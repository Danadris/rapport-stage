import { useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Layers, List } from 'lucide-react'
import type { OrgNode, OrgShape } from '../../types'
import { useAnchoredPanel } from '../../hooks/useAnchoredPanel'

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

interface TreeNode {
  node: OrgNode
  children: TreeNode[]
  x: number
  y: number
  /** Space the subtree occupies along the axis its children are laid out on. */
  span: number
}

/** Tree direction, chosen on the page. */
type OrgOrientation = 'vertical' | 'horizontal'

const BOX_W = 160
const BOX_H = 58
const MIN_H_GAP = 20 // minimum horizontal gap between sibling boxes
/** Indented-list shape: one row per member, depth shown by indentation. */
const LIST_INDENT = 26
const LIST_ROW_H = 42
const LIST_TEXT_W = 340

/** Width range for the slider, in page px — the sheet's content column is 794. */
const CHART_MIN_W = 160
const CHART_MAX_W = 794
/** A chart taller than this would run off the sheet, whatever its width. */
const CHART_MAX_H = 640

function buildTree(nodes: OrgNode[]): TreeNode[] {
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
function assignPositions(roots: TreeNode[], orientation: OrgOrientation, start = 10): void {
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

function collectNodes(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  function walk(t: TreeNode) {
    result.push(t)
    for (const c of t.children) walk(c)
  }
  for (const r of roots) walk(r)
  return result
}

/** Indented-list rows: depth-first, so a subordinate always sits under its chief. */
function layoutList(roots: TreeNode[]): { rows: Array<{ node: OrgNode; depth: number; y: number }>; height: number } {
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

/** One row of the list shape: a depth guide, a marker, then poste and name. */
/** A patch that changes nothing writes nothing: a blur after an untouched
 *  keystroke must not enter the history. */
function makeCommit(onChange: ((patch: Partial<OrgNode>) => void) | undefined, node: OrgNode) {
  return (patch: Partial<OrgNode>) => {
    if (!onChange) return
    if (patch.title !== undefined && patch.title === node.title) return
    if (patch.name !== undefined && patch.name === node.name) return
    onChange(patch)
  }
}

function ListRow({
  node,
  depth,
  y,
  editable,
  onChange,
  color,
}: {
  node: OrgNode
  depth: number
  y: number
  editable?: boolean
  onChange?: (patch: Partial<OrgNode>) => void
  color: string
}) {
  const field =
    'flex-1 border-0 bg-transparent p-0 leading-tight outline-none placeholder:text-neutral-300 ' +
    (editable && onChange ? 'rounded-sm hover:bg-gold-soft/40 focus:bg-gold-soft/60' : '')

  const commit = makeCommit(onChange, node)

  return (
    <g>
      {/* Depth guide: the vertical rule the eye follows down a branch. */}
      {depth > 0 && (
        <path
          d={`M ${depth * LIST_INDENT} ${y - LIST_ROW_H + 14} V ${y + LIST_ROW_H - 8}`}
          stroke={color}
          strokeWidth="1"
          strokeOpacity="0.35"
          fill="none"
        />
      )}
      <rect x={depth * LIST_INDENT + 6} y={y + 6} width="6" height="6" rx="1.5" fill={color} />
      <foreignObject x={depth * LIST_INDENT + 20} y={y + 2} width={LIST_TEXT_W} height={LIST_ROW_H - 4}>
        <div className="flex h-full items-center gap-1.5">
          {editable && onChange ? (
            <NodeFields
              node={node}
              commit={commit}
              titleClass={`${field} text-[11px] font-bold text-[color:var(--doc-color,#2f5496)]`}
              nameClass={`${field} text-[10px] font-medium text-[#4b5563]`}
              titleStyle={{ fontSize: 11 }}
              nameStyle={{ fontSize: 10 }}
              separator={<span className="shrink-0 text-[10px] text-neutral-400">—</span>}
            />
          ) : (
            <>
              <span className="text-[11px] font-bold text-[color:var(--doc-color,#2f5496)]" style={{ fontSize: 11 }}>
                {node.title.trim() || 'Poste'}
              </span>
              <span className="shrink-0 text-[10px] text-neutral-400">—</span>
              <span className="text-[10px] font-medium text-[#4b5563]" style={{ fontSize: 10 }}>
                {node.name.trim() || '—'}
              </span>
            </>
          )}
        </div>
      </foreignObject>
    </g>
  )
}

/**
 * One node's two editable fields — its poste and the member's name — with the
 * drafts they need: a blur commits only what actually changed, and Enter blurs.
 * The list lays the pair side by side and the chart stacks them, so the class,
 * style and separator per field come from the caller.
 */
function NodeFields({
  node,
  commit,
  titleClass,
  nameClass,
  titleStyle,
  nameStyle,
  separator,
}: {
  node: OrgNode
  commit: (patch: Partial<OrgNode>) => void
  titleClass: string
  nameClass: string
  titleStyle: React.CSSProperties
  nameStyle: React.CSSProperties
  separator?: React.ReactNode
}) {
  const titleDraft = useRef('')
  const nameDraft = useRef('')

  return (
    <>
      <input
        aria-label={`Poste de ${node.name || 'ce membre'}`}
        defaultValue={node.title}
        placeholder="Poste"
        onChange={(e) => { titleDraft.current = e.target.value }}
        onBlur={() => {
          const draft = titleDraft.current
          titleDraft.current = ''
          if (draft !== '') commit({ title: draft })
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className={titleClass}
        style={titleStyle}
      />
      {separator}
      <input
        aria-label={`Nom de ${node.title || 'ce poste'}`}
        defaultValue={node.name}
        placeholder="—"
        onChange={(e) => { nameDraft.current = e.target.value }}
        onBlur={() => {
          const draft = nameDraft.current
          nameDraft.current = ''
          if (draft !== '') commit({ name: draft })
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
        className={nameClass}
        style={nameStyle}
      />
    </>
  )
}

function collectEdges(roots: TreeNode[], orientation: OrgOrientation): { x1: number; y1: number; x2: number; y2: number }[] {
  const edges: { x1: number; y1: number; x2: number; y2: number }[] = []
  function walk(t: TreeNode) {
    for (const child of t.children) {
      // Vertical leaves from the bottom edge, horizontal from the right edge, so
      // the connector always follows the direction the tree grows.
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

/**
 * One node's two lines. Editing happens inside a foreignObject so the fields sit
 * in real HTML at exact chart coordinates — an SVG <input> would not be
 * focusable, and measuring an HTML overlay against a responsive SVG would.
 */
function NodeLabels({
  node,
  x,
  y,
  editable,
  onChange,
  titleFontVar,
  bodyFontVar,
}: {
  node: OrgNode
  x: number
  y: number
  editable?: boolean
  onChange?: (patch: Partial<OrgNode>) => void
  titleFontVar?: string
  bodyFontVar?: string
}) {
  const commit = makeCommit(onChange, node)

  const fieldCls = (weight: string, colour: string, font: string | undefined) =>
    `w-full border-0 bg-transparent p-0 text-center leading-tight outline-none placeholder:text-neutral-300 ${weight} ${colour} ${font ?? ''} ${
      editable && onChange ? 'rounded-sm hover:bg-gold-soft/40 focus:bg-gold-soft/60' : ''
    }`

  return (
    <foreignObject x={x + 8} y={y + 12} width={BOX_W - 16} height={BOX_H - 14}>
      <div className="flex h-full flex-col justify-start gap-1">
        {editable && onChange ? (
          <NodeFields
            node={node}
            commit={commit}
            titleClass={fieldCls('text-[11px] font-bold', 'text-[color:var(--doc-color,#2f5496)]', titleFontVar)}
            nameClass={fieldCls('text-[10px] font-medium', 'text-[#4b5563]', bodyFontVar)}
            titleStyle={{ fontSize: 11 }}
            nameStyle={{ fontSize: 10 }}
          />
        ) : (
          <>
            <div className="text-center text-[11px] font-bold leading-tight text-[color:var(--doc-color,#2f5496)]" style={{ fontFamily: titleFontVar }}>
              {node.title.trim() || 'Poste'}
            </div>
            <div className="text-center text-[10px] font-medium leading-tight text-[#4b5563]" style={{ fontFamily: bodyFontVar }}>
              {node.name.trim() || '—'}
            </div>
          </>
        )}
      </div>
    </foreignObject>
  )
}

/**
 * Width control for one chart, in the same shape as the image toolbar: a chip over
 * the chart, revealed on hover, and clamped to the page by useAnchoredPanel so a
 * chart flush against an edge never loses it. The field takes any value in the
 * range and commits on Enter or blur, like the image width field.
 */
function OrgWidthChip({
  width,
  naturalWidth,
  shape,
  anchorRef,
  onWidthChange,
  onShapeChange,
}: {
  /** Absent when the chart is drawn at its natural size. */
  width?: number
  naturalWidth: number
  shape: OrgShape
  anchorRef: React.RefObject<HTMLElement | null>
  onWidthChange: (width: number | undefined) => void
  onShapeChange?: (shape: OrgShape) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState<string | null>(null)
  // One ref for the panel's lifetime: creating it inline in the hook call would
  // hand the hook a new object every render, recreating `reposition` with it.
  const panelRef = useRef<HTMLDivElement>(null)
  const style = useAnchoredPanel({ open, anchorRef, panelRef })
  const visible = open
  const current = width ?? naturalWidth

  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(n)) {
      onWidthChange(Math.min(CHART_MAX_W, Math.max(CHART_MIN_W, Math.round(n))))
    }
    setText(null)
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); e.preventDefault(); setOpen((v) => !v) }}
        title="Largeur de l'organigramme"
        aria-label="Largeur de l'organigramme"
        aria-expanded={visible}
        className={`absolute right-2 top-2 z-50 flex h-8 items-center gap-1.5 rounded-full border px-2.5 shadow-sm backdrop-blur-xs transition-opacity print:hidden ${
          visible ? 'border-blue-300 bg-blue-50 text-blue-600' : 'border-neutral-300 bg-white/85 text-neutral-500 hover:opacity-100'
        } opacity-0 group-hover/chart:opacity-100 focus-within:opacity-100`}
      >
        <Layers size={13} />
        <span className="font-mono text-[11px]">{current}px</span>
      </button>
      {visible && (
        <div
          ref={panelRef}
          style={style}
          className="absolute z-50 w-60 rounded-md border border-neutral-300 bg-white/95 px-2 py-2 shadow-md backdrop-blur-sm print:hidden"
          onMouseLeave={() => setOpen(false)}
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Largeur</span>
            {width !== undefined && (
              <button
                type="button"
                onClick={() => { onWidthChange(undefined); setOpen(false) }}
                title="Revenir à la taille naturelle"
                className="cursor-pointer text-[9px] text-neutral-500 underline hover:text-neutral-900"
              >
                Défaut
              </button>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <input
              type="range"
              min={CHART_MIN_W}
              max={CHART_MAX_W}
              step={10}
              value={current}
              onChange={(e) => onWidthChange(Number(e.target.value))}
              className="h-1 flex-1 cursor-pointer accent-blue-600"
              aria-label="Largeur de l'organigramme (curseur)"
            />
            <input
              type="number"
              min={CHART_MIN_W}
              max={CHART_MAX_W}
              value={text ?? current}
              onChange={(e) => setText(e.target.value)}
              onBlur={(e) => commit(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  commit((e.target as HTMLInputElement).value)
                  ;(e.target as HTMLInputElement).blur()
                }
              }}
              title={`Largeur en px — toute valeur entre ${CHART_MIN_W} et ${CHART_MAX_W}`}
              aria-label="Largeur en px"
              className="w-14 shrink-0 rounded border border-neutral-300 px-1 py-0.5 text-right font-mono text-[11px] text-neutral-800"
            />
          </div>
          {onShapeChange && (
            <div className="mt-2 flex items-center justify-between border-t border-neutral-200 pt-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-neutral-500">Forme</span>
              <div className="flex items-center gap-0.5 rounded-lg border border-neutral-300 bg-white p-0.5">
                {(
                  [
                    ['tree', 'Arbre descendant', ArrowDown],
                    ['tree-side', 'Arbre horizontal', ArrowRight],
                    ['list', 'Liste indentée', List],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onShapeChange(value)}
                    title={label}
                    aria-label={label}
                    aria-pressed={shape === value}
                    className={`flex h-6 w-8 cursor-pointer items-center justify-center rounded-md transition-colors ${
                      shape === value ? 'bg-blue-100 text-blue-700' : 'text-neutral-500 hover:text-neutral-900'
                    }`}
                  >
                    <Icon size={13} />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </>
  )
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
