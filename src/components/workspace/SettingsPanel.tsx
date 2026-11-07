import { useState } from 'react'
import { AlignCenter, AlignJustify, AlignLeft, LayoutPanelTop, Monitor, Palette, Plus, Type } from 'lucide-react'
import { cx } from '../../lib/cx'
import type { Rapport, RapportStyle } from '../../types'
import { DOC_ACCENT, DOC_PALETTES, STYLE_PRESETS, TEXT_SIZES, type TextSizeKey } from '../../lib/reportDocument'

/**
 * The panel shows one section at a time. Stacking all four pushed the document
 * down while you were styling it — the one moment you most want to see the page.
 */
const STYLE_TABS = [
  { id: 'page', label: 'Mise en page', Icon: LayoutPanelTop },
  { id: 'text', label: 'Texte', Icon: Type },
  { id: 'colors', label: 'Couleurs', Icon: Palette },
  { id: 'screen', label: 'Écran', Icon: Monitor },
] as const

type StyleTab = (typeof STYLE_TABS)[number]['id']

/**
 * Buttons instead of a dropdown: the current value is always on screen (a select
 * hides it until it is opened) and the choice is one tap instead of two. An
 * option may carry an icon, in which case it renders icon-only — the picture says
 * what the word would have, and the name lives in the title and aria-label.
 */
function ChoiceField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string; title?: string; Icon?: typeof AlignLeft }>
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-0.5 rounded-lg border border-line bg-paper p-0.5">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            title={option.title ?? option.label}
            aria-label={option.Icon ? option.label : undefined}
            aria-pressed={option.value === value}
            className={cx(
              'flex h-7 cursor-pointer items-center justify-center rounded-md transition-colors',
              option.Icon ? 'w-8' : 'px-2.5',
              option.value === value ? 'bg-gold-soft text-gold-deep' : 'text-muted hover:text-ink',
            )}
          >
            {option.Icon ? <option.Icon size={14} /> : option.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** A dropdown, for the few choices that are too long to be buttons. */
function SelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 rounded-lg border border-line bg-paper px-2 text-xs text-ink"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/**
 * One heading colour, seeded with the accent so a report that never touches it
 * keeps the single-colour look it has always had. Body text deliberately stays
 * near-black — it is the printed part of a graded report, and it has to read at
 * 13px on paper — so only headings are offered here.
 */
function ColorField({
  label,
  value,
  fallback,
  onChange,
}: {
  label: string
  value: string
  /** The accent: what "Défaut" goes back to. */
  fallback: string
  onChange: (hex: string) => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
        {value.toLowerCase() !== fallback.toLowerCase() && (
          <button
            type="button"
            onClick={() => onChange(fallback)}
            title="Revenir à la couleur d'accent"
            className="cursor-pointer text-[9px] text-muted underline hover:text-ink"
          >
            Défaut
          </button>
        )}
      </div>
      <div className="flex h-8 items-center gap-2 rounded-lg border border-line bg-paper px-1.5">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-5 w-6 shrink-0 cursor-pointer rounded border-0 bg-transparent p-0"
          aria-label={label}
        />
        <span className="font-mono text-[11px] uppercase text-muted">{value}</span>
      </div>
    </div>
  )
}

/**
 * Curated heading palettes: each chip is the title colour over the subtitle
 * colour, so a pair is visible before it is applied. Choosing different colours
 * per level is opt-in — until then every heading shares the accent.
 */
function PaletteField({ onApply }: { onApply: (palette: (typeof DOC_PALETTES)[number]) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Palette titres</span>
      <div className="flex h-8 items-center gap-1.5 rounded-lg border border-line bg-paper px-1.5">
        {DOC_PALETTES.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p)}
            title={`${p.name} — titres ${p.title}, sous-titres ${p.subtitle}`}
            className="flex h-5 flex-1 cursor-pointer items-center overflow-hidden rounded border border-line/60 transition-shadow hover:ring-1 hover:ring-gold/40"
          >
            <span className="h-full w-1/2" style={{ background: p.title }} />
            <span className="h-full w-1/2" style={{ background: p.subtitle }} />
          </button>
        ))}
      </div>
    </div>
  )
}

/**
 * Page presets — one tap for density, the individual knobs for anyone who wants
 * them.
 */
function PresetField({ onApply }: { onApply: (preset: (typeof STYLE_PRESETS)[number]) => void }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Préréglage</span>
      <div className="flex items-center gap-1.5">
        {STYLE_PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onApply(p)}
            title={`${p.name} — ${p.hint}`}
            className="cursor-pointer rounded-lg border border-line bg-paper px-3 py-1.5 text-[11px] font-medium text-muted transition-colors hover:border-gold hover:text-gold-deep"
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  )
}

/** A paragraph is added from here, aimed at the section the student is on. */
function ParagraphField({
  sectionLabel,
  count,
  onAdd,
}: {
  sectionLabel: string
  count: number
  onAdd: () => void
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
        Paragraphes{count > 0 ? ` · ${count} ajouté${count > 1 ? 's' : ''}` : ''}
      </span>
      <button
        type="button"
        onClick={onAdd}
        title={`Ajouter un paragraphe à « ${sectionLabel} »`}
        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-dashed border-line-strong bg-paper px-3 text-[11px] text-muted transition-colors hover:border-gold hover:text-gold-deep"
      >
        <Plus size={13} />
        Ajouter à « {sectionLabel} »
      </button>
    </div>
  )
}

/**
 * One text size: a slider over the usual range plus a free-px field, so any
 * value can be typed — the fixed-step selects that used to live here only
 * offered the listed numbers and left nothing in between (13.5px, 21px…) out of
 * reach. The field commits on Enter or blur and clamps to the range, so a stray
 * keystroke never writes NaN into the document.
 */
function SizeField({
  sizeKey,
  value,
  onChange,
}: {
  sizeKey: TextSizeKey
  value: number
  onChange: (px: number) => void
}) {
  const { label, min, max, fallback } = TEXT_SIZES[sizeKey]
  const [text, setText] = useState<string | null>(null)

  const commit = (raw: string) => {
    const n = Number(raw)
    if (raw.trim() !== '' && Number.isFinite(n)) {
      const clamped = Math.min(max, Math.max(min, n))
      // One decimal keeps the field truly free without inviting 13.7333px.
      onChange(Math.round(clamped * 10) / 10)
    }
    setText(null)
  }

  return (
    <div className="flex w-44 flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">
          {label} · {value}px
        </span>
        {value !== fallback && (
          <button
            type="button"
            onClick={() => onChange(fallback)}
            title={`Réinitialiser à ${fallback}px`}
            className="cursor-pointer text-[9px] text-muted underline hover:text-ink"
          >
            Défaut
          </button>
        )}
      </div>
      <div className="flex h-8 items-center gap-2 rounded-lg border border-line bg-paper px-2">
        <input
          type="range"
          min={min}
          max={max}
          step={0.5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-1 flex-1 cursor-pointer"
          aria-label={`${label} (curseur)`}
        />
        <input
          type="number"
          min={min}
          max={max}
          step="any"
          value={text ?? value}
          onChange={(e) => setText(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commit((e.target as HTMLInputElement).value)
              ;(e.target as HTMLInputElement).blur()
            }
          }}
          title={`${label} en px — toute valeur entre ${min} et ${max}`}
          aria-label={`${label} en px`}
          className="w-12 shrink-0 border-0 bg-transparent p-0 text-right font-mono text-[11px] text-ink"
        />
      </div>
    </div>
  )
}

const MARGIN_LABELS: Record<string, string> = { narrow: 'Étroites', normal: 'Normales', wide: 'Larges' }

export function SettingsPanel({
  style,
  patchStyle,
  zoom,
  setZoom,
  addParagraph,
}: {
  style?: Rapport['style']
  patchStyle: (patch: Partial<RapportStyle>) => void
  zoom: number
  setZoom: (zoom: number) => void
  /** Present when paragraphs can be added: targets the section being edited. */
  addParagraph?: { sectionLabel: string; count: number; onAdd: () => void }
}) {
  // A heading's colour falls back to the accent, so an untouched report renders
  // exactly one colour across all levels — the way the template has always been.
  const accent = style?.primaryColor || DOC_ACCENT
  const titleColor = style?.titleColor || accent
  const subtitleColor = style?.subtitleColor || accent

  const [tab, setTab] = useState<StyleTab>('page')
  const tabIndex = STYLE_TABS.findIndex((t) => t.id === tab)

  return (
    <div className="flex flex-col gap-4 border-b border-line bg-cream/98 px-4 py-3 shadow-sm md:px-6">
      {/* One section at a time. The stacked version of this panel pushed the
          document down while you were styling it — the one moment you most want
          the page in view. */}
      <div
        role="tablist"
        aria-label="Réglages du style"
        className="flex flex-wrap items-center gap-1"
        onKeyDown={(e) => {
          if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
          e.preventDefault()
          const next = (tabIndex + (e.key === 'ArrowRight' ? 1 : -1) + STYLE_TABS.length) % STYLE_TABS.length
          setTab(STYLE_TABS[next].id)
          document.getElementById(`style-tab-${STYLE_TABS[next].id}`)?.focus()
        }}
      >
        {STYLE_TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            id={`style-tab-${id}`}
            role="tab"
            type="button"
            aria-selected={tab === id}
            aria-controls={`style-tabpanel-${id}`}
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className={cx(
              'flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-colors',
              tab === id ? 'bg-gold-soft text-gold-deep' : 'text-muted hover:text-ink',
            )}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`style-tabpanel-${tab}`}
        aria-labelledby={`style-tab-${tab}`}
        className="flex flex-wrap items-end gap-x-6 gap-y-3"
      >
        {tab === 'page' && (
          <>
            <PresetField onApply={(p) => patchStyle(p.style)} />
            <ChoiceField
              label="Interligne"
              value={String(style?.lineSpacing || 1.85)}
              onChange={(v) => patchStyle({ lineSpacing: Number(v) })}
              options={[
                { value: '1', label: 'Simple' },
                { value: '1.5', label: '1,5' },
                { value: '1.85', label: '1,85' },
                { value: '2', label: 'Double' },
              ]}
            />
            <ChoiceField
              label="Marges"
              value={style?.margins || 'normal'}
              onChange={(v) => patchStyle({ margins: v as RapportStyle['margins'] })}
              options={(Object.keys(MARGIN_LABELS) as Array<keyof typeof MARGIN_LABELS>).map((value) => ({
                value,
                label: MARGIN_LABELS[value],
              }))}
            />
          </>
        )}

        {tab === 'text' && (
          <>
            {addParagraph && (
              <ParagraphField
                sectionLabel={addParagraph.sectionLabel}
                count={addParagraph.count}
                onAdd={addParagraph.onAdd}
              />
            )}
            <SelectField
              label="Police des titres"
              value={style?.titleFont || 'Georgia, "Times New Roman", serif'}
              onChange={(v) => patchStyle({ titleFont: v })}
              options={[
                { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
                { value: '"Geist Sans", ui-sans-serif, system-ui, sans-serif', label: 'Geist' },
                { value: '"Geist Mono", ui-monospace, monospace', label: 'Mono' },
              ]}
            />
            <SelectField
              label="Police du texte"
              value={style?.bodyFont || '"Geist Sans", ui-sans-serif, system-ui, sans-serif'}
              onChange={(v) => patchStyle({ bodyFont: v })}
              options={[
                { value: '"Geist Sans", ui-sans-serif, system-ui, sans-serif', label: 'Geist' },
                { value: 'Georgia, "Times New Roman", serif', label: 'Georgia' },
                { value: '"Geist Mono", ui-monospace, monospace', label: 'Mono' },
              ]}
            />
            <ChoiceField
              label="Alignement"
              value={style?.textAlign || 'justify'}
              onChange={(v) => patchStyle({ textAlign: v as RapportStyle['textAlign'] })}
              options={[
                { value: 'left', label: 'Gauche', Icon: AlignLeft },
                { value: 'center', label: 'Centré', Icon: AlignCenter },
                { value: 'justify', label: 'Justifié', Icon: AlignJustify },
              ]}
            />
            <SizeField sizeKey="title" value={style?.titleSize || TEXT_SIZES.title.fallback} onChange={(px) => patchStyle({ titleSize: px })} />
            <SizeField sizeKey="subtitle" value={style?.subtitleSize || TEXT_SIZES.subtitle.fallback} onChange={(px) => patchStyle({ subtitleSize: px })} />
            <SizeField sizeKey="body" value={style?.bodySize || TEXT_SIZES.body.fallback} onChange={(px) => patchStyle({ bodySize: px })} />
          </>
        )}

        {tab === 'colors' && (
          <>
            <ColorField label="Accent" value={accent} fallback={DOC_ACCENT} onChange={(hex) => patchStyle({ primaryColor: hex })} />
            <PaletteField onApply={(p) => patchStyle({ primaryColor: p.primary, titleColor: p.title, subtitleColor: p.subtitle })} />
            <ColorField label="Couleur des titres" value={titleColor} fallback={accent} onChange={(hex) => patchStyle({ titleColor: hex })} />
            <ColorField label="Couleur des sous-titres" value={subtitleColor} fallback={accent} onChange={(hex) => patchStyle({ subtitleColor: hex })} />
          </>
        )}

        {tab === 'screen' && (
          <div className="flex w-52 flex-col gap-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Zoom · {zoom}%</span>
            <div className="flex h-8 items-center gap-2 rounded-lg border border-line bg-paper px-2">
              <input
                type="range"
                min="50"
                max="150"
                step="10"
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                aria-label="Zoom de l’aperçu"
                className="h-1 flex-1 cursor-pointer"
              />
              <button
                type="button"
                onClick={() => setZoom(100)}
                disabled={zoom === 100}
                title="Revenir à 100%"
                className="shrink-0 cursor-pointer rounded border border-line px-1.5 py-0.5 text-[10px] text-muted hover:text-ink disabled:opacity-30"
              >
                100%
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

