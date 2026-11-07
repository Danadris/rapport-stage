import { Fragment, useLayoutEffect, useRef, useState, useContext } from 'react'

import { IfmbpLogoContext } from './ifmbpLogo'
import { packBlocks, type BlockBox, type PageSlice } from './pagination'

/**
 * MeasuredPages — the one place that knows how a growing report body is cut
 * into N fixed A4 page windows.
 *
 * A sheet is filled, then closed, and the next block opens the next one: a
 * block moves whole rather than being split to fit, and only a block taller
 * than a whole sheet is cut, across as many sheets as it needs. That is what
 * keeps a paragraph from ending mid-sentence at the foot of a page.
 *
 * Every window holds the whole document, translated by the offset its sheet
 * opens at. The blocks belonging to other sheets keep their space and turn
 * invisible, which leaves the bottom of a page blank instead of pulling the
 * next block up into it — and keeps the copy one coordinate system from the
 * first sheet to the last, the system free-positioned figures are stored
 * against.
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
  const copyRefs = useRef<(HTMLDivElement | null)[]>([])
  const layoutRef = useRef<Layout | null>(null)
  // What each window's copy already shows. Tracked per copy, not per document:
  // a re-measure that moves a cut but keeps the same blocks still has to be
  // shown, and a freshly mounted window has nothing shown yet. Without this a
  // stale layout freezes on screen — a page coming out blank with its content
  // hidden on every other one.
  const [shown] = useState(() => new Map<HTMLElement, string>())
  const [layout, setLayout] = useState<Layout | null>(null)
  const logo = useContext(IfmbpLogoContext)

  // Cut the document into pages. Any window can be measured: the blocks of the
  // other sheets keep their space, so every copy lays the document out the same
  // way, and a block's place on its copy is its place in the document.
  useLayoutEffect(() => {
    const copy = copyRefs.current.find((c): c is HTMLDivElement => c !== null)
    const sheet = copy?.parentElement
    if (!copy || !sheet) return

    const measure = () => {
      // Print pins each sheet to the paper size; the layout already measured is
      // the right one to keep on paper.
      if (sheet.clientHeight <= 0) return
      const next = packPages(copy, sheet)
      layoutRef.current = next
      setLayout((prev) => (prev && sameLayout(prev, next) ? prev : next))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(copy)
    return () => ro.disconnect()
  }, [])

  // Each window holds the whole document but shows only its own sheet.
  useLayoutEffect(() => {
    const current = layoutRef.current
    if (!current) return
    const live = new Set<HTMLElement>()
    current.slices.forEach((slice, page) => {
      const copy = copyRefs.current[page]
      if (!copy) return
      live.add(copy)
      // The cut's offset is part of what is shown: the drag re-renders the
      // whole document every frame it moves, but a move changes no cut, so
      // this stays cheap while never going stale.
      const signature = `${current.selector}|${slice.start}|${slice.blocks.join()}`
      if (shown.get(copy) === signature) return
      shown.set(copy, signature)
      const visible = new Set(slice.blocks)
      blocksIn(copy, current.selector).forEach((el, i) => {
        const want = visible.has(i) ? '' : 'hidden'
        if (el.style.visibility !== want) el.style.visibility = want
      })
    })
    for (const copy of shown.keys()) {
      if (!live.has(copy)) shown.delete(copy)
    }
  })

  const slices = layout?.slices ?? ONE_SHEET.slices
  const sheet = layout?.sheet ?? ONE_SHEET.sheet

  /** How far down this sheet the last line it shows ends, when a block is cut
      across it — the tail of that line belongs to the next sheet. */
  const cutOn = (page: number): number | null => {
    const slice = slices[page]
    const next = slices[page + 1]
    if (!slice || !next || next.start >= slice.start + sheet.content) return null
    // Only where a block really runs over both sheets: a sheet that simply ends
    // early has nothing to cover.
    const shared = slice.blocks.some((block) => next.blocks.includes(block))
    return shared ? next.start - slice.start : null
  }

  return (
    <div
      {...rest}
      data-pages={layout?.pages ?? 1}
      className={`w-full space-y-10 print:space-y-0 ${className ?? ''}`}
      style={style}
    >
      {slices.map((slice, page) => {
        const cut = cutOn(page)
        // A block this sheet shares with the one before runs across the join:
        // its lines above the cut belong to that sheet, not this one.
        const prev = slices[page - 1]
        const leak = !!prev && prev.blocks.some((block) => slice.blocks.includes(block))
        return (
          <div
            key={page}
            className="a4-page page-window"
            style={{ paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
          >
          <div
            data-doc-copy
            className="relative"
            ref={(el) => {
              copyRefs.current[page] = el
            }}
            style={{ transform: `translateY(${-slice.start}px)`, paddingTop: layout?.centerPad ?? 0 }}
          >
            {children}
          </div>
          {/* A sheet that ends between two lines shows the tail of a line the
              next sheet shows whole. Cover it down to the bottom of the
              window — not just to the end of the content — so no text ever
              takes the place of the footer: the page number sits on top of the
              cover, like the header above. */}
          {cut !== null && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-white"
              style={{ clipPath: `inset(${sheet.padTop + cut}px 0 0 0)` }}
            />
          )}
          {/* The mirror: the last line of the previous sheet ends where this
              one opens, so it renders whole on the sheet before and leaks onto
              this one's top padding, under the header. Cover the padding band —
              the header sits on top of it, like the page number below. */}
          {leak && (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-white"
              style={{ clipPath: `inset(0 0 calc(100% - ${sheet.padTop}px) 0)` }}
            />
          )}
          {startPageNum !== undefined && (
            <Fragment>
              {/* Inside the top padding, clear of the content: with the 14px
                  root the h-10 band is 35px tall, so it ends 24px above the
                  first line, mirroring the page number below. */}
              <div
                className="absolute left-0 right-0 flex items-center justify-between"
                style={{ top: '21px', paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
              >
                <img src={logo} alt="IFMBP" className="h-10 max-w-[150px] object-contain opacity-80" />
                {headerLogo ? (
                  <img src={headerLogo} alt="Entreprise" className="h-10 max-w-[150px] object-contain opacity-80" />
                ) : (
                  <div />
                )}
              </div>
              <div
                className="absolute left-0 right-0 text-center text-[12px] text-neutral-500"
                style={{ top: `${PAGE_HEIGHT_PX - 56}px` }}
              >
                - {startPageNum + page} -
              </div>
            </Fragment>
          )}
        </div>
        )
      })}
    </div>
  )
}

const PAGE_HEIGHT_PX = 1123

interface Layout {
  slices: PageSlice[]
  /** How many sheets this document fills, so the sommaire counts them all. */
  pages: number
  /** Padding that centres a document short enough for a single sheet. */
  centerPad: number
  /** How the blocks are found, so every window shows the same ones. */
  selector: string
  /** The sheet itself: how much of it is content, and the padding around it. */
  sheet: { content: number; padTop: number; padBottom: number }
}

/** A document is filled block by block: `data-unit` marks the blocks of one. */
const UNIT_SELECTOR = '[data-unit]'

/** One sheet holding everything — the document before it has been cut. */
const ONE_SHEET: Layout = {
  slices: [{ start: 0, blocks: [] }],
  pages: 1,
  centerPad: 0,
  selector: UNIT_SELECTOR,
  sheet: { content: 1, padTop: 0, padBottom: 0 },
}

function blocksIn(copy: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(selector === '' ? copy.children : copy.querySelectorAll(selector)) as HTMLElement[]
}

/** Reads the blocks off the page and asks the rule where they fall. */
function packPages(copy: HTMLElement, sheet: HTMLElement): Layout {
  const styles = getComputedStyle(sheet)
  const padTop = parseFloat(styles.paddingTop) || 0
  const padBottom = parseFloat(styles.paddingBottom) || 0
  const sheetContent = Math.max(1, sheet.clientHeight - padTop - padBottom)

  const units = copy.querySelectorAll(UNIT_SELECTOR)
  // A page made of no blocks of its own — the sommaire, the equipment list —
  // paginates by its top-level children instead.
  const selector = units.length > 0 ? UNIT_SELECTOR : ''
  const items = blocksIn(copy, selector)

  // The preview is scaled — desktop zoom, mobile zoom — so rects come back in
  // viewport px while every offset here is layout px. Everything is rounded, so
  // measuring the same document twice gives the same numbers back and the
  // pagination settles instead of chasing its own tail.
  const copyRect = copy.getBoundingClientRect()
  const scale = copyRect.width / Math.max(1, copy.clientWidth) || 1
  const copyPad = (parseFloat(getComputedStyle(copy).paddingTop) || 0) * scale
  const at = (viewportPx: number) => Math.round(((viewportPx - copyRect.top - copyPad) / scale) * 100) / 100

  const boxes: BlockBox[] = items.map((el) => {
    const rect = el.getBoundingClientRect()
    const top = at(rect.top)
    return {
      top,
      bottom: top + Math.round((rect.height / scale) * 100) / 100,
      heading: el.matches('h1, h2, h3, h4'),
      lineEdges: lineEdgesOf(el, at),
    }
  })
  return { ...packBlocks(boxes, sheetContent), selector, sheet: { content: sheetContent, padTop, padBottom } }
}

/**
 * Where a block can be cut: the top of each line of text inside it.
 *
 * A block holding a picture, a chart or a table has no lines to cut between — a
 * line edge inside it would cut the picture in half — so it reports none and is
 * cut at the sheet's own edge, the only place left for its overflow to go.
 *
 * Lines are read text node by text node, not with one Range over the whole
 * block: the block also holds its controls (the grip, the arrows, the "Move
 * to…" picker), and their line boxes would read as lines of text. A cut there
 * lands a few pixels into the block and blanks most of the page.
 */
function lineEdgesOf(el: HTMLElement, at: (viewportPx: number) => number): number[] {
  // Media holds no lines to cut between — but the block's own controls (the
  // grip, the arrows) are inline SVG too, so only media outside them counts.
  for (const m of Array.from(el.querySelectorAll('img, svg, canvas, table, video'))) {
    if (!(m as Element).closest('[data-pagination-ignore]')) return []
  }
  const edges = new Set<number>()
  const range = document.createRange()
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
  let node: Node | null = null
  while ((node = walker.nextNode())) {
    if (!node.textContent || !node.textContent.trim()) continue
    const parent = node.parentElement
    if (!parent || parent.closest('button, select, input, textarea, [data-pagination-ignore]')) continue
    range.selectNodeContents(node)
    for (const rect of Array.from(range.getClientRects())) {
      if (rect.width <= 0 || rect.height <= 0) continue
      edges.add(at(rect.top))
    }
  }
  return [...edges].sort((a, b) => a - b)
}

function sameLayout(a: Layout, b: Layout): boolean {
  return (
    a.pages === b.pages &&
    a.centerPad === b.centerPad &&
    a.selector === b.selector &&
    a.sheet.content === b.sheet.content &&
    a.slices.length === b.slices.length &&
    a.slices.every(
      (slice, i) =>
        slice.start === b.slices[i].start &&
        slice.blocks.length === b.slices[i].blocks.length &&
        slice.blocks.every((block, j) => block === b.slices[i].blocks[j]),
    )
  )
}
