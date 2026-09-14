import { X, ListChecks, PencilLine, Plus, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { useState } from 'react'
import { WIZARD_STEPS } from '../data/sections'
import type { WizardStep } from '../types'
import { Button } from './ui'

interface PlanPickerModalProps {
  onConfirm: (customSteps?: WizardStep[]) => void
  onClose: () => void
}

/** The two fixed steps always prepended to any plan */
const FIXED_STEPS = WIZARD_STEPS.slice(0, 2) // couverture + entreprise

/** Generate a simple numbered label for a custom step */
function stepNumero(index: number): string {
  return String(index + 3).padStart(2, '0') // starts at 03 after the 2 fixed steps
}

interface CustomSection {
  id: string
  titre: string
}

export function PlanPickerModal({ onConfirm, onClose }: PlanPickerModalProps) {
  const [tab, setTab] = useState<'officiel' | 'personnalise'>('officiel')
  const [sections, setSections] = useState<CustomSection[]>([
    { id: crypto.randomUUID(), titre: '' },
  ])

  const addSection = () =>
    setSections((prev) => [...prev, { id: crypto.randomUUID(), titre: '' }])

  const removeSection = (id: string) =>
    setSections((prev) => prev.filter((s) => s.id !== id))

  const updateTitle = (id: string, titre: string) =>
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, titre } : s)))

  const moveUp = (index: number) => {
    if (index === 0) return
    setSections((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  const moveDown = (index: number) => {
    setSections((prev) => {
      if (index === prev.length - 1) return prev
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  const handleConfirmCustom = () => {
    const validSections = sections.filter((s) => s.titre.trim() !== '')
    if (validSections.length === 0) return

    const customContentSteps: WizardStep[] = validSections.map((s, i) => {
      const isOrg = s.titre.trim().toLowerCase().includes('organigramme')
      return {
        id: `custom-${s.id}`,
        numero: stepNumero(i),
        titre: s.titre.trim(),
        sousTitre: isOrg ? "Structure de l'entreprise" : 'Section personnalisée',
        consigne: isOrg
          ? "Renseignez les postes et la hiérarchie de l'entreprise d'accueil."
          : 'Décrivez librement le contenu de cette section.',
        kind: isOrg ? 'organigramme' : 'notes',
        fields: isOrg
          ? []
          : [
              {
                id: 'contenu',
                label: s.titre.trim(),
                placeholder: 'Vos notes pour cette section…',
                examples: [],
              },
            ],
      }
    })

    // Always prepend couverture + entreprise
    onConfirm([...FIXED_STEPS, ...customContentSteps])
  }

  const hasValidSection = sections.some((s) => s.titre.trim() !== '')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-2xl border border-line bg-cream shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <h2 className="font-serif text-[18px] text-ink">Choisir un plan</h2>
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="rounded-lg p-1.5 text-faint transition-colors hover:bg-paper hover:text-ink"
          >
            <X size={17} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-line bg-paper/60 px-6 pt-3">
          <button
            onClick={() => setTab('officiel')}
            className={`flex items-center gap-2 border-b-2 px-3 pb-2.5 text-[13px] font-medium transition-colors ${
              tab === 'officiel'
                ? 'border-gold-deep text-ink'
                : 'border-transparent text-faint hover:text-muted'
            }`}
          >
            <ListChecks size={14} />
            Plan officiel
          </button>
          <button
            onClick={() => setTab('personnalise')}
            className={`flex items-center gap-2 border-b-2 px-3 pb-2.5 text-[13px] font-medium transition-colors ${
              tab === 'personnalise'
                ? 'border-gold-deep text-ink'
                : 'border-transparent text-faint hover:text-muted'
            }`}
          >
            <PencilLine size={14} />
            Plan personnalisé
          </button>
        </div>

        {/* Panel: Official */}
        {tab === 'officiel' && (
          <div className="px-6 py-4">
            <p className="mb-3 text-[13px] text-muted">
              Le canevas officiel IFMBP — 12 sections dans l'ordre réglementaire.
            </p>
            <ol className="max-h-64 overflow-y-auto rounded-xl border border-line bg-paper/80 divide-y divide-line overflow-hidden">
              {WIZARD_STEPS.map((step) => (
                <li key={step.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="font-mono text-[10px] text-faint w-6 shrink-0 text-center">{step.numero}</span>
                  <span className="text-[13px] text-ink font-medium">{step.titre}</span>
                  <span className="ml-auto text-[11px] text-faint truncate max-w-[120px]">{step.sousTitre}</span>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex justify-end">
              <Button variant="primary" onClick={() => onConfirm(undefined)}>
                Créer avec ce plan
              </Button>
            </div>
          </div>
        )}

        {/* Panel: Custom */}
        {tab === 'personnalise' && (
          <div className="px-6 py-4">
            <p className="mb-1 text-[13px] text-muted">
              Définissez vos propres sections. La page de couverture et l'entreprise sont toujours incluses.
            </p>

            {/* Fixed steps preview */}
            <div className="mb-3 mt-2 flex gap-2">
              {FIXED_STEPS.map((s) => (
                <span
                  key={s.id}
                  className="inline-flex items-center gap-1 rounded-full border border-line bg-cream px-2.5 py-0.5 text-[11px] text-muted"
                >
                  <span className="font-mono text-faint">{s.numero}</span>
                  {s.titre}
                </span>
              ))}
              <span className="inline-flex items-center text-[11px] text-faint">+ vos sections…</span>
            </div>

            {/* Custom sections list */}
            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {sections.map((section, i) => (
                <div key={section.id} className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-faint w-6 shrink-0 text-center">
                    {stepNumero(i)}
                  </span>
                  <div className="relative flex-1 flex items-center">
                    <input
                      type="text"
                      value={section.titre}
                      onChange={(e) => updateTitle(section.id, e.target.value)}
                      placeholder={`Section ${i + 1}…`}
                      className="w-full rounded-lg border border-line bg-paper px-3 py-1.5 text-[13px] text-ink placeholder:text-faint focus:border-gold-deep focus:outline-none pr-28"
                    />
                    {section.titre.toLowerCase().includes('organigramme') && (
                      <span className="absolute right-2 rounded-md bg-gold-soft px-1.5 py-0.5 text-[10px] font-semibold text-gold-deep border border-gold/20 pointer-events-none">
                        🏢 Organigramme
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => moveUp(i)}
                    disabled={i === 0}
                    aria-label="Monter"
                    className="rounded p-1 text-faint transition-colors hover:bg-paper hover:text-ink disabled:opacity-30"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => moveDown(i)}
                    disabled={i === sections.length - 1}
                    aria-label="Descendre"
                    className="rounded p-1 text-faint transition-colors hover:bg-paper hover:text-ink disabled:opacity-30"
                  >
                    <ArrowDown size={13} />
                  </button>
                  <button
                    onClick={() => removeSection(section.id)}
                    disabled={sections.length === 1}
                    aria-label="Supprimer"
                    className="rounded p-1 text-faint transition-colors hover:bg-danger/10 hover:text-danger disabled:opacity-30"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={addSection}
              className="mt-2 flex items-center gap-1.5 text-[12px] text-faint transition-colors hover:text-ink"
            >
              <Plus size={13} />
              Ajouter une section
            </button>

            <div className="mt-5 flex justify-end">
              <Button
                variant="primary"
                onClick={handleConfirmCustom}
                disabled={!hasValidSection}
              >
                Créer avec ce plan
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
