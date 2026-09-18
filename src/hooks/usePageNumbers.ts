import { useLayoutEffect, useState, type RefObject } from 'react'

export const PAGE_HEIGHT = 1123

// The preview is a vertical stack of "page" blocks (CoverPage, remerciements,
// sommaire, then each section group). Blocks can grow taller than one page —
// content is never clipped. A block starting on page N spans ceil(its height /
// PAGE_HEIGHT) pages, so the next block starts at N + that span. Walking the
// blocks in document order gives every section its exact starting page number.
export function usePageNumbers(ref: RefObject<HTMLDivElement | null>) {
  const [numbers, setNumbers] = useState<Record<string, number>>({})

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const compute = () => {
      const nodes = el.querySelectorAll<HTMLElement>('[data-part]')
      const next: Record<string, number> = {}
      // The preview is scaled via CSS transform/zoom, so getBoundingClientRect
      // returns scaled pixels; normalize with the same "zoom" on both axes.
      const rect = el.getBoundingClientRect()
      const scale = el.offsetWidth > 0 && rect.width > 0 ? rect.width / el.offsetWidth : 1
      let page = 1 // cover is page 1
      for (const n of nodes) {
        const key = n.dataset.part
        if (!key) continue
        if (key === 'couverture') {
          page = 2
          continue
        }
        const h = n.getBoundingClientRect().height / scale
        next[key] = page
        page += Math.max(1, Math.ceil((h - 1) / PAGE_HEIGHT))
      }
      setNumbers((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])

  return numbers
}