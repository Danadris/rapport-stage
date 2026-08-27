import { ImagePlus, Trash2, Wand2, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import { cx } from '../lib/cx'
import { removeBg } from '../lib/bgRemoval'

interface LogoUploadProps {
  value?: string
  onChange: (dataUrl: string | undefined) => void
  label: string
  aspect?: 'square' | 'wide'
}

export function LogoUpload({ value, onChange, label, aspect = 'wide' }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isRemovingBg, setIsRemovingBg] = useState(false)

  const handleFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onChange(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBg = async () => {
    if (!value) return
    try {
      setIsRemovingBg(true)
      const noBg = await removeBg(value)
      onChange(noBg)
    } catch (e) {
      console.error('Failed to remove bg', e)
    } finally {
      setIsRemovingBg(false)
    }
  }

  return (
    <div className="space-y-1.5">
      <span className="text-[13px] font-medium text-ink">
        {label} <span className="text-[11px] font-normal text-faint">Optionnel</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      {value ? (
        <div
          className={cx(
            'group relative overflow-hidden rounded-lg border border-line bg-paper',
            aspect === 'square' ? 'aspect-square w-32' : 'h-24',
          )}
        >
          <img src={value} alt={label} className={cx("h-full w-full object-contain", isRemovingBg && "opacity-50")} />
          {isRemovingBg && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-sm">
              <Loader2 className="animate-spin text-ink" size={24} />
            </div>
          )}
          
          <div className="absolute top-1.5 right-1.5 flex gap-1.5 opacity-0 transition-opacity group-hover:opacity-100">
            {!isRemovingBg && (
              <button
                type="button"
                aria-label="Enlever le fond"
                title="Détourer l'image"
                onClick={handleRemoveBg}
                className="rounded-md bg-paper/90 p-1.5 text-muted hover:text-gold-deep"
              >
                <Wand2 size={14} />
              </button>
            )}
            <button
              type="button"
              aria-label="Retirer l'image"
              onClick={() => onChange(undefined)}
              className="rounded-md bg-paper/90 p-1.5 text-muted hover:text-danger"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cx(
            'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-cream/60 px-3 py-4 text-sm text-muted transition-colors duration-150',
            'hover:border-gold hover:bg-gold-soft/50 hover:text-gold-deep',
            aspect === 'square' && 'aspect-square w-32 flex-col py-2',
          )}
        >
          <ImagePlus size={16} />
          Choisir une image
        </button>
      )}
    </div>
  )
}
