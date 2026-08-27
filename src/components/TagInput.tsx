import { X } from 'lucide-react'
import { useState } from 'react'
import { cx } from '../lib/cx'

interface TagInputProps {
  values: string[]
  onChange: (values: string[]) => void
  placeholder?: string
}

export function TagInput({ values, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState('')

  const commit = () => {
    const v = draft.trim()
    if (v === '') return
    if (!values.includes(v)) onChange([...values, v])
    setDraft('')
  }

  return (
    <div
      className={cx(
        'flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line bg-paper px-2 py-1.5 transition-colors duration-150',
        'hover:border-line-strong focus-within:border-gold',
      )}
    >
      {values.map((v) => (
        <span
          key={v}
          className="inline-flex items-center gap-1 rounded-md bg-gold-soft py-0.5 pr-1 pl-2 text-[13px] text-gold-deep"
        >
          {v}
          <button
            type="button"
            aria-label={`Retirer ${v}`}
            className="rounded p-0.5 transition-colors hover:bg-gold/40"
            onClick={() => onChange(values.filter((x) => x !== v))}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            commit()
          } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
            onChange(values.slice(0, -1))
          }
        }}
        onBlur={commit}
        placeholder={values.length === 0 ? placeholder : ''}
        className="min-w-32 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-faint"
      />
    </div>
  )
}
