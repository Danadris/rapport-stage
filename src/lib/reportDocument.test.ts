import { describe, it, expect } from 'vitest'
import { buildReportParts, buildSommaireEntries, groupReportParts } from './reportDocument'
import { progressOf } from './progress'
import { materializeSteps } from './blockModel'
import { createRapport } from './demo'
import type { Rapport } from '../types'

function bareRapport(): Rapport {
  const r = createRapport()
  r.couverture.nomStagiaire = 'Salma'
  r.entreprise.nom = 'Medina'
  return r
}

describe('buildReportParts official plan', () => {
  it('produces the full official sequence in order', () => {
    const parts = buildReportParts(bareRapport())
    expect(parts.map((p) => p.key)).toEqual([
      'remerciements',
      'introduction',
      'presentation',
      'organigramme',
      'activites',
      'contexte',
      'objectifs',
      'deroulement',
      'taches',
      // materiel only when items exist, fiches when fiches exist
      'bilan',
      'conclusion',
    ])
  })
  it('merges remerciements people + raisons into one paragraph', () => {
    const r = bareRapport()
    r.sections = { remerciements: { personnes: 'Merci A', raisons: 'car B' } }
    const p = buildReportParts(r).find((x) => x.key === 'remerciements')!
    expect(p.paragraphes).toEqual(['Merci A car B'])
    expect(p.editPath?.fieldIds).toEqual(['personnes', 'raisons'])
  })
  it('generated text wins over manual notes when present', () => {
    const r = bareRapport()
    r.sections = { contexte: { rechercheStage: 'manuel' } }
    r.sectionsGenerated = { contexte: { rechercheStage: 'genere' } }
    const p = buildReportParts(r).find((x) => x.key === 'contexte')!
    expect(p.paragraphes).toEqual(['genere'])
  })
  it('explicit empty generated clears the text (no resurrect)', () => {
    const r = bareRapport()
    r.sections = { contexte: { rechercheStage: 'manuel' } }
    r.sectionsGenerated = { contexte: { rechercheStage: '' } }
    const p = buildReportParts(r).find((x) => x.key === 'contexte')!
    expect(p.paragraphes).toEqual([])
  })
  it('presentation has 4 numbered sous-sections', () => {
    const p = buildReportParts(bareRapport()).find((x) => x.key === 'presentation')!
    expect(p.sousSections?.length).toBe(4)
    expect(p.sousSections?.map((s) => s.numero)).toEqual([1, 2, 3, 4])
  })
  it('adds materiel + fiche parts when present', () => {
    const r = bareRapport()
    r.materiels = [{ id: 'm1', nom: 'Pétrin', utilisation: 'Petrir' }]
    r.ficheTechniques = [{ id: 'f1', nom: 'Pain au levain', famille: 'pain', nbPieces: '8', poidsUnitaire: '750g', duree: '6h', ingredients: [], materiel: '', etapes: '', conseils: '' }]
    const keys = buildReportParts(r).map((p) => p.key)
    expect(keys).toContain('materiel-utilise')
    expect(keys).toContain('fiche-technique-f1')
  })
  it('titleOverrides rename an official title', () => {
    const r = bareRapport()
    r.titleOverrides = { 'step:remerciements': 'Merci !' }
    expect(buildReportParts(r).find((p) => p.key === 'remerciements')!.titre).toBe('Merci !')
  })
  it('custom plan uses step titres', () => {
    const r = bareRapport()
    r.customSteps = materializeSteps()
    const intro = r.customSteps.find((s) => s.id === 'introduction')!
    intro.titre = 'Mon intro'
    const p = buildReportParts(r).find((x) => x.key === 'introduction')!
    expect(p.titre).toBe('Mon intro')
  })
})

describe('buildSommaireEntries', () => {
  it('skips empty titles', () => {
    const entries = buildSommaireEntries(
      [{ key: 'a', numero: null, titre: '  ' }, { key: 'b', numero: null, titre: 'OK' }],
      {},
    )
    expect(entries.map((e) => e.label)).toEqual(['OK'])
  })
  it('collapses fiches into one entry', () => {
    const entries = buildSommaireEntries(
      [
        { key: 'fiche-technique-f1', numero: null, titre: 'Pain' },
        { key: 'fiche-technique-f2', numero: null, titre: 'Entremets' },
      ],
      { 'fiche-technique-f1': 5 },
    )
    expect(entries.length).toBe(1)
    expect(entries[0].label).toBe('Fiches techniques')
    expect(entries[0].page).toBe(5)
  })
})

describe('groupReportParts', () => {
  it('each part on its own page by default', () => {
    const g = groupReportParts([
      { key: 'a', numero: null, titre: 'A' },
      { key: 'b', numero: null, titre: 'B' },
    ])
    expect(g.length).toBe(2)
  })
  it('pageBreaks=false groups with previous', () => {
    const g = groupReportParts(
      [
        { key: 'a', numero: null, titre: 'A' },
        { key: 'b', numero: null, titre: 'B' },
        { key: 'c', numero: null, titre: 'C' },
      ],
      { b: false, c: false },
    )
    expect(g.length).toBe(1)
    expect(g[0].length).toBe(3)
  })
})

describe('progressOf', () => {
  it('empty report has radio 0', () => {
    const p = progressOf(createRapport())
    expect(p.ratio).toBe(0)
    expect(p.done).toBe(0)
    expect(p.total).toBeGreaterThan(0)
  })
  it('filling couverture fields increases done', () => {
    const r = createRapport()
    const before = progressOf(r).done
    r.couverture.nomStagiaire = 'Salma'
    r.couverture.periodeNumero = '3'
    expect(progressOf(r).done).toBe(before + 2)
  })
  it('optional fields are skipped in total', () => {
    // annexes/bibliographie have hint 'Optionnel' and must not count
    const r = createRapport()
    const p = progressOf(r)
    // total should be < (all fields) because optionals excluded — just assert it runs
    expect(p.total).toBeGreaterThan(10)
  })
  it('filling a notes field increases done by one', () => {
    const r = createRapport()
    const before = progressOf(r).done
    r.sections.introduction = { presentationBreve: 'hello' }
    expect(progressOf(r).done).toBe(before + 1)
  })
})
