import { useRef, useState } from 'react'
import { Plus, Trash2, ChefHat, GripVertical, ImagePlus, Sparkles, AlertCircle, Wand2, Loader2 } from 'lucide-react'
import type { FicheTechnique, FicheIngredient, SectionImage, Entreprise, MaterielItem } from '../../types'
import { Field, Textarea, Button } from '../ui'
import { genererFicheTechnique } from '../../lib/ai'
import { useBackgroundRemoval } from '../../hooks/useBackgroundRemoval'

const FAMILLES = [
  { value: 'pain', label: '🍞 Pain' },
  { value: 'viennoiserie', label: '🥐 Viennoiserie' },
  { value: 'patisserie', label: '🎂 Pâtisserie' },
  { value: 'traiteur', label: '🍽️ Traiteur' },
  { value: 'autre', label: '✨ Autre' },
]

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
  const photoRef = useRef<HTMLInputElement>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
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

  const MATERIAL_SIZES: { value: 'S' | 'M' | 'L'; label: string }[] = [
    { value: 'S', label: 'Petite' },
    { value: 'M', label: 'Moyenne' },
    { value: 'L', label: 'Grande' },
  ]

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

  const handleAiGenerate = async () => {
    if (!activeFiche) return
    if (!activeFiche.nom.trim()) {
      setAiError('Renseignez d\'abord le nom du produit.')
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await genererFicheTechnique(activeFiche.nom, entrepriseContext)
      patchActive(res)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur de génération')
    } finally {
      setAiLoading(false)
    }
  }

  const inputCls = 'block w-full rounded-lg border border-line bg-white px-3 py-2 text-[13px] text-ink placeholder-faint outline-none focus:border-gold-deep focus:ring-2 focus:ring-gold-deep/20 transition'

  return (
    <div className="space-y-7">
      <section className="rounded-xl border border-line bg-paper p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Matériel utilisé</p>
            <p className="text-[12px] text-faint">Cette section apparaîtra avant les fiches techniques dans l’aperçu.</p>
          </div>
          <button
            type="button"
            onClick={addMateriel}
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
                        setMaterielPhoto(item.id, e.target.files?.[0])
                        e.target.value = ''
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => removeMaterielPhotoBackground(item)}
                    disabled={!item.imageDataUrl || removingBgId !== null}
                    className="inline-flex items-center justify-center gap-1 rounded-md border border-line px-1.5 py-1 text-[10.5px] text-muted transition-colors hover:border-gold-deep/40 hover:text-ink disabled:opacity-40"
                    title="Supprimer le fond de la photo"
                  >
                    {removingBgId === item.id ? <Loader2 size={11} className="animate-spin" /> : <Wand2 size={11} />}
                    Enlever le fond
                  </button>
                  <div className="flex items-center gap-1">
                    {MATERIAL_SIZES.map((s) => (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => patchMateriel(item.id, { size: s.value })}
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
                    onChange={(e) => patchMateriel(item.id, { nom: e.target.value })}
                    placeholder="Nom du matériel, ex : Pétrin spirale"
                    className={inputCls}
                  />
                  <Textarea
                    value={item.utilisation}
                    onChange={(e) => patchMateriel(item.id, { utilisation: e.target.value })}
                    placeholder="Utilisation dans la production..."
                    rows={2}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => deleteMateriel(item.id)}
                  className="h-8 rounded p-1.5 text-faint transition-colors hover:bg-danger/10 hover:text-danger"
                  title="Supprimer ce matériel"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <div className="flex min-h-0 flex-col gap-6 md:flex-row">
      {/* Left sidebar */}
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
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-faint hover:text-danger transition-all"
                title="Supprimer cette fiche"
              >
                <Trash2 size={11} />
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

      {/* Right — active fiche editor */}
      <div className="flex-1 min-w-0">
        {!activeFiche ? (
          <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line text-faint">
            <ChefHat size={32} strokeWidth={1.5} />
            <p className="text-sm">Cliquez sur « Ajouter une fiche » pour commencer</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI generation */}
            <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3">
              <div className="text-[12px] leading-snug text-muted">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Sparkles size={13} className="text-gold-deep" />
                  Génération assistée par IA
                </span>
                <span className="text-faint">Remplit ingrédients, matériel, étapes et conseils à partir du nom du produit.</span>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleAiGenerate}
                disabled={aiLoading}
              >
                <Sparkles size={14} className={aiLoading ? 'animate-pulse text-gold-deep' : 'text-gold-deep'} />
                {aiLoading ? 'Génération...' : 'Générer la fiche'}
              </Button>
            </div>
            {aiError && (
              <div className="flex items-center gap-1.5 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[12px] text-danger">
                <AlertCircle size={14} /> {aiError}
              </div>
            )}

            {/* Identity */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Nom du produit">
                <input
                  type="text"
                  value={activeFiche.nom}
                  onChange={(e) => patchActive({ nom: e.target.value })}
                  placeholder="Ex : Croissant beurre, Tarte aux fraises…"
                  className={inputCls}
                />
              </Field>
              <Field label="Famille de produit">
                <select
                  value={activeFiche.famille}
                  onChange={(e) => patchActive({ famille: e.target.value })}
                  className={inputCls}
                >
                  {FAMILLES.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </Field>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Field label="Nombre de pièces">
                <input
                  type="text"
                  value={activeFiche.nbPieces}
                  onChange={(e) => patchActive({ nbPieces: e.target.value })}
                  placeholder="Ex : 12"
                  className={inputCls}
                />
              </Field>
              <Field label="Poids unitaire">
                <input
                  type="text"
                  value={activeFiche.poidsUnitaire}
                  onChange={(e) => patchActive({ poidsUnitaire: e.target.value })}
                  placeholder="Ex : 80 g"
                  className={inputCls}
                />
              </Field>
              <Field label="Durée de réalisation">
                <input
                  type="text"
                  value={activeFiche.duree}
                  onChange={(e) => patchActive({ duree: e.target.value })}
                  placeholder="Ex : 2h30"
                  className={inputCls}
                />
              </Field>
            </div>

            {/* Photo du produit */}
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                Photo du produit <span className="font-normal normal-case text-faint">Optionnel</span>
              </p>
              {bgError && (
                <p className="mb-2 text-[12px] text-danger" role="alert">
                  {bgError}
                </p>
              )}
              <input
                ref={photoRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => {
                  addPhoto(e.target.files?.[0])
                  e.target.value = ''
                }}
              />
              {ficheImages.length > 0 ? (
                <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper p-3">
                  <img
                    src={ficheImages[0].dataUrl}
                    alt=""
                    className="h-20 w-28 shrink-0 rounded-md border border-line object-cover"
                  />
                  <div className="flex flex-1 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => photoRef.current?.click()}
                      className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted hover:border-gold-deep/40 hover:text-ink transition-colors"
                    >
                      Remplacer
                    </button>
                    <button
                      type="button"
                      onClick={removePhotoBackground}
                      disabled={removingBgId !== null}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted hover:border-gold-deep/40 hover:text-ink transition-colors disabled:opacity-50"
                    >
                      {removingBgId === ficheImages[0].id ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
                      Enlever le fond
                    </button>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-faint hover:text-danger transition-colors"
                    >
                      Supprimer
                    </button>
                    <div className="ml-auto flex items-center gap-1 rounded-lg border border-line p-0.5">
                      {MATERIAL_SIZES.map((s) => (
                        <button
                          key={s.value}
                          type="button"
                          onClick={() => setPhotoSize(s.value)}
                          title={`Photo ${s.label.toLowerCase()}`}
                          className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                            (ficheImages[0].size ?? 'M') === s.value
                              ? 'bg-gold-soft text-gold-deep font-semibold'
                              : 'text-faint hover:text-ink'
                          }`}
                        >
                          {s.value}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoRef.current?.click()}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-line-strong bg-cream/60 px-3 py-4 text-[12px] text-muted hover:border-gold hover:bg-gold-soft/50 hover:text-gold-deep transition-colors"
                >
                  <ImagePlus size={15} />
                  Ajouter une photo du produit
                </button>
              )}
            </div>

            {/* Ingredients table */}
            <div>
              <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">
                Ingrédients
              </p>
              <div className="rounded-lg border border-line overflow-x-auto">
                <table className="w-full min-w-[400px] text-[13px]">
                  <thead>
                    <tr className="bg-paper border-b border-line">
                      <th className="px-3 py-2 text-left font-medium text-muted">Ingrédient</th>
                      <th className="px-3 py-2 text-left font-medium text-muted w-32">Quantité</th>
                      <th className="w-8" />
                    </tr>
                  </thead>
                  <tbody>
                    {activeFiche.ingredients.map((ing, idx) => (
                      <tr key={ing.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-cream/30'}>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={ing.ingredient}
                            onChange={(e) => patchIngredient(ing.id, { ingredient: e.target.value })}
                            placeholder="Ex : Farine T65"
                            className="w-full bg-transparent px-1 py-0.5 text-[13px] text-ink placeholder-faint outline-none focus:bg-white focus:rounded focus:ring-1 focus:ring-gold-deep/30 transition"
                          />
                        </td>
                        <td className="px-2 py-1">
                          <input
                            type="text"
                            value={ing.quantite}
                            onChange={(e) => patchIngredient(ing.id, { quantite: e.target.value })}
                            placeholder="500 g"
                            className="w-full bg-transparent px-1 py-0.5 text-[13px] text-ink placeholder-faint outline-none focus:bg-white focus:rounded focus:ring-1 focus:ring-gold-deep/30 transition"
                          />
                        </td>
                        <td className="px-1 py-1 text-center">
                          <button
                            type="button"
                            onClick={() => deleteIngredient(ing.id)}
                            disabled={activeFiche.ingredients.length <= 1}
                            className="rounded p-0.5 text-faint hover:text-danger disabled:opacity-20 transition-colors"
                          >
                            <Trash2 size={11} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="border-t border-line bg-paper px-3 py-2">
                  <button
                    type="button"
                    onClick={addIngredient}
                    className="flex items-center gap-1.5 text-[12px] text-gold-deep hover:text-ink transition-colors"
                  >
                    <Plus size={13} />
                    Ajouter un ingrédient
                  </button>
                </div>
              </div>
            </div>

            {/* Materiel */}
            <Field label="Matériel nécessaire">
              <Textarea
                value={activeFiche.materiel}
                onChange={(e) => patchActive({ materiel: e.target.value })}
                placeholder="Ex : Pétrin, batteur, moules à tarte Ø22cm, spatule coudée…"
                rows={3}
              />
            </Field>

            {/* Etapes */}
            <Field label="Étapes de réalisation">
              <Textarea
                value={activeFiche.etapes}
                onChange={(e) => patchActive({ etapes: e.target.value })}
                placeholder={"1. Peser tous les ingrédients.\n2. Mélanger la farine et le sel.\n3. Ajouter l'eau progressivement…"}
                rows={7}
              />
            </Field>

            {/* Conseils */}
            <Field label="Conseils & astuces" hint="Optionnel">
              <Textarea
                value={activeFiche.conseils}
                onChange={(e) => patchActive({ conseils: e.target.value })}
                placeholder="Astuces de professionnel, points de vigilance, variations possibles…"
                rows={3}
              />
            </Field>
          </div>
        )}
      </div>
      </div>
    </div>
  )
}
