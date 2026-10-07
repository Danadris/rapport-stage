import { useEffect, useRef, useState } from 'react'
import { PreviewA4 } from '../PreviewA4'
import type { Rapport, SectionImage, FicheTechnique } from '../../types'
import type { EditHandler } from '../PreviewA4'

export function PreviewPane({
  rapport,
  onEdit,
  onImagesChange,
  onFicheChange,
  onTitleEdit,
  zoom,
}: {
  rapport: Rapport
  onEdit?: EditHandler
  onImagesChange?: (sectionId: string, imgs: SectionImage[]) => void
  onFicheChange?: (ficheId: string, patch: Partial<FicheTechnique>) => void
  onTitleEdit?: (field: string, value: string) => void
  zoom: number
}) {
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768)
  const previewWrapRef = useRef<HTMLDivElement>(null)
  const [previewWrapWidth, setPreviewWrapWidth] = useState<number | null>(null)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Fit the A4 preview to the actual preview column width on mobile — the pages
  // are fixed at 794px, so the zoom must track the container (not innerWidth,
  // which includes the sidebar) and must never be floored, or the A4 page
  // overflows the screen instead of fitting it.
  useEffect(() => {
    if (!isMobile) return
    const el = previewWrapRef.current
    if (!el) return
    const measure = () => setPreviewWrapWidth(el.offsetWidth)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [isMobile])

  return (
    <div className="flex-1 bg-line-strong/60 print:bg-transparent min-w-0 relative">
      <div ref={previewWrapRef} className={`px-2 py-6 md:px-4 md:py-10 print:p-0${isMobile ? ' overflow-x-auto' : ''}`}>
        <div
          style={
            isMobile
              ? ({ '--preview-zoom': Math.min(1, ((previewWrapWidth ?? window.innerWidth) - 16) / 794) * (zoom / 100) } as React.CSSProperties)
              : ({ '--preview-scale': zoom / 100 } as React.CSSProperties)
          }
          className={
            isMobile
              ? 'print:!block print:![zoom:1] [zoom:var(--preview-zoom)]'
              : 'print:!block print:!transform-none [transform:scale(var(--preview-scale))] origin-top'
          }
        >
          <PreviewA4
            rapport={rapport}
            onEdit={onEdit}
            onImagesChange={onImagesChange}
            onFicheChange={onFicheChange}
            onTitleEdit={onTitleEdit}
          />
        </div>
      </div>
    </div>
  )
}
