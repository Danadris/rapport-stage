import { ChevronDown, ChevronUp, GripVertical, MoveHorizontal } from 'lucide-react'
import { EditableTitle } from './EditableText'
import { TITLE_COLOR } from './tokens'
import type { ReportSubSection } from '../../lib/reportDocument'
import type { TextBlock } from '../../types'

/** What PartContent renders per block: a sub-section, or a merged paragraph. */
export type RenderBlock = Partial<ReportSubSection> & { paragraphes?: string[] }

/** One renderable piece of a section: a plan block or a free paragraph. */
export type SectionUnit =
  | { kind: 'block'; block: RenderBlock; index: number; key: string }
  | { kind: 'text'; block: TextBlock; index: number; key: string }

export function Removable({ onRemove, label, children }: { onRemove?: () => void; label: string; children: React.ReactNode }) {
  if (!onRemove) return <>{children}</>
  return (
    <div className="group/text relative">
      {children}
      <button
        type="button"
        title={label}
        aria-label={label}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove() }}
        className="absolute -right-6 top-0 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-[10px] text-neutral-400 opacity-40 transition-opacity hover:text-red-500 print:hidden sm:opacity-0 sm:group-hover/text:opacity-100 sm:group-focus-within/text:opacity-100"
      >
        ×
      </button>
    </div>
  )
}

/**
 * A part's level-1 title: centred, and editable when the report allows it.
 * The organigramme branch and the section branch render the same title, so
 * it lives here once.
 */
export function PartTitle({ titre, onTitleEdit, partKey }: { titre: string; onTitleEdit?: (field: string, value: string) => void; partKey: string }) {
  const style = { color: TITLE_COLOR, fontSize: 'var(--doc-title-size)' }
  if (!onTitleEdit) {
    return <h2 className="text-center font-bold" style={style}>{titre}</h2>
  }
  return (
    <EditableTitle
      tag="h2"
      text={titre}
      onSave={(v) => onTitleEdit?.(`stepTitle:${partKey}`, v)}
      onRemove={() => onTitleEdit?.(`stepTitle:${partKey}`, '')}
      className="text-center font-bold"
      style={style}
    />
  )
}

export function BlockMoveControls({
  label,
  canUp,
  canDown,
  dragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  onUp,
  onDown,
  sectionTargets,
  onMoveToSection,
}: {
  label: string
  canUp: boolean
  canDown: boolean
  dragging: boolean
  onDragStart: (event: React.PointerEvent<HTMLElement>) => void
  onDragMove: (event: React.PointerEvent<HTMLElement>) => void
  onDragEnd: () => void
  onUp: () => void
  onDown: () => void
  /** Other sections, for the move sheet: a drag needs a grip and a scroll, this does not. */
  sectionTargets: Array<{ key: string; label: string }>
  onMoveToSection?: () => void
}) {
  return (
    // Always faintly visible, full on hover or focus. Hover alone never fires on
    // a touch screen, and a control you cannot see is a control you cannot drag.
    // Marked so the pagination never reads its text as lines of the block: a cut
    // there would blank most of the page.
    <div data-pagination-ignore className="absolute -left-10 top-0 flex w-10 flex-col items-center gap-1 opacity-40 transition-opacity hover:opacity-100 group-hover/block:opacity-100 group-focus-within/block:opacity-100 print:hidden">
      <button
        type="button"
        onPointerDown={onDragStart}
        onPointerMove={onDragMove}
        onPointerUp={onDragEnd}
        onPointerCancel={onDragEnd}
        title={`Glisser « ${label} » pour réorganiser`}
        aria-label={`Réorganiser « ${label} »`}
        className={`flex h-7 w-7 touch-none select-none items-center justify-center rounded border border-neutral-300 bg-white/90 shadow-sm transition-colors ${
          dragging ? 'cursor-grabbing border-blue-300 bg-blue-50 text-blue-600' : 'cursor-grab text-neutral-500 hover:text-neutral-900'
        }`}
      >
        <GripVertical size={13} />
      </button>
      {onMoveToSection && sectionTargets.length > 0 && (
        <button
          type="button"
          onClick={onMoveToSection}
          title={`Déplacer « ${label} » hors de la section`}
          aria-label={`Déplacer « ${label} » hors de la section`}
          className="flex h-7 w-7 items-center justify-center rounded border border-neutral-300 bg-white/90 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900"
        >
          <MoveHorizontal size={13} />
        </button>
      )}
      <div className="flex gap-px">
        <button
          type="button"
          onClick={onUp}
          disabled={!canUp}
          title={`Monter « ${label} »`}
          aria-label={`Monter « ${label} »`}
          className="flex h-5 w-4 items-center justify-center rounded border border-neutral-300 bg-white/90 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900 disabled:opacity-30"
        >
          <ChevronUp size={11} />
        </button>
        <button
          type="button"
          onClick={onDown}
          disabled={!canDown}
          title={`Descendre « ${label} »`}
          aria-label={`Descendre « ${label} »`}
          className="flex h-5 w-4 items-center justify-center rounded border border-neutral-300 bg-white/90 text-neutral-500 shadow-sm transition-colors hover:text-neutral-900 disabled:opacity-30"
        >
          <ChevronDown size={11} />
        </button>
      </div>
    </div>
  )
}
