import { Loader2, Maximize2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react'
import { cx } from '../lib/cx'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}

const buttonVariants: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-paper border border-ink hover:bg-ink/88',
  secondary: 'bg-paper text-ink border border-line hover:border-line-strong hover:bg-cream',
  ghost: 'bg-transparent text-muted border border-transparent hover:text-ink hover:bg-gold-soft',
  danger: 'bg-transparent text-danger border border-transparent hover:bg-danger/10',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading = false,
  className,
  children,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors duration-150 select-none',
        size === 'sm' ? 'h-9 px-3 text-[13px]' : 'h-11 px-4 text-sm',
        buttonVariants[variant],
        (disabled || loading) && 'pointer-events-none opacity-45',
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  )
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition-colors duration-150',
        'placeholder:text-faint hover:border-line-strong focus:border-gold focus:outline-none',
        'disabled:cursor-not-allowed disabled:bg-cream disabled:opacity-60',
        className,
      )}
      {...rest}
    />
  )
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  counter?: boolean
  /** Shown as the title when expanded full-screen — falls back to a generic label. */
  label?: string
}

export function Textarea({ className, counter = false, maxLength = 1200, value, label, id, ...rest }: TextareaProps) {
  const len = typeof value === 'string' ? value.length : 0
  const [expanded, setExpanded] = useState(false)
  const expandedRef = useRef<HTMLTextAreaElement>(null)

  // Full-screen composing view: cramped little inline boxes are the single
  // biggest friction point for writing report content on a phone. This
  // is purely additive — the inline textarea still works exactly as before.
  useEffect(() => {
    if (!expanded) return

    const el = expandedRef.current
    if (el) {
      el.focus()
      const pos = el.value.length
      el.setSelectionRange(pos, pos)
    }

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setExpanded(false)
    }
    document.addEventListener('keydown', onKeyDown)

    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [expanded])

  return (
    <>
      <div className="relative">
        <textarea
          id={id}
          className={cx(
            'w-full rounded-lg border border-line bg-paper px-3 py-2 pr-9 text-sm leading-relaxed text-ink transition-colors duration-150',
            'placeholder:text-faint hover:border-line-strong focus:border-gold focus:outline-none',
            counter && 'pb-7',
            className,
          )}
          maxLength={maxLength}
          rows={4}
          value={value}
          aria-hidden={expanded}
          tabIndex={expanded ? -1 : undefined}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setExpanded(true)}
          title="Agrandir"
          aria-label="Agrandir la zone de texte"
          className="absolute right-1.5 top-1.5 flex h-8 w-8 items-center justify-center rounded text-faint opacity-70 transition-colors hover:bg-cream hover:text-ink hover:opacity-100 active:bg-cream"
        >
          <Maximize2 size={14} />
        </button>
        {counter && (
          <span className="pointer-events-none absolute right-3 bottom-2 font-mono text-[11px] text-faint">
            {len}/{maxLength}
          </span>
        )}
      </div>

      {expanded && (
        <div
          className="fixed inset-0 z-[100] flex flex-col bg-cream"
          style={{
            paddingTop: 'env(safe-area-inset-top, 0px)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
            <span className="truncate text-[14px] font-semibold text-ink">{label || 'Texte'}</span>
            <div className="flex shrink-0 items-center gap-3">
              {counter && <span className="font-mono text-[11px] text-faint">{len}/{maxLength}</span>}
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="flex h-10 items-center rounded-lg bg-ink px-4 text-[13px] font-medium text-paper active:bg-ink/88"
              >
                Terminé
              </button>
            </div>
          </div>
          <textarea
            ref={expandedRef}
            className="flex-1 resize-none bg-transparent px-4 py-4 text-[16px] leading-relaxed text-ink placeholder:text-faint focus:outline-none"
            maxLength={maxLength}
            value={value}
            {...rest}
          />
        </div>
      )}
    </>
  )
}

interface FieldProps {
  label: string
  hint?: string
  error?: string
  optional?: boolean
  children: ReactNode
  htmlFor?: string
}

export function Field({ label, hint, error, optional = false, children, htmlFor }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="flex items-baseline justify-between gap-3">
        <span className="text-[13px] font-medium text-ink">{label}</span>
        {(hint || optional) && (
          <span className="text-[11px] text-faint">{hint ?? (optional ? 'Optionnel' : undefined)}</span>
        )}
      </label>
      {children}
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  )
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cx(
        'inline-block text-[11px] font-medium tracking-[0.22em] text-gold-deep uppercase',
        className,
      )}
    >
      {children}
    </span>
  )
}

export function Badge({ children, tone = 'gold' }: { children: ReactNode; tone?: 'gold' | 'neutral' | 'danger' }) {
  const tones = {
    gold: 'bg-gold-soft text-gold-deep',
    neutral: 'bg-cream text-muted border border-line',
    danger: 'bg-danger/10 text-danger',
  }
  return (
    <span className={cx('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', tones[tone])}>
      {children}
    </span>
  )
}

export function SkeletonRow() {
  return <div className="h-4 w-full animate-pulse rounded bg-line" />
}
