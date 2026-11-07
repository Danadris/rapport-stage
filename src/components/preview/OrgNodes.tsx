import { useRef } from 'react'
import type { OrgNode } from '../../types'
import { BOX_H, BOX_W, LIST_INDENT, LIST_ROW_H, LIST_TEXT_W, makeCommit } from './orgLayout'


/**
 * One node's two editable fields — its poste and the member's name — with the
 * drafts they need: a blur commits only what actually changed, and Enter blurs.
 * The list lays the pair side by side and the chart stacks them, so the class,
 * style and separator per field come from the caller.
 */
export function NodeFields({
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

export function ListRow({
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
 * One node's two lines. Editing happens inside a foreignObject so the fields sit
 * in real HTML at exact chart coordinates — an SVG <input> would not be
 * focusable, and measuring an HTML overlay against a responsive SVG would.
 */
export function NodeLabels({
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
