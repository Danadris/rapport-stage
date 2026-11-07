import { useEffect, useRef, useState } from 'react'

/**
 * Where a dragged paragraph would land, and the blocks already at that spot.
 *
 * `keys` is the target list as drawn — the reason a paragraph dropped into a
 * section that mixes plan paragraphs with free ones still lands exactly where
 * the insertion line was, rather than wherever the fields array happens to put it.
 */
export interface BlockDrop {
  sectionKey: string
  index: number
  y: number
  keys: string[]
}

interface DragState {
  sectionKey: string
  blockKey: string
}

/**
 * Which section's list the pointer is over, and where in it. Found by geometry
 * rather than by the topmost element, because whatever happens to be on top —
 * the hover controls, the insertion line, the dragged block itself — must not
 * change which section a drop lands in.
 */
function slotAtPoint(
  clientX: number,
  clientY: number,
  draggedKey: string,
  draggedSection: string,
): BlockDrop | null {
  const lists = Array.from(document.querySelectorAll<HTMLElement>('[data-section-key]'))
  if (lists.length === 0) return null

  let list: HTMLElement | null = null
  let nearestGap = Infinity
  for (const el of lists) {
    const rect = el.getBoundingClientRect()
    if (clientY >= rect.top && clientY <= rect.bottom && clientX >= rect.left && clientX <= rect.right) {
      list = el
      break
    }
    // Dropping in the gap between two sections still has to land somewhere: the
    // closest list wins.
    const gap = clientY < rect.top ? rect.top - clientY : clientY - rect.bottom
    if (gap < nearestGap) {
      nearestGap = gap
      list = el
    }
  }
  if (!list) return null

  const sectionKey = list.dataset.sectionKey ?? draggedSection
  const items = Array.from(list.querySelectorAll<HTMLElement>('[data-unit]'))
  const listTop = list.getBoundingClientRect().top
  const keys: string[] = []
  let slot: { index: number; y: number } | null = null
  for (let i = 0; i < items.length; i++) {
    const isDragged = sectionKey === draggedSection && items[i].dataset.unit === draggedKey
    if (!isDragged) keys.push(items[i].dataset.unit ?? '')
    const rect = items[i].getBoundingClientRect()
    if (!slot && !isDragged && clientY < rect.top + rect.height / 2) {
      slot = { index: keys.length - 1, y: rect.top - listTop - 3 }
    }
  }
  if (!slot) {
    const last = items[items.length - 1]
    slot = { index: items.length, y: last ? last.getBoundingClientRect().bottom - listTop + 3 : 0 }
  }
  return { sectionKey, ...slot, keys }
}

/** How close to a viewport edge the pointer must be for auto-scroll to start. */
const EDGE_PX = 96
/** Fastest scroll, in px per frame, at the very edge. */
const MAX_SPEED = 20

export interface ParagraphDrag {
  /** The block being held, and which section owns it. */
  drag: DragState | null
  /** Where it would land right now — null until the pointer moves. */
  drop: BlockDrop | null
  start: (sectionKey: string, blockKey: string, clientX: number, clientY: number) => void
  move: (clientX: number, clientY: number) => void
  /** Clears the drag. Commit the drop first if it should be applied. */
  end: () => void
}

/**
 * One paragraph drag for the whole document.
 *
 * It lives here, at document level, because a drag crosses sections: the block
 * starts in one and lands in another, so neither section can own the state. It
 * also owns the auto-scroll — while a pointer is down the gesture belongs to the
 * drag, so without this a section below the fold could never be reached,
 * especially on a touch screen.
 */
export function useParagraphDrag(): ParagraphDrag {
  const [drag, setDrag] = useState<DragState | null>(null)
  const [drop, setDrop] = useState<BlockDrop | null>(null)
  const [speed, setSpeed] = useState(0)
  const pointer = useRef({ x: 0, y: 0 })

  useEffect(() => {
    if (!drag || speed === 0) return
    let frame = 0
    const tick = () => {
      // Scroll every ancestor that can, starting from the list under the pointer:
      // in the split view that is the preview column, otherwise the page itself.
      const under = document.elementFromPoint(pointer.current.x, pointer.current.y)
      let node = (under?.closest('[data-section-key]') as HTMLElement | null)?.parentElement ?? null
      while (node) {
        const overflowY = getComputedStyle(node).overflowY
        if (overflowY === 'auto' || overflowY === 'scroll') node.scrollTop += speed
        node = node.parentElement
      }
      window.scrollBy(0, speed)
      // The insertion line follows, since the blocks under the pointer moved.
      setDrop(slotAtPoint(pointer.current.x, pointer.current.y, drag.blockKey, drag.sectionKey))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [drag, speed])

  return {
    drag,
    drop,
    start: (sectionKey, blockKey, clientX, clientY) => {
      pointer.current = { x: clientX, y: clientY }
      setDrag({ sectionKey, blockKey })
      setSpeed(0)
      // The line only shows once the pointer moves, so a stray press on the grip
      // does not draw one.
      const slot = slotAtPoint(clientX, clientY, blockKey, sectionKey)
      setDrop(slot && slot.sectionKey === sectionKey ? slot : null)
    },
    move: (clientX, clientY) => {
      pointer.current = { x: clientX, y: clientY }
      if (!drag) return
      setDrop(slotAtPoint(clientX, clientY, drag.blockKey, drag.sectionKey))
      // Near an edge, scroll — faster the closer to it.
      const height = window.innerHeight
      const next =
        clientY < EDGE_PX
          ? -((EDGE_PX - clientY) / EDGE_PX) * MAX_SPEED
          : clientY > height - EDGE_PX
            ? ((clientY - (height - EDGE_PX)) / EDGE_PX) * MAX_SPEED
            : 0
      setSpeed(Math.abs(next) < 0.5 ? 0 : Math.round(next))
    },
    end: () => {
      setDrag(null)
      setDrop(null)
      setSpeed(0)
    },
  }
}
