import { useRef, type CSSProperties } from 'react'

interface EditableTextProps {
  text: string
  placeholder: string
  onSave?: (value: string) => void
  className?: string
  style?: CSSProperties
  showPlaceholder?: boolean
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
      className={`${className ?? ''} ${onSave ? 'min-h-[1em] cursor-text rounded-sm outline-none ring-transparent transition-all hover:ring-1 hover:ring-gold/40 focus:ring-2 focus:ring-gold/60 focus:bg-gold-soft/10' : ''}`}
      style={style}
    >
      {text || (onSave && showPlaceholder ? placeholder : '')}
    </p>
  )
}
