import type { Rapport } from '../types'

export interface ReportEditPath {
  source: 'entreprise' | 'section'
  field: string
}

export interface ReportSubSection {
  titre: string
  texte: string
  editPath?: ReportEditPath
}

export interface ReportPart {
  key: string
  numero: number | null
  titre: string
  sousSections?: ReportSubSection[]
  paragraphes?: string[]
  editPath?: { stepId: string; fieldIds: string[] }
}

export interface SommaireEntry {
  label: string
  page?: number
  sub?: boolean
}

export function toParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function note(rapport: Rapport, stepId: string, fieldId: string): string {
  const generated = rapport.sectionsGenerated?.[stepId]?.[fieldId]?.trim()
  const manual = rapport.sections[stepId]?.[fieldId]?.trim()
  return generated || manual || ''
}

export function buildReportParts(rapport: Rapport): ReportPart[] {
  const e = rapport.entreprise

  const remerciements = [note(rapport, 'remerciements', 'personnes'), note(rapport, 'remerciements', 'raisons')]
    .filter(Boolean)
    .join(' ')

  const intro = [note(rapport, 'introduction', 'presentationBreve'), note(rapport, 'introduction', 'objectifsIntro')]
    .filter(Boolean)
    .join('\n')

  const conclusionParas = [note(rapport, 'conclusion', 'resumeExperiences'), note(rapport, 'conclusion', 'perspectives')]
    .filter(Boolean)

  return [
    {
      key: 'remerciements',
      numero: null,
      titre: 'Remerciements',
      paragraphes: remerciements ? [remerciements] : [],
      editPath: { stepId: 'remerciements', fieldIds: ['personnes', 'raisons'] },
    },
    {
      key: 'introduction',
      numero: 1,
      titre: 'Introduction',
      paragraphes: intro ? toParagraphs(intro) : [],
      editPath: { stepId: 'introduction', fieldIds: ['presentationBreve', 'objectifsIntro'] },
    },
    {
      key: 'presentation',
      numero: 2,
      titre: "Présentation de l'entreprise d'accueil",
      sousSections: [
        { titre: "Organisme d'accueil", texte: e.organismeAccueil, editPath: { source: 'entreprise', field: 'organismeAccueil' } },
        { titre: "Historique de l'entreprise", texte: e.historique, editPath: { source: 'entreprise', field: 'historique' } },
        { titre: "Secteur d'activité", texte: e.secteurActivite, editPath: { source: 'entreprise', field: 'secteurActivite' } },
        { titre: 'Missions et valeurs', texte: e.missionsValeurs, editPath: { source: 'entreprise', field: 'missionsValeurs' } },
      ],
    },
    {
      key: 'activites',
      numero: 3,
      titre: "Les activités et équipements de l'entreprise",
      sousSections: [
        { titre: 'Activités principales', texte: e.activitesPrincipales, editPath: { source: 'entreprise', field: 'activitesPrincipales' } },
        { titre: 'Équipements utilisés', texte: e.equipements, editPath: { source: 'entreprise', field: 'equipements' } },
        { titre: 'Technologies employées', texte: e.technologies, editPath: { source: 'entreprise', field: 'technologies' } },
      ],
    },
    {
      key: 'contexte',
      numero: 4,
      titre: 'Contexte du stage',
      paragraphes: toParagraphs(note(rapport, 'contexte', 'rechercheStage')),
      editPath: { stepId: 'contexte', fieldIds: ['rechercheStage'] },
    },
    {
      key: 'objectifs',
      numero: 5,
      titre: 'Objectifs du stage',
      paragraphes: toParagraphs(note(rapport, 'objectifs', 'objectifsFixes')),
      editPath: { stepId: 'objectifs', fieldIds: ['objectifsFixes'] },
    },
    {
      key: 'deroulement',
      numero: 6,
      titre: 'Déroulement du stage',
      sousSections: [
        { titre: 'Départements ou services visités', texte: note(rapport, 'deroulement', 'departements'), editPath: { source: 'section', field: 'deroulement:departements' } },
        { titre: 'Tâches confiées', texte: note(rapport, 'deroulement', 'tachesConfiees'), editPath: { source: 'section', field: 'deroulement:tachesConfiees' } },
      ],
    },
    {
      key: 'taches',
      numero: 7,
      titre: 'Tâches effectuées pendant le stage',
      sousSections: [
        { titre: 'Détail des missions confiées', texte: note(rapport, 'taches', 'missionsDetaillees'), editPath: { source: 'section', field: 'taches:missionsDetaillees' } },
        { titre: 'Compétences développées', texte: note(rapport, 'taches', 'competencesDeveloppees'), editPath: { source: 'section', field: 'taches:competencesDeveloppees' } },
        { titre: 'Problématiques rencontrées', texte: note(rapport, 'taches', 'problematiquesRencontrees'), editPath: { source: 'section', field: 'taches:problematiquesRencontrees' } },
      ],
    },
    {
      key: 'bilan',
      numero: 8,
      titre: 'Bilan personnel',
      sousSections: [
        { titre: 'Les compétences acquises', texte: note(rapport, 'bilan', 'competencesAcquises'), editPath: { source: 'section', field: 'bilan:competencesAcquises' } },
        { titre: 'Les enseignements tirés', texte: note(rapport, 'bilan', 'enseignementsTires'), editPath: { source: 'section', field: 'bilan:enseignementsTires' } },
        { titre: 'Les points à améliorer', texte: note(rapport, 'bilan', 'pointsAmeliorer'), editPath: { source: 'section', field: 'bilan:pointsAmeliorer' } },
      ],
    },
    {
      key: 'conclusion',
      numero: 9,
      titre: 'Conclusion',
      paragraphes: conclusionParas,
      editPath: { stepId: 'conclusion', fieldIds: ['resumeExperiences', 'perspectives'] },
      sousSections: [
        { titre: 'Annexes', texte: note(rapport, 'conclusion', 'annexes'), editPath: { source: 'section', field: 'conclusion:annexes' } },
        { titre: 'Bibliographie', texte: note(rapport, 'conclusion', 'bibliographie'), editPath: { source: 'section', field: 'conclusion:bibliographie' } },
      ],
    },
  ]
}

export function buildSommaireEntries(parts: ReportPart[], numbers: Record<string, number>): SommaireEntry[] {
  const [remerciements, ...mainParts] = parts
  const entries: SommaireEntry[] = []

  if (remerciements) {
    entries.push({ label: 'Remerciements', page: numbers[remerciements.key] || undefined })
  }

  for (const part of mainParts) {
    entries.push({
      label: part.numero !== null ? `${part.numero}. ${part.titre}` : part.titre,
      page: numbers[part.key] || undefined,
    })

    for (const sousSection of part.sousSections ?? []) {
      entries.push({ label: sousSection.titre, page: numbers[part.key] || undefined, sub: true })
    }
  }

  return entries
}

export function groupReportParts(parts: ReportPart[], pageBreaks: Record<string, boolean> = {}): ReportPart[][] {
  const grouped: ReportPart[][] = []
  let currentGroup: ReportPart[] = []

  for (const part of parts) {
    if (pageBreaks[part.key] === false && currentGroup.length > 0) {
      currentGroup.push(part)
    } else {
      if (currentGroup.length > 0) grouped.push(currentGroup)
      currentGroup = [part]
    }
  }

  if (currentGroup.length > 0) grouped.push(currentGroup)
  return grouped
}

export function formatPeriodeLabel(periodeNumero: string): string {
  if (!periodeNumero) return '__ période'
  return `${periodeNumero}${periodeNumero === '1' ? 're' : 'e'} période`
}
