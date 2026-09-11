import { Check } from 'lucide-react'
import type { Rapport, WizardStep } from '../types'
import { cx } from '../lib/cx'

interface StepperProps {
  rapport: Rapport
  steps: WizardStep[]
  currentId: string
  onSelect: (id: string) => void
}

function stepComplete(rapport: Rapport, step: WizardStep): boolean {
  if (step.kind === 'couverture') {
    const c = rapport.couverture
    return [c.nomStagiaire, c.periodeNumero, c.periodeDebut, c.periodeFin, c.objectifStage].every(
      (v) => v.trim() !== '',
    )
  }
  if (step.kind === 'entreprise') return rapport.entreprise.nom.trim() !== ''
  if (step.kind === 'presentation' || step.kind === 'activites') {
    const e = rapport.entreprise
    return step.kind === 'presentation'
      ? e.historique.trim() !== '' && e.secteurActivite.trim() !== ''
      : e.activitesPrincipales.trim() !== ''
  }
  const notes = rapport.sections[step.id]
  if (!notes) return false
  return step.fields
    .filter((f) => f.hint !== 'Optionnel')
    .every((f) => (notes[f.id] ?? '').trim() !== '')
}

function stepProgress(rapport: Rapport, step: WizardStep): number {
  if (stepComplete(rapport, step)) return 100
  if (step.kind === 'couverture') {
    const c = rapport.couverture
    const filled = [c.nomStagiaire, c.periodeNumero, c.periodeDebut, c.periodeFin, c.objectifStage].filter(v => v.trim() !== '').length
    return Math.round((filled / 5) * 100)
  }
  if (step.kind === 'entreprise') return rapport.entreprise.nom.trim() !== '' ? 100 : 0
  if (step.kind === 'presentation') {
    const e = rapport.entreprise
    const filled = [e.organismeAccueil, e.historique, e.secteurActivite, e.missionsValeurs].filter(v => v.trim() !== '').length
    return Math.round((filled / 4) * 100)
  }
  if (step.kind === 'activites') {
    const e = rapport.entreprise
    const filled = [e.activitesPrincipales, e.equipements, e.technologies].filter(v => v.trim() !== '').length
    return Math.round((filled / 3) * 100)
  }
  const notes = rapport.sections[step.id]
  if (!notes) return 0
  const required = step.fields.filter(f => f.hint !== 'Optionnel')
  if (required.length === 0) return 0
  const filled = required.filter(f => (notes[f.id] ?? '').trim() !== '').length
  return Math.round((filled / required.length) * 100)
}

export function Stepper({ rapport, steps, currentId, onSelect }: StepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentId)
  return (
    <nav aria-label="Sections du rapport" className="py-4">
      <ol className="space-y-0.5">
        {steps.map((step, i) => {
          const done = stepComplete(rapport, step)
          const current = step.id === currentId
          const reachable = i <= currentIndex || stepComplete(rapport, steps[i - 1] ?? step)
          return (
            <li key={step.id}>
              <button
                onClick={() => onSelect(step.id)}
                disabled={!reachable}
                className={cx(
                  'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors duration-150',
                  current ? 'bg-gold-soft' : reachable ? 'hover:bg-paper' : 'cursor-not-allowed opacity-40',
                )}
              >
                <span
                  className={cx(
                    'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border font-mono text-[10px]',
                    done
                      ? 'border-gold-deep bg-gold-deep text-paper'
                      : current
                        ? 'border-gold-deep text-gold-deep'
                        : 'border-line text-faint',
                  )}
                >
                  {done ? <Check size={11} strokeWidth={3} /> : step.numero}
                </span>
                <span className="min-w-0">
                  <span
                    className={cx(
                      'block truncate text-[13px]',
                      current ? 'font-semibold text-ink' : done ? 'text-ink' : 'text-muted',
                    )}
                  >
                    {step.titre}
                  </span>
                  <span className="block truncate text-[11px] text-faint">{step.sousTitre}</span>
                  {(() => {
                    const pct = stepProgress(rapport, step)
                    return pct > 0 && pct < 100 ? (
                      <span className="mt-1 block h-0.5 w-full overflow-hidden rounded-full bg-line">
                        <span className="block h-full rounded-full bg-gold transition-all" style={{ width: `${pct}%` }} />
                      </span>
                    ) : null
                  })()}
                </span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
