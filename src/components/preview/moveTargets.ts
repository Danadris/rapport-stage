import type { ReportPart } from '../../lib/reportDocument'

export interface MoveTarget {
  sectionKey: string
  blockIndex: number
  label: string
}

/** Places an image can be moved to — the touch-friendly "Move to…" picker, which
    stands in for the native drag grip (that never fires on touch). Exported for
    the assembler, which computes it once for the whole document. */
export function computeMoveTargets(parts: ReportPart[]): MoveTarget[] {
  const targets: MoveTarget[] = []
  for (const part of parts) {
    if (part.key === 'organigramme' || part.isOrganigramme) continue
    const blockTitles: (string | undefined)[] = []
    if (part.paragraphes && part.paragraphes.length > 0) blockTitles.push(undefined)
    for (const ss of part.sousSections ?? []) blockTitles.push(ss.titre)
    if (blockTitles.length === 0) blockTitles.push(undefined)
    const sectionLabel = part.titre && part.titre.trim() !== '' ? part.titre : part.key
    blockTitles.forEach((t, bi) => {
      const label = t && t.trim() !== '' ? `${sectionLabel} — ${t}` : sectionLabel
      targets.push({ sectionKey: part.key, blockIndex: bi, label })
    })
  }
  return targets
}
