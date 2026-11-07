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

export function isFicheTechniqueKey(key: string): boolean {
  return key.startsWith('fiche-technique-')
}

export const MATERIEL_PART_KEY = 'materiel-utilise'

/**
 * The document's three text sizes, in px. `fallback` is what the preview renders
 * when a report carries no value — the same number the settings panel's reset
 * button restores, so the two can never drift apart. `min`/`max` are the range
 * the slider and the free-px field accept.
 */
export const TEXT_SIZES = {
  title: { key: 'titleSize', label: 'Titres', min: 10, max: 48, fallback: 17 },
  subtitle: { key: 'subtitleSize', label: 'Sous-titres', min: 9, max: 40, fallback: 14 },
  body: { key: 'bodySize', label: 'Texte', min: 8, max: 32, fallback: 13 },
} as const

export type TextSizeKey = keyof typeof TEXT_SIZES

/**
 * The cover page's two furniture sizes, in px — the blue ribbon's width and the
 * orange banner's padding. Same contract as TEXT_SIZES: `fallback` is what the
 * page renders when a report carries no value, and the cover's own sliders reset
 * to it.
 */
export const COVER_SIZES = {
  ribbon: { key: 'coverRibbonWidth', label: 'Ruban bleu', min: 70, max: 140, step: 2, fallback: 104 },
  banner: { key: 'coverBannerPadding', label: 'Bandeau orange', min: 8, max: 28, step: 2, fallback: 16 },
} as const

export type CoverSizeKey = keyof typeof COVER_SIZES

/**
 * The document's accent as shipped, used by the preview and by the settings
 * panel's reset — the same contract as TEXT_SIZES' fallbacks.
 */
export const DOC_ACCENT = '#2f5496'

/**
 * Curated heading-colour pairs. Every value clears 4.5:1 on white at the sizes
 * the document actually uses, and each pair stays in one hue family — a second
 * unrelated hue is what makes student reports look like a ransom note. The first
 * entry is the document as it has always looked: one accent for every heading.
 */
export const DOC_PALETTES = [
  { id: 'ifmbp',    name: 'Bleu IFMBP', primary: '#2f5496', title: '#2f5496', subtitle: '#4472c4' },
  { id: 'vif',      name: 'Bleu vif',   primary: '#4472c4', title: '#4472c4', subtitle: '#2f5496' },
  { id: 'graphite', name: 'Graphite',   primary: '#3f3a34', title: '#3f3a34', subtitle: '#5d574e' },
  { id: 'bordeaux', name: 'Bordeaux',   primary: '#7b2d26', title: '#7b2d26', subtitle: '#a0522d' },
  { id: 'prune',    name: 'Prune',      primary: '#5b3a6e', title: '#5b3a6e', subtitle: '#7d5a91' },
] as const

/**
 * Page presets. Density is the one style decision nobody should have to make
 * knob by knob: one tap sets line spacing, margins and the three text sizes
 * together, and the individual controls stay for anyone who wants them.
 */
export const STYLE_PRESETS = [
  {
    id: 'standard',
    name: 'Standard',
    hint: 'Le réglage du rapport officiel',
    style: { lineSpacing: 1.85, margins: 'normal' as const, titleSize: 17, subtitleSize: 14, bodySize: 13 },
  },
  {
    id: 'compact',
    name: 'Compact',
    hint: 'Moins de pages, texte plus dense',
    style: { lineSpacing: 1.4, margins: 'narrow' as const, titleSize: 16, subtitleSize: 13, bodySize: 12 },
  },
  {
    id: 'aere',
    name: 'Aéré',
    hint: 'Plus lisible, plus de pages',
    style: { lineSpacing: 2.2, margins: 'wide' as const, titleSize: 18, subtitleSize: 15, bodySize: 13.5 },
  },
] as const

/** Titles of fixed subsection cards can be renamed/removed from the aperçu via titleOverrides. */
function titleO(rapport: Rapport, source: 'entreprise' | 'section' | 'step', field: string, fallback: string): string {
  const v = rapport.titleOverrides?.[`${source}:${field}`]
  return v === undefined ? fallback : v
}

function hasMaterielItems(rapport: Rapport): boolean {
  return (rapport.materiels ?? []).some((item) => item.nom.trim() || item.utilisation.trim() || item.imageDataUrl)
}

/** One synthetic part per saved fiche technique — rendered standalone in the A4 preview. */
function ficheParts(rapport: Rapport): ReportPart[] {
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

function toParagraphs(text: string): string[] {
  return text
    .split(/\n+/)
    .map((t) => t.trim())
    .filter(Boolean)
}

function note(rapport: Rapport, stepId: string, fieldId: string): string {
  const generated = rapport.sectionsGenerated?.[stepId]?.[fieldId]
  // An explicitly saved value — even an empty string from clearing the text in
  // the aperçu — wins over the manual notes. Only fall back to manual when no
  // generated value exists at all, otherwise cleared text would resurrect.
  if (generated !== undefined) return generated.trim()
  return rapport.sections[stepId]?.[fieldId]?.trim() || ''
}

/** Shared section builders — one definition for the custom-plan and official-plan paths. */
function presentationPart(rapport: Rapport, key: string, titre: string): ReportPart {
  const e = rapport.entreprise
  return {
    key,
    numero: null,
    titre,
    sousSections: [
      { titre: titleO(rapport, 'entreprise', 'organismeAccueil', "Organisme d'accueil"), numero: 1, texte: e.organismeAccueil, editPath: { source: 'entreprise', field: 'organismeAccueil' } },
      { titre: titleO(rapport, 'entreprise', 'historique', "Historique de l'entreprise"), numero: 2, texte: e.historique, editPath: { source: 'entreprise', field: 'historique' } },
      { titre: titleO(rapport, 'entreprise', 'secteurActivite', "Secteur d'activité"), numero: 3, texte: e.secteurActivite, editPath: { source: 'entreprise', field: 'secteurActivite' } },
      { titre: titleO(rapport, 'entreprise', 'missionsValeurs', 'Missions et valeurs'), numero: 4, texte: e.missionsValeurs, editPath: { source: 'entreprise', field: 'missionsValeurs' } },
    ],
  }
}

function activitesPart(rapport: Rapport, key: string, titre: string): ReportPart {
  const e = rapport.entreprise
  return {
    key,
    numero: null,
    titre,
    sousSections: [
      { titre: titleO(rapport, 'entreprise', 'activitesPrincipales', 'Activités principales'), numero: 1, texte: e.activitesPrincipales, editPath: { source: 'entreprise', field: 'activitesPrincipales' } },
      { titre: titleO(rapport, 'entreprise', 'equipements', 'Équipements utilisés'), numero: 2, texte: e.equipements, editPath: { source: 'entreprise', field: 'equipements' } },
      { titre: titleO(rapport, 'entreprise', 'technologies', 'Technologies employées'), numero: 3, texte: e.technologies, editPath: { source: 'entreprise', field: 'technologies' } },
    ],
  }
}

function remerciementsPart(rapport: Rapport, key: string, titre: string): ReportPart {
  const merged = [note(rapport, 'remerciements', 'personnes'), note(rapport, 'remerciements', 'raisons')]
    .filter(Boolean)
    .join(' ')
  return {
    key,
    numero: null,
    titre,
    paragraphes: merged ? [merged] : [],
    editPath: { stepId: 'remerciements', fieldIds: ['personnes', 'raisons'] },
  }
}

function introductionPart(rapport: Rapport, key: string, titre: string): ReportPart {
  const merged = [note(rapport, 'introduction', 'presentationBreve'), note(rapport, 'introduction', 'objectifsIntro')]
    .filter(Boolean)
    .join('\n')
  return {
    key,
    numero: null,
    titre,
    paragraphes: merged ? toParagraphs(merged) : [],
    editPath: { stepId: 'introduction', fieldIds: ['presentationBreve', 'objectifsIntro'] },
  }
}

function contextePart(rapport: Rapport, key: string, titre: string): ReportPart {
  return {
    key,
    numero: null,
    titre,
    paragraphes: toParagraphs(note(rapport, 'contexte', 'rechercheStage')),
    editPath: { stepId: 'contexte', fieldIds: ['rechercheStage'] },
  }
}

function objectifsPart(rapport: Rapport, key: string, titre: string): ReportPart {
  return {
    key,
    numero: null,
    titre,
    paragraphes: toParagraphs(note(rapport, 'objectifs', 'objectifsFixes')),
    editPath: { stepId: 'objectifs', fieldIds: ['objectifsFixes'] },
  }
}

function conclusionPart(rapport: Rapport, key: string, titre: string): ReportPart {
  const paras = [note(rapport, 'conclusion', 'resumeExperiences'), note(rapport, 'conclusion', 'perspectives')]
    .filter(Boolean)
  return {
    key,
    numero: null,
    titre,
    paragraphes: paras,
    editPath: { stepId: 'conclusion', fieldIds: ['resumeExperiences', 'perspectives'] },
    sousSections: [
      { titre: titleO(rapport, 'section', 'conclusion:annexes', 'Annexes'), numero: 1, texte: note(rapport, 'conclusion', 'annexes'), editPath: { source: 'section', field: 'conclusion:annexes' } },
      { titre: titleO(rapport, 'section', 'conclusion:bibliographie', 'Bibliographie'), numero: 2, texte: note(rapport, 'conclusion', 'bibliographie'), editPath: { source: 'section', field: 'conclusion:bibliographie' } },
    ],
  }
}

export function buildReportParts(rapport: Rapport): ReportPart[] {
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
        parts.push(presentationPart(rapport, step.id, step.titre))
        continue
      }

      if (step.kind === 'activites') {
        parts.push(activitesPart(rapport, step.id, step.titre))
        continue
      }

      // Standard explanatory sections render as merged paragraphs (identical to the official plan)
      if (step.id === 'remerciements') {
        parts.push(remerciementsPart(rapport, step.id, step.titre))
        continue
      }
      if (step.id === 'introduction') {
        parts.push(introductionPart(rapport, step.id, step.titre))
        continue
      }
      if (step.id === 'contexte') {
        parts.push(contextePart(rapport, step.id, step.titre))
        continue
      }
      if (step.id === 'objectifs') {
        parts.push(objectifsPart(rapport, step.id, step.titre))
        continue
      }
      if (step.id === 'conclusion') {
        parts.push(conclusionPart(rapport, step.id, step.titre))
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

  const deroulement: ReportPart = {
    key: 'deroulement',
    numero: null,
    titre: titleO(rapport, 'step', 'deroulement', 'Déroulement du stage'),
    sousSections: [
      { titre: titleO(rapport, 'section', 'deroulement:departements', 'Départements ou services visités'), numero: 1, texte: note(rapport, 'deroulement', 'departements'), editPath: { source: 'section', field: 'deroulement:departements' } },
      { titre: titleO(rapport, 'section', 'deroulement:tachesConfiees', 'Tâches confiées'), numero: 2, texte: note(rapport, 'deroulement', 'tachesConfiees'), editPath: { source: 'section', field: 'deroulement:tachesConfiees' } },
    ],
  }

  const taches: ReportPart = {
    key: 'taches',
    numero: null,
    titre: titleO(rapport, 'step', 'taches', 'Tâches effectuées pendant le stage'),
    sousSections: [
      { titre: titleO(rapport, 'section', 'taches:missionsDetaillees', 'Détail des missions confiées'), numero: 1, texte: note(rapport, 'taches', 'missionsDetaillees'), editPath: { source: 'section', field: 'taches:missionsDetaillees' } },
      { titre: titleO(rapport, 'section', 'taches:competencesDeveloppees', 'Compétences développées'), numero: 2, texte: note(rapport, 'taches', 'competencesDeveloppees'), editPath: { source: 'section', field: 'taches:competencesDeveloppees' } },
      { titre: titleO(rapport, 'section', 'taches:problematiquesRencontrees', 'Problématiques rencontrées'), numero: 3, texte: note(rapport, 'taches', 'problematiquesRencontrees'), editPath: { source: 'section', field: 'taches:problematiquesRencontrees' } },
    ],
  }

  const bilan: ReportPart = {
    key: 'bilan',
    numero: null,
    titre: titleO(rapport, 'step', 'bilan', 'Bilan personnel'),
    sousSections: [
      { titre: titleO(rapport, 'section', 'bilan:competencesAcquises', 'Les compétences acquises'), numero: 1, texte: note(rapport, 'bilan', 'competencesAcquises'), editPath: { source: 'section', field: 'bilan:competencesAcquises' } },
      { titre: titleO(rapport, 'section', 'bilan:enseignementsTires', 'Les enseignements tirés'), numero: 2, texte: note(rapport, 'bilan', 'enseignementsTires'), editPath: { source: 'section', field: 'bilan:enseignementsTires' } },
      { titre: titleO(rapport, 'section', 'bilan:pointsAmeliorer', 'Les points à améliorer'), numero: 3, texte: note(rapport, 'bilan', 'pointsAmeliorer'), editPath: { source: 'section', field: 'bilan:pointsAmeliorer' } },
    ],
  }

  return [
    remerciementsPart(rapport, 'remerciements', titleO(rapport, 'step', 'remerciements', 'Remerciements')),
    introductionPart(rapport, 'introduction', titleO(rapport, 'step', 'introduction', 'Introduction')),
    presentationPart(rapport, 'presentation', titleO(rapport, 'step', 'presentation', "Présentation de l'entreprise d'accueil")),
    {
      key: 'organigramme',
      numero: null,
      titre: titleO(rapport, 'step', 'organigramme', "Organigramme de l'entreprise"),
      isOrganigramme: true,
    },
    activitesPart(rapport, 'activites', titleO(rapport, 'step', 'activites', "Les activités et équipements de l'entreprise")),
    contextePart(rapport, 'contexte', titleO(rapport, 'step', 'contexte', 'Contexte du stage')),
    objectifsPart(rapport, 'objectifs', titleO(rapport, 'step', 'objectifs', 'Objectifs du stage')),
    deroulement,
    taches,
    ...(hasMaterielItems(rapport) ? [{ key: MATERIEL_PART_KEY, numero: null, titre: 'Matériel utilisé' }] : []),
    ...ficheParts(rapport),
    bilan,
    conclusionPart(rapport, 'conclusion', titleO(rapport, 'step', 'conclusion', 'Conclusion')),
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
