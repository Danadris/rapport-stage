import { useRef } from 'react'
import { AlertCircle, ImagePlus, Loader2, Plus, Trash2, Wheat, Croissant, CakeSlice, UtensilsCrossed, Boxes } from 'lucide-react'
import type { FicheTechnique, FicheIngredient, SectionImage } from '../../types'
import { Field, Textarea, Button } from '../ui'
import { cx } from '../../lib/cx'

export interface FicheCardProps {
  fiche: FicheTechnique
  onPatch: (patch: Partial<FicheTechnique>) => void
  onPatchIngredient: (ingId: string, patch: Partial<FicheIngredient>) => void
  onAddIngredient: () => void
  onDeleteIngredient: (ingId: string) => void
  images: SectionImage[]
  onAddPhoto: (file: File | undefined) => void
  onRemovePhoto: () => void
  onRemovePhotoBackground: () => void
  onSetPhotoSize: (size: 'S' | 'M' | 'L') => void
  removingBgId: string | null
  bgError: string | null
  aiLoading: boolean
  aiError: string | null
  onAiGenerate: () => void
  inputCls: string
}

const FAMILLES = [
  { value: 'pain', label: 'Pain', Icon: Wheat },
  { value: 'viennoiserie', label: 'Viennoiserie', Icon: Croissant },
  { value: 'patisserie', label: 'Pâtisserie', Icon: CakeSlice },
  { value: 'traiteur', label: 'Traiteur', Icon: UtensilsCrossed },
  { value: 'autre', label: 'Autre', Icon: Boxes },
]

const PHOTO_SIZES: { value: 'S' | 'M' | 'L'; label: string }[] = [
  { value: 'S', label: 'Petite' },
  { value: 'M', label: 'Moyenne' },
  { value: 'L', label: 'Grande' },
]

export function FicheCard({
  fiche,
  onPatch,
  onPatchIngredient,
  onAddIngredient,
  onDeleteIngredient,
  images,
  onAddPhoto,
  onRemovePhoto,
  onRemovePhotoBackground,
  onSetPhotoSize,
  removingBgId,
  bgError,
  aiLoading,
  aiError,
  onAiGenerate,
  inputCls,
}: FicheCardProps) {
  const photoRef = useRef<HTMLInputElement>(null)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-4 py-3">
        <div className="text-[12px] leading-snug text-muted">
          <span className="font-semibold text-ink">
            Génération assistée par IA <span className="font-normal text-faint">— non obligatoire</span>
          </span>
          <span className="text-faint">Remplit ingrédients, matériel, étapes et conseils à partir du nom du produit.</span>
        </div>
        <Button size="sm" variant="secondary" onClick={onAiGenerate} disabled={aiLoading}>
          {aiLoading && <Loader2 size={14} className="animate-spin" />}
          {aiLoading ? 'Génération...' : 'Générer la fiche'}
        </Button>
      </div>
      {aiError && (
        <div className="flex items-center gap-1.5 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2 text-[12px] text-danger">
          <AlertCircle size={14} /> {aiError}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="Nom du produit">
          <input
            type="text"
            value={fiche.nom}
            onChange={(e) => onPatch({ nom: e.target.value })}
            placeholder="Ex : Croissant beurre, Tarte aux fraises…"
            className={inputCls}
          />
        </Field>
        <Field label="Famille de produit">
          <div className="flex flex-wrap gap-1.5">
            {FAMILLES.map(({ value, label, Icon }) => {
              const active = fiche.famille === value
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => onPatch({ famille: value })}
                  aria-pressed={active}
                  title={label}
                  className={cx(
                    'flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors cursor-pointer',
                    active
                      ? 'border-gold-deep bg-gold-soft/50 font-medium text-ink'
                      : 'border-line bg-paper text-muted hover:border-line-strong hover:text-ink',
                  )}
                >
                  <Icon size={14} />
                  {label}
                </button>
              )
            })}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Field label="Nombre de pièces">
          <input
            type="text"
            value={fiche.nbPieces}
            onChange={(e) => onPatch({ nbPieces: e.target.value })}
            placeholder="Ex : 12"
            className={inputCls}
          />
        </Field>
        <Field label="Poids unitaire">
          <input
            type="text"
            value={fiche.poidsUnitaire}
            onChange={(e) => onPatch({ poidsUnitaire: e.target.value })}
            placeholder="Ex : 80 g"
            className={inputCls}
          />
        </Field>
        <Field label="Durée de réalisation">
          <input
            type="text"
            value={fiche.duree}
            onChange={(e) => onPatch({ duree: e.target.value })}
            placeholder="Ex : 2h30"
            className={inputCls}
          />
        </Field>
      </div>

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
            onAddPhoto(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {images.length > 0 ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-line bg-paper p-3">
            <img
              src={images[0].dataUrl}
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
                onClick={onRemovePhotoBackground}
                disabled={removingBgId !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-[12px] text-muted hover:border-gold-deep/40 hover:text-ink transition-colors disabled:opacity-50"
              >
                {removingBgId === images[0].id && <Loader2 size={13} className="animate-spin" />}
                Enlever le fond
              </button>
              <button
                type="button"
                onClick={onRemovePhoto}
                className="rounded-lg border border-line px-3 py-1.5 text-[12px] text-faint hover:text-danger transition-colors"
              >
                Supprimer
              </button>
              <div className="ml-auto flex items-center gap-1 rounded-lg border border-line p-0.5">
                {PHOTO_SIZES.map((s) => (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => onSetPhotoSize(s.value)}
                    title={`Photo ${s.label.toLowerCase()}`}
                    className={`rounded-md px-2 py-1 text-[11px] transition-colors ${
                      (images[0].size ?? 'M') === s.value
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

      <div>
        <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-muted">Ingrédients</p>
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
              {fiche.ingredients.map((ing, idx) => (
                <tr key={ing.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-cream/30'}>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={ing.ingredient}
                      onChange={(e) => onPatchIngredient(ing.id, { ingredient: e.target.value })}
                      placeholder="Ex : Farine T65"
                      className="w-full bg-transparent px-1 py-0.5 text-[13px] text-ink placeholder-faint outline-none focus:bg-white focus:rounded focus:ring-1 focus:ring-gold-deep/30 transition"
                    />
                  </td>
                  <td className="px-2 py-1">
                    <input
                      type="text"
                      value={ing.quantite}
                      onChange={(e) => onPatchIngredient(ing.id, { quantite: e.target.value })}
                      placeholder="500 g"
                      className="w-full bg-transparent px-1 py-0.5 text-[13px] text-ink placeholder-faint outline-none focus:bg-white focus:rounded focus:ring-1 focus:ring-gold-deep/30 transition"
                    />
                  </td>
                  <td className="px-1 py-1 text-center">
                    <button
                      type="button"
                      onClick={() => onDeleteIngredient(ing.id)}
                      disabled={fiche.ingredients.length <= 1}
                      className="inline-flex h-8 w-8 items-center justify-center rounded text-faint hover:bg-danger/10 hover:text-danger active:bg-danger/10 active:text-danger disabled:opacity-20 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t border-line bg-paper px-3 py-2">
            <button
              type="button"
              onClick={onAddIngredient}
              className="flex items-center gap-1.5 text-[12px] text-gold-deep hover:text-ink transition-colors"
            >
              <Plus size={13} />
              Ajouter un ingrédient
            </button>
          </div>
        </div>
      </div>

      <Field label="Matériel nécessaire">
        <Textarea
          label="Matériel nécessaire"
          value={fiche.materiel}
          onChange={(e) => onPatch({ materiel: e.target.value })}
          placeholder="Ex : Pétrin, batteur, moules à tarte Ø22cm, spatule coudée…"
          rows={3}
        />
      </Field>

      <Field label="Étapes de réalisation">
        <Textarea
          label="Étapes de réalisation"
          value={fiche.etapes}
          onChange={(e) => onPatch({ etapes: e.target.value })}
          placeholder={"1. Peser tous les ingrédients.\n2. Mélanger la farine et le sel.\n3. Ajouter l'eau progressivement…"}
          rows={7}
        />
      </Field>

      <Field label="Conseils & astuces" hint="Optionnel">
        <Textarea
          label="Conseils & astuces"
          value={fiche.conseils}
          onChange={(e) => onPatch({ conseils: e.target.value })}
          placeholder="Astuces de professionnel, points de vigilance, variations possibles…"
          rows={3}
        />
      </Field>
    </div>
  )
}
