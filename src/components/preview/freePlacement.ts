/**
 * Free placement on the page — the shared math behind floating images and
 * floating text boxes. Positions are stored in layout px against the nearest
 * positioned ancestor, and clamped to the visible slice of the window the
 * element sits in, so nothing can be dropped where no page shows it.
 */

import { useLayoutEffect, useState, type RefObject } from 'react'

/** What a free element is allowed to sit on: one page's worth of the copy. */
export interface FreeBounds {
  /** Column width in layout px — a free element never leaves the text column. */
  width: number
  /** The band of the copy that one page window actually shows. */
  slice: { top: number; bottom: number }
  /** Height of the whole element, so nothing hangs off the page. */
  height: number
}

/**
 * The band of the document copy that one page window shows, in the same units a
 * free position is stored in. Every window holds the whole copy, translated by
 * the offset its sheet opens at, so a free element is only ever visible inside
 * its own window's slice: dragged past the bottom of the page it is not pushed
 * back, it is clipped — and on the next open it has moved to a later page, or
 * to no page at all.
 */
export function visibleCopySlice(el: HTMLElement): { top: number; bottom: number } | null {
  const copy = el.closest('[data-doc-copy]') as HTMLElement | null
  if (!copy) return null
  const win = copy.closest('.page-window') as HTMLElement | null
  // Cover / fiche pages are a single unpaginated sheet: the copy is the page.
  if (!win) return { top: 0, bottom: copy.clientHeight }

  const copyRect = copy.getBoundingClientRect()
  // Preview zoom — desktop transform, mobile zoom — scales the rects but not the
  // layout px the position is stored in; the ratio converts between the two.
  const scale = copyRect.width / Math.max(1, copy.clientWidth)
  const winRect = win.getBoundingClientRect()
  const padTop = (parseFloat(getComputedStyle(win).paddingTop) || 0) * scale
  const padBottom = (parseFloat(getComputedStyle(win).paddingBottom) || 0) * scale
  return {
    top: (winRect.top + padTop - copyRect.top) / scale,
    bottom: (winRect.bottom - padBottom - copyRect.top) / scale,
  }
}

export function measureFreeBounds(el: HTMLElement, copy: HTMLElement): FreeBounds {
  return {
    width: copy.clientWidth,
    slice: visibleCopySlice(el) ?? { top: 0, bottom: copy.clientHeight },
    height: el.offsetHeight,
  }
}

/**
 * Keeps a free element on the page it belongs to: inside the column horizontally,
 * inside the visible slice vertically, and never past the bottom by more than
 * the element's own height.
 */
export function clampFreePos(x: number, y: number, bounds: FreeBounds, sizeW: number) {
  return {
    x: Math.round(Math.max(0, Math.min(bounds.width - sizeW, x))),
    y: Math.round(Math.max(bounds.slice.top, Math.min(bounds.slice.bottom - bounds.height, y))),
  }
}

/**
 * A stored free position can strand outside the document — reflow, deleted
 * text, an image that decodes late — and an element with no page to sit on
 * renders on none at all: invisible, so it can be neither hovered nor dragged
 * back. This pulls it into view for display only: the stored position is
 * rewritten by the next drag, never by this, so nothing touches the document
 * or the undo history on its own.
 *
 * `computeTarget` reads the document and returns the y to show — the clamped
 * one when the stored position is out, `null` when the element is fine where
 * it is (or is not free / is being dragged). It is read after every render,
 * so the answer is never stale, and on every resize, because the element's own
 * size counts: a caption that opens, a width field, an image that decodes
 * after first paint.
 */
export function useRescuedY(
  elRef: RefObject<HTMLElement | null>,
  computeTarget: () => number | null,
): number | null {
  const [rescuedY, setRescuedY] = useState<number | null>(null)
  useLayoutEffect(() => {
    const el = elRef.current
    if (!el) return
    const measure = () => {
      const target = computeTarget()
      setRescuedY((prev) => (prev === target ? prev : target))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  })
  return rescuedY
}
