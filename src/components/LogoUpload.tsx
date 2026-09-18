import { ImagePlus, Trash2, Loader2, RotateCcw } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { cx } from '../lib/cx'
import { useBackgroundRemoval } from '../hooks/useBackgroundRemoval'
import { removeWhiteBackground } from '../lib/bgRemoval'

interface LogoUploadProps {
  value?: string
  onChange: (dataUrl: string | undefined) => void
  label: string
  aspect?: 'square' | 'wide'
}

export function LogoUpload({ value, onChange, label, aspect = 'wide' }: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { activeId, error: bgError, clearError, removeBackground } = useBackgroundRemoval()
  const isRemovingBg = activeId === 'logo'

  const [originalDataUrl, setOriginalDataUrl] = useState<string | undefined>(value)
  const [isCutout, setIsCutout] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const isCutoutRef = useRef(false)
  const cutoutUrlRef = useRef<string | undefined>(undefined)
  const lastPropValueRef = useRef(value)

  useEffect(() => {
    if (value !== lastPropValueRef.current) {
      lastPropValueRef.current = value
      if (value !== cutoutUrlRef.current) {
        cutoutUrlRef.current = undefined
        isCutoutRef.current = false
        setIsCutout(false)
        setOriginalDataUrl(value)
      }
    }
  }, [value])

  const handleFile = (file: File | undefined) => {
    if (!file) return
    clearError()
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const dataUrl = reader.result
        cutoutUrlRef.current = undefined
        setOriginalDataUrl(dataUrl)
        setIsCutout(false)
        isCutoutRef.current = false
        onChange(dataUrl)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleRemoveBg = async () => {
    if (!value || isRemovingBg || isProcessing || isCutout) return
    clearError()
    setIsProcessing(true)

    const currentImage = originalDataUrl || value
    if (!originalDataUrl) {
      setOriginalDataUrl(currentImage)
    }

    try {
      const cutout = await removeWhiteBackground(currentImage)
      cutoutUrlRef.current = cutout
      isCutoutRef.current = true
      setIsCutout(true)
      onChange(cutout)
    } catch (err) {
      console.warn('Canvas white background removal skipped/failed, trying neural worker', err)
      await removeBackground('logo', currentImage, (cutout) => {
        cutoutUrlRef.current = cutout
        isCutoutRef.current = true
        setIsCutout(true)
        onChange(cutout)
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const handleRevert = () => {
    if (!originalDataUrl) return
    clearError()
    cutoutUrlRef.current = undefined
    isCutoutRef.current = false
    setIsCutout(false)
    onChange(originalDataUrl)
  }

  const handleDelete = () => {
    clearError()
    cutoutUrlRef.current = undefined
    isCutoutRef.current = false
    setIsCutout(false)
    setOriginalDataUrl(undefined)
    onChange(undefined)
  }

  const isBusy = isRemovingBg || isProcessing

  return (
    <div className="space-y-1.5">
      <span className="text-[13px] font-medium text-ink">
        {label} <span className="text-[11px] font-normal text-faint">Optionnel</span>
      </span>
      {bgError && (
        <p className="text-[12px] text-danger" role="alert">
          {bgError}
        </p>
      )}
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
        <div className="space-y-2">
          <div
            className={cx(
              'relative overflow-hidden rounded-lg border border-line bg-paper flex items-center justify-center p-2',
              aspect === 'square' ? 'aspect-square w-32' : 'h-24',
            )}
          >
            <img
              src={value}
              alt={label}
              className={cx('h-full w-full object-contain', isBusy && 'opacity-50')}
            />
            {isBusy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/5 backdrop-blur-sm">
                <Loader2 className="animate-spin text-ink" size={24} />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-label="Retirer le fond"
              title={isCutout ? 'Le fond a déjà été retiré' : 'Retirer le fond'}
              onClick={handleRemoveBg}
              disabled={isBusy || isCutout}
              className={cx(
                'inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-[12px] font-medium transition-colors duration-150',
                isCutout
                  ? 'cursor-not-allowed text-faint opacity-50'
                  : 'cursor-pointer text-muted hover:border-gold hover:bg-gold-soft/50 hover:text-gold-deep disabled:opacity-50',
              )}
            >
              {isBusy && <Loader2 size={13} className="animate-spin text-ink" />}
              <span>Retirer le fond</span>
            </button>

            {isCutout && originalDataUrl && (
              <button
                type="button"
                aria-label="Rétablir l'original"
                title="Rétablir l'image d'origine"
                onClick={handleRevert}
                disabled={isBusy}
                className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-[12px] font-medium text-muted transition-colors duration-150 hover:border-gold hover:bg-gold-soft/50 hover:text-gold-deep disabled:opacity-50 cursor-pointer"
              >
                <RotateCcw size={13} className="text-muted" />
                <span>Rétablir l'original</span>
              </button>
            )}

            <button
              type="button"
              aria-label="Retirer l'image"
              title="Supprimer l'image"
              onClick={handleDelete}
              disabled={isBusy}
              className="inline-flex items-center gap-1.5 rounded-md border border-line bg-paper px-2.5 py-1 text-[12px] font-medium text-muted transition-colors duration-150 hover:border-danger/30 hover:bg-danger/5 hover:text-danger disabled:opacity-50 cursor-pointer"
            >
              <Trash2 size={13} className="text-muted" />
              <span>Retirer</span>
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className={cx(
            'flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-cream/60 px-3 py-4 text-sm text-muted transition-colors duration-150',
            'hover:border-gold hover:bg-gold-soft/50 hover:text-gold-deep cursor-pointer',
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
