import { Loader2, Plus, Trash2 } from 'lucide-react'
import { Textarea } from '../ui'
import type { MaterielItem } from '../../types'

export interface MaterielsCardProps {
  materiels: MaterielItem[]
  onAdd: () => void
  onPatch: (id: string, patch: Partial<MaterielItem>) => void
  onDelete: (id: string) => void
  onSetPhoto: (id: string, file: File | undefined) => void
  onRemoveBackground: (item: MaterielItem) => void
  removingBgId: string | null
  inputCls: string
}

const MATERIAL_SIZES: { value: 'S' | 'M' | 'L'; label: string }[] = [
  { value: 'S', label: 'Petite' },
  { value: 'M', label: 'Moyenne' },
  { value: 'L', label: 'Grande' },
]

export function MaterielsCard({
  materiels,
  onAdd,
  onPatch,
  onDelete,
  onSetPhoto,
  onRemoveBackground,
  removingBgId,
  inputCls,
}: MaterielsCardProps) {
  return (
    <section className="rounded-xl border border-line bg-paper p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Matériel utilisé</p>
          <p className="text-[12px] text-faint">Cette section apparaîtra avant les fiches techniques dans l’aperçu.</p>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted transition-colors hover:border-gold-deep/40 hover:text-ink"
        >
          <Plus size={13} />
          Ajouter
        </button>
      </div>
      {materiels.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line-strong bg-cream/50 px-4 py-5 text-center text-[13px] text-faint">
          Ajoutez les équipements importants : pétrin, four, batteur, chambre de fermentation...
        </div>
      ) : (
        <div className="space-y-3">
          {materiels.map((item) => (
            <div key={item.id} className="grid gap-3 rounded-lg border border-line bg-white p-3 sm:grid-cols-[112px_1fr_auto]">
              <div className="flex flex-col gap-1.5">
                <label className="flex h-24 cursor-pointer items-center justify-center overflow-hidden rounded-md border border-line bg-cream/60 text-center text-[12px] text-faint hover:border-gold">
                  {item.imageDataUrl ? (
                    <img src={item.imageDataUrl} alt="" className="h-full w-full object-contain" />
                  ) : (
                    <span>Ajouter<br />photo</span>
                  )}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    className="hidden"
                    onChange={(e) => {
                      onSetPhoto(item.id, e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => onRemoveBackground(item)}
                  disabled={!item.imageDataUrl || removingBgId !== null}
                  className="inline-flex items-center justify-center gap-1 rounded-md border border-line px-1.5 py-1 text-[10.5px] text-muted transition-colors hover:border-gold-deep/40 hover:text-ink disabled:opacity-40"
                  title="Supprimer le fond de la photo"
                >
                  {removingBgId === item.id && <Loader2 size={11} className="animate-spin" />}
                  Enlever le fond
                </button>
                <div className="flex items-center gap-1">
                  {MATERIAL_SIZES.map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => onPatch(item.id, { size: s.value })}
                      title={s.label}
                      className={`flex-1 rounded-md border px-1 py-0.5 text-[10.5px] transition-colors ${
                        (item.size ?? 'M') === s.value
                          ? 'border-gold-deep bg-gold-soft text-gold-deep font-semibold'
                          : 'border-line text-faint hover:text-ink'
                      }`}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <input
                  type="text"
                  value={item.nom}
                  onChange={(e) => onPatch(item.id, { nom: e.target.value })}
                  placeholder="Nom du matériel, ex : Pétrin spirale"
                  className={inputCls}
                />
                <Textarea
                  label={item.nom || 'Matériel'}
                  value={item.utilisation}
                  onChange={(e) => onPatch(item.id, { utilisation: e.target.value })}
                  placeholder="Utilisation dans la production..."
                  rows={2}
                />
              </div>
              <button
                type="button"
                onClick={() => onDelete(item.id)}
                className="inline-flex h-9 w-9 shrink-0 self-start justify-self-end items-center justify-center rounded-md text-faint transition-colors hover:bg-danger/10 hover:text-danger active:bg-danger/10 active:text-danger"
                title="Supprimer ce matériel"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
