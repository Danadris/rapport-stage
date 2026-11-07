import type { OrgNode } from '../../types'

export interface TreeNode {
  node: OrgNode
  children: TreeNode[]
  x: number
  y: number
  /** Space the subtree occupies along the axis its children are laid out on. */
  span: number
}

/** Tree direction, chosen on the page. */
export type OrgOrientation = 'vertical' | 'horizontal'

export const BOX_W = 160
export const BOX_H = 58
const MIN_H_GAP = 20 // minimum horizontal gap between sibling boxes
/** Indented-list shape: one row per member, depth shown by indentation. */
export const LIST_INDENT = 26
export const LIST_ROW_H = 42
export const LIST_TEXT_W = 340

/** Width range for the slider, in page px — the sheet's content column is 794. */
export const CHART_MIN_W = 160
export const CHART_MAX_W = 794
/** A chart taller than this would run off the sheet, whatever its width. */
export const CHART_MAX_H = 640

export function buildTree(nodes: OrgNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const node of nodes) {
    map.set(node.id, { node, children: [], x: 0, y: 0, span: 0 })
  }

  for (const tnode of map.values()) {
    const parentId = tnode.node.parentId
    if (parentId && map.has(parentId) && parentId !== tnode.node.id) {
      map.get(parentId)!.children.push(tnode)
    } else {
      roots.push(tnode)
    }
  }

  return roots
}

/** Distance between a box and its children, along the tree's direction. */
const LEVEL_STEP = { vertical: 100, horizontal: 64 } as const

function subtreeSpan(tnode: TreeNode, orientation: OrgOrientation): number {
  const own = orientation === 'vertical' ? BOX_W : BOX_H
  if (tnode.children.length === 0) return own
  const childrenSpan =
    tnode.children.reduce((sum, c) => sum + subtreeSpan(c, orientation) + MIN_H_GAP, -MIN_H_GAP)
  return Math.max(own, childrenSpan)
}

/**
 * Places every box. Vertical is the classic descending tree: children sit side by
 * side one level below. Horizontal runs the tree left to right — the shape to pick
 * when the hierarchy is wide rather than deep, since an A4 portrait sheet has more
 * room across than down.
 */
export function assignPositions(roots: TreeNode[], orientation: OrgOrientation, start = 10): void {
  function layout(tnode: TreeNode, x: number, y: number): void {
    tnode.span = subtreeSpan(tnode, orientation)

    if (orientation === 'vertical') {
      tnode.x = x + tnode.span / 2 - BOX_W / 2
      tnode.y = y

      let childX = x
      for (const child of tnode.children) {
        layout(child, childX, y + LEVEL_STEP.vertical)
        childX += subtreeSpan(child, orientation) + MIN_H_GAP
      }
      return
    }

    tnode.x = x
    tnode.y = y + tnode.span / 2 - BOX_H / 2

    let childY = y
    for (const child of tnode.children) {
      layout(child, x + BOX_W + LEVEL_STEP.horizontal, childY)
      childY += subtreeSpan(child, orientation) + MIN_H_GAP
    }
  }

  let cursor = start
  for (const root of roots) {
    layout(root, orientation === 'vertical' ? cursor : start, orientation === 'vertical' ? start : cursor)
    cursor += subtreeSpan(root, orientation) + MIN_H_GAP * 2
  }
}

export function collectNodes(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(t: TreeNode) {
    result.push(t)
    for (const c of t.children) walk(c)
  }
  for (const r of roots) walk(r)
  return result
}

/** Indented-list rows: depth-first, so a subordinate always sits under its chief. */
export function layoutList(roots: TreeNode[]): { rows: Array<{ node: OrgNode; depth: number; y: number }>; height: number } {
  const rows: Array<{ node: OrgNode; depth: number; y: number }> = []
  let y = 10
  const walk = (nodes: TreeNode[], depth: number) => {
    for (const n of nodes) {
      rows.push({ node: n.node, depth, y })
      y += LIST_ROW_H
      walk(n.children, depth + 1)
    }
  }
  walk(roots, 0)
  return { rows, height: y + 12 }
}

export function collectEdges(roots: TreeNode[], orientation: OrgOrientation): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []
  function walk(t: TreeNode) {
    for (const child of t.children) {
      edges.push(
        orientation === 'vertical'
          ? { x1: t.x + BOX_W / 2, y1: t.y + BOX_H, x2: child.x + BOX_W / 2, y2: child.y }
          : { x1: t.x + BOX_W, y1: t.y + BOX_H / 2, x2: child.x, y2: child.y + BOX_H / 2 },
      )
      walk(child)
    }
  }
  for (const r of roots) walk(r)
  return edges
}

/** A patch that changes nothing writes nothing: a blur after an untouched
 *  keystroke must not enter the history. */
export function makeCommit(onChange: ((patch: Partial<OrgNode>) => void) | undefined, node: OrgNode) {
  return (patch: Partial<OrgNode>) => {
    if (!onChange) return
    if (patch.title !== undefined && patch.title === node.title) return
    if (patch.name !== undefined && patch.name === node.name) return
    onChange(patch)
  }
}
