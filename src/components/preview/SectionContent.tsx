
import { cx } from '../../lib/cx'
import type { Organigramme, SectionImage, TextBlock } from '../../types'
import { EditableText, EditableTitle } from './EditableText'
import { Figure } from './Figure'
import type { MoveTarget } from './moveTargets'
import { TextBlockView } from './TextBlockView'
import { OrgChart } from './OrgChart'
import { DOC_BODY_STYLE, SUBTITLE_COLOR } from './tokens'
import { BlockMoveControls, PartTitle, Removable, type RenderBlock, type SectionUnit } from './SectionShell'
import { blockKeyFor } from '../../lib/blockModel'
import type { ParagraphDrag } from './paragraphDrag'
import type { BlockDrop } from './paragraphDrag'
import type { PreviewActions } from './actions'
import type { ReportPart, ReportSubSubSection } from '../../lib/reportDocument'

export function PartContent({
  part,
  images,
  organigramme,
  organigrammes,
  primaryColor,
  moveTargets,
  onMoveImage,
  sectionTargets,
  parts,
  textBlocks = [],
  blockOrder,
  onImagesChange,
  drag,
  actions,
}: {
  part: ReportPart
  images: SectionImage[]
  /** Image drag plumbing, owned by the document's own drag state. */
  /** Chart data: the report-level chart, plus per-section overrides. */
  organigramme?: Organigramme
  organigrammes?: Record<string, Organigramme>
  primaryColor?: string
  moveTargets?: MoveTarget[]
  onMoveImage?: (imgId: string, fromSection: string, toSection: string, toBlockIndex: number) => void
  /** The other sections a paragraph can be sent to. */
  sectionTargets?: Array<{ key: string; label: string }>
  /** Every part, to name a drop target that is not in the list above. */
  parts?: ReportPart[]
  /** Paragraphs already added to this section, and their stored order. */
  textBlocks?: TextBlock[]
  blockOrder?: string[]
  /** The section's own image writer, derived from actions.onImagesChange. */
  onImagesChange?: (imgs: SectionImage[]) => void
  /** The document's single paragraph drag, shared so it can cross sections. */
  drag?: ParagraphDrag
  actions: PreviewActions
}) {
  const dragKey = drag?.drag && drag.drag.sectionKey === part.key ? drag.drag.blockKey : null
  const dropAt = drag?.drop ?? null
  // A floating box is placed, not reordered: the line and the chip say so.
  const freeDragKey =
    drag?.drag && textBlocks.some((t) => `text:${t.id}` === drag.drag!.blockKey && t.positioning === 'free')
      ? drag.drag.blockKey
      : null
  const freeDropHere = !!freeDragKey && !!dropAt && dropAt.sectionKey === part.key
  const dropY = !freeDropHere && drag?.drop && drag.drop.sectionKey === part.key ? drag.drop.y : null

  const getOrg = (key?: string) => {
    if (key && organigrammes?.[key]?.nodes?.length) return organigrammes[key]
    if (part.key && organigrammes?.[part.key]?.nodes?.length) return organigrammes[part.key]
    return organigramme
  }

  // Writes the chart that is on screen, not the one the key points at: a
  // sub-chart falls back to its section's chart, and that fallback is what the
  // reader sees, so that is what has to be edited.
  const changeOrg = (key: string, patch: Partial<Organigramme>) => {
    if (!actions.onOrganigrammeChange) return
    actions.onOrganigrammeChange?.(key, { ...(getOrg(key) ?? { nodes: [] }), ...patch })
  }

  if (part.key === 'organigramme' || part.isOrganigramme) {
    const orgData = getOrg(part.key)
    return (
      <div data-part-content={part.key}>
        {part.titre && part.titre.trim() !== '' && (
          <PartTitle titre={part.titre} onTitleEdit={actions.onTitleEdit} partKey={part.key} />
        )}
        <div className="mt-8">
          <OrgChart
            nodes={orgData?.nodes ?? []}
            primaryColor={primaryColor}
            width={orgData?.width}
            shape={orgData?.shape}
            orientation={orgData?.orientation}
            editable={!!actions.onOrganigrammeChange}
            onWidthChange={actions.onOrganigrammeChange ? (width) => changeOrg(part.key, { width }) : undefined}
            onShapeChange={actions.onOrganigrammeChange ? (shape) => changeOrg(part.key, { shape }) : undefined}
            onNodesChange={actions.onOrganigrammeChange ? (next) => changeOrg(part.key, { nodes: next }) : undefined}
          />
        </div>
      </div>
    )
  }

  const blocks: RenderBlock[] = []
  if (part.paragraphes && part.paragraphes.length > 0) blocks.push({ paragraphes: part.paragraphes })
  for (const ss of part.sousSections ?? []) blocks.push(ss)

  const hasContent = blocks.some(
    (b) =>
      (b.paragraphes !== undefined && b.paragraphes.length > 0) ||
      (b.texte !== undefined && b.texte.trim() !== '') ||
      b.isOrganigramme ||
      (b.items?.some((item) => item.texte.trim() !== '' || item.isOrganigramme) ?? false),
  )

  const handleParagraphsSave = (newText: string) => {
    if (!actions.onEdit || !part.editPath) return
    const { stepId, fieldIds } = part.editPath
    if (!newText.trim()) {
      // Clearing merged text (e.g. Remerciements = personnes + raisons) must
      // clear every contributing field, otherwise the surviving fields resurrect.
      for (const fid of fieldIds) actions.onEdit?.('section', `${stepId}:${fid}`, '')
      return
    }
    actions.onEdit?.('section', `${stepId}:${fieldIds[0]}`, newText)
  }

  // One ordered list of everything the section renders: its own blocks and any
  // free paragraphs. The plan's order is the default; a stored order overrides
  // it, and a block that is not listed keeps its place at the end.
  const order = blockOrder
  const units: SectionUnit[] = [
    ...blocks.map((b, bi) => ({
      kind: 'block' as const,
      block: b,
      index: bi,
      // The key is built by the same module that resolves it when a block moves,
      // so the two can never disagree about which block is which.
      key: blockKeyFor(b, bi),
    })),
    ...textBlocks.map((t) => ({ kind: 'text' as const, block: t, index: -1, key: `text:${t.id}` })),
  ]
  const ordered = order
    ? [...units].sort((a, b) => {
        const rank = (key: string) => {
          const i = order.indexOf(key)
          return i === -1 ? Number.MAX_SAFE_INTEGER : i
        }
        return rank(a.key) - rank(b.key)
      })
    : units

  // Sub-sections are numbered by position ("1.", "2.", …), so the number has to
  // follow the block when it is moved. buildReportParts numbers them in plan
  // order, which is no longer where they are on the page — so the shown number
  // is derived from the display position instead of from the stored one.
  // Merged paragraphs are not numbered and must not consume one either.
  const ordinals = new Map<string, number>()
  let nextNumero = 0
  for (const unit of ordered) {
    if (unit.kind !== 'block' || unit.block.paragraphes) continue
    nextNumero += 1
    ordinals.set(unit.key, nextNumero)
  }

  const moveUnit = (key: string, dir: -1 | 1) => {
    if (!actions.onBlockOrderChange) return
    const keys = ordered.map((u) => u.key)
    const from = keys.indexOf(key)
    const to = from + dir
    if (from === -1 || to < 0 || to >= keys.length) return
    const next = [...keys]
    ;[next[from], next[to]] = [next[to], next[from]]
    actions.onBlockOrderChange?.(part.key, next)
  }

  // Drag to reorder, the way a word processor moves a paragraph: grab the handle,
  // an insertion line shows where the block will land, drop to commit. The arrow
  // buttons stay for the keyboard and for phones, where a handle is a smaller
  // target than it looks.
  /**
   * Where the dragged block would land, and where to draw the line. Any
   * section's list can be the target, so the list is found under the pointer
   * rather than assumed to be this one.
   */
  const commitDrop = () => {
    if (dragKey && dropAt) {
      if (dropAt.sectionKey === part.key) {
        // Same section: reorder.
        if (actions.onBlockOrderChange) {
          // The slot is counted without the dragged block, so it drops in directly.
          const keys = ordered.map((u) => u.key).filter((k) => k !== dragKey)
          keys.splice(Math.max(0, Math.min(keys.length, dropAt.index)), 0, dragKey)
          if (keys.join(' ') !== ordered.map((u) => u.key).join(' ')) {
            actions.onBlockOrderChange?.(part.key, keys)
          }
        }
      } else if (actions.onBlockMove) {
        // Another section: the paragraph carries its text with it, and the
        // destination's order is written out so it lands where the line was.
        actions.onBlockMove?.(part.key, dragKey, dropAt.sectionKey, dropAt.index, ordered.map((u) => u.key), dropAt.keys)
      }
    }
    drag?.end()
  }


  const handleUpdate = (id: string, patch: Partial<SectionImage>) => {
    if (!onImagesChange) return
    onImagesChange(images.map((img) => (img.id === id ? { ...img, ...patch } : img)))
  }

  // The guaranteed path: the same move the drag performs, chosen from a picker.
  // It lands at the top of the destination; the arrows then move it from there.
  const moveBlockToSectionTop = (blockKey: string) => (sectionKey: string) => {
    if (!actions.onBlockMove) return
    actions.onBlockMove(part.key, blockKey, sectionKey, 0, ordered.map((u) => u.key), [])
  }

  // A free drop places the box where the pointer is. Same section: write the
  // freely chosen position. Another section: the paragraph carries its text
  // there (the stored offset travels with it) and lands at its flow place —
  // the next grab repositions it freely, so it is never stranded.
  const commitFreeDrop = (blockKey: string, drop: BlockDrop | null, pos: { x: number; y: number }) => {
    if (!drop) return
    if (drop.sectionKey === part.key) {
      actions.onTextBlocksChange?.(
        part.key,
        textBlocks.map((x) => (blockKey === `text:${x.id}` ? { ...x, x: pos.x, y: pos.y } : x)),
      )
      return
    }
    if (actions.onBlockMove) {
      actions.onBlockMove(part.key, blockKey, drop.sectionKey, drop.index, ordered.map((u) => u.key), drop.keys)
    }
  }

  // The image grip shares the document drag, so an image moves to another
  // section with the same gesture — and the same auto-scroll — as a paragraph.
  const handleImageDrop = (imgId: string, target: { sectionKey: string; index: number }) => {
    if (!onMoveImage) return
    if (target.sectionKey === part.key) {
      // Within a section: keep it on the block it was dropped on.
      onMoveImage(imgId, part.key, part.key, target.index)
      return
    }
    onMoveImage(imgId, part.key, target.sectionKey, target.index)
  }

  return (
    <div data-part-content={part.key}>
      {/* Level 1: unnumbered — omit entirely if empty */}
      {part.titre && part.titre.trim() !== '' && (
        <PartTitle titre={part.titre} onTitleEdit={actions.onTitleEdit} partKey={part.key} />
      )}
      <div
        data-section-key={part.key}
        className={cx(
          'relative mt-5 rounded-md transition-colors',
          // Another section's paragraph is hovering here: say so, so the drop is
          // never a guess.
          Boolean(drag?.drop && drag.drop.sectionKey === part.key && drag.drag && drag.drag.sectionKey !== part.key) && 'bg-gold-soft/40 ring-1 ring-gold/40',
        )}
      >
        {/* Where the dragged block will land — the word-processor insertion line,
            with the section it is going to spelled out. An invisible target is
            indistinguishable from a broken one. A floating box is placed, not
            reordered, so it names the spot without the line. */}
        {drag && drag.drop && drag.drop.sectionKey === part.key && (
          <div
            className="pointer-events-none absolute inset-x-0 z-40 flex justify-center"
            style={{ top: Math.max(0, (dropY ?? drag.drop.y) - 26) }}
          >
            <span className="rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700 shadow-sm backdrop-blur-xs">
              {drag.drag && drag.drag.sectionKey === part.key
                ? freeDropHere
                  ? 'Placer ici'
                  : 'Réorganiser dans cette section'
                : `Déplacer vers « ${(sectionTargets ?? []).find((t) => t.key === drag!.drop!.sectionKey)?.label ?? (parts ?? []).find((p) => p.key === drag!.drop!.sectionKey)?.titre ?? drag.drop!.sectionKey} »`}
            </span>
          </div>
        )}
        {drag && dropY !== null && (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 h-0.5 rounded-full bg-blue-500"
            style={{ top: dropY ?? 0 }}
          />
        )}
        {ordered.map((unit, di) => {
          // Images stay attached to the block they belong to, whatever order the
          // blocks are shown in.
          const bi = unit.index
          const b = unit.block as RenderBlock
          const blockImages = bi < 0 ? [] : images.filter((img) => (img.blockIndex ?? images.indexOf(img)) === bi)
          const blockItems: ReportSubSubSection[] | undefined = b.items

          return (
            <div
              key={unit.key}
              data-unit={unit.key}
              className={cx(di > 0 ? 'mt-7' : '', 'group/block relative', dragKey === unit.key && 'select-none opacity-40')}
            >
              {actions.onBlockOrderChange && (
                <BlockMoveControls
                  label={unit.kind === 'text' ? 'ce paragraphe' : b.titre || 'ce paragraphe'}
                  canUp={di > 0}
                  canDown={di < ordered.length - 1}
                  dragging={dragKey === unit.key}
                  onDragStart={(e) => {
                    if ((!actions.onBlockOrderChange && !actions.onBlockMove) || !drag) return
                    e.preventDefault()
                    e.stopPropagation()
                    e.currentTarget.setPointerCapture?.(e.pointerId)
                    drag.start(part.key, unit.key, e.clientX, e.clientY)
                  }}
                  onDragMove={(e) => drag?.move(e.clientX, e.clientY)}
                  onDragEnd={() => { commitDrop(); drag?.end() }}
                  onUp={() => moveUnit(unit.key, -1)}
                  onDown={() => moveUnit(unit.key, 1)}
                  sectionTargets={sectionTargets ?? []}
                  onMoveToSection={
                    actions.onBlockMove && (sectionTargets ?? []).length > 0
                      ? moveBlockToSectionTop(unit.key)
                      : undefined
                  }
                />
              )}
              {unit.kind === 'text' ? (
                <TextBlockView
                  block={unit.block}
                  onSaveText={actions.onTextBlocksChange ? (v) => actions.onTextBlocksChange?.(part.key, textBlocks.map((x) => (x.id === unit.block.id ? { ...x, text: v } : x))) : undefined}
                  onPatch={actions.onTextBlocksChange ? (patch) => actions.onTextBlocksChange?.(part.key, textBlocks.map((x) => (x.id === unit.block.id ? { ...x, ...patch } : x))) : undefined}
                  onRemove={actions.onTextBlocksChange ? () => actions.onTextBlocksChange?.(part.key, textBlocks.filter((x) => x.id !== unit.block.id)) : undefined}
                  drag={drag}
                  partKey={part.key}
                  unitKey={unit.key}
                  onFreeDrop={
                    actions.onTextBlocksChange || actions.onBlockMove
                      ? (drop, pos) => commitFreeDrop(unit.key, drop, pos)
                      : undefined
                  }
                />
              ) : (
                <>
              {/* Level 2: numbered (1., 2., ...) — omit entirely if empty */}
              {b.titre && b.titre.trim() !== '' && (
                actions.onTitleEdit && (b.id || b.editPath) ? (
                  <EditableTitle
                    tag="h3"
                    text={b.titre}
                    prefixNode={ordinals.get(unit.key) !== undefined ? `${ordinals.get(unit.key)}.` : undefined}
                    onSave={(v) => actions.onTitleEdit?.(b.id ? `fieldLabel:${part.key}:${b.id}` : `titleOverride:${b.editPath!.source}:${b.editPath!.field}`, v)}
                    onRemove={() => actions.onTitleEdit?.(b.id ? `fieldLabel:${part.key}:${b.id}` : `titleOverride:${b.editPath!.source}:${b.editPath!.field}`, '')}
                    className="font-semibold"
                    style={{ color: SUBTITLE_COLOR, fontSize: 'var(--doc-subtitle-size)' }}
                  />
                ) : (
                  <h3 className="font-semibold" style={{ color: SUBTITLE_COLOR, fontSize: 'var(--doc-subtitle-size)' }}>
                    {ordinals.get(unit.key) !== undefined ? `${ordinals.get(unit.key)}. ${b.titre}` : b.titre}
                  </h3>
                )
              )}
              {b.isOrganigramme ? (
                <div className="mt-4">
                  <OrgChart
                    nodes={getOrg(b.id)?.nodes ?? []}
                    primaryColor={primaryColor}
                    width={getOrg(b.id)?.width}
                    shape={getOrg(b.id)?.shape}
                    orientation={getOrg(b.id)?.orientation}
                    editable={!!actions.onOrganigrammeChange}
                    onWidthChange={actions.onOrganigrammeChange ? (width) => changeOrg(b.id ?? '', { width }) : undefined}
                    onShapeChange={actions.onOrganigrammeChange ? (shape) => changeOrg(b.id ?? '', { shape }) : undefined}
                    onNodesChange={actions.onOrganigrammeChange ? (next) => changeOrg(b.id ?? '', { nodes: next }) : undefined}
                  />
                </div>
              ) : (
                <div className="flow-root">
                  {blockImages.map((img) => (
                    <Figure
                      key={img.id}
                      img={img}
                      onUpdate={onImagesChange ? (patch) => handleUpdate(img.id, patch) : undefined}
                      onRemove={onImagesChange ? () => onImagesChange(images.filter((i) => i.id !== img.id)) : undefined}
                      isDragging={drag?.drag?.blockKey === `image:${img.id}`}
                      moveTargets={moveTargets}
                      onMoveImage={onMoveImage ? (toSection, toBlockIndex) => onMoveImage(img.id, part.key, toSection, toBlockIndex) : undefined}
                      drag={drag}
                      onImageDrop={onMoveImage ? (target) => handleImageDrop(img.id, target) : undefined}
                    />
                  ))}
                  {b.paragraphes ? (
                    <Removable onRemove={actions.onEdit ? () => handleParagraphsSave('') : undefined} label="Supprimer ce texte">
                    <div className="space-y-3.5" style={DOC_BODY_STYLE}>
                      <EditableText
                        text={b.paragraphes.join('\n\n')}
                        placeholder="Cliquez ici pour rédiger..."
                        onSave={actions.onEdit ? handleParagraphsSave : undefined}
                        className="whitespace-pre-wrap"
                      />
                    </div>
                    </Removable>
                  ) : b.texte && b.texte.trim() !== '' ? (
                    <Removable onRemove={actions.onEdit && b.editPath ? () => actions.onEdit?.(b.editPath!.source, b.editPath!.field, '') : undefined} label="Supprimer ce texte">
                    <EditableText
                      text={b.texte}
                      placeholder="Cliquez ici pour rédiger..."
                      onSave={actions.onEdit && b.editPath ? (v) => actions.onEdit?.(b.editPath!.source, b.editPath!.field, v) : undefined}
                      className={`${b.titre && b.titre.trim() !== '' ? 'mt-2.5' : ''} whitespace-pre-wrap`}
                      style={DOC_BODY_STYLE}
                    />
                    </Removable>
                  ) : actions.onEdit && b.editPath ? (
                    <EditableText
                      text=""
                      placeholder="Cliquez ici pour rédiger..."
                      onSave={(v) => actions.onEdit?.(b.editPath!.source, b.editPath!.field, v)}
                      className="mt-2"
                      style={{ fontSize: 'var(--doc-body-size)' }}
                    />
                  ) : null}
                </div>
              )}

              {/* Level 3: a/, b/, c/ — omit heading if title empty */}
              {blockItems && blockItems.length > 0 && (
                <div className="mt-4 space-y-4">
                  {blockItems.map((item) => (
                    <div key={item.id} className="pl-4 border-l-2 border-line/40">
                      {/* Level 3 heading: "a/ Titre" — omit if titre is empty */}
                      {item.titre && item.titre.trim() !== '' && (
                        actions.onTitleEdit && (item.id || item.editPath) ? (
                          <EditableTitle
                            tag="h4"
                            text={item.titre}
                            prefixNode={<span style={{ color: SUBTITLE_COLOR }}>{item.prefix || 'a/'}</span>}
                            onSave={(v) => actions.onTitleEdit?.(item.id ? `fieldLabel:${part.key}:${item.id}` : `titleOverride:${item.editPath!.source}:${item.editPath!.field}`, v)}
                            onRemove={() => actions.onTitleEdit?.(item.id ? `fieldLabel:${part.key}:${item.id}` : `titleOverride:${item.editPath!.source}:${item.editPath!.field}`, '')}
                            className="font-semibold text-ink"
                            style={{ fontSize: 'var(--doc-body-size)', fontFamily: 'var(--doc-title-font)' }}
                          />
                        ) : (
                          <h4
                            className="font-semibold text-ink"
                            style={{ fontSize: 'var(--doc-body-size)', fontFamily: 'var(--doc-title-font)' }}
                          >
                            <span style={{ color: SUBTITLE_COLOR, marginRight: '0.375rem' }}>{item.prefix || 'a/'}</span>
                            {item.titre}
                          </h4>
                        )
                      )}
                      {item.isOrganigramme ? (
                        <div className="mt-2">
                          <OrgChart
                            nodes={getOrg(item.id)?.nodes ?? []}
                            primaryColor={primaryColor}
                            width={getOrg(item.id)?.width}
                            shape={getOrg(item.id)?.shape}
                            orientation={getOrg(item.id)?.orientation}
                            editable={!!actions.onOrganigrammeChange}
                            onWidthChange={actions.onOrganigrammeChange ? (width) => changeOrg(item.id, { width }) : undefined}
                            onShapeChange={actions.onOrganigrammeChange ? (shape) => changeOrg(item.id, { shape }) : undefined}
                            onNodesChange={actions.onOrganigrammeChange ? (next) => changeOrg(item.id, { nodes: next }) : undefined}
                          />
                        </div>
                      ) : (
                        item.texte && item.texte.trim() !== '' ? (
                          <Removable onRemove={actions.onEdit && item.editPath ? () => actions.onEdit?.(item.editPath!.source, item.editPath!.field, '') : undefined} label="Supprimer ce texte">
                          <EditableText
                            text={item.texte}
                            placeholder="Cliquez ici pour rédiger..."
                            onSave={actions.onEdit && item.editPath ? (v) => actions.onEdit?.(item.editPath!.source, item.editPath!.field, v) : undefined}
                            className={`${item.titre && item.titre.trim() !== '' ? 'mt-1.5' : ''} whitespace-pre-wrap`}
                            style={DOC_BODY_STYLE}
                          />
                          </Removable>
                        ) : actions.onEdit && item.editPath ? (
                          <EditableText
                            text=""
                            placeholder="Cliquez ici pour rédiger..."
                            onSave={(v) => actions.onEdit?.(item.editPath!.source, item.editPath!.field, v)}
                            className="mt-1"
                            style={{ fontSize: 'var(--doc-body-size)' }}
                          />
                        ) : null
                      )}
                    </div>
                  ))}
                </div>
              )}
                </>
              )}
            </div>
          )
        })}
        {images.slice(Math.max(1, blocks.length)).map((img) => (
          <Figure
            key={img.id}
            img={{ ...img, side: img.side ?? 'center' }}
            onUpdate={onImagesChange ? (patch) => handleUpdate(img.id, patch) : undefined}
            onRemove={onImagesChange ? () => onImagesChange(images.filter((i) => i.id !== img.id)) : undefined}
            isDragging={drag?.drag?.blockKey === `image:${img.id}`}
            moveTargets={moveTargets}
            onMoveImage={onMoveImage ? (toSection, toBlockIndex) => onMoveImage(img.id, part.key, toSection, toBlockIndex) : undefined}
            drag={drag}
            onImageDrop={onMoveImage ? (target) => handleImageDrop(img.id, target) : undefined}
          />
        ))}

      </div>
      {!hasContent && part.sousSections && part.sousSections.length === 0 && (
        <div className="mt-8 text-center text-sm italic text-neutral-400">Section vide</div>
      )}
    </div>
  )
}
