import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CSSProperties, ReactNode } from 'react'

export type Placement =
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'bottom-center'
  | 'above-right'
  | 'above-left'

interface FloatingState {
  style: CSSProperties
  ready: boolean
}

const GAP = 6

/**
 * Returns a `portal` render function and a ref to attach to the anchor element.
 *
 * The panel is rendered into document.body via a portal so no overflow:hidden
 * ancestor can clip it. Position is computed from the anchor's bounding rect
 * and clamped to the viewport bounds so it never goes off-screen.
 */
export function useFloatingPortal<T extends HTMLElement = HTMLElement>() {
  const anchorRef = useRef<T>(null)
  const [floating, setFloating] = useState<FloatingState>({ style: {}, ready: false })
  const panelRef = useRef<HTMLDivElement>(null)
  const placementRef = useRef<Placement>('top-right')
  const openRef = useRef(false)

  const reposition = useCallback(() => {
    if (!openRef.current) return
    const anchor = anchorRef.current
    const panel = panelRef.current
    if (!anchor) return

    const ar = anchor.getBoundingClientRect()
    const pw = panel?.offsetWidth ?? 0
    const ph = panel?.offsetHeight ?? 0
    const vw = window.innerWidth
    const vh = window.innerHeight

    const placement = placementRef.current
    let top = 0
    let left = 0

    if (placement === 'top-right') {
      top = ar.top + GAP
      left = ar.right - pw - GAP
    } else if (placement === 'top-left') {
      top = ar.top + GAP
      left = ar.left + GAP
    } else if (placement === 'above-right') {
      top = ar.top - ph - GAP
      left = ar.right - pw
    } else if (placement === 'above-left') {
      top = ar.top - ph - GAP
      left = ar.left
    } else if (placement === 'bottom-right') {
      top = ar.bottom + GAP
      left = ar.right - pw
    } else if (placement === 'bottom-left') {
      top = ar.bottom + GAP
      left = ar.left
    } else {
      // bottom-center
      top = ar.bottom + GAP
      left = ar.left + ar.width / 2 - pw / 2
    }

    // Clamp to viewport so the panel never goes off-screen
    top = Math.max(GAP, Math.min(top, vh - ph - GAP))
    left = Math.max(GAP, Math.min(left, vw - pw - GAP))

    setFloating({ style: { position: 'fixed', top, left, zIndex: 9999 }, ready: true })
  }, [])

  useLayoutEffect(() => {
    if (!openRef.current) return
    reposition()
  })

  useEffect(() => {
    if (!openRef.current) return
    window.addEventListener('scroll', reposition, true)
    window.addEventListener('resize', reposition)
    return () => {
      window.removeEventListener('scroll', reposition, true)
      window.removeEventListener('resize', reposition)
    }
  }, [reposition])

  const portal = useCallback(
    (open: boolean, children: ReactNode, placement: Placement = 'top-right') => {
      placementRef.current = placement
      openRef.current = open
      if (!open || typeof document === 'undefined') return null
      return createPortal(
        <div
          ref={panelRef}
          style={floating.style}
          className={`transition-none ${floating.ready ? '' : 'invisible'}`}
        >
          {children}
        </div>,
        document.body,
      )
    },
    [floating],
  )

  return { anchorRef, portal, reposition }
}
