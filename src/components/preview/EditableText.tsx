import { useRef, type CSSProperties } from 'react'

interface EditableTextProps {
  text: string
  placeholder: string
  onSave?: (value: string) => void
  className?: string
  style?: CSSProperties
  showPlaceholder?: boolean
}

export function EditableTitle({
  text,
  tag = 'h3',
  onSave,
  onRemove,
  className,
  style,
  prefixNode,
}: {
  text: string
  tag?: 'h2' | 'h3' | 'h4'
  onSave?: (value: string) => void
  onRemove?: () => void
  className?: string
  style?: CSSProperties
  /** Read-only prefix rendered before the editable text, e.g. "1." or "a/". */
  prefixNode?: React.ReactNode
}) {
  const ref = useRef<HTMLElement>(null)
  const Tag = tag

  const handleBlur = () => {
    if (!ref.current || !onSave) return
    const prefixEl = ref.current.querySelector('[data-editable-prefix]')
    const prefixText = prefixEl ? prefixEl.textContent ?? '' : ''
    const raw = ref.current.innerText.trim()
    const newText =
      prefixText && raw.startsWith(prefixText)
        ? raw.slice(prefixText.length).trim()
        : raw
    if (newText !== text) onSave(newText)
  }

  return (
    <div className="group/title relative">
      <Tag
        ref={ref as any}
        contentEditable={!!onSave}
        suppressContentEditableWarning
        onBlur={handleBlur}
        className={`${className ?? ''} ${onSave ? 'cursor-text rounded-sm outline-none ring-transparent transition-all hover:ring-1 hover:ring-gold/40 focus:ring-2 focus:ring-gold/60 focus:bg-gold-soft/10' : ''}`}
        style={style}
      >
        {prefixNode && (
          <span contentEditable={false} data-editable-prefix>
            {prefixNode}{' '}
          </span>
        )}
        {text}
      </Tag>
      {onRemove && (
        <button
          type="button"
          title="Supprimer ce titre"
          aria-label="Supprimer ce titre"
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onRemove() }}
          className="absolute -right-6 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-[10px] text-neutral-400 opacity-40 transition-opacity hover:text-red-500 print:hidden sm:opacity-0 sm:group-hover/title:opacity-100 sm:group-focus-within/title:opacity-100"
        >
          ×
        </button>
      )}
    </div>
  )
}

export function EditableText({ text, placeholder, onSave, className, style, showPlaceholder = false }: EditableTextProps) {
  const ref = useRef<HTMLParagraphElement>(null)

  const handleBlur = () => {
    if (!ref.current || !onSave) return
    const newText = ref.current.innerText.trim()
    if (newText !== text) onSave(newText)
  }

  return (
    <p
      ref={ref}
      contentEditable={!!onSave}
      suppressContentEditableWarning
      onBlur={handleBlur}
      aria-label={!text && onSave ? placeholder : undefined}
      data-placeholder={!text && onSave ? placeholder : undefined}
      className={`${className ?? ''} ${onSave ? 'min-h-[1em] cursor-text rounded-sm outline-none ring-transparent transition-all hover:ring-1 hover:ring-gold/40 focus:ring-2 focus:ring-gold/60 focus:bg-gold-soft/10' : ''}`}
      style={style}
    >
      {text || (onSave && showPlaceholder ? placeholder : '')}
    </p>
  )
}
