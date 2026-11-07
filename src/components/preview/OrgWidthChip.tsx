import { useRef, useState } from 'react'
import { ArrowDown, ArrowRight, Layers, List } from 'lucide-react'
import type { OrgShape } from '../../types'
import { useAnchoredPanel } from '../../hooks/useAnchoredPanel'
import { CHART_MAX_W, CHART_MIN_W } from './orgLayout'

/**
 * Width control for one chart, in the same shape as the image toolbar: a chip over
 * the chart, revealed on hover, and clamped to the page by useAnchoredPanel so a
 * chart flush against an edge never loses it. The field takes any value in the
 * range and commits on Enter or blur, like the image width field.
 */
export function OrgWidthChip({
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
