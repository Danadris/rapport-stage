import type { OrgNode } from '../../types'

interface OrgChartProps {
  nodes: OrgNode[]
  primaryColor?: string
}

interface TreeNode {
  node: OrgNode
  children: TreeNode[]
  x: number
  y: number
  width: number
}

const BOX_W = 160
const BOX_H = 58
const LEVEL_H = 100 // vertical spacing between levels
const MIN_H_GAP = 20 // minimum horizontal gap between sibling boxes

function buildTree(nodes: OrgNode[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  const roots: TreeNode[] = []

  for (const node of nodes) {
    map.set(node.id, { node, children: [], x: 0, y: 0, width: BOX_W })
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

function assignPositions(roots: TreeNode[], startY = 10): void {
  function subtreeWidth(tnode: TreeNode): number {
    if (tnode.children.length === 0) return BOX_W
    const childrenWidth = tnode.children.reduce(
      (sum, c) => sum + subtreeWidth(c) + MIN_H_GAP,
      -MIN_H_GAP,
    )
    return Math.max(BOX_W, childrenWidth)
  }

  function layout(tnode: TreeNode, x: number, y: number): void {
    tnode.width = subtreeWidth(tnode)
    tnode.x = x + tnode.width / 2 - BOX_W / 2
    tnode.y = y

    if (tnode.children.length > 0) {
      let childX = x
      for (const child of tnode.children) {
        const cw = subtreeWidth(child)
        layout(child, childX, y + LEVEL_H)
        childX += cw + MIN_H_GAP
      }
    }
  }

  let totalX = 10
  for (const root of roots) {
    layout(root, totalX, startY)
    totalX += subtreeWidth(root) + MIN_H_GAP * 2
  }
}

function collectNodes(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(t: TreeNode) {
    result.push(t)
    for (const c of t.children) walk(c)
  }
  for (const r of roots) walk(r)
  return result
}

function collectEdges(roots: TreeNode[]): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []
  function walk(t: TreeNode) {
    for (const child of t.children) {
      edges.push({
        x1: t.x + BOX_W / 2,
        y1: t.y + BOX_H,
        x2: child.x + BOX_W / 2,
        y2: child.y,
      })
      walk(child)
    }
  }
  for (const r of roots) walk(r)
  return edges
}

export function OrgChart({ nodes, primaryColor = '#2f5496' }: OrgChartProps) {
  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm italic text-neutral-400">
        Organigramme non renseigné
      </div>
    )
  }

  const roots = buildTree(nodes)
  assignPositions(roots)
  const allNodes = collectNodes(roots)
  const edges = collectEdges(roots)

  if (allNodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm italic text-neutral-400">
        Organigramme non renseigné
      </div>
    )
  }

  // Compute SVG bounding box with margins
  const allX = allNodes.map((n) => n.x)
  const allY = allNodes.map((n) => n.y)
  const minX = Math.min(...allX) - 24
  const minY = Math.min(...allY) - 16
  const maxX = Math.max(...allX) + BOX_W + 24
  const maxY = Math.max(...allY) + BOX_H + 24
  const svgW = Math.max(300, maxX - minX)
  const svgH = Math.max(120, maxY - minY)

  return (
    <div className="w-full overflow-x-auto py-4 flex justify-center">
      <svg
        viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
        className="max-h-[640px] w-auto max-w-full"
        style={{ minWidth: Math.min(svgW, 400) }}
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="org-shadow" x="-8%" y="-8%" width="120%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.08" />
          </filter>
        </defs>

        {/* Connector lines */}
        {edges.map((e, i) => {
          const midY = (e.y1 + e.y2) / 2
          return (
            <path
              key={i}
              d={`M ${e.x1} ${e.y1} C ${e.x1} ${midY}, ${e.x2} ${midY}, ${e.x2} ${e.y2}`}
              fill="none"
              stroke={primaryColor}
              strokeWidth="2"
              strokeOpacity="0.45"
              strokeLinecap="round"
            />
          )
        })}

        {/* Node boxes */}
        {allNodes.map(({ node, x, y }) => {
          const title = node.title.trim() || 'Poste'
          const name = node.name.trim() || '—'

          return (
            <g key={node.id} filter="url(#org-shadow)">
              {/* Card background */}
              <rect
                x={x}
                y={y}
                width={BOX_W}
                height={BOX_H}
                rx={6}
                ry={6}
                fill="#ffffff"
                stroke={primaryColor}
                strokeWidth="1.5"
              />

              {/* Top color bar */}
              <path
                d={`M ${x + 6} ${y} H ${x + BOX_W - 6} Q ${x + BOX_W} ${y} ${x + BOX_W} ${y + 6} V ${y + 8} H ${x} V ${y + 6} Q ${x} ${y} ${x + 6} ${y} Z`}
                fill={primaryColor}
              />

              {/* Job title */}
              <text
                x={x + BOX_W / 2}
                y={y + 26}
                textAnchor="middle"
                fontSize="10"
                fontWeight="700"
                fill={primaryColor}
                fontFamily="var(--doc-title-font, sans-serif)"
              >
                {title.length > 24 ? title.slice(0, 22) + '…' : title}
              </text>

              {/* Person's name */}
              <text
                x={x + BOX_W / 2}
                y={y + 44}
                textAnchor="middle"
                fontSize="9"
                fontWeight="500"
                fill="#4b5563"
                fontFamily="var(--doc-body-font, sans-serif)"
              >
                {name.length > 26 ? name.slice(0, 24) + '…' : name}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
