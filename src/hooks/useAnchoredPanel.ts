import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type RefObject } from 'react'

/** Breathing room between the panel and every edge of its clipping page. */
const GAP = 8

interface AnchoredPanelOptions {
  /** The panel is only measured while open — it is not even rendered otherwise. */
  open: boolean
  /** The element the panel hangs off (for us, the figure). */
  anchorRef: RefObject<HTMLElement | null>
  /** The panel itself. */
  panelRef: RefObject<HTMLElement | null>
}

interface Box {
  left: number
  top: number
  width: number
  height: number
}

const sameBox = (a: Box, b: Box | null) =>
  b !== null &&
  Math.abs(a.left - b.left) < 0.5 &&
  Math.abs(a.top - b.top) < 0.5 &&
  Math.abs(a.width - b.width) < 0.5 &&
  Math.abs(a.height - b.height) < 0.5

/**
 * Placement for a floating panel anchored to an element that lives inside the
 * A4 page — a box with `overflow: hidden`.
 *
 * The image toolbar used to be pinned with `top: 8; right: 8` inside the
 * figure, which is fine only while the figure sits in the middle of the page.
 * The toolbar is a single row wider than a small figure, so any figure near an
 * edge — `float: right`, or free-positioned near an edge of the canvas — pushed
 * the row past the page, and `overflow: hidden` cut it off.
 *
 * Portals to document.body were tried and reverted (see a4f56d1): a fixed panel
 * is laid out against the preview's `scale`/`zoom` wrapper instead of the
 * viewport, and MeasuredPages renders the same children once per page window,
 * so a portalled copy is duplicated at misplaced coordinates. Measuring
 * instead keeps the panel in the page DOM, where each window clips only its own
 * copy, and the clamp keeps the whole row inside the visible page.
 *
 * The returned style is expressed in the anchor's layout pixels (what `top` and
 * `left` need). Both rects are read in the same screen space, so the preview
 * zoom cancels out through their ratio rather than having to know it.
 */
export function useAnchoredPanel({ open, anchorRef, panelRef }: AnchoredPanelOptions): CSSProperties {
  // Until the first measurement the panel keeps its old top-right pinning; the
  // explicit width is what lets it be measured at its natural row width.
  const [style, setStyle] = useState<CSSProperties>({ top: GAP, right: GAP, width: 'max-content' })
  const lastStyleKeyRef = useRef('')
  const lastBoxRef = useRef<Box | null>(null)
  const lastPanelSizeRef = useRef({ w: -1, h: -1 })

  const reposition = useCallback(() => {
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor || !panel) return
    // The clipping box: every page (cover, paginated body, fiche) is .a4-page.
    const page = anchor.closest('.a4-page') as HTMLElement | null
    if (!page) return

    const anchorRect = anchor.getBoundingClientRect()
    const pageRect = page.getBoundingClientRect()
    // Preview zoom — desktop `transform: scale`, mobile `zoom` — scales the
    // page: the ratio converts screen px back into the page's layout px.
    const scale = anchorRect.width / Math.max(1, anchor.offsetWidth)
    // Anchor position inside the page, in layout px.
    const ax = (anchorRect.left - pageRect.left) / scale
    const ay = (anchorRect.top - pageRect.top) / scale

    const pageW = page.offsetWidth
    const pageH = page.offsetHeight
    const panelW = panel.offsetWidth
    const panelH = panel.offsetHeight
    const anchorBox: Box = { left: anchorRect.left, top: anchorRect.top, width: anchorRect.width, height: anchorRect.height }

    // Nothing moved since the last pass, so the answer cannot change.
    if (sameBox(anchorBox, lastBoxRef.current) && panelW === lastPanelSizeRef.current.w && panelH === lastPanelSizeRef.current.h) return
    lastBoxRef.current = anchorBox
    lastPanelSizeRef.current = { w: panelW, h: panelH }

    // Default anchor: the panel's right edge flush with the anchor's, one GAP
    // from its top — exactly where it used to sit whenever there is room.
    let left = anchor.offsetWidth - GAP - panelW
    left = Math.max(GAP - ax, Math.min(pageW - GAP - panelW - ax, left))

    let top = GAP
    // The anchor's top edge is above the visible page: hang the panel below it.
    if (top < GAP - ay) top = anchor.offsetHeight + GAP
    top = Math.max(GAP - ay, Math.min(pageH - GAP - panelH - ay, top))

    // Wrap onto a second row instead of reaching past the page.
    const maxWidth = Math.max(160, pageW - GAP * 2)

    const key = `${left}|${top}|${maxWidth}`
    if (key === lastStyleKeyRef.current) return
    lastStyleKeyRef.current = key
    setStyle({ left, top, maxWidth, width: 'max-content' })
  }, [anchorRef, panelRef])

  // Runs before the browser paints the freshly opened panel, so the row is
  // never seen at the wrong place for a frame.
  useLayoutEffect(() => {
    if (open) reposition()
  }, [open, reposition])

  useEffect(() => {
    if (!open) return
    let frame = 0
    const schedule = () => {
      if (frame) return
      frame = requestAnimationFrame(() => {
        frame = 0
        reposition()
      })
    }
    // Scrolling slides the anchor across the page window, a free-position drag
    // moves it without any resize, and fonts/zoom re-lay the panel out.
    window.addEventListener('scroll', schedule, { capture: true, passive: true })
    window.addEventListener('pointermove', schedule, { capture: true, passive: true })
    window.addEventListener('resize', schedule)
    // A drag that snaps the anchor (a figure pulled back onto the page) moves
    // it in the same task, with no pointermove in between: the panel has to be
    // re-measured after that commit, or it hangs where the anchor used to be.
    window.addEventListener('pointerdown', schedule, { capture: true, passive: true })
    window.addEventListener('pointerup', schedule, { capture: true, passive: true })
    const page = anchorRef.current?.closest('.a4-page') as HTMLElement | null
    const ro = new ResizeObserver(schedule)
    for (const el of [anchorRef.current, panelRef.current, page]) if (el) ro.observe(el)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule, { capture: true })
      window.removeEventListener('pointermove', schedule, { capture: true })
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pointerdown', schedule, { capture: true })
      window.removeEventListener('pointerup', schedule, { capture: true })
      ro.disconnect()
    }
  }, [open, reposition, anchorRef, panelRef])

  return style
}
