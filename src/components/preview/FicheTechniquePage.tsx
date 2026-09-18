import { Fragment, useRef } from 'react'
import { Eye, EyeOff, ImagePlus, Loader2, Trash2, Scissors } from 'lucide-react'
import type { FicheIngredient, FicheTechnique } from '../../types'
import logo from '../../assets/ifmbp-logo-official.png'

const FAMILLE_LABELS: Record<string, string> = {
  pain: 'Pain',
  viennoiserie: 'Viennoiserie',
  patisserie: 'Pâtisserie',
  traiteur: 'Traiteur',
  autre: 'Autre',
}

type FicheTitleKey = NonNullable<FicheTechnique['hiddenTitles']>[number]

interface Props {
  fiche: FicheTechnique
  ficheIndex: number
  startPageNum?: number
  headerLogo?: string | null
  primaryColor?: string
  photoDataUrl?: string
  photoSize?: 'S' | 'M' | 'L'
  onChange?: (patch: Partial<FicheTechnique>) => void
  onPhotoChange?: (dataUrl: string) => void
  onPhotoRemove?: () => void
  onPhotoRemoveBg?: () => void
  bgRemoving?: boolean
  bgError?: string | null
  /** True when rendered inside the flowing (multicol) screen preview: no standalone A4 chrome. */
  embedded?: boolean
}

export function FicheTechniquePage({
  fiche,
  ficheIndex,
  startPageNum,
  headerLogo,
  primaryColor,
  photoDataUrl,
  photoSize,
  onChange,
  onPhotoChange,
  onPhotoRemove,
  onPhotoRemoveBg,
  bgRemoving,
  bgError,
  embedded,
}: Props) {
  const color = primaryColor || '#2f5496'
  const fileRef = useRef<HTMLInputElement>(null)
  const canEdit = !!onChange
  const hiddenTitles = fiche.hiddenTitles ?? []

  const etapesLines = fiche.etapes
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const visibleIngredients = fiche.ingredients.filter((i) => i.ingredient.trim())

  const infoChips = [
    { label: 'Famille', value: FAMILLE_LABELS[fiche.famille] || fiche.famille },
    fiche.nbPieces ? { label: 'Pièces', value: fiche.nbPieces } : null,
    fiche.poidsUnitaire ? { label: 'Poids unit.', value: fiche.poidsUnitaire } : null,
    fiche.duree ? { label: 'Durée', value: fiche.duree } : null,
  ].filter(Boolean)

  const handlePhotoFile = (file: File | undefined) => {
    if (!file || !onPhotoChange) return
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') onPhotoChange(reader.result)
    }
    reader.readAsDataURL(file)
  }

  const patchIngredient = (ingredientId: string, patch: Partial<FicheIngredient>) => {
    onChange?.({
      ingredients: fiche.ingredients.map((ingredient) =>
        ingredient.id === ingredientId ? { ...ingredient, ...patch } : ingredient,
      ),
    })
  }

  const patchStep = (index: number, value: string) => {
    const nextLines = etapesLines.map((line, i) => {
      const cleanLine = i === index ? value : line.replace(/^\d+[.)]\s*/, '')
      return `${i + 1}. ${cleanLine.trim()}`
    })
    onChange?.({ etapes: nextLines.join('\n') })
  }

  const isTitleHidden = (key: FicheTitleKey) => hiddenTitles.includes(key)

  const hideTitle = (key: FicheTitleKey) => {
    if (isTitleHidden(key)) return
    onChange?.({ hiddenTitles: [...hiddenTitles, key] })
  }

  const showTitle = (key: FicheTitleKey) => {
    onChange?.({ hiddenTitles: hiddenTitles.filter((item) => item !== key) })
  }

  return (
    <div
      data-part={`fiche-technique-${fiche.id}`}
      className={
        embedded
          ? 'relative w-full bg-white text-[#1f1d1a]'
          : 'a4-page relative mx-auto flex min-h-[1123px] w-[794px] flex-col bg-white py-[80px] text-[#1f1d1a] shadow-[0_2px_16px_rgba(61,56,50,0.14)] print:shadow-none print:break-before-page'
      }
      style={{ fontFamily: 'var(--doc-body-font)', paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
    >
      {/* Header stamp */}
      {startPageNum !== undefined && (
        <Fragment>
          <div
            className="absolute left-0 right-0 flex items-center justify-between"
            style={{ top: '40px', paddingLeft: 'var(--doc-margins)', paddingRight: 'var(--doc-margins)' }}
          >
            <img src={logo} alt="IFMBP" className="h-12 max-w-[150px] object-contain opacity-80" />
            {headerLogo ? (
              <img src={headerLogo} alt="Entreprise" className="h-12 max-w-[150px] object-contain opacity-80" />
            ) : <div />}
          </div>
          <div
            className="absolute left-0 right-0 text-center text-[12px] text-neutral-500"
            style={{ top: `${1123 - 40}px` }}
          >
            - {startPageNum} -
          </div>
        </Fragment>
      )}

      {/* Content */}
      <div className={embedded ? 'w-full' : 'my-auto w-full'}>
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            handlePhotoFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />

        <div className="mb-5 flex items-end justify-between gap-6 border-b border-[#d8cdbc] pb-3">
          <div className="min-w-0">
            <p className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.18em] text-[#8a765d]">
              Fiche technique{ficheIndex > 0 ? ` n°${ficheIndex + 1}` : ''}
            </p>
            <EditableBlock
              value={fiche.nom || 'Sans nom'}
              onSave={canEdit ? (value) => onChange?.({ nom: value }) : undefined}
              className="text-[25px] font-bold leading-tight text-[#2f2a24]"
              style={{ fontFamily: 'var(--doc-title-font)' }}
            />
          </div>
          <div className="h-8 w-8 shrink-0 rounded-full border border-[#c9bda8] bg-[#f6f0e5]" style={{ boxShadow: `inset 0 0 0 5px ${color}12` }} />
        </div>

        <div className="mb-6 flex items-start gap-5">
          <div className={`group relative flex ${({ S: 'h-[110px] w-[150px]', M: 'h-[150px] w-[212px]', L: 'h-[190px] w-[272px]' })[photoSize ?? 'M']} shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#d8cdbc] bg-[#f7f1e7]`}>
            {photoDataUrl ? (
              <img src={photoDataUrl} alt={fiche.nom} className="h-full w-full object-contain" />
            ) : (
              <button
                type="button"
                disabled={!onPhotoChange}
                onClick={() => fileRef.current?.click()}
                className="print:hidden flex flex-col items-center gap-1 text-[11px] font-medium text-[#8a765d] disabled:opacity-40"
              >
                <ImagePlus size={18} />
                Ajouter une photo
              </button>
            )}
            {(photoDataUrl || onPhotoChange) && (
              <div className="absolute inset-x-2 bottom-2 flex justify-center gap-1 rounded-md border border-[#d8cdbc] bg-[#fffaf1]/95 px-1.5 py-1 shadow-sm print:hidden">
                {onPhotoChange && (
                  <button type="button" title="Remplacer la photo" onClick={() => fileRef.current?.click()} className="flex h-7 w-7 items-center justify-center rounded text-[#665744] hover:bg-[#efe3d1]">
                    <ImagePlus size={14} />
                  </button>
                )}
                {photoDataUrl && onPhotoRemoveBg && (
                  <button type="button" title="Enlever le fond" onClick={onPhotoRemoveBg} disabled={bgRemoving} className="flex h-7 w-7 items-center justify-center rounded text-[#665744] hover:bg-[#efe3d1] disabled:opacity-50">
                    {bgRemoving ? <Loader2 size={14} className="animate-spin" /> : <Scissors size={14} />}
                  </button>
                )}
                {photoDataUrl && onPhotoRemove && (
                  <button type="button" title="Supprimer la photo" onClick={onPhotoRemove} className="flex h-7 w-7 items-center justify-center rounded text-[#8f4f43] hover:bg-[#f4ded8]">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2">
            {infoChips.map((item) => (
              <div
                key={item!.label}
                className="border-b border-[#e5dac8] pb-1.5"
              >
                <span className="block text-[8.5px] font-semibold uppercase tracking-[0.14em] text-[#9b8971]">{item!.label}</span>
                <span className="mt-0.5 block text-[12px] font-semibold text-[#2f2a24]">{item!.value}</span>
              </div>
            ))}
            </div>
            {bgError && <p className="mt-3 text-[10.5px] leading-snug text-[#9a4b3f] print:hidden">{bgError}</p>}
          </div>
        </div>

        {infoChips.length === 0 && (
          <div className="mb-5 h-px bg-[#e5dac8]" />
        )}

        <div className="flex gap-7">
          <div className="w-[245px] shrink-0">
            <OptionalSectionTitle
              titleKey="ingredients"
              color={color}
              hidden={isTitleHidden('ingredients')}
              editable={canEdit}
              onHide={hideTitle}
              onShow={showTitle}
            >
              Ingrédients
            </OptionalSectionTitle>
            <table className="mt-2 w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="border-y border-[#d8cdbc] bg-[#fbf7ef]">
                  <th className="px-2 py-1.5 text-left font-semibold text-[#5d4d3b]">Ingrédient</th>
                  <th className="w-20 px-2 py-1.5 text-right font-semibold text-[#5d4d3b]">Quantité</th>
                </tr>
              </thead>
              <tbody>
                {visibleIngredients.map((ing) => (
                  <tr key={ing.id} className="border-b border-[#eee5d7]">
                    <EditableCell value={ing.ingredient} align="left" onSave={canEdit ? (value) => patchIngredient(ing.id, { ingredient: value }) : undefined} />
                    <EditableCell value={ing.quantite} align="right" mono onSave={canEdit ? (value) => patchIngredient(ing.id, { quantite: value }) : undefined} />
                  </tr>
                ))}
                {visibleIngredients.length === 0 && (
                  <tr>
                    <td colSpan={2} className="px-2 py-2 text-[11px] italic text-[#9b8971]">Aucun ingrédient renseigné</td>
                  </tr>
                )}
              </tbody>
            </table>

            {(fiche.materiel.trim() || canEdit) && (
              <div className="mt-5">
                <OptionalSectionTitle
                  titleKey="materiel"
                  color={color}
                  hidden={isTitleHidden('materiel')}
                  editable={canEdit}
                  onHide={hideTitle}
                  onShow={showTitle}
                >
                  Matériel
                </OptionalSectionTitle>
                <EditableBlock
                  value={fiche.materiel}
                  placeholder="Matériel nécessaire..."
                  onSave={canEdit ? (value) => onChange?.({ materiel: value }) : undefined}
                  className="mt-2 whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#3d352c]"
                />
              </div>
            )}
          </div>

          <div className="min-w-0 flex-1">
            <OptionalSectionTitle
              titleKey="realisation"
              color={color}
              hidden={isTitleHidden('realisation')}
              editable={canEdit}
              onHide={hideTitle}
              onShow={showTitle}
            >
              Réalisation
            </OptionalSectionTitle>
            {etapesLines.length > 0 ? (
              <ol className="mt-2 space-y-2.5">
                {etapesLines.map((line, i) => {
                  const cleanLine = line.replace(/^\d+[.)]\s*/, '')
                  return (
                    <li key={i} className="grid grid-cols-[24px_1fr] gap-2 text-[11.5px] leading-relaxed text-[#3d352c]">
                      <span className="mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border border-[#c9bda8] bg-[#fbf7ef] text-[10px] font-bold text-[#7b674f]">
                        {i + 1}
                      </span>
                      <EditableBlock
                        value={cleanLine}
                        onSave={canEdit ? (value) => patchStep(i, value) : undefined}
                        className="min-w-0"
                      />
                    </li>
                  )
                })}
              </ol>
            ) : (
              <EditableBlock
                value=""
                placeholder="Étapes de réalisation..."
                onSave={canEdit ? (value) => onChange?.({ etapes: value }) : undefined}
                className="mt-2 text-[11.5px] italic text-[#9b8971]"
              />
            )}

            {(fiche.conseils.trim() || canEdit) && (
              <div className="mt-5 rounded-md border border-[#e2d6c4] bg-[#fbf7ef] p-3">
                <OptionalSectionTitle
                  titleKey="conseils"
                  color={color}
                  hidden={isTitleHidden('conseils')}
                  editable={canEdit}
                  onHide={hideTitle}
                  onShow={showTitle}
                  compact
                >
                  Conseils & astuces
                </OptionalSectionTitle>
                <EditableBlock
                  value={fiche.conseils}
                  placeholder="Points de vigilance..."
                  onSave={canEdit ? (value) => onChange?.({ conseils: value }) : undefined}
                  className="whitespace-pre-wrap text-[11.5px] leading-relaxed text-[#3d352c]"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function EditableBlock({
  value,
  placeholder,
  onSave,
  className,
  style,
}: {
  value: string
  placeholder?: string
  onSave?: (value: string) => void
  className?: string
  style?: React.CSSProperties
}) {
  const ref = useRef<HTMLDivElement>(null)

  const handleBlur = () => {
    if (!onSave || !ref.current) return
    const next = ref.current.innerText.trim()
    if (next !== value.trim()) onSave(next)
  }

  return (
    <div
      ref={ref}
      contentEditable={!!onSave}
      suppressContentEditableWarning
      onBlur={handleBlur}
      aria-label={!value && onSave ? placeholder : undefined}
      className={`${className ?? ''} ${onSave ? 'min-h-[1em] cursor-text rounded-sm outline-none transition-all hover:ring-1 hover:ring-[#d2b779]/60 focus:bg-[#fff8e9] focus:ring-2 focus:ring-[#d2b779]/70' : ''}`}
      style={style}
    >
      {value || (onSave ? '' : placeholder ?? '')}
    </div>
  )
}

function EditableCell({
  value,
  align,
  mono,
  onSave,
}: {
  value: string
  align: 'left' | 'right'
  mono?: boolean
  onSave?: (value: string) => void
}) {
  const ref = useRef<HTMLTableCellElement>(null)

  const handleBlur = () => {
    if (!onSave || !ref.current) return
    const next = ref.current.innerText.trim()
    if (next !== value.trim()) onSave(next)
  }

  return (
    <td
      ref={ref}
      contentEditable={!!onSave}
      suppressContentEditableWarning
      onBlur={handleBlur}
      className={`px-2 py-1.5 align-top text-[#3d352c] outline-none ${align === 'right' ? 'text-right' : 'text-left'} ${mono ? 'font-mono text-[11px]' : ''} ${onSave ? 'cursor-text rounded-sm hover:bg-[#fff8e9] focus:bg-[#fff8e9] focus:ring-1 focus:ring-[#d2b779]/70' : ''}`}
    >
      {value}
    </td>
  )
}

function OptionalSectionTitle({
  children,
  color,
  titleKey,
  hidden,
  editable,
  onHide,
  onShow,
  compact,
}: {
  children: React.ReactNode
  color: string
  titleKey: FicheTitleKey
  hidden: boolean
  editable: boolean
  onHide: (key: FicheTitleKey) => void
  onShow: (key: FicheTitleKey) => void
  compact?: boolean
}) {
  if (hidden) {
    if (!editable) return null
    return (
      <button
        type="button"
        onClick={() => onShow(titleKey)}
        className={`${compact ? 'mb-1' : ''} print:hidden inline-flex items-center gap-1 rounded border border-[#e2d6c4] bg-[#fffaf1] px-2 py-1 text-[10px] font-medium text-[#8a765d] hover:bg-[#efe3d1]`}
      >
        <Eye size={11} />
        Afficher le titre
      </button>
    )
  }

  return (
    <div className={`group flex items-center gap-2 ${compact ? 'mb-1' : ''}`}>
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#6b5a45]">
        {children}
      </p>
      <div className="h-px flex-1 bg-[#e2d6c4]" />
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {editable && (
        <button
          type="button"
          onClick={() => onHide(titleKey)}
          title="Masquer ce titre"
          className="print:hidden flex h-7 w-7 items-center justify-center rounded text-[#9b8971] opacity-70 hover:bg-[#efe3d1] hover:opacity-100 active:bg-[#efe3d1] active:opacity-100"
        >
          <EyeOff size={11} />
        </button>
      )}
    </div>
  )
}
