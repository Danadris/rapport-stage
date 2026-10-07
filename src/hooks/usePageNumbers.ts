import { useLayoutEffect, useState, type RefObject } from 'react'

export const PAGE_HEIGHT = 1123

// The preview is a vertical stack of fixed A4 page blocks (CoverPage,
// remerciements, sommaire, then each section group). Split blocks carry a
// data-pages attribute with the number of page windows they contain, which
// gives every section its exact starting page number.
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
        next[key] = page
        // Split-page blocks know how many page windows they contain — trust
        // that. Legacy growing blocks fall back to measuring their height.
        const declared = n.getAttribute('data-pages')
        if (declared) {
          page += Math.max(1, Number(declared) || 1)
          continue
        }
        const h = n.getBoundingClientRect().height / scale
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