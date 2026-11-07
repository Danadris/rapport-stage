import { useEffect, useRef, useState } from 'react'
import { PreviewA4 } from '../PreviewA4'
import type { Rapport } from '../../types'
import type { PreviewActions } from '../PreviewA4'
import { cx } from '../../lib/cx'

export function PreviewPane({
  rapport,
  actions,
  zoom,
  compact,
}: {
  rapport: Rapport
  actions: PreviewActions
  zoom: number
  /** Beside the form instead of full width: padding tightens, the page is the point. */
  compact?: boolean
}) {
  const [wrapWidth, setWrapWidth] = useState<number | null>(null)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  // The page is a fixed 794px sheet, so the preview is zoomed to fit whatever
  // column it is given — full width in Aperçu, a narrow column in the split
  // edition view. `zoom` (not `transform: scale`) so the layout box shrinks with
  // the picture and nothing overflows its container invisibly.
  useEffect(() => {
    const el = previewWrapRef.current
    if (!el) return
    const measure = () => setWrapWidth(el.clientWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const fitZoom = Math.min(1, ((wrapWidth ?? 0) - 16) / 794)
  const previewZoom = Math.max(0.2, fitZoom * (zoom / 100))

  return (
    <div className="flex-1 bg-line-strong/60 print:bg-transparent min-w-0 relative">
      <div
        ref={previewWrapRef}
        className={cx(
          'print:!p-0 print:!m-0 overflow-x-auto',
          compact ? 'px-2 py-3 md:px-3 md:py-4' : 'px-2 py-6 md:px-4 md:py-10',
        )}
      >
        <div
          style={{ '--preview-zoom': previewZoom } as React.CSSProperties}
          className="print:!block print:![zoom:1] [zoom:var(--preview-zoom)]"
        >
          <PreviewA4 rapport={rapport} actions={actions} />
        </div>
      </div>
    </div>
  )
}
