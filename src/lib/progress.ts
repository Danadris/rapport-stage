import type { Rapport, WizardStep } from '../types'
import { WIZARD_STEPS } from '../data/sections'

export function progressOf(
  rapport: Rapport,
  steps: WizardStep[] = WIZARD_STEPS,
): { done: number; total: number; ratio: number } {
  let total = 0
  let done = 0
  const c = rapport.couverture
  const couvFields = [c.nomStagiaire, c.periodeNumero, c.periodeDebut, c.periodeFin, c.objectifStage]
  total += couvFields.length + 2
  done += couvFields.filter((v) => v.trim() !== '').length
  if (c.tuteurPedagogique.trim()) done++
  if (c.tuteurIndustriel.trim()) done++
  const e = rapport.entreprise
  const entFields = [e.nom, e.historique, e.secteurActivite]
  total += entFields.length
  done += entFields.filter((v) => v && v.trim() !== '').length
  for (const step of steps) {
    if (step.kind === 'organigramme') {
      total++
      if ((rapport.organigramme?.nodes?.length ?? 0) > 0) done++
    }
    if (step.kind === 'fiche-technique') {
      total++
      if ((rapport.ficheTechniques?.filter((f) => f.nom.trim() !== '').length ?? 0) > 0) done++
    }
    if (step.kind === 'notes') {
      for (const field of step.fields) {
        if (field.hint === 'Optionnel') continue
        total++
        const notes = rapport.sections[step.id]
        if (notes && (notes[field.id] ?? '').trim() !== '') done++
      }
    }
  }
  return { done, total, ratio: total === 0 ? 0 : done / total }
}
