import { useRef } from 'react'
import type { OrgNode, OrgShape } from '../../types'
import { assignPositions, buildTree, BOX_H, BOX_W, CHART_MAX_H, CHART_MAX_W, collectEdges, collectNodes, layoutList, LIST_INDENT, LIST_TEXT_W, type OrgOrientation } from './orgLayout'
import { ListRow, NodeLabels } from './OrgNodes'
import { OrgWidthChip } from './OrgWidthChip'

interface OrgChartProps {
  nodes: OrgNode[]
  primaryColor?: string
  /** Drawn width in page px; absent = the chart's natural size. */
  width?: number
  /** How the chart is drawn, chosen on the page itself. */
  shape?: OrgShape
  /** Legacy field: superseded by `shape`, still read so saved charts keep their look. */
  orientation?: OrgOrientation
  /** Editing turns every poste and every name into a field. */
  editable?: boolean
  onWidthChange?: (width: number | undefined) => void
  onShapeChange?: (shape: OrgShape) => void
  onNodesChange?: (nodes: OrgNode[]) => void
}

export function OrgChart({
  nodes,
  primaryColor = '#2f5496',
  width,
  shape,
  orientation = 'vertical',
  editable,
  onWidthChange,
  onShapeChange,
  onNodesChange,
}: OrgChartProps) {
  const chartRef = useRef<HTMLDivElement>(null)
  // A chart saved before shapes existed keeps the look it was given.
  const resolved: OrgShape = shape ?? (orientation === 'horizontal' ? 'tree-side' : 'tree')

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm italic text-neutral-400">
        Organigramme non renseigné
      </div>
    )
  }

  const roots = buildTree(nodes)
  assignPositions(roots, resolved === 'tree-side' ? 'horizontal' : 'vertical')
  const allNodes = collectNodes(roots)
  const edges = collectEdges(roots, resolved === 'tree-side' ? 'horizontal' : 'vertical')
  const rootIds = new Set(roots.map((r) => r.node.id))
  // Only worth flagging "top of the hierarchy" once there's an actual hierarchy —
  // a single lone box doesn't need the label.
  const showRootBadge = allNodes.length > 1

  if (allNodes.length === 0) {
    return (
      <div className="flex items-center justify-center py-20 text-sm italic text-neutral-400">
        Organigramme non renseigné
      </div>
    )
  }

  // The list shape has its own geometry: rows of text, no boxes and no
  // connectors, so the hierarchy is carried by indentation alone.
  const list = resolved === 'list' ? layoutList(roots) : null
  const listDepth = list ? Math.max(...list.rows.map((r) => r.depth)) : 0
  const listW = list ? Math.max(300, 24 + (listDepth + 1) * LIST_INDENT + 20 + LIST_TEXT_W) : 0
  const svgW = list ? listW : Math.max(300, Math.max(...allNodes.map((n) => n.x)) + BOX_W + 48 - Math.min(...allNodes.map((n) => n.x)))
  const svgH = list ? list.height : Math.max(120, Math.max(...allNodes.map((n) => n.y)) + BOX_H + 24 - (Math.min(...allNodes.map((n) => n.y)) - (showRootBadge ? 30 : 16)))
  const minX = list ? 0 : Math.min(...allNodes.map((n) => n.x)) - 24
  const minY = list ? 0 : Math.min(...allNodes.map((n) => n.y)) - (showRootBadge ? 30 : 16)
  // A stored width scales the whole chart around it; the height cap keeps a deep
  // hierarchy on the sheet whatever width was asked for.
  const drawnW = Math.min(CHART_MAX_W, Math.max(60, width ?? svgW))
  const scale = Math.min(drawnW / svgW, CHART_MAX_H / svgH)
  const drawnH = Math.round(svgH * scale)
  const finalW = Math.round(svgW * scale)

  return (
    <div ref={chartRef} className="group/chart relative w-full overflow-x-auto py-4 flex justify-center">
      {(onWidthChange || onShapeChange) && (
        <OrgWidthChip
          width={width}
          naturalWidth={finalW}
          shape={resolved}
          anchorRef={chartRef}
          onWidthChange={onWidthChange ?? (() => {})}
          onShapeChange={onShapeChange}
        />
      )}
      <svg
        viewBox={`${minX} ${minY} ${svgW} ${svgH}`}
        width={finalW}
        height={drawnH}
        className="w-auto max-w-full"
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
        {list
          ? list.rows.map(({ node, depth, y }) => (
              <ListRow
                key={node.id}
                node={node}
                depth={depth}
                y={y}
                editable={editable}
                color={primaryColor}
                onChange={onNodesChange ? (patch) => {
                  onNodesChange(nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n)))
                } : undefined}
              />
            ))
          : allNodes.map(({ node, x, y }) => {
          return (
            <g key={node.id} filter="url(#org-shadow)">
              {/* "Top of the hierarchy" marker for root positions */}
              {showRootBadge && rootIds.has(node.id) && (
                <g>
                  <rect x={x + BOX_W / 2 - 34} y={y - 19} width={68} height={15} rx={7.5} fill={primaryColor} />
                  <text
                    x={x + BOX_W / 2}
                    y={y - 9}
                    textAnchor="middle"
                    fontSize="7.5"
                    fontWeight="700"
                    letterSpacing="0.4"
                    fill="#ffffff"
                  >
                    NIVEAU SUPÉRIEUR
                  </text>
                </g>
              )}

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

              {/* Poste + name: plain text when read-only, fields when editing.
                  foreignObject keeps them in HTML at exact chart coordinates, so
                  no measurement and no overlap maths is needed. */}
              <NodeLabels
                node={node}
                x={x}
                y={y}
                editable={editable}
                onChange={onNodesChange ? (patch) => {
                  onNodesChange(nodes.map((n) => (n.id === node.id ? { ...n, ...patch } : n)))
                } : undefined}
                titleFontVar="var(--doc-title-font, sans-serif)"
                bodyFontVar="var(--doc-body-font, sans-serif)"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
