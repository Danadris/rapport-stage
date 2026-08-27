import { AlignCenter, AlignLeft, AlignRight, GripVertical, ImagePlus, Trash2, Wand2, Loader2 } from 'lucide-react'
import { useRef, useState } from 'react'
import type { SectionImage } from '../types'
import { cx } from '../lib/cx'
import { Input } from './ui'
import { removeBg } from '../lib/bgRemoval'

interface ImageManagerProps {
  images: SectionImage[]
  onChange: (images: SectionImage[]) => void
  max?: number
}

export function ImageManager({ images, onChange, max = 6 }: ImageManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [overIdx, setOverIdx] = useState<number | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const handleRemoveBg = async (id: string, dataUrl: string) => {
    try {
      setRemovingId(id)
      const noBg = await removeBg(dataUrl)
      update(id, { dataUrl: noBg })
    } catch (e) {
      console.error('Failed to remove bg', e)
    } finally {
      setRemovingId(null)
    }
  }

  const addFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onChange([
          ...images,
          { id: crypto.randomUUID(), dataUrl: reader.result, side: 'right', size: 'M' },
        ])
      }
    }
    reader.readAsDataURL(file)
  }

  const update = (id: string, patch: Partial<SectionImage>) =>
    onChange(images.map((img) => (img.id === id ? { ...img, ...patch } : img)))

  const handleDragStart = (idx: number) => setDragIdx(idx)
  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    setOverIdx(idx)
  }
  const handleDrop = (idx: number) => {
    if (dragIdx === null || dragIdx === idx) {
      setDragIdx(null)
      setOverIdx(null)
      return
    }
    const reordered = [...images]
    const [moved] = reordered.splice(dragIdx, 1)
    reordered.splice(idx, 0, moved)
    onChange(reordered)
    setDragIdx(null)
    setOverIdx(null)
  }
  const handleDragEnd = () => {
    setDragIdx(null)
    setOverIdx(null)
  }

  return (
    <div className="border-t border-line pt-5">
      <span className="text-[13px] font-medium text-ink">
        Images de la section{' '}
        <span className="text-[11px] font-normal text-faint">Optionnel · glisser pour réordonner</span>
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          addFile(e.target.files?.[0])
          e.target.value = ''
        }}
      />
      <div className="mt-3 space-y-3">
        {images.map((img, idx) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => handleDragStart(idx)}
            onDragOver={(e) => handleDragOver(e, idx)}
            onDrop={() => handleDrop(idx)}
            onDragEnd={handleDragEnd}
            className={cx(
              'flex gap-3 rounded-lg border bg-paper p-3 transition-all duration-150',
              overIdx === idx && dragIdx !== null && dragIdx !== idx
                ? 'border-gold ring-1 ring-gold/30'
                : 'border-line',
              dragIdx === idx ? 'opacity-50' : '',
            )}
          >
            <div className="flex flex-col items-center justify-center gap-1 cursor-grab active:cursor-grabbing text-faint hover:text-muted">
              <GripVertical size={16} />
            </div>
            <img src={img.dataUrl} alt="" className="h-20 w-20 shrink-0 rounded-md border border-line object-cover" />
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    ['left', AlignLeft, 'À gauche'],
                    ['center', AlignCenter, 'Centré'],
                    ['right', AlignRight, 'À droite'],
                  ] as const
                ).map(([side, Icon, label]) => (
                  <button
                    key={side}
                    type="button"
                    title={label}
                    aria-label={label}
                    onClick={() => update(img.id, { side })}
                    className={cx(
                      'flex h-7 w-7 items-center justify-center rounded-md border transition-colors duration-150',
                      img.side === side
                        ? 'border-gold-deep bg-gold-soft text-gold-deep'
                        : 'border-line text-muted hover:border-line-strong hover:text-ink',
                    )}
                  >
                    <Icon size={14} />
                  </button>
                ))}
                <span className="mx-1 h-5 w-px bg-line" />
                {(['S', 'M', 'L'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    title={s === 'S' ? 'Petite (6 cm)' : s === 'M' ? 'Moyenne (9 cm)' : 'Grande (14 cm)'}
                    onClick={() => update(img.id, { size: s })}
                    className={cx(
                      'h-7 rounded-md border px-2.5 font-mono text-[11px] transition-colors duration-150',
                      img.size === s
                        ? 'border-gold-deep bg-gold-soft text-gold-deep'
                        : 'border-line text-muted hover:border-line-strong hover:text-ink',
                    )}
                  >
                    {s}
                  </button>
                ))}
                <div className="ml-auto flex gap-1">
                  <button
                    type="button"
                    title="Détourer l'image (Enlever le fond)"
                    onClick={() => handleRemoveBg(img.id, img.dataUrl)}
                    disabled={removingId === img.id}
                    className="flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors duration-150 hover:bg-gold-soft hover:text-gold-deep disabled:opacity-50"
                  >
                    {removingId === img.id ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
                  </button>
                  <button
                    type="button"
                  title="Supprimer"
                  aria-label="Supprimer l'image"
                  onClick={() => onChange(images.filter((x) => x.id !== img.id))}
                  className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-faint transition-colors duration-150 hover:bg-danger/10 hover:text-danger"
                >
                  <Trash2 size={14} />
                </button>
                </div>
              </div>
              <Input
                value={img.caption ?? ''}
                placeholder="Légende (ex : Figure 1 : Four à sole)"
                onChange={(e) => update(img.id, { caption: e.target.value })}
                className="py-1.5 text-[13px]"
              />
            </div>
          </div>
        ))}
        {images.length < max && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-cream/60 px-3 py-2.5 text-[13px] text-muted transition-colors duration-150 hover:border-gold hover:bg-gold-soft/50 hover:text-gold-deep"
          >
            <ImagePlus size={15} />
            Ajouter une image
          </button>
        )}
      </div>
    </div>
  )
}
