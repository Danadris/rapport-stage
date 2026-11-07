import { useRef, useState } from 'react'
import { cx } from '../../lib/cx'

/**
 * Drag handle between the form and the live preview. Pointer Events rather than
 * mouse events so it works with a finger, and ArrowLeft/ArrowRight (plus Home,
 * End, Enter) so it works from the keyboard — a resize that only answers a mouse
 * is not a resize everybody can do.
 */
export function SplitHandle({
  value,
  min,
  max,
  defaultValue,
  onChange,
  label = "Redimensionner l'aperçu",
  className,
}: {
  value: number
  min: number
  max: number
  defaultValue: number
  onChange: (width: number) => void
  label?: string
  /** Layout, supplied by the caller — the handle mirrors the pane's stickiness. */
  className?: string
}) {
  const [dragging, setDragging] = useState(false)
  const start = useRef({ x: 0, width: 0 })

  const clamp = (width: number) => Math.min(max, Math.max(min, Math.round(width)))

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={value}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        start.current = { x: e.clientX, width: value }
        setDragging(true)
      }}
      onPointerMove={(e) => {
        if (!dragging) return
        onChange(clamp(start.current.width + (e.clientX - start.current.x)))
      }}
      onPointerUp={(e) => {
        e.currentTarget.releasePointerCapture?.(e.pointerId)
        setDragging(false)
      }}
      onPointerCancel={() => setDragging(false)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 48 : 16
        // Dragging left widens the preview, so the arrows follow the direction.
        if (e.key === 'ArrowLeft') {
          e.preventDefault()
          onChange(clamp(value + step))
        } else if (e.key === 'ArrowRight') {
          e.preventDefault()
          onChange(clamp(value - step))
        } else if (e.key === 'Home') {
          e.preventDefault()
          onChange(min)
        } else if (e.key === 'End') {
          e.preventDefault()
          onChange(max)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          onChange(defaultValue)
        }
      }}
      onDoubleClick={() => onChange(defaultValue)}
      title="Glisser pour redimensionner l'aperçu — double-clic (ou Entrée) pour revenir à la taille par défaut"
      className={cx(
        'group/handle relative w-2 shrink-0 cursor-col-resize touch-none select-none print:hidden',
        className,
        dragging ? 'bg-gold/15' : 'hover:bg-gold/10',
      )}
    >
      {/* 8px is too small a target for a finger: this keeps the layout narrow and
          the pointer area wide. */}
      <span aria-hidden className="absolute inset-y-0 -left-2.5 -right-2.5" />
      <span aria-hidden className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-line transition-colors group-hover/handle:bg-gold/50" />
      <span aria-hidden className="absolute top-1/2 left-1/2 h-12 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong transition-colors group-hover/handle:bg-gold" />
    </div>
  )
}
