import type { Rapport } from '../types'

export interface ReportEditPath {
  source: 'entreprise' | 'section'
  field: string
}

export interface ReportSubSubSection {
  id: string
  titre: string
  prefix?: string
  texte: string
  editPath?: ReportEditPath
  isOrganigramme?: boolean
}

export interface ReportSubSection {
  id?: string
  titre: string
  numero?: number
  texte: string
  items?: ReportSubSubSection[]
  editPath?: ReportEditPath
  isOrganigramme?: boolean
}

export interface ReportPart {
  key: string
  numero: number | null
  titre: string
  sousSections?: ReportSubSection[]
  paragraphes?: string[]
  editPath?: { stepId: string; fieldIds: string[] }
  isOrganigramme?: boolean
}

export function isOrganigrammeTitle(title?: string): boolean {
  if (!title) return false
  return title.toLowerCase().includes('organigramme')
}

export function isFicheTechniqueKey(key: string): boolean {
  return key.startsWith('fiche-technique-')
}

export const MATERIEL_PART_KEY = 'materiel-utilise'

export function hasMaterielItems(rapport: Rapport): boolean {
  return (rapport.materiels ?? []).some((item) => item.nom.trim() || item.utilisation.trim() || item.imageDataUrl)
}

/** One synthetic part per saved fiche technique — rendered standalone in the A4 preview. */
export function ficheParts(rapport: Rapport): ReportPart[] {
  return (rapport.ficheTechniques ?? [])
    .filter((fiche) => fiche.nom.trim() !== '')
    .map((fiche) => ({
      key: `fiche-technique-${fiche.id}`,
      numero: null,
      titre: fiche.nom.trim(),
    }))
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

  if (rapport.customSteps) {
    const parts: ReportPart[] = []

    for (const step of rapport.customSteps) {
      if (step.kind === 'couverture' || step.kind === 'entreprise') continue

      if (step.kind === 'organigramme') {
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          isOrganigramme: true,
        })
        continue
      }

      if (step.kind === 'fiche-technique') {
        if (hasMaterielItems(rapport)) {
          parts.push({ key: MATERIEL_PART_KEY, numero: null, titre: 'Matériel utilisé' })
        }
        parts.push(...ficheParts(rapport))
        continue
      }

      if (step.kind === 'presentation') {
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          sousSections: [
            { titre: "Organisme d'accueil", numero: 1, texte: e.organismeAccueil, editPath: { source: 'entreprise', field: 'organismeAccueil' } },
            { titre: "Historique de l'entreprise", numero: 2, texte: e.historique, editPath: { source: 'entreprise', field: 'historique' } },
            { titre: "Secteur d'activité", numero: 3, texte: e.secteurActivite, editPath: { source: 'entreprise', field: 'secteurActivite' } },
            { titre: 'Missions et valeurs', numero: 4, texte: e.missionsValeurs, editPath: { source: 'entreprise', field: 'missionsValeurs' } },
          ],
        })
        continue
      }

      if (step.kind === 'activites') {
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          sousSections: [
            { titre: 'Activités principales', numero: 1, texte: e.activitesPrincipales, editPath: { source: 'entreprise', field: 'activitesPrincipales' } },
            { titre: 'Équipements utilisés', numero: 2, texte: e.equipements, editPath: { source: 'entreprise', field: 'equipements' } },
            { titre: 'Technologies employées', numero: 3, texte: e.technologies, editPath: { source: 'entreprise', field: 'technologies' } },
          ],
        })
        continue
      }

      // Standard explanatory sections render as merged paragraphs (identical to the official plan)
      if (step.id === 'remerciements') {
        const merged = [note(rapport, 'remerciements', 'personnes'), note(rapport, 'remerciements', 'raisons')]
          .filter(Boolean)
          .join(' ')
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          paragraphes: merged ? [merged] : [],
          editPath: { stepId: 'remerciements', fieldIds: ['personnes', 'raisons'] },
        })
        continue
      }
      if (step.id === 'introduction') {
        const merged = [note(rapport, 'introduction', 'presentationBreve'), note(rapport, 'introduction', 'objectifsIntro')]
          .filter(Boolean)
          .join('\n')
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          paragraphes: merged ? toParagraphs(merged) : [],
          editPath: { stepId: 'introduction', fieldIds: ['presentationBreve', 'objectifsIntro'] },
        })
        continue
      }
      if (step.id === 'contexte') {
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          paragraphes: toParagraphs(note(rapport, 'contexte', 'rechercheStage')),
          editPath: { stepId: 'contexte', fieldIds: ['rechercheStage'] },
        })
        continue
      }
      if (step.id === 'objectifs') {
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          paragraphes: toParagraphs(note(rapport, 'objectifs', 'objectifsFixes')),
          editPath: { stepId: 'objectifs', fieldIds: ['objectifsFixes'] },
        })
        continue
      }
      if (step.id === 'conclusion') {
        const paras = [note(rapport, 'conclusion', 'resumeExperiences'), note(rapport, 'conclusion', 'perspectives')]
          .filter(Boolean)
        parts.push({
          key: step.id,
          numero: null,
          titre: step.titre,
          paragraphes: paras,
          editPath: { stepId: 'conclusion', fieldIds: ['resumeExperiences', 'perspectives'] },
          sousSections: [
            { titre: 'Annexes', numero: 1, texte: note(rapport, 'conclusion', 'annexes'), editPath: { source: 'section', field: 'conclusion:annexes' } },
            { titre: 'Bibliographie', numero: 2, texte: note(rapport, 'conclusion', 'bibliographie'), editPath: { source: 'section', field: 'conclusion:bibliographie' } },
          ],
        })
        continue
      }

      if (step.kind === 'notes') {
        // Level 2 = fields without parentId
        const level2Fields = step.fields.filter(f => !f.parentId)

        const sousSections: ReportSubSection[] = level2Fields.map((parent, i) => {
          // Level 3 = fields whose parentId matches this level-2 field
          const children = step.fields.filter(f => f.parentId === parent.id)
          const isParentOrg = parent.isOrganigramme ?? false

          const items: ReportSubSubSection[] = children.map((child, ci) => ({
            id: child.id,
            titre: child.label,
            prefix: child.prefix || `${String.fromCharCode(97 + ci)}/`,
            texte: note(rapport, step.id, child.id),
            editPath: { source: 'section' as const, field: `${step.id}:${child.id}` },
            isOrganigramme: child.isOrganigramme ?? false,
          }))

          return {
            id: parent.id,
            titre: parent.label,
            numero: i + 1,
            texte: note(rapport, step.id, parent.id),
            items: items.length > 0 ? items : undefined,
            editPath: { source: 'section' as const, field: `${step.id}:${parent.id}` },
            isOrganigramme: isParentOrg,
          }
        })

        parts.push({
          key: step.id,
          numero: null,       // Level 1 is UNNUMBERED (user requirement)
          titre: step.titre,
          sousSections,
        })
      }
    }
    return parts
  }

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
      numero: null,
      titre: 'Introduction',
      paragraphes: intro ? toParagraphs(intro) : [],
      editPath: { stepId: 'introduction', fieldIds: ['presentationBreve', 'objectifsIntro'] },
    },
    {
      key: 'presentation',
      numero: null,
      titre: "Présentation de l'entreprise d'accueil",
      sousSections: [
        { titre: "Organisme d'accueil", numero: 1, texte: e.organismeAccueil, editPath: { source: 'entreprise', field: 'organismeAccueil' } },
        { titre: "Historique de l'entreprise", numero: 2, texte: e.historique, editPath: { source: 'entreprise', field: 'historique' } },
        { titre: "Secteur d'activité", numero: 3, texte: e.secteurActivite, editPath: { source: 'entreprise', field: 'secteurActivite' } },
        { titre: 'Missions et valeurs', numero: 4, texte: e.missionsValeurs, editPath: { source: 'entreprise', field: 'missionsValeurs' } },
      ],
    },
    {
      key: 'organigramme',
      numero: null,
      titre: "Organigramme de l'entreprise",
      isOrganigramme: true,
    },
    {
      key: 'activites',
      numero: null,
      titre: "Les activités et équipements de l'entreprise",
      sousSections: [
        { titre: 'Activités principales', numero: 1, texte: e.activitesPrincipales, editPath: { source: 'entreprise', field: 'activitesPrincipales' } },
        { titre: 'Équipements utilisés', numero: 2, texte: e.equipements, editPath: { source: 'entreprise', field: 'equipements' } },
        { titre: 'Technologies employées', numero: 3, texte: e.technologies, editPath: { source: 'entreprise', field: 'technologies' } },
      ],
    },
    {
      key: 'contexte',
      numero: null,
      titre: 'Contexte du stage',
      paragraphes: toParagraphs(note(rapport, 'contexte', 'rechercheStage')),
      editPath: { stepId: 'contexte', fieldIds: ['rechercheStage'] },
    },
    {
      key: 'objectifs',
      numero: null,
      titre: 'Objectifs du stage',
      paragraphes: toParagraphs(note(rapport, 'objectifs', 'objectifsFixes')),
      editPath: { stepId: 'objectifs', fieldIds: ['objectifsFixes'] },
    },
    {
      key: 'deroulement',
      numero: null,
      titre: 'Déroulement du stage',
      sousSections: [
        { titre: 'Départements ou services visités', numero: 1, texte: note(rapport, 'deroulement', 'departements'), editPath: { source: 'section', field: 'deroulement:departements' } },
        { titre: 'Tâches confiées', numero: 2, texte: note(rapport, 'deroulement', 'tachesConfiees'), editPath: { source: 'section', field: 'deroulement:tachesConfiees' } },
      ],
    },
    {
      key: 'taches',
      numero: null,
      titre: 'Tâches effectuées pendant le stage',
      sousSections: [
        { titre: 'Détail des missions confiées', numero: 1, texte: note(rapport, 'taches', 'missionsDetaillees'), editPath: { source: 'section', field: 'taches:missionsDetaillees' } },
        { titre: 'Compétences développées', numero: 2, texte: note(rapport, 'taches', 'competencesDeveloppees'), editPath: { source: 'section', field: 'taches:competencesDeveloppees' } },
        { titre: 'Problématiques rencontrées', numero: 3, texte: note(rapport, 'taches', 'problematiquesRencontrees'), editPath: { source: 'section', field: 'taches:problematiquesRencontrees' } },
      ],
    },
    ...(hasMaterielItems(rapport) ? [{ key: MATERIEL_PART_KEY, numero: null, titre: 'Matériel utilisé' }] : []),
    ...ficheParts(rapport),
    {
      key: 'bilan',
      numero: null,
      titre: 'Bilan personnel',
      sousSections: [
        { titre: 'Les compétences acquises', numero: 1, texte: note(rapport, 'bilan', 'competencesAcquises'), editPath: { source: 'section', field: 'bilan:competencesAcquises' } },
        { titre: 'Les enseignements tirés', numero: 2, texte: note(rapport, 'bilan', 'enseignementsTires'), editPath: { source: 'section', field: 'bilan:enseignementsTires' } },
        { titre: 'Les points à améliorer', numero: 3, texte: note(rapport, 'bilan', 'pointsAmeliorer'), editPath: { source: 'section', field: 'bilan:pointsAmeliorer' } },
      ],
    },
    {
      key: 'conclusion',
      numero: null,
      titre: 'Conclusion',
      paragraphes: conclusionParas,
      editPath: { stepId: 'conclusion', fieldIds: ['resumeExperiences', 'perspectives'] },
      sousSections: [
        { titre: 'Annexes', numero: 1, texte: note(rapport, 'conclusion', 'annexes'), editPath: { source: 'section', field: 'conclusion:annexes' } },
        { titre: 'Bibliographie', numero: 2, texte: note(rapport, 'conclusion', 'bibliographie'), editPath: { source: 'section', field: 'conclusion:bibliographie' } },
      ],
    },
  ]
}

export function buildSommaireEntries(parts: ReportPart[], numbers: Record<string, number>): SommaireEntry[] {
  const entries: SommaireEntry[] = []
  let ficheEntryAdded = false

  for (const part of parts) {
    // Collapse all consecutive fiche technique pages into a single sommaire entry
    if (isFicheTechniqueKey(part.key)) {
      if (!ficheEntryAdded) {
        entries.push({
          label: 'Fiches techniques',
          page: numbers[part.key] || undefined,
        })
        ficheEntryAdded = true
      }
      continue
    }

    // Skip Level 1 entries with empty titles
    if (!part.titre || !part.titre.trim()) continue

    entries.push({
      label: part.titre,  // Level 1: no number
      page: numbers[part.key] || undefined,
    })

    for (const sousSection of part.sousSections ?? []) {
      // Skip Level 2 entries with empty titles
      if (!sousSection.titre || !sousSection.titre.trim()) continue

      const label = sousSection.numero !== undefined
        ? `${sousSection.numero}. ${sousSection.titre}`
        : sousSection.titre

      entries.push({ label, page: numbers[part.key] || undefined, sub: true })
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
