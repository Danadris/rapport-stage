import { ChevronDown, Lightbulb, AlertCircle, Loader2, Type, Network, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import type { NoteField, Organigramme, Entreprise } from '../../types'
import { Field, Textarea, Button } from '../ui'
import type { LongueurAI } from '../../lib/ai'
import { useAiDraft } from './useAiDraft'
import { OrganigrammeStep } from './OrganigrammeStep'

export function Examples({ examples, onPick }: { examples: string[]; onPick: (text: string) => void }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1 text-xs text-gold-deep transition-colors hover:text-ink"
        aria-expanded={open}
      >
        <Lightbulb size={13} />
        {open ? 'Masquer les exemples' : 'Voir des exemples'}
        <ChevronDown size={13} className={open ? 'rotate-180 transition-transform' : 'transition-transform'} />
      </button>
      {open && (
        <ul className="mt-2 space-y-2 rounded-lg bg-gold-soft/40 px-3 py-2.5">
          {examples.map((ex) => (
            <li key={ex}>
              <button
                type="button"
                onClick={() => onPick(ex)}
                title="Cliquer pour insérer"
                className="flex items-start gap-2 text-left text-[13px] leading-relaxed text-muted transition-colors hover:text-ink"
              >
                <span className="mt-[0.45em] h-1 w-1 shrink-0 rounded-full bg-gold-deep/50" />
                {ex}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** The organigramme mode switch: a box flips between plain text and a chart. */
export function OrgToggle({ isOrg, onToggle, small }: { isOrg: boolean; onToggle: (isOrg: boolean) => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!isOrg)}
      title={isOrg ? 'Passer en texte simple' : 'Convertir en organigramme'}
      className={
        small
          ? 'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-gold-deep hover:bg-gold-soft/60 transition-colors'
          : 'inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium text-gold-deep hover:bg-gold-soft/60 transition-colors'
      }
    >
      {isOrg ? <Type size={12} /> : <Network size={12} />}
      {isOrg ? 'Texte' : 'Organigramme'}
    </button>
  )
}

/** The delete button that sits next to a box's label. */
export function DeleteBoxButton({ onClick, title, small }: { onClick: () => void; title: string; small?: boolean }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex shrink-0 items-center justify-center rounded text-faint opacity-60 transition-all hover:bg-danger/10 hover:text-danger hover:opacity-100 active:bg-danger/10 active:text-danger ${
        small ? 'h-7 w-7' : 'h-8 w-8'
      }`}
    >
      <Trash2 size={small ? 13 : 14} />
    </button>
  )
}

/** The chart, framed by its box. */
export function OrgEditor({
  organigrammeData,
  onOrganigrammeChange,
  entreprise,
  onToggleMode,
  small,
}: {
  organigrammeData?: Organigramme
  onOrganigrammeChange?: (val: Organigramme) => void
  entreprise?: Entreprise
  onToggleMode?: (isOrg: boolean) => void
  small?: boolean
}) {
  return (
    <div className={`rounded-xl border border-line bg-paper ${small ? 'space-y-3 p-3' : 'mt-2 space-y-3 p-4'}`}>
      <div className="flex items-center justify-between pb-2 border-b border-line">
        <span className={`font-semibold text-ink ${small ? 'text-[11px]' : 'text-[12px]'}`}>
          Structure hiérarchique
        </span>
        {onToggleMode && (
          <button
            type="button"
            onClick={() => onToggleMode(false)}
            className={`text-faint hover:text-ink transition-colors ${small ? 'text-[11px]' : 'text-[12px]'}`}
          >
            Basculer en texte simple
          </button>
        )}
      </div>
      <OrganigrammeStep
        value={organigrammeData ?? { nodes: [] }}
        onChange={(val) => onOrganigrammeChange?.(val)}
        entreprise={entreprise ?? { nom: '', ville: '', secteurActivite: '', historique: '', organismeAccueil: '', missionsValeurs: '', activitesPrincipales: '', equipements: '', technologies: '', sourceRecherche: null }}
      />
    </div>
  )
}

/** The final-text card: pick a length, ask the IA, and edit what it wrote. */
export function FinalTextCard({
  draft,
  generated,
  onGeneratedChange,
  title,
  subtitle,
  hint,
  finalRows,
  small,
}: {
  draft: ReturnType<typeof useAiDraft>
  generated: string
  onGeneratedChange: (value: string) => void
  title: ReactNode
  subtitle: ReactNode
  hint: string
  finalRows: number
  small?: boolean
}) {
  const iconSize = small ? 13 : 14
  return (
    <div className={small ? 'field-card-sm' : 'field-card'}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs font-semibold text-ink">
          {title} <span className="font-normal text-faint">{subtitle}</span>
        </span>
        <div className="flex items-center gap-2">
          {draft.hasFinal && (
            <select
              value={draft.longueur}
              onChange={(e) => draft.setLongueur(e.target.value as LongueurAI)}
              aria-label="Longueur du texte généré"
              title="Longueur du texte généré"
              className="h-8 rounded border border-line bg-paper px-1.5 text-[11px] text-ink"
            >
              <option value="court">Court</option>
              <option value="moyen">Moyen</option>
              <option value="long">Long</option>
            </select>
          )}
          <Button
            size="sm"
            variant="secondary"
            onClick={draft.generate}
            disabled={draft.loading || !draft.canGenerate}
          >
            {draft.loading && <Loader2 size={iconSize} className="animate-spin" />}
            {draft.loading ? 'Rédaction...' : 'Rédiger (IA)'}
          </Button>
        </div>
      </div>

      {draft.error && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <AlertCircle size={iconSize} /> {draft.error}
        </div>
      )}

      {draft.hasFinal ? (
        <div className="mt-2">
          <Textarea
            label="Texte final du rapport"
            rows={finalRows}
            value={generated}
            onChange={(e) => onGeneratedChange(e.target.value)}
            className="bg-paper"
          />
        </div>
      ) : (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] leading-relaxed text-faint">{hint}</p>
          <button
            type="button"
            onClick={() => draft.setFinalOpen(true)}
            className="text-[11px] font-medium text-gold-deep underline hover:text-ink cursor-pointer"
          >
            Écrire le texte final
          </button>
        </div>
      )}
    </div>
  )
}

export interface FieldBoxProps {
  f: NoteField
  stepTitle: string
  current: string
  generated: string
  onChange: (fieldId: string, value: string) => void
  onGenerate: (fieldId: string, value: string) => void
  isCustom?: boolean
  onRename?: (newLabel: string) => void
  onDelete?: () => void
  organigrammeData?: Organigramme
  onOrganigrammeChange?: (val: Organigramme) => void
  onToggleMode?: (isOrg: boolean) => void
  entreprise?: Entreprise
}

/**
 * A level-2 subtitle: its own editable label line (in a custom plan), its
 * notes and the shared IA drafting.
 */
export function FieldBox({
  f,
  stepTitle,
  current,
  generated,
  onChange,
  onGenerate,
  isCustom,
  onRename,
  onDelete,
  organigrammeData,
  onOrganigrammeChange,
  onToggleMode,
  entreprise,
}: FieldBoxProps) {
  const draft = useAiDraft({
    stepTitle,
    fieldLabel: f.label,
    current,
    generated,
    onGenerate: (res) => onGenerate(f.id, res),
  })
  const isOrg = f.isOrganigramme ?? false

  return (
    <div key={f.id} className="space-y-3 relative group/field">
      <div>
        {isCustom ? (
          <>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="text"
                value={f.label}
                onChange={(e) => onRename?.(e.target.value)}
                placeholder="Sous-titre (optionnel)"
                className="flex-1 bg-transparent text-[13px] font-medium text-ink focus:outline-none focus:border-b focus:border-gold border-b border-transparent p-0"
              />
              {onToggleMode && (isOrg || f.label.toLowerCase().includes('organigramme')) && (
                <OrgToggle isOrg={isOrg} onToggle={onToggleMode} />
              )}
              {onDelete && <DeleteBoxButton onClick={onDelete} title="Supprimer ce sous-titre" />}
            </div>

            {isOrg ? (
              <OrgEditor
                organigrammeData={organigrammeData}
                onOrganigrammeChange={onOrganigrammeChange}
                entreprise={entreprise}
                onToggleMode={onToggleMode}
              />
            ) : (
              <Textarea
                id={`f-${f.id}`}
                label={f.label}
                rows={3}
                counter
                value={current}
                onChange={(e) => onChange(f.id, e.target.value)}
                placeholder={f.placeholder}
              />
            )}
          </>
        ) : (
          <Field label={f.label} hint={f.hint} optional={f.hint === 'Optionnel'} htmlFor={`f-${f.id}`}>
            <Textarea
              id={`f-${f.id}`}
              label={f.label}
              rows={3}
              counter
              value={current}
              onChange={(e) => onChange(f.id, e.target.value)}
              placeholder={f.placeholder}
            />
          </Field>
        )}
        {(!isCustom || (!isOrg && f.examples?.length > 0)) && (
          <Examples
            examples={f.examples || []}
            onPick={(ex) => onChange(f.id, current.trim() === '' ? ex : `${current.trimEnd()} ${ex}`)}
          />
        )}
      </div>

      {!isOrg && (
        <FinalTextCard
          draft={draft}
          generated={generated}
          onGeneratedChange={(v) => onGenerate(f.id, v)}
          title="Texte final du rapport"
          subtitle="— remplace vos notes dans le document"
          hint="Vos notes sont utilisées telles quelles. « Rédiger (IA) » en fait un texte plus rédigé — qui remplace alors vos notes dans le PDF."
          finalRows={4}
        />
      )}
    </div>
  )
}

export interface Level3BoxProps {
  f: NoteField
  stepTitle: string
  current: string
  generated: string
  onChange: (fieldId: string, value: string) => void
  onGenerate: (fieldId: string, value: string) => void
  onDelete?: () => void
  onRename?: (newLabel: string) => void
  organigrammeData?: Organigramme
  onOrganigrammeChange?: (val: Organigramme) => void
  onToggleMode?: (isOrg: boolean) => void
  entreprise?: Entreprise
}

/**
 * A level-3 point: prefixed and indented under its subtitle. The notes, the
 * chart and the IA drafting are the level-2 ones, in the small size.
 */
export function Level3Box({
  f,
  stepTitle,
  current,
  generated,
  onChange,
  onGenerate,
  onDelete,
  onRename,
  organigrammeData,
  onOrganigrammeChange,
  onToggleMode,
  entreprise,
}: Level3BoxProps) {
  const draft = useAiDraft({
    stepTitle,
    fieldLabel: f.prefix ? `${f.prefix} ${f.label}` : f.label,
    current,
    generated,
    onGenerate: (res) => onGenerate(f.id, res),
  })
  const isOrg = f.isOrganigramme ?? false

  return (
    <div className="pl-4 border-l-2 border-gold/30 space-y-3 group/l3">
      <div className="flex items-center gap-2">
        <span className="text-[13px] font-bold text-gold-deep shrink-0">{f.prefix || 'a/'}</span>
        <input
          type="text"
          value={f.label}
          onChange={(e) => onRename?.(e.target.value)}
          placeholder="Point (optionnel)"
          className="flex-1 bg-transparent text-[13px] font-medium text-ink focus:outline-none focus:border-b focus:border-gold border-b border-transparent p-0"
        />
        {onToggleMode && (isOrg || f.label.toLowerCase().includes('organigramme')) && (
          <OrgToggle isOrg={isOrg} onToggle={onToggleMode} small />
        )}
        {onDelete && <DeleteBoxButton onClick={onDelete} title="Supprimer ce point" small />}
      </div>

      {isOrg ? (
        <OrgEditor
          organigrammeData={organigrammeData}
          onOrganigrammeChange={onOrganigrammeChange}
          entreprise={entreprise}
          onToggleMode={onToggleMode}
          small
        />
      ) : (
        <>
          <Textarea
            label={f.label || f.prefix || 'Point'}
            rows={2}
            counter
            value={current}
            onChange={(e) => onChange(f.id, e.target.value)}
            placeholder={f.placeholder || 'Vos notes pour ce point…'}
          />

          <FinalTextCard
            draft={draft}
            generated={generated}
            onGeneratedChange={(v) => onGenerate(f.id, v)}
            title="Texte final"
            subtitle="— remplace vos notes"
            hint="Vos notes sont utilisées telles quelles. « Rédiger (IA) » les remplace dans le document."
            finalRows={3}
            small
          />
        </>
      )}
    </div>
  )
}
