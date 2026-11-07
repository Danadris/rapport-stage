import { WIZARD_STEPS } from '../data/sections'
import { buildReportParts } from './reportDocument'
import type { Rapport, NoteField } from '../types'

/**
 * Block keys — the identity of a paragraph as it is drawn on the page.
 *
 * Every block in a section has one, and these are the strings `Rapport.blockOrder`
 * stores. They are built by `blockKeyFor` below and read back by `resolveBlock`,
 * so the two can never drift apart; the preview's drag code uses the same values.
 *
 *   `editPath.field`    an official-plan paragraph, e.g. `taches:missionsDetaillees`
 *                       — the section id and the note's field id, colon-joined
 *   `<field id>`        a custom-plan paragraph, e.g. `3f8a1c…`
 *   `paragraphes`       a merged paragraph (Remerciements, Introduction) that reads
 *                       several fields as one block
 *   `text:<id>`         a free paragraph added from the preview
 *   `fusion-<a>-<b>`    a merged paragraph after it has been carried to another
 *                       section by a move
 *
 * `b<index>` is the last resort for a block with none of the above, and only ever
 * appears for as long as that block exists.
 */

/** The fields a rendered block stands for, parent first. */
interface ResolvedBlock {
  /** The paragraph's label, so it can be rebuilt in its new section. */
  label: string
  /** The note field ids the paragraph is made of: the block itself, then its a/, b/ items. */
  fieldIds: string[]
  /** True when several fields are read as one paragraph. */
  merged: boolean
}

/** The key of a block as buildReportParts returns it. */
export function blockKeyFor(
  block: { id?: string; paragraphes?: string[]; editPath?: { field?: string } },
  fallbackIndex: number,
): string {
  if (block.id) return block.id
  if (block.paragraphes) return 'paragraphes'
  if (block.editPath?.field) return block.editPath.field
  return `b${fallbackIndex}`
}

/** The official plan, copied into editable steps — the way a section becomes one the student can reorganise. */
export function materializeSteps() {
  return WIZARD_STEPS.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f })) }))
}

/**
 * The fields a block stands for. Company fields (source `entreprise`) cannot be
 * carried to another section, so they resolve to null and the block stays put.
 */
function resolveFromPart(part: ReturnType<typeof buildReportParts>[number], blockKey: string): ResolvedBlock | null {
  if (blockKey === 'paragraphes') {
    const fieldIds = part.editPath?.fieldIds ?? []
    return fieldIds.length > 0 ? { label: '', fieldIds, merged: true } : null
  }

  const ss = (part.sousSections ?? []).find((b) => blockKeyFor(b, -1) === blockKey)
  if (!ss) return null
  if (!ss.id && ss.editPath?.source !== 'section') return null

  const own = ss.id ?? ss.editPath!.field.split(':')[1]
  const items = (ss.items ?? [])
    .map((i) =>
      i.id ?? (i.editPath?.source === 'section' ? i.editPath.field.split(':')[1] : undefined),
    )
    .filter((id): id is string => Boolean(id))
  return { label: ss.titre, fieldIds: [own, ...items], merged: false }
}

/** Inserts a key into an ordered list, clamped to its bounds. */
const insertAt = (keys: string[], key: string, index: number) => {
  const next = [...keys]
  next.splice(Math.max(0, Math.min(next.length, index)), 0, key)
  return next
}

/**
 * The key a block will be known by once a move has happened.
 *
 * A report starts on the official plan, where a section's blocks are keyed
 * `section:field` (the id buildReportParts gives them). The first move writes
 * `customSteps`, and from then on the same blocks are keyed by field id alone.
 * Rewriting the drawn order in the pre-move format would leave every block
 * unlisted — so the paragraph would land wherever the field array happened to
 * put it, not where it was dropped.
 */
const afterMoveKey = (key: string) =>
  key.startsWith('text:') || !key.includes(':') ? key : key.slice(key.indexOf(':') + 1)

/**
 * Moves a paragraph to another section, carrying its text with it so nothing is
 * left behind where it came from.
 *
 * `sourceKeys` and `targetKeys` are the two sections' keys *as drawn on the
 * page*; they are written back as `blockOrder`, which is what makes the
 * paragraph land exactly where the insertion line was even when a section mixes
 * plan paragraphs with free ones (the fields array and the drawn order are not
 * the same list once that happens).
 *
 * Returns null when the move cannot be made, so the caller can leave the report
 * untouched — and keep its undo history clean.
 */
export function moveBlock(
  rapport: Rapport,
  fromSection: string,
  blockKey: string,
  toSection: string,
  index: number,
  sourceKeys: string[],
  targetKeys: string[],
): Rapport | null {
  if (fromSection === toSection || fromSection === '' || toSection === '') return null

  const order = {
    ...(rapport.blockOrder ?? {}),
    [fromSection]: sourceKeys.map(afterMoveKey).filter((k) => k !== afterMoveKey(blockKey)),
    [toSection]: insertAt(targetKeys.map(afterMoveKey), blockKey, index),
  }
  // Free paragraphs are self-contained: they simply change list.
  if (blockKey.startsWith('text:')) {
    const id = blockKey.slice(5)
    const source = rapport.textBlocks?.[fromSection] ?? []
    const moved = source.find((b) => b.id === id)
    if (!moved) return null
    const target = [...(rapport.textBlocks?.[toSection] ?? [])]
    target.splice(Math.max(0, Math.min(target.length, index)), 0, moved)
    return {
      ...rapport,
      textBlocks: {
        ...(rapport.textBlocks ?? {}),
        [fromSection]: source.filter((b) => b.id !== id),
        [toSection]: target,
      },
      blockOrder: order,
      updatedAt: Date.now(),
    }
  }

  const part = buildReportParts(rapport).find((p) => p.key === fromSection)
  const resolved = part ? resolveFromPart(part, blockKey) : null
  if (!part || !resolved) return null

  const steps = (rapport.customSteps ?? materializeSteps()).map((s) => ({ ...s, fields: [...s.fields] }))
  const sourceStep = steps.find((s) => s.id === fromSection)
  const targetStep = steps.find((s) => s.id === toSection)
  if (!sourceStep || !targetStep) return null
  // Only a text section can host a paragraph. Sections with a fixed plan kind —
  // presentation, activités, organigramme, fiche technique — render hardcoded
  // blocks and ignore `fields`, so a paragraph moved there would be kept in the
  // data but rendered nowhere: silently lost, and gone from the PDF too.
  if (targetStep.kind !== 'notes') return null

  // Both texts move with the block: the raw notes and the generated draft alike.
  const sections = { ...(rapport.sections ?? {}) }
  const generated = { ...(rapport.sectionsGenerated ?? {}) }
  const fromNotes = { ...(sections[fromSection] ?? {}) }
  const fromGenerated = { ...(generated[fromSection] ?? {}) }
  const toNotes = { ...(sections[toSection] ?? {}) }
  const toGenerated = { ...(generated[toSection] ?? {}) }

  const existing = sourceStep.fields.find((f) => f.id === resolved.fieldIds[0])
  const children = sourceStep.fields.filter((f) => f.parentId && resolved.fieldIds.includes(f.parentId))

  let field: NoteField
  let newKey: string
  if (resolved.merged) {
    const note = resolved.fieldIds.map((fid) => fromNotes[fid] ?? '').filter(Boolean).join('\n\n')
    const draft = resolved.fieldIds.map((fid) => fromGenerated[fid] ?? '').filter(Boolean).join('\n\n')
    newKey = `fusion-${resolved.fieldIds.join('-')}`
    field = {
      id: newKey,
      label: existing?.label ?? resolved.label ?? 'Paragraphe',
      placeholder: 'Vos notes…',
      examples: [],
    }
    if (note) toNotes[newKey] = note
    if (draft) toGenerated[newKey] = draft
    for (const fid of resolved.fieldIds) {
      delete fromNotes[fid]
      delete fromGenerated[fid]
    }
  } else {
    newKey = resolved.fieldIds[0]
    field = existing ?? {
      id: newKey,
      label: resolved.label || 'Sans titre',
      placeholder: 'Vos notes…',
      examples: [],
    }
    for (const fid of resolved.fieldIds) {
      if (fromNotes[fid] !== undefined) toNotes[fid] = fromNotes[fid]
      if (fromGenerated[fid] !== undefined) toGenerated[fid] = fromGenerated[fid]
      delete fromNotes[fid]
      delete fromGenerated[fid]
    }
  }

  sourceStep.fields = sourceStep.fields.filter((f) => f.id !== field.id && !children.includes(f))
  const at = Math.max(0, Math.min(targetStep.fields.length, index))
  targetStep.fields = [
    ...targetStep.fields.slice(0, at),
    field,
    ...children.filter((c) => c.parentId === field.id),
    ...targetStep.fields.slice(at),
  ]

  if (Object.keys(fromNotes).length > 0) sections[fromSection] = fromNotes
  else delete sections[fromSection]
  if (Object.keys(fromGenerated).length > 0) generated[fromSection] = fromGenerated
  else delete generated[fromSection]
  if (Object.keys(toNotes).length > 0) sections[toSection] = toNotes
  if (Object.keys(toGenerated).length > 0) generated[toSection] = toGenerated

  // The moved block keeps the identity it had, so the order written above points
  // at a block the destination really renders.
  order[toSection] = insertAt(targetKeys.map(afterMoveKey), newKey, index)

  return {
    ...rapport,
    customSteps: steps,
    sections,
    sectionsGenerated: generated,
    blockOrder: order,
    updatedAt: Date.now(),
  }
}
