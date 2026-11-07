import { useState } from 'react'
import { Plus, Trash2, ChefHat, GripVertical } from 'lucide-react'
import type { FicheTechnique, FicheIngredient, SectionImage, Entreprise, MaterielItem } from '../../types'
import { useBackgroundRemoval } from '../../hooks/useBackgroundRemoval'
import { MaterielsCard } from './MaterielsCard'
import { FicheCard } from './FicheCard'
import { useFicheAi } from './useFicheAi'

function newFiche(): FicheTechnique {
  return {
    id: crypto.randomUUID(),
    nom: '',
    famille: 'patisserie',
    nbPieces: '',
    poidsUnitaire: '',
    duree: '',
    ingredients: [{ id: crypto.randomUUID(), ingredient: '', quantite: '' }],
    materiel: '',
    etapes: '',
    conseils: '',
  }
}

function newIngredient(): FicheIngredient {
  return { id: crypto.randomUUID(), ingredient: '', quantite: '' }
}

function newMateriel(): MaterielItem {
  return { id: crypto.randomUUID(), nom: '', utilisation: '', size: 'M' }
}

interface Props {
  fiches: FicheTechnique[]
  onChange: (fiches: FicheTechnique[]) => void
  materiels?: MaterielItem[]
  onMaterielsChange?: (items: MaterielItem[]) => void
  getImages?: (ficheId: string) => SectionImage[]
  onImagesChange?: (ficheId: string, imgs: SectionImage[]) => void
  entreprise?: Entreprise
}

export function FicheTechniqueStep({ fiches, onChange, materiels = [], onMaterielsChange, getImages, onImagesChange, entreprise }: Props) {
  const [selectedFicheId, setActiveId] = useState<string | null>(fiches[0]?.id ?? null)
  const { activeId: removingBgId, error: bgError, removeBackground } = useBackgroundRemoval()

  const activeId = fiches.some((f) => f.id === selectedFicheId) ? selectedFicheId : fiches[0]?.id ?? null
  const activeFiche = fiches.find((f) => f.id === activeId) ?? null

  const addFiche = () => {
    const f = newFiche()
    onChange([...fiches, f])
    setActiveId(f.id)
  }

  const deleteFiche = (id: string) => {
    const remaining = fiches.filter((f) => f.id !== id)
    onChange(remaining)
    if (activeId === id) setActiveId(remaining[0]?.id ?? null)
  }

  const patchActive = (patch: Partial<FicheTechnique>) => {
    if (!activeFiche) return
    onChange(fiches.map((f) => (f.id === activeFiche.id ? { ...f, ...patch } : f)))
  }

  const patchIngredient = (ingId: string, patch: Partial<FicheIngredient>) => {
    if (!activeFiche) return
    patchActive({
      ingredients: activeFiche.ingredients.map((i) => (i.id === ingId ? { ...i, ...patch } : i)),
    })
  }

  const addIngredient = () => {
    if (!activeFiche) return
    patchActive({ ingredients: [...activeFiche.ingredients, newIngredient()] })
  }

  const deleteIngredient = (ingId: string) => {
    if (!activeFiche) return
    patchActive({ ingredients: activeFiche.ingredients.filter((i) => i.id !== ingId) })
  }

  const addMateriel = () => onMaterielsChange?.([...materiels, newMateriel()])
  const patchMateriel = (id: string, patch: Partial<MaterielItem>) =>
    onMaterielsChange?.(materiels.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  const deleteMateriel = (id: string) => onMaterielsChange?.(materiels.filter((item) => item.id !== id))
  const setMaterielPhoto = (id: string, file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') patchMateriel(id, { imageDataUrl: reader.result })
    }
    reader.readAsDataURL(file)
  }

  const removeMaterielPhotoBackground = (item: MaterielItem) => {
    if (!item.imageDataUrl) return
    void removeBackground(item.id, item.imageDataUrl, (dataUrl) => {
      patchMateriel(item.id, { imageDataUrl: dataUrl })
    })
  }

  const ficheImages = activeFiche && getImages ? getImages(activeFiche.id) : []
  const addPhoto = (file: File | undefined) => {
    if (!activeFiche || !file || !onImagesChange) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImagesChange(activeFiche.id, [{ id: crypto.randomUUID(), dataUrl: reader.result, side: 'right', size: 'M' }])
      }
    }
    reader.readAsDataURL(file)
  }
  const removePhoto = () => {
    if (!activeFiche || !onImagesChange) return
    onImagesChange(activeFiche.id, [])
  }

  const removePhotoBackground = () => {
    if (!activeFiche || !onImagesChange || ficheImages.length === 0) return
    const img = ficheImages[0]
    void removeBackground(img.id, img.dataUrl, (dataUrl) => {
      onImagesChange(activeFiche.id, [{ ...img, dataUrl }])
    })
  }

  const setPhotoSize = (size: 'S' | 'M' | 'L') => {
    if (!activeFiche || !onImagesChange || ficheImages.length === 0) return
    const img = ficheImages[0]
    onImagesChange(activeFiche.id, [{ ...img, size }])
  }

  const entrepriseContext = entreprise
    ? [
        entreprise.nom?.trim() ? `Entreprise : ${entreprise.nom}` : '',
        entreprise.secteurActivite?.trim() ? `Secteur : ${entreprise.secteurActivite}` : '',
        entreprise.historique?.trim() ? `Historique : ${entreprise.historique}` : '',
        entreprise.missionsValeurs?.trim() ? `Missions : ${entreprise.missionsValeurs}` : '',
        entreprise.activitesPrincipales?.trim() ? `Activités : ${entreprise.activitesPrincipales}` : '',
      ].filter(Boolean).join('\n')
    : ''

  const { aiLoading, aiError, handleAiGenerate } = useFicheAi({
    activeFiche,
    entrepriseContext,
    patchActive,
  })

  const inputCls = 'block w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder-faint outline-none focus:border-gold-deep focus:ring-2 focus:ring-gold-deep/20 transition'

  return (
    <div className="space-y-7">
      <MaterielsCard
        materiels={materiels}
        onAdd={addMateriel}
        onPatch={patchMateriel}
        onDelete={deleteMateriel}
        onSetPhoto={setMaterielPhoto}
        onRemoveBackground={removeMaterielPhotoBackground}
        removingBgId={removingBgId}
        inputCls={inputCls}
      />

      <div className="flex min-h-0 flex-col gap-6 md:flex-row">
        <div className="w-full shrink-0 md:w-52">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-2 md:flex-col md:space-y-1.5 md:space-x-0 md:overflow-visible md:pb-0">
            {fiches.length === 0 && (
              <p className="text-[12px] italic text-faint px-1 mb-3 hidden md:block">Aucune fiche pour l'instant.</p>
            )}
            {fiches.map((f, i) => (
              <div
                key={f.id}
                className={`group flex shrink-0 md:w-full items-center gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                  f.id === activeId
                    ? 'border-gold-deep bg-gold-soft text-ink'
                    : 'border-line bg-paper text-muted hover:border-gold-deep/40 hover:text-ink'
                }`}
                onClick={() => setActiveId(f.id)}
              >
                <GripVertical size={12} className="shrink-0 text-faint" />
                <span className="flex-1 min-w-0">
                  <span className="block text-[11px] text-faint">Fiche {i + 1}</span>
                  <span className="block truncate text-[12px] font-medium">
                    {f.nom || <span className="italic text-faint">Sans nom</span>}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); deleteFiche(f.id) }}
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded text-faint opacity-60 transition-all hover:bg-danger/10 hover:text-danger hover:opacity-100 active:bg-danger/10 active:text-danger"
                  title="Supprimer cette fiche"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addFiche}
              className="flex w-full shrink-0 md:w-full items-center gap-2 rounded-lg border border-dashed border-line px-3 py-2 text-[12px] text-faint hover:border-gold-deep hover:text-ink transition-colors"
            >
              <Plus size={13} />
              Ajouter une fiche
            </button>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {!activeFiche ? (
            <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line text-faint">
              <ChefHat size={32} strokeWidth={1.5} />
              <p className="text-sm">Cliquez sur « Ajouter une fiche » pour commencer</p>
            </div>
          ) : (
            <FicheCard
              fiche={activeFiche}
              onPatch={patchActive}
              onPatchIngredient={patchIngredient}
              onAddIngredient={addIngredient}
              onDeleteIngredient={deleteIngredient}
              images={ficheImages}
              onAddPhoto={addPhoto}
              onRemovePhoto={removePhoto}
              onRemovePhotoBackground={removePhotoBackground}
              onSetPhotoSize={setPhotoSize}
              removingBgId={removingBgId}
              bgError={bgError}
              aiLoading={aiLoading}
              aiError={aiError}
              onAiGenerate={handleAiGenerate}
              inputCls={inputCls}
            />
          )}
        </div>
      </div>
    </div>
  )
}
