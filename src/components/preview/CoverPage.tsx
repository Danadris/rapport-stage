import { useLayoutEffect, useRef, useState, useContext } from 'react'
import { Pencil } from 'lucide-react'
import type { Rapport } from '../../types'
import { EditableText } from './EditableText'
import { IfmbpLogoContext } from './ifmbpLogo'
import { COVER_SIZES, type CoverSizeKey } from '../../lib/reportDocument'
import { readFileAsDataUrl } from '../../lib/imageRuntime'
import { INSTITUT_FR, INSTITUT_AR } from './tokens'
import type { PreviewActions } from './actions'

/** Slider for one piece of cover furniture — the blue ribbon's width, the orange banner's padding. */
function CoverSizeSlider({
  sizeKey,
  value,
  onChange,
  className,
}: {
  sizeKey: CoverSizeKey
  value: number
  onChange: (px: number) => void
  /** Placement and reveal, set by the anchor it belongs to. */
  className: string
}) {
  const { label, min, max, step, fallback } = COVER_SIZES[sizeKey]

  return (
    <div
      className={`absolute z-30 flex items-center gap-2 rounded-md bg-black/60 px-2 py-1 shadow-md backdrop-blur-xs transition-opacity print:hidden ${className}`}
    >
      <span className="whitespace-nowrap text-[10px] font-semibold uppercase tracking-wide text-white/90">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1 w-24 cursor-pointer accent-white"
        aria-label={`${label} en px`}
      />
      <span className="w-10 font-mono text-[10px] tabular-nums text-white">{value}px</span>
      {value !== fallback && (
        <button
          type="button"
          onClick={() => onChange(fallback)}
          title={`Réinitialiser à ${fallback}px`}
          className="cursor-pointer text-[9px] font-semibold text-white/80 underline hover:text-white"
        >
          Défaut
        </button>
      )}
    </div>
  )

}

export function CoverPage({
  rapport,
  periodeLabel,
  actions,
}: {
  rapport: Rapport
  periodeLabel: string
  actions: PreviewActions
}) {
  const c = rapport.couverture
  const e = rapport.entreprise
  const contentRef = useRef<HTMLDivElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const logoInputRef = useRef<HTMLInputElement>(null)
  const ifmbpInputRef = useRef<HTMLInputElement>(null)
  const [editingPeriod, setEditingPeriod] = useState(false)
  const [fit, setFit] = useState(1)
  const ifmbpLogo = useContext(IfmbpLogoContext)
  const customIfmbpLogo = rapport.style?.ifmbpLogo

  const ribbonWidth = rapport.style?.coverRibbonWidth ?? COVER_SIZES.ribbon.fallback
  const bannerPadding = rapport.style?.coverBannerPadding ?? COVER_SIZES.banner.fallback

  // Scale-to-fit guarantee: screen clips overflow (looks fine) while print
  // fragments it onto page 2 (the orange strip bug) — same DOM, different
  // result. Measuring the real content height and zooming the content column
  // to fit makes screen and print identical for ANY data, fonts or version.
  useLayoutEffect(() => {
    const el = contentRef.current
    if (!el) return
    const measure = () => {
      setFit((prev) => {
        const trueH = el.scrollHeight / (prev || 1)
        const next = trueH > 1123 ? Math.max(0.5, Math.floor((1123 / trueH) * 1000) / 1000) : 1
        return Math.abs(prev - next) > 0.001 ? next : prev
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return (
    <div
      data-part="couverture"
      className="a4-page mx-auto flex h-[1123px] w-[794px] overflow-hidden bg-white text-[#1f1d1a] shadow-[0_2px_16px_rgba(61,56,50,0.14)] print:h-[297mm] print:w-[210mm] print:shadow-none [&_span]:!font-[family-name:var(--doc-title-font)] [&_p.text-\[16px\]]:!font-[family-name:var(--doc-title-font)]"
      style={{ fontFamily: 'var(--doc-body-font)' }}
    >
      <div
        className="group/ribbon relative flex shrink-0 items-center justify-center bg-[#4472c4]"
        style={{ width: `${ribbonWidth}px` }}
      >
        <span className="block rotate-180 whitespace-nowrap text-[48px] font-bold tracking-wide text-white [writing-mode:vertical-rl]">
          Rapport de stage : {periodeLabel}
        </span>
        {actions.onCoverChange && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 opacity-0 group-hover/ribbon:opacity-100 transition-opacity print:hidden">
            <select
              value={c.periodeNumero || '1'}
              onChange={(ev) => actions.onCoverChange?.({ periodeNumero: ev.target.value })}
              className="rounded bg-white/90 px-1 py-0.5 text-[11px] font-semibold text-neutral-800 shadow cursor-pointer"
              title="Changer la période"
            >
              {['1', '2', '3', '4', '5', '6'].map((n) => (
                <option key={n} value={n}>
                  {n}{n === '1' ? 're' : 'e'}
                </option>
              ))}
            </select>
          </div>
        )}
        {actions.onStyleChange && (
          // Anchored to the ribbon's own left edge, so the chip grows into the
          // page instead of off it — the page is an overflow-hidden box.
          <CoverSizeSlider
            sizeKey="ribbon"
            value={ribbonWidth}
            onChange={(px) => actions.onStyleChange?.({ coverRibbonWidth: px })}
            className="bottom-3 left-2 opacity-0 group-hover/ribbon:opacity-100 focus-within:opacity-100"
          />
        )}
      </div>

      <div
        ref={contentRef}
        className="flex min-w-0 flex-1 flex-col px-10 pt-4 [zoom:var(--cover-fit,1)]"
        style={{ '--cover-fit': fit } as React.CSSProperties}
      >
        <div className="flex items-start justify-between gap-6">
          <div className="group/ifmbp relative inline-block">
            <img src={ifmbpLogo} alt="IFMBP" className="h-20 w-auto object-contain" />
            {actions.onStyleChange && (
              <>
                <input
                  ref={ifmbpInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0]
                    ev.target.value = ''
                    if (!file) return
                    try {
                      actions.onStyleChange?.({ ifmbpLogo: await readFileAsDataUrl(file) })
                    } catch {
                      // A file the browser cannot read changes nothing.
                    }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center gap-1 rounded bg-black/40 opacity-0 transition-opacity group-hover/ifmbp:opacity-100 focus-within:opacity-100 print:hidden">
                  <button
                    type="button"
                    onClick={() => ifmbpInputRef.current?.click()}
                    title={customIfmbpLogo ? 'Changer le logo IFMBP' : 'Remplacer le logo IFMBP'}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 shadow hover:bg-white cursor-pointer"
                  >
                    {customIfmbpLogo ? 'Changer' : 'Remplacer'}
                  </button>
                  {customIfmbpLogo && (
                    <button
                      type="button"
                      onClick={() => actions.onStyleChange?.({ ifmbpLogo: undefined })}
                      title="Revenir au logo officiel"
                      className="rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow hover:bg-red-600 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
          <div
            className={`group/logo relative flex h-[88px] w-[128px] shrink-0 items-center justify-center bg-white ${
              e.logoDataUrl ? '' : 'border-[3px] border-[#4472c4] p-1.5'
            }`}
          >
            {e.logoDataUrl ? (
              <img src={e.logoDataUrl} alt="Logo entreprise" className="max-h-full max-w-full object-contain" />
            ) : (
              <span className="text-[10px] text-neutral-400">Logo entreprise</span>
            )}
            {actions.onEdit && (
              <>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0]
                    ev.target.value = ''
                    if (!file) return
                    try {
                      actions.onEdit?.('entreprise', 'logoDataUrl', await readFileAsDataUrl(file))
                    } catch {
                      // A file the browser cannot read changes nothing.
                    }
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 opacity-0 transition-opacity group-hover/logo:opacity-100 print:hidden rounded">
                  <button
                    type="button"
                    onClick={() => logoInputRef.current?.click()}
                    title={e.logoDataUrl ? 'Changer le logo' : 'Ajouter un logo'}
                    className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-semibold text-neutral-800 shadow hover:bg-white cursor-pointer"
                  >
                    {e.logoDataUrl ? 'Changer' : 'Ajouter'}
                  </button>
                  {e.logoDataUrl && (
                    <button
                      type="button"
                      onClick={() => actions.onEdit?.('entreprise', 'logoDataUrl', '')}
                      title="Supprimer le logo"
                      className="rounded bg-red-600/90 px-1.5 py-0.5 text-[10px] font-semibold text-white shadow hover:bg-red-600 cursor-pointer"
                    >
                      ×
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-auto border border-neutral-700 px-6 py-3 text-center">
          <p className="text-[11px] font-bold leading-snug">{INSTITUT_FR}</p>
          <p dir="rtl" lang="ar" className="mt-1 text-[16px] font-bold leading-relaxed">
            {INSTITUT_AR}
          </p>
        </div>

        <div className="mt-auto flex flex-col gap-5">
          <div className="text-center">
            <p className="text-[13.5px]">Objectif de stage :</p>
            <EditableText
              text={c.objectifStage || (!actions.onEdit ? '…' : '')}
              placeholder="Objectif du stage…"
              showPlaceholder={false}
              className="mt-1 text-[13.5px] font-semibold"
              onSave={actions.onEdit ? (v) => actions.onEdit?.('couverture', 'objectifStage', v) : undefined}
            />
          </div>

          <div className="group/period relative text-center">
            <p className="text-[13.5px]">Période de stage :</p>
            {editingPeriod && actions.onCoverChange ? (
              <div className="mt-1 flex flex-wrap items-center justify-center gap-2 print:hidden">
                <select
                  value={c.periodeNumero || '1'}
                  onChange={(ev) => actions.onCoverChange?.({ periodeNumero: ev.target.value })}
                  className="rounded border border-line bg-paper px-2 py-0.5 text-xs text-ink shadow-xs"
                >
                  {['1', '2', '3', '4', '5', '6'].map((n) => (
                    <option key={n} value={n}>
                      {n}{n === '1' ? 're' : 'e'} période
                    </option>
                  ))}
                </select>
                <span className="text-xs text-muted">du</span>
                <input
                  type="date"
                  value={c.periodeDebut || ''}
                  onChange={(ev) => actions.onCoverChange?.({ periodeDebut: ev.target.value })}
                  className="rounded border border-line bg-paper px-1.5 py-0.5 text-xs text-ink shadow-xs"
                />
                <span className="text-xs text-muted">au</span>
                <input
                  type="date"
                  value={c.periodeFin || ''}
                  onChange={(ev) => actions.onCoverChange?.({ periodeFin: ev.target.value })}
                  className="rounded border border-line bg-paper px-1.5 py-0.5 text-xs text-ink shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setEditingPeriod(false)}
                  className="rounded bg-gold/20 px-2 py-0.5 text-xs font-semibold text-gold-deep hover:bg-gold/30 cursor-pointer"
                >
                  OK
                </button>
              </div>
            ) : (
              <div
                onClick={actions.onCoverChange ? () => setEditingPeriod(true) : undefined}
                className={`mt-1 text-[13.5px] font-semibold ${
                  actions.onCoverChange ? 'cursor-pointer rounded-sm hover:ring-1 hover:ring-gold/40' : ''
                }`}
                title={actions.onCoverChange ? 'Cliquer pour modifier la période et les dates' : undefined}
              >
                {c.periodeDebut ? `du ${new Date(c.periodeDebut).toLocaleDateString('fr-FR')}` : 'du …'} au{' '}
                {c.periodeFin ? new Date(c.periodeFin).toLocaleDateString('fr-FR') : '…'}
                {actions.onCoverChange && (
                  <span className="ml-1.5 inline-block text-[11px] text-muted opacity-0 group-hover/period:opacity-100 print:hidden">
                    <Pencil size={11} />
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="text-center">
            <p className="text-[13.5px]">Entreprise d'accueil :</p>
            <EditableText
              text={e.nom || (!actions.onEdit ? "Nom de l'entreprise" : '')}
              placeholder="Nom de l'entreprise"
              showPlaceholder={false}
              className="mt-1 text-[13.5px] font-semibold"
              onSave={actions.onEdit ? (v) => actions.onEdit?.('entreprise', 'nom', v) : undefined}
            />
          </div>
        </div>

        <div
          className={`group/photo mt-auto mb-6 relative flex h-[300px] min-h-[140px] shrink items-center justify-center overflow-hidden bg-white ${
            c.photoActivite ? '' : 'border-[3px] border-[#4472c4] p-1.5'
          }`}
        >
          {c.photoActivite ? (
            <img
              src={c.photoActivite}
              alt="Photo de l'entreprise"
              className={
                (c.photoActiviteFit ?? 'contain') === 'cover'
                  ? 'h-full w-full object-cover'
                  : 'max-h-full max-w-full object-contain'
              }
            />
          ) : (
            <span
              onClick={() => actions.onCoverChange && photoInputRef.current?.click()}
              className={`text-xs text-neutral-400 ${actions.onCoverChange ? 'cursor-pointer hover:text-neutral-600' : ''}`}
            >
              Photo de l'activité de l'entreprise {actions.onCoverChange && '(cliquer pour ajouter)'}
            </span>
          )}

          {actions.onCoverChange && (
            <>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (ev) => {
                  const file = ev.target.files?.[0]
                  ev.target.value = ''
                  if (!file) return
                  try {
                    actions.onCoverChange?.({ photoActivite: await readFileAsDataUrl(file) })
                  } catch {
                    // A file the browser cannot read changes nothing.
                  }
                }}
              />
              <div className="absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-black/60 p-1 opacity-0 backdrop-blur-xs transition-opacity group-hover/photo:opacity-100 print:hidden">
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  title="Changer l'image"
                  className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-neutral-900 shadow hover:bg-white cursor-pointer"
                >
                  {c.photoActivite ? 'Changer' : 'Ajouter'}
                </button>
                {c.photoActivite && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        actions.onCoverChange?.({
                          photoActiviteFit: (c.photoActiviteFit ?? 'contain') === 'cover' ? 'contain' : 'cover',
                        })
                      }
                      title="Basculer entre ajuster et remplir"
                      className="rounded bg-white/90 px-2 py-0.5 text-xs font-medium text-neutral-900 shadow hover:bg-white cursor-pointer"
                    >
                      {(c.photoActiviteFit ?? 'contain') === 'cover' ? 'Ajuster' : 'Remplir'}
                    </button>
                    <button
                      type="button"
                      onClick={() => actions.onCoverChange?.({ photoActivite: undefined })}
                      title="Supprimer la photo"
                      className="rounded bg-red-600/90 px-2 py-0.5 text-xs font-medium text-white shadow hover:bg-red-600 cursor-pointer"
                    >
                      Supprimer
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </div>

        <div
          className="group/banner relative -mx-10 bg-[#ed7d31] px-10 text-white"
          style={{ paddingTop: `${bannerPadding}px`, paddingBottom: `${bannerPadding}px` }}
        >
          {actions.onStyleChange && (
            <CoverSizeSlider
              sizeKey="banner"
              value={bannerPadding}
              onChange={(px) => actions.onStyleChange?.({ coverBannerPadding: px })}
              className="top-2 right-2 opacity-0 group-hover/banner:opacity-100 focus-within:opacity-100"
            />
          )}
          <p className="text-center text-[14px] font-semibold">Rapport réalisé par :</p>
          <EditableText
            text={c.nomStagiaire || (!actions.onEdit ? 'Nom et prénom' : '')}
            placeholder="Nom et prénom"
            showPlaceholder={false}
            className="mt-1.5 text-center text-[14px] font-bold !text-white hover:!ring-white/60 focus:!ring-white focus:!bg-white/20"
            onSave={actions.onEdit ? (v) => actions.onEdit?.('couverture', 'nomStagiaire', v) : undefined}
          />
          <div className="mt-3 grid grid-cols-2 gap-x-8">
            <div>
              <p className="text-[13.5px] font-semibold">Tuteur pédagogique :</p>
              <EditableText
                text={c.tuteurPedagogique || (!actions.onEdit ? 'Nom et prénom' : '')}
                placeholder="Nom et prénom"
                showPlaceholder={false}
                className="mt-1 text-[13.5px] font-bold !text-white hover:!ring-white/60 focus:!ring-white focus:!bg-white/20"
                onSave={actions.onEdit ? (v) => actions.onEdit?.('couverture', 'tuteurPedagogique', v) : undefined}
              />
            </div>
            <div>
              <p className="text-[13.5px] font-semibold">Tuteur industriel :</p>
              <EditableText
                text={c.tuteurIndustriel || (!actions.onEdit ? 'Nom et prénom' : '')}
                placeholder="Nom et prénom"
                showPlaceholder={false}
                className="mt-1 text-[13.5px] font-bold !text-white hover:!ring-white/60 focus:!ring-white focus:!bg-white/20"
                onSave={actions.onEdit ? (v) => actions.onEdit?.('couverture', 'tuteurIndustriel', v) : undefined}
              />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-[13.5px] font-semibold">
              Membre de jury{c.membresJury.length > 0 ? ` : ${c.membresJury.length}` : ' :'}
            </p>
            <EditableText
              text={c.membresJury.length > 0 ? c.membresJury.join(', ') : (!actions.onEdit ? 'M. XXXXXXX / Mme XXXXXXX' : '')}
              placeholder="M. XXXXXXX / Mme XXXXXXX"
              showPlaceholder={false}
              className="mt-1 text-[13.5px] !text-white hover:!ring-white/60 focus:!ring-white focus:!bg-white/20"
              onSave={actions.onEdit ? (v) => actions.onEdit?.('couverture', 'membresJury', v) : undefined}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
