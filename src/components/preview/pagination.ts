/**
 * Where a report's blocks fall across the pages of the printed document.
 *
 * A sheet is filled, then closed, and the next block opens the next one: a block
 * moves whole rather than being split to fit. A block taller than a whole sheet
 * is cut — but at the line it is on, so the sheet ends between two lines and no
 * line is ever shown in half.
 *
 * MeasuredPages measures the blocks off the page and hands their boxes here, so
 * the rule lives in one place and can be tested without a browser.
 */

export interface BlockBox {
  /** Distance from the top of the page's content area to the block's top. */
  top: number
  /** Distance from the top of the page's content area to the block's bottom. */
  bottom: number
  /** A heading: it never sits alone at the foot of a sheet. */
  heading: boolean
  /** Where the block can be cut: the top of each line of text inside it. */
  lineEdges: number[]
}

export interface PageSlice {
  /** Offset into the copy this page opens at. */
  start: number
  /** Blocks that belong on this page. */
  blocks: number[]
}

interface Pagination {
  slices: PageSlice[]
  /** Sheets the document fills, so the sommaire counts every one of them. */
  pages: number
  /** Padding that centres a document short enough to fit on one sheet. */
  centerPad: number
}

/**
 * Fills `sheetContent`-tall sheets with `boxes`, in order.
 *
 * A block that does not fit in what is left of the current sheet closes it and
 * opens the next one at the block's own top, so the block keeps its spacing
 * clear of the top edge instead of inheriting a gap.
 */
export function packBlocks(boxes: BlockBox[], sheetContent: number): Pagination {
  if (boxes.length === 0) return { slices: [{ start: 0, blocks: [] }], pages: 1, centerPad: 0 }

  const height = Math.max(1, sheetContent)
  const slices: PageSlice[] = [{ start: 0, blocks: [] }]

  let i = 0
  while (i < boxes.length) {
    // A heading and the block after it are placed as one, so a heading never
    // sits alone at the foot of a sheet: it moves to the sheet its block opens.
    // A pair too tall to share a sheet stays apart rather than being pulled
    // apart to make room, unless the block runs over several sheets anyway —
    // then it carries its heading onto the first of them.
    let last = i
    const canFollow = (next: number) =>
      boxes[next].bottom - boxes[i].top <= height || boxes[next].bottom - boxes[next].top > height
    while (boxes[last].heading && last + 1 < boxes.length && canFollow(last + 1)) last++

    let slice = slices[slices.length - 1]
    if (slice.blocks.length > 0 && boxes[last].bottom - slice.start > height) {
      slice = { start: boxes[i].top, blocks: [] }
      slices.push(slice)
    }

    // Cut where the unit runs past this sheet, at the line it is on.
    let from = boxes[i].top
    while (boxes[last].bottom - slice.start > height) {
      // No line to cut at — the block holds no splittable text, or its lines
      // could not be read — so the sheet's own edge is the only place its
      // overflow can go. The cut is never moved forward to the block instead:
      // everything before the block would then belong to no sheet at all, and a
      // page would come out blank with its content lost.
      const cut = cutEdge(boxes, i, last, from, slice.start + height) ?? slice.start + height
      for (let block = i; block <= last; block++) slice.blocks.push(block)
      slice = { start: cut, blocks: [] }
      slices.push(slice)
      from = cut
    }
    for (let block = i; block <= last; block++) slice.blocks.push(block)
    i = last + 1
  }

  const contentHeight = Math.max(...boxes.map((b) => b.bottom))
  return {
    slices,
    pages: slices.length,
    centerPad: slices.length === 1 ? Math.max(0, (height - contentHeight) / 2) : 0,
  }
}

/** The top of the last line that fits before `limit`, if there is one. */
function lastLineEdge(box: BlockBox, from: number, limit: number): number | undefined {
  let edge: number | undefined
  for (const line of box.lineEdges) {
    if (line > from && line <= limit) edge = line
  }
  return edge
}

/**
 * Where a unit placed as one — a heading and what follows it — can be cut: at a
 * line of the block the cut falls in, and only when that block has no line
 * there, at a line of the one before it. A heading and its block stay together,
 * so the cut lands in text rather than between them.
 */
function cutEdge(boxes: BlockBox[], i: number, last: number, from: number, limit: number): number | undefined {
  const edge = lastLineEdge(boxes[last], from, limit)
  if (edge !== undefined) return edge
  for (let block = last - 1; block >= i; block--) {
    const before = lastLineEdge(boxes[block], from, limit)
    if (before !== undefined) return before
  }
  return undefined
}
