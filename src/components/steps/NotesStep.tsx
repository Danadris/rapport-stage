import { ChevronDown, Lightbulb, Sparkles, AlertCircle } from 'lucide-react'
import { useState } from 'react'
import type { NoteField } from '../../data/sections'
import type { SectionImage } from '../../types'
import { ConsigneBox, Field, Textarea, Button } from '../ui'
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
          <li className="pt-0.5 text-[11px] text-faint">Cliquez sur un exemple pour l'insérer dans le champ.</li>
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
}

function FieldBox({ f, stepTitle, current, generated, onChange, onGenerate }: FieldBoxProps) {
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
    <div key={f.id} className="space-y-3">
      <div>
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
        <Examples
          examples={f.examples}
          onPick={(ex) => onChange(f.id, current.trim() === '' ? ex : `${current.trimEnd()} ${ex}`)}
        />
      </div>

      <div className="rounded-lg border border-line bg-cream p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink">Texte rédigé final (Aperçu A4)</span>
          <Button 
            size="sm" 
            variant="secondary" 
            onClick={handleGenerate} 
            disabled={loading || !current.trim()}
          >
            <Sparkles size={14} className={loading ? "animate-pulse" : "text-gold-deep"} />
            {loading ? 'Génération…' : 'Générer la rédaction'}
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
          placeholder="Le texte professionnel sera généré ici..."
          className="bg-paper"
        />
        <p className="mt-1.5 text-[11px] text-muted">
          Vous pouvez modifier le texte généré manuellement s'il ne vous convient pas totalement.
        </p>
      </div>
    </div>
  )
}

export function NotesStep({ stepTitle, fields, values, generatedValues, onChange, onGenerate, images, onImagesChange }: Props) {
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
        />
      ))}
      <div className="pt-4 border-t border-line">
        <ImageManager images={images} onChange={onImagesChange} />
      </div>
      <ConsigneBox>
        Vos notes courtes sont transformées en paragraphes professionnels grâce au bouton de génération. Relisez toujours le résultat !
      </ConsigneBox>
    </div>
  )
}
