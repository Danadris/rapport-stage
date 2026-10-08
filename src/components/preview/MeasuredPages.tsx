import { Fragment, useLayoutEffect, useRef, useState } from 'react'

import logo from '../../assets/ifmbp-logo-official.png'

/**
 * MeasuredPages — the one place that knows how a growing report body is cut
 * into N fixed A4 page windows. Used by Page and by any other preview block
 * that should paginate exactly like the printed document.
 *
 * The same children are rendered once per window; each window shifts its copy
 * up by the accumulated height of the previous windows (clipped by overflow).
 * So a page can never exceed one A4 sheet, and on-screen pagination matches
 * the print pagination.
 */
export function MeasuredPages({
  children,
  className,
  style,
  startPageNum,
  headerLogo,
  ...rest
}: {
  children: React.ReactNode
  className?: string
  style?: React.CSSProperties
  startPageNum?: number
  headerLogo?: string | null
} & React.HTMLAttributes<HTMLDivElement>) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [pageCount, setPageCount] = useState(1)
  const [centerPad, setCenterPad] = useState(0)

  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => {
      const h = el.offsetHeight
      const pages = Math.max(1, Math.ceil(h / PAGE_CONTENT_HEIGHT))
      setPageCount(pages)
      setCenterPad(0)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div {...rest} data-pages={pageCount} className={`w-full space-y-10 print:space-y-0 ${className ?? ''}`} style={style}>
      {Array.from({ length: pageCount }, (_, i) => (
        <div
          key={i}
          className="a4-page page-window"
          style={{ fontFamily: 'var(--doc-body-font)', paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
        >
          <div data-doc-copy className="relative" style={{ transform: `translateY(${-i * PAGE_CONTENT_HEIGHT}px)` }}>
            <div style={{ paddingTop: centerPad }}>
              <div ref={i === 0 ? contentRef : undefined} className="w-full">
                {children}
              </div>
            </div>
          </div>
          {startPageNum !== undefined && (
            <Fragment>
              <div
                className="absolute left-0 right-0 flex items-center justify-between"
                style={{ top: '40px', paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
              >
                <img src={logo} alt="IFMBP" className="h-12 max-w-[150px] object-contain opacity-80" />
                {headerLogo ? (
                  <img src={headerLogo} alt="Entreprise" className="h-12 max-w-[150px] object-contain opacity-80" />
                ) : <div />}
              </div>
              <div
                className="absolute left-0 right-0 text-center text-[12px] text-neutral-500"
                style={{ top: `${PAGE_HEIGHT_PX - 40}px` }}
              >
                - {startPageNum + i} -
              </div>
            </Fragment>
          )}
        </div>
      ))}
    </div>
  )
}

const PAGE_HEIGHT_PX = 1123
const PAGE_PAD_Y = 80
const PAGE_CONTENT_HEIGHT = PAGE_HEIGHT_PX - PAGE_PAD_Y * 2
