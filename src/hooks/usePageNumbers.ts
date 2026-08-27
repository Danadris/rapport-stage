import { useLayoutEffect, useState, type RefObject } from 'react'

export function usePageNumbers(ref: RefObject<HTMLDivElement | null>, pageHeight = 1123) {
  const [numbers, setNumbers] = useState<Record<string, number>>({})

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return

    const compute = () => {
      const nodes = el.querySelectorAll<HTMLElement>('[data-part]')
      let consumed = 0
      const next: Record<string, number> = {}
      nodes.forEach((n) => {
        const key = n.dataset.part
        if (!key || key === 'couverture') return
        next[key] = consumed + 1
        consumed += Math.max(1, Math.ceil((n.offsetHeight || pageHeight) / pageHeight))
      })
      setNumbers((prev) => (JSON.stringify(prev) === JSON.stringify(next) ? prev : next))
    }

    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref, pageHeight])

  return numbers
}
