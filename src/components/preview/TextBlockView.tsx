import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { GripVertical, Layers, MoreHorizontal } from 'lucide-react'
import type { TextBlock } from '../../types'
import { EditableText } from './EditableText'
import { clampFreePos, useRescuedY, visibleCopySlice, type FreeBounds } from './freePlacement'
import type { BlockDrop, ParagraphDrag } from './paragraphDrag'

/** Box width when free, mirroring the image sizes. */
const FREE_TEXT_DEFAULT_W = 280
const FREE_TEXT_WIDTHS = [
  ['S', 190],
  ['M', 280],
  ['L', 420],
] as const

interface TextBlockViewProps {
  block: TextBlock
  onSaveText?: (value: string) => void
  onPatch?: (patch: Partial<TextBlock>) => void
  onRemove?: () => void
  /** The document's shared drag: a free box moves with insertion line and auto-scroll. */
  drag?: ParagraphDrag
  partKey?: string
  unitKey?: string
  /** Commit a free drop: same section places freely, another section re-anchors. */
  onFreeDrop?: (drop: BlockDrop | null, pos: { x: number; y: number }) => void
}

const textStyle = {
  fontSize: 'var(--doc-body-size)',
  lineHeight: 'var(--doc-line-spacing)',
  textAlign: 'var(--doc-text-align)',
} as const

/**
 * A free paragraph: in the flow between the other blocks, or floating anywhere
 * on the page like a Word text box — over text, in the margins, on another
 * page. The unit wrapper stays in the flow either way, so ordering, section
 * moves and the print fallback keep working — only the rendering changes.
 */
export function TextBlockView({ block, onSaveText, onPatch, onRemove, drag, partKey, unitKey, onFreeDrop }: TextBlockViewProps) {
  if (block.positioning === 'free') {
    return (
      <FreeTextBox
        block={block}
        onSaveText={onSaveText}
        onPatch={onPatch}
        onRemove={onRemove}
        drag={drag}
        partKey={partKey}
        unitKey={unitKey}
        onFreeDrop={onFreeDrop}
      />
    )
  }
  return <FlowTextBox block={block} onSaveText={onSaveText} onPatch={onPatch} onRemove={onRemove} />
}

/**
 * Where a free box may go, in its unit's own coordinates. A free box is placed
 * against its unit (the nearest positioned ancestor), so the offsets it stores
 * are unit-relative and render exactly — every bound here has to speak the
 * same language. Unlike images, which stay on their page, a text box may go
 * anywhere in the section's document: any page, including the margins.
 */
interface SectionBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

function sectionBounds(unit: HTMLElement, copy: HTMLElement, boxW: number, boxH: number): SectionBounds {
  const copyRect = copy.getBoundingClientRect()
  const unitRect = unit.getBoundingClientRect()
  const scale = copyRect.width / Math.max(1, copy.clientWidth)
  const ux = (unitRect.left - copyRect.left) / scale
  const uy = (unitRect.top - copyRect.top) / scale
  // The page's own margins: a box may sit in them, just never off the paper.
  // They are window padding in layout px, like everything else here.
  const win = unit.closest('.page-window') as HTMLElement | null
  const winStyle = win ? getComputedStyle(win) : null
  const padL = winStyle ? parseFloat(winStyle.paddingLeft) || 0 : 0
  const padR = winStyle ? parseFloat(winStyle.paddingRight) || 0 : 0
  // The whole section document, not just the visible slice: hidden blocks keep
  // their space, so the copy is always the full height. One page of padding at
  // each end: like Word, a box may sit in the white above the first line and
  // below the last one — those bands belong to no other page, so the box still
  // renders exactly once.
  const docH = Math.max(1, copy.clientHeight)
  const EDGE_PAD = 80
  return {
    minX: Math.round(-padL - ux),
    maxX: Math.round(unit.clientWidth + padR - ux - boxW),
    minY: Math.round(-uy - EDGE_PAD),
    maxY: Math.round(docH + EDGE_PAD - boxH - uy),
  }
}

function clampToSection(
  x: number,
  y: number,
  bounds: SectionBounds,
): { x: number; y: number } {
  return {
    x: Math.round(Math.max(bounds.minX, Math.min(bounds.maxX, x))),
    y: Math.round(Math.max(bounds.minY, Math.min(bounds.maxY, y))),
  }
}

function FlowTextBox({ block, onSaveText, onPatch, onRemove }: TextBlockViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null)

  // Free starts where the flowed paragraph sits, pulled inside the page so a
  // box born on the last line of a section never begins life off-page.
  const enableFree = () => {
    if (!onPatch) return
    let x = 100
    let y = 200
    const el = wrapRef.current
    const unit = el?.closest('[data-unit]') as HTMLElement | null
    const copy = el?.closest('[data-doc-copy]') as HTMLElement | null
    if (el && unit && copy) {
      const unitRect = unit.getBoundingClientRect()
      const elRect = el.getBoundingClientRect()
      const scale = unitRect.width / Math.max(1, unit.clientWidth)
      const start = clampFreePos(
        (elRect.left - unitRect.left) / scale,
        (elRect.top - unitRect.top) / scale,
        {
          width: unit.clientWidth,
          slice: visibleCopySlice(el) ?? { top: 0, bottom: copy.clientHeight },
          height: 0,
        } as FreeBounds,
        block.width ?? FREE_TEXT_DEFAULT_W,
      )
      x = start.x
      y = start.y
    }
    onPatch({ positioning: 'free', x, y })
  }

  return (
    <div ref={wrapRef} className="relative">
      <EditableText
        text={block.text}
        placeholder="Cliquez ici pour rédiger…"
        showPlaceholder
        onSave={onSaveText}
        className="whitespace-pre-wrap"
        style={{ ...textStyle, textAlign: textStyle.textAlign as 'left' }}
      />
      {(onPatch || onRemove) && (
        <div className="absolute -right-7 top-1/2 flex -translate-y-1/2 flex-col gap-1 print:hidden">
          {onPatch && (
            <button
              type="button"
              onClick={enableFree}
              title="Flotter sur la page (déplacer partout)"
              aria-label="Flotter sur la page"
              className="flex h-7 w-7 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-neutral-500 opacity-70 transition-opacity hover:text-violet-600 sm:opacity-0 sm:group-hover/block:opacity-100 sm:group-focus-within/block:opacity-100"
            >
              <Layers size={13} />
            </button>
          )}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              title="Supprimer ce paragraphe"
              aria-label="Supprimer ce paragraphe"
              className="flex h-5 w-5 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-[10px] text-neutral-400 opacity-40 transition-opacity hover:text-red-500 sm:opacity-0 sm:group-hover/block:opacity-100 sm:group-focus-within/block:opacity-100"
            >
              ×
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function FreeTextBox({
  block,
  onSaveText,
  onPatch,
  onRemove,
  drag,
  partKey,
  unitKey,
  onFreeDrop,
}: TextBlockViewProps & { drag?: ParagraphDrag; partKey?: string; unitKey?: string; onFreeDrop?: (drop: BlockDrop | null, pos: { x: number; y: number }) => void }) {
  const widthVal = block.width ?? FREE_TEXT_DEFAULT_W
  const boxRef = useRef<HTMLDivElement>(null)
  // Live position while held. The stored one only changes on release.
  const [freePos, setFreePos] = useState<{ x: number; y: number } | null>(null)
  // Reflow can strand the stored offset past the end of the document (text
  // below the box deleted): the box would render on no page at all, invisible,
  // so it is pulled back for display. Display only — the stored position is
  // rewritten by the next drag, never by this.
  const rescuedY = useRescuedY(boxRef, () => {
      if (freePos) return null
      const box = boxRef.current
      if (!box) return null
      const unit = box.closest('[data-unit]') as HTMLElement | null
      const copy = box.closest('[data-doc-copy]') as HTMLElement | null
      if (!unit || !copy) return null
      const bounds = sectionBounds(unit, copy, widthVal, box.offsetHeight)
      const y = block.y ?? 200
      return y < bounds.minY ? bounds.minY : y > bounds.maxY ? Math.max(bounds.minY, bounds.maxY) : null
    })
  const grabOffset = useRef({ dx: 0, dy: 0 })
  const downAt = useRef<{ x: number; y: number } | null>(null)
  // The settings bar hides when unneeded — hover, focus or the … button shows
  // it; the outline stays, so the box remains grabbable either way.
  const [barOpen, setBarOpen] = useState(false)
  const dispX = freePos?.x ?? block.x ?? 100
  const dispY = freePos?.y ?? rescuedY ?? block.y ?? 200

  const unitOf = () => {
    const box = boxRef.current
    const unit = box?.closest('[data-unit]') as HTMLElement | null
    const copy = box?.closest('[data-doc-copy]') as HTMLElement | null
    return box && unit && copy ? { box, unit, copy } : null
  }

  // Pointer Events (not mouse events) so the drag also works with touch. The
  // box is grabbed by its border or its grip — inside stays editable, exactly
  // like a Word text box. The shared engine drives it, so the insertion line,
  // the destination chip and the auto-scroll come along.
  const startFreeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag || !onFreeDrop || !partKey || !unitKey) return
    event.preventDefault()
    event.stopPropagation()
    const found = unitOf()
    if (!found) return
    const { box, unit } = found

    const unitRect = unit.getBoundingClientRect()
    const boxRect = box.getBoundingClientRect()
    const scale = unitRect.width / Math.max(1, unit.clientWidth)
    grabOffset.current = {
      dx: (event.clientX - boxRect.left) / scale,
      dy: (event.clientY - boxRect.top) / scale,
    }
    downAt.current = { x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture?.(event.pointerId)
    drag.start(partKey, unitKey, event.clientX, event.clientY)
  }

  const moveFreeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag || drag.drag?.blockKey !== unitKey) return
    const found = unitOf()
    if (!found) return
    const { unit, copy } = found
    drag.move(event.clientX, event.clientY)
    const r = unit.getBoundingClientRect()
    const s = r.width / Math.max(1, unit.clientWidth)
    const bounds = sectionBounds(unit, copy, widthVal, boxRef.current?.offsetHeight ?? 0)
    setFreePos(
      clampToSection(
        (event.clientX - r.left) / s - grabOffset.current.dx,
        (event.clientY - r.top) / s - grabOffset.current.dy,
        bounds,
      ),
    )
  }

  const endFreeDrag = (event: ReactPointerEvent<HTMLElement>) => {
    if (!drag || drag.drag?.blockKey !== unitKey || !onFreeDrop) return
    const down = downAt.current
    downAt.current = null
    const drop = drag.drop
    drag.end()
    setFreePos(null)
    // A press without a move is not a drop: committing it would write an undo
    // entry that changed nothing.
    if (!down || Math.hypot(event.clientX - down.x, event.clientY - down.y) < 4) return
    const found = unitOf()
    if (!found) {
      onFreeDrop(drop, { x: dispX, y: dispY })
      return
    }
    const { unit, copy } = found
    const r = unit.getBoundingClientRect()
    const s = r.width / Math.max(1, unit.clientWidth)
    const bounds = sectionBounds(unit, copy, widthVal, boxRef.current?.offsetHeight ?? 0)
    const raw = {
      x: (event.clientX - r.left) / s - grabOffset.current.dx,
      y: (event.clientY - r.top) / s - grabOffset.current.dy,
    }
    const pos = clampToSection(raw.x, raw.y, bounds)
    // Keep the box whole: a box left straddling a page join would print split
    // across two sheets, so it snaps fully onto the page under the pointer.
    // The page's own padding counts, but only at the document's extremes: in
    // the middle the padding belongs to the neighbor band, and the box would
    // render twice.
    if (partKey) {
      const under = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest('.page-window') as HTMLElement | null
      const copyThere = under?.querySelector('[data-doc-copy]') as HTMLElement | null
      if (under && copyThere && under.querySelector(`[data-part-content="${CSS.escape(partKey)}"]`)) {
        const m = /translateY\((-?\d+(?:\.\d+)?)px\)/.exec((copyThere as HTMLElement).style.transform)
        if (m) {
          // The style stores the negated offset; the sheet opens at +S.
          const S = -parseFloat(m[1])
          const ws = getComputedStyle(under)
          const contentH = Math.max(
            1,
            under.clientHeight - (parseFloat(ws.paddingTop) || 0) - (parseFloat(ws.paddingBottom) || 0),
          )
          let minS = S
          let maxS = S
          for (const w of Array.from(document.querySelectorAll('.page-window'))) {
            if (!w.querySelector(`[data-part-content="${CSS.escape(partKey)}"]`)) continue
            const cp = w.querySelector('[data-doc-copy]') as HTMLElement | null
            const m2 = /translateY\((-?\d+(?:\.\d+)?)px\)/.exec(cp?.style.transform ?? '')
            if (m2) {
              const s2 = -parseFloat(m2[1])
              minS = Math.min(minS, s2)
              maxS = Math.max(maxS, s2)
            }
          }
          const topPad = S === minS ? 80 : 0
          const botPad = S === maxS ? 80 : 0
          const h = boxRef.current?.offsetHeight ?? 0
          const cr = copy.getBoundingClientRect()
          const uy = (r.top - cr.top) / s
          const top = S - topPad - uy
          const bottom = Math.max(top, S + contentH + botPad - h - uy)
          pos.y = Math.round(Math.max(top, Math.min(bottom, pos.y)))
        }
      }
    }
    onFreeDrop(drop, pos)
  }

  return (
    <div
      ref={boxRef}
      data-pagination-ignore
      className="group/box absolute z-20 print:static"
      // A hidden unit hides its children — except this box, which has to show
      // on whatever page holds its position, not on its anchor's page.
      style={{ left: dispX, top: dispY, width: widthVal, visibility: 'visible' }}
    >
      {(onPatch || onRemove) && (
        <div className="absolute -top-3 -right-3 z-30 flex items-center gap-1 print:hidden">
          {drag && onFreeDrop && (
            <button
              type="button"
              onPointerDown={startFreeDrag}
              onPointerMove={moveFreeDrag}
              onPointerUp={endFreeDrag}
              title="Glisser pour déplacer partout"
              aria-label="Glisser pour déplacer partout"
              className="flex h-8 w-8 touch-none cursor-move items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-neutral-500 shadow-sm select-none transition-colors hover:text-neutral-900 active:cursor-grabbing"
            >
              <GripVertical size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setBarOpen((v) => !v) }}
            title="Options du bloc"
            aria-label="Options du bloc"
            className={`flex h-7 w-7 items-center justify-center rounded-full border shadow-sm transition-colors ${
              barOpen
                ? 'border-violet-300 bg-violet-50 text-violet-600 opacity-100'
                : 'border-neutral-300 bg-white/85 text-neutral-500 opacity-70 hover:opacity-100'
            }`}
          >
            <MoreHorizontal size={14} />
          </button>
        </div>
      )}
      {(onPatch || onRemove) && (
        <div
          className={`mb-1 w-max max-w-full flex-wrap items-center gap-0.5 rounded-md border border-neutral-300 bg-white/95 px-1 py-0.5 shadow-sm print:hidden ${
            barOpen ? 'flex' : 'hidden group-hover/box:flex group-focus-within/box:flex'
          }`}
        >
          {onPatch && (
            <button
              type="button"
              onClick={() => onPatch({ positioning: 'flow' })}
              title="Revenir dans le texte"
              aria-label="Revenir dans le texte"
              className="flex h-7 w-7 items-center justify-center rounded bg-violet-100 text-[12px] text-violet-700 transition-colors hover:bg-violet-200"
            >
              <Layers size={13} />
            </button>
          )}
          {onPatch && <span className="mx-1 h-4 w-px bg-neutral-300" />}
          {onPatch &&
            FREE_TEXT_WIDTHS.map(([label, w]) => (
              <button
                key={label}
                type="button"
                title={label === 'S' ? 'Étroite' : label === 'M' ? 'Moyenne' : 'Large'}
                onClick={() => onPatch({ width: w })}
                className={`h-7 rounded px-1.5 font-mono text-[11px] font-medium transition-colors ${
                  widthVal === w
                    ? 'bg-violet-100 text-violet-700'
                    : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900'
                }`}
              >
                {label}
              </button>
            ))}
          {onRemove && <span className="mx-1 h-4 w-px bg-neutral-300" />}
          {onRemove && (
            <button
              type="button"
              onClick={onRemove}
              title="Supprimer ce paragraphe"
              aria-label="Supprimer ce paragraphe"
              className="flex h-7 w-7 items-center justify-center rounded text-[13px] text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
            >
              ×
            </button>
          )}
        </div>
      )}
      <div className="relative rounded-sm ring-1 ring-violet-300/70 hover:ring-violet-400 focus-within:ring-violet-500 print:shadow-none print:ring-transparent">
        {/* The border is the handle, like Word: grabbing anywhere on it moves
            the box, clicking inside edits. Touch needs its own gesture, so the
            strips opt out of scrolling. */}
        {drag && onFreeDrop && (
          <>
            <div
              role="presentation"
              title="Glisser pour déplacer"
              onPointerDown={startFreeDrag}
              onPointerMove={moveFreeDrag}
              onPointerUp={endFreeDrag}
              className="absolute inset-x-0 top-0 z-10 h-3 cursor-move touch-none print:hidden"
            />
            <div
              role="presentation"
              title="Glisser pour déplacer"
              onPointerDown={startFreeDrag}
              onPointerMove={moveFreeDrag}
              onPointerUp={endFreeDrag}
              className="absolute inset-x-0 bottom-0 z-10 h-3 cursor-move touch-none print:hidden"
            />
            <div
              role="presentation"
              title="Glisser pour déplacer"
              onPointerDown={startFreeDrag}
              onPointerMove={moveFreeDrag}
              onPointerUp={endFreeDrag}
              className="absolute inset-y-0 left-0 z-10 w-3 cursor-move touch-none print:hidden"
            />
            <div
              role="presentation"
              title="Glisser pour déplacer"
              onPointerDown={startFreeDrag}
              onPointerMove={moveFreeDrag}
              onPointerUp={endFreeDrag}
              className="absolute inset-y-0 right-0 z-10 w-3 cursor-move touch-none print:hidden"
            />
          </>
        )}
        <EditableText
          text={block.text}
          placeholder="Cliquez ici pour rédiger…"
          showPlaceholder
          onSave={onSaveText}
          className="whitespace-pre-wrap"
          style={{ ...textStyle, textAlign: textStyle.textAlign as 'left' }}
        />
      </div>
    </div>
  )
}
