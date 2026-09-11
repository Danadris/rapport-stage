import { ChevronDown, Lightbulb, Sparkles, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { NoteField } from '../../types'
import type { SectionImage } from '../../types'
import { Field, Textarea, Button } from '../ui'
import { ImageManager } from '../ImageManager'
import { genererParagraphe } from '../../lib/ai'

interface Props {
  stepId: string
  stepTitle: string
  fields: NoteField[]
  values: Record<string, string>
  generatedValues: Record<string, string>
  onChange: (fieldId: string, value: string) => void
  onGenerate: (fieldId: string, value: string) => void
  images: SectionImage[]
  onImagesChange: (images: SectionImage[]) => void
  isCustom?: boolean
  onAddSubSection?: () => void
  onDeleteSubSection?: (fieldId: string) => void
  onRenameSubSection?: (fieldId: string, newLabel: string) => void
}

function Examples({ examples, onPick }: { examples: string[]; onPick: (text: string) => void }) {
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

interface FieldBoxProps {
  f: NoteField
  stepTitle: string
  current: string
  generated: string
  onChange: (fieldId: string, value: string) => void
  onGenerate: (fieldId: string, value: string) => void
  isCustom?: boolean
  onRename?: (newLabel: string) => void
  onDelete?: () => void
}

function FieldBox({ f, stepTitle, current, generated, onChange, onGenerate, isCustom, onRename, onDelete }: FieldBoxProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const handleGenerate = async () => {
    if (!current.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await genererParagraphe(stepTitle, f.label, current)
      onGenerate(f.id, res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération')
    } finally {
      setLoading(false)
    }
  }

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
                className="flex-1 bg-transparent text-[13px] font-medium text-ink focus:outline-none focus:border-b focus:border-gold border-b border-transparent p-0"
              />
              {onDelete && (
                <button
                  onClick={onDelete}
                  title="Supprimer ce sous-titre"
                  className="opacity-0 group-hover/field:opacity-100 p-1 text-faint hover:text-danger hover:bg-danger/10 rounded transition-all"
                >
                  <AlertCircle size={14} className="hidden" />
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                </button>
              )}
            </div>
            <Textarea
              id={`f-${f.id}`}
              rows={3}
              counter
              value={current}
              onChange={(e) => onChange(f.id, e.target.value)}
              placeholder={f.placeholder}
            />
          </>
        ) : (
          <Field label={f.label} hint={f.hint} optional={f.hint === 'Optionnel'} htmlFor={`f-${f.id}`}>
            <Textarea
              id={`f-${f.id}`}
              rows={3}
              counter
              value={current}
              onChange={(e) => onChange(f.id, e.target.value)}
              placeholder={f.placeholder}
            />
          </Field>
        )}
        {(!isCustom || f.examples?.length > 0) && (
          <Examples
            examples={f.examples || []}
            onPick={(ex) => onChange(f.id, current.trim() === '' ? ex : `${current.trimEnd()} ${ex}`)}
          />
        )}
      </div>

      <div className="rounded-lg border border-line bg-cream p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink">Texte final A4</span>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleGenerate} 
            disabled={loading || !current.trim()}
          >
            <Sparkles size={14} className={loading ? "animate-pulse" : "text-gold-deep"} />
            {loading ? 'Rédaction...' : 'Rédiger'}
          </Button>
        </div>
        
        {error && (
          <div className="mb-2 flex items-center gap-1.5 text-xs text-danger">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <Textarea
          rows={generated ? 4 : 2}
          value={generated}
          onChange={(e) => onGenerate(f.id, e.target.value)}
          placeholder="Texte final..."
          className="bg-paper"
        />
      </div>
    </div>
  )
}

export function NotesStep({ 
  stepTitle, 
  fields, 
  values, 
  generatedValues, 
  onChange, 
  onGenerate, 
  images, 
  onImagesChange,
  isCustom,
  onAddSubSection,
  onDeleteSubSection,
  onRenameSubSection
}: Props) {
  return (
    <div className="space-y-10">
      {fields.map((f) => (
        <FieldBox 
          key={f.id} 
          f={f} 
          stepTitle={stepTitle} 
          current={values[f.id] ?? ''} 
          generated={generatedValues[f.id] ?? ''}
          onChange={onChange}
          onGenerate={onGenerate}
          isCustom={isCustom}
          onRename={isCustom && onRenameSubSection ? (val) => onRenameSubSection(f.id, val) : undefined}
          onDelete={isCustom && onDeleteSubSection && fields.length > 1 ? () => onDeleteSubSection(f.id) : undefined}
        />
      ))}

      {isCustom && onAddSubSection && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" size="sm" onClick={onAddSubSection}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Ajouter un sous-titre
          </Button>
        </div>
      )}

      <div className="pt-4 border-t border-line">
        <ImageManager images={images} onChange={onImagesChange} />
      </div>
    </div>
  )
}
