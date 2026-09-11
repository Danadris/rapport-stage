import type { NoteField, Rapport, WizardStep } from '../types'

const F = (
  id: string,
  label: string,
  placeholder: string,
  examples: string[],
  hint?: string,
): NoteField => ({ id, label, placeholder, examples, hint })

export const WIZARD_STEPS: WizardStep[] = [
  {
    id: 'couverture',
    numero: '01',
    titre: 'Page de couverture',
    sousTitre: 'Identité du rapport',
    consigne:
      'Ces informations apparaissent sur la première page de votre rapport, exactement comme dans le canevas officiel de l\'institut.',
    kind: 'couverture',
    fields: [],
  },
  {
    id: 'entreprise',
    numero: '02',
    titre: 'Entreprise d\'accueil',
    sousTitre: 'Recherche automatique',
    consigne:
      'Tapez le nom de l\'entreprise qui vous a accueilli : l\'application recherche ses informations et remplit une grande partie du rapport pour vous. Vous pourrez toujours corriger chaque détail.',
    kind: 'entreprise',
    fields: [],
  },
  {
    id: 'remerciements',
    numero: '03',
    titre: 'Remerciements',
    sousTitre: 'Section obligatoire',
    consigne:
      'Exprimez votre gratitude envers les personnes qui vous ont soutenu pendant le stage. Notez qui vous voulez remercier et pourquoi, le rapport sera rédigé à partir de vos notes.',
    kind: 'notes',
    fields: [
      F(
        'personnes',
        'Personnes à remercier',
        'Ex : M. Youssef El Amrani (chef de fournil), toute l\'équipe de la boutique…',
        [
          'Le tuteur industriel qui m\'a formé au fournil',
          'L\'équipe de pâtisserie qui m\'a intégré dès le premier jour',
          'La directrice de l\'entreprise pour son accueil',
          'Mes professeurs pour leur préparation technique',
        ],
      ),
      F('raisons', 'Pourquoi les remercier', 'Ce qu\'ils vous ont apporté concrètement pendant ces semaines.', [
        'Il m\'a appris les gestes du pétrissage et la gestion du four',
        'Elle prenait le temps de corriger mes finitions',
        'Ils m\'ont fait confiance sur les commandes des clients',
      ]),
    ],
  },
  {
    id: 'introduction',
    numero: '04',
    titre: 'Introduction',
    sousTitre: 'Section obligatoire',
    consigne:
      'Le lecteur découvre ici le contexte : qui vous êtes, où le stage a eu lieu et ce que vous cherchiez à apprendre.',
    kind: 'notes',
    fields: [
      F(
        'presentationBreve',
        'Brève présentation',
        'Votre formation, l\'entreprise, la période…',
        [
          'Stagiaire en Technicien Spécialisé Boulangerie-Pâtisserie',
          'Stage effectué dans un laboratoire de pâtisserie artisanale',
          'Période de 6 semaines au sein d\'une équipe de 8 personnes',
        ],
      ),
      F(
        'objectifsIntro',
        'Objectifs du stage',
        'Ce que vous espériez apprendre et pratiquer.',
        [
          'Mettre en pratique les techniques vues en atelier',
          'Découvrir le rythme réel de la production quotidienne',
          'Me perfectionner en viennoiserie feuilletée',
        ],
      ),
    ],
  },
  {
    id: 'presentation',
    numero: '05',
    titre: 'Présentation de l\'entreprise',
    sousTitre: 'Rempli par la recherche',
    consigne:
      'Historique, secteur d\'activité et valeurs de l\'organisme d\'accueil. Si vous avez lancé la recherche automatique, ces champs sont déjà remplis : relisez-les et corrigez ce qui doit l\'être.',
    kind: 'presentation',
    fields: [],
  },
  {
    id: 'activites',
    numero: '06',
    titre: 'Activités et équipements',
    sousTitre: 'Section obligatoire',
    consigne:
      'Ce que fait l\'entreprise au quotidien et avec quoi elle travaille : fours, pétrins, chambres de fermentation, matériel spécifique.',
    kind: 'activites',
    fields: [],
  },
  {
    id: 'contexte',
    numero: '07',
    titre: 'Contexte du stage',
    sousTitre: 'Section obligatoire',
    consigne:
      'Comment ce stage a été trouvé et organisé : démarche, contacts, choix de l\'entreprise.',
    kind: 'notes',
    fields: [
      F(
        'rechercheStage',
        'Comment vous avez trouvé le stage',
        'Démarches, personnes mobilisées…',
        [
          'Proposé par l\'institut auprès d\'une entreprise partenaire',
          'Démarches personnelles : CV déposé dans 5 boutiques du quartier',
          'Contact via un ancien stagiaire de la promotion',
        ],
      ),
    ],
  },
  {
    id: 'objectifs',
    numero: '08',
    titre: 'Objectifs du stage',
    sousTitre: 'Section obligatoire',
    consigne:
      'Les objectifs que vous vous étiez fixés avant de commencer, en termes de compétences et de découverte du métier.',
    kind: 'notes',
    fields: [
      F(
        'objectifsFixes',
        'Objectifs fixés avant le stage',
        'Compétences visées, découvertes prévues…',
        [
          'Maîtriser la fermentation et le façonnage des pains courants',
          'Apprendre à gérer les quantités de production en boutique',
          'Observer l\'organisation HACCP d\'un laboratoire professionnel',
        ],
      ),
    ],
  },
  {
    id: 'deroulement',
    numero: '09',
    titre: 'Déroulement du stage',
    sousTitre: 'Section obligatoire',
    consigne:
      'Le fil chronologique : services traversés, tâches confiées semaine après semaine.',
    kind: 'notes',
    fields: [
      F(
        'departements',
        'Départements ou services visités',
        'Fournil, boutique, laboratoire pâtisserie…',
        [
          'Semaines 1-2 : fournil pains courants',
          'Semaine 3 : viennoiserie',
          'Semaines 4-5 : laboratoire pâtisserie, entremets',
          'Semaine 6 : boutique et vente',
        ],
      ),
      F(
        'tachesConfiees',
        'Tâches confiées',
        'Ce qu\'on vous a demandé de faire concrètement.',
        [
          'Pétrir, diviser et façonner 200 baguettes par jour',
          'Préparer les crèmes (pâtissière, diplomate) pour la journée',
          'Assurer la mise en place du fournil dès 5h du matin',
        ],
      ),
    ],
  },
  {
    id: 'taches',
    numero: '10',
    titre: 'Tâches effectuées',
    sousTitre: 'Section obligatoire',
    consigne:
      'Le cœur technique du rapport : missions détaillées, compétences développées et difficultés rencontrées avec leurs solutions.',
    kind: 'notes',
    fields: [
      F(
        'missionsDetaillees',
        'Détail des missions confiées',
        'Une mission marquante décrite précisément.',
        [
          'Réalisation complète d\'une commande de 30 entremets montés',
          'Confection quotidienne de la gamme viennoiserie (croissant, pain au chocolat)',
          'Participation au façonnage des pièces de tradition du week-end',
        ],
      ),
      F(
        'competencesDeveloppees',
        'Compétences développées',
        'Gestes, rigueur, organisation, rapidité…',
        [
          'Tempérage du chocolat et régularité des glaçages',
          'Gestion du temps : respecter les temps de pousse tout en enchaînant les tâches',
          'Travail en équipe et communication pendant le rush',
        ],
      ),
      F(
        'problematiquesRencontrees',
        'Problématiques rencontrées',
        'Difficulté + solution trouvée.',
        [
          'Premiers feuilletages ratés à cause d\'un beurre trop chaud : correction en travaillant plus vite',
          'Fatigue des horaires matinaux : adaptation progressive du rythme',
        ],
      ),
    ],
  },
  {
    id: 'bilan',
    numero: '11',
    titre: 'Bilan personnel',
    sousTitre: 'Section obligatoire',
    consigne:
      'Votre regard rétrospectif : ce que ce stage vous a apporté et ce que vous ferez différemment.',
    kind: 'notes',
    fields: [
      F(
        'competencesAcquises',
        'Les compétences acquises',
        'Techniques mais aussi humaines.',
        [
          'Autonomie complète sur la production des pains courants',
          'Confiance face aux clients et aux commandes personnalisées',
        ],
      ),
      F('enseignementsTires', 'Les enseignements tirés', 'Ce que le métier vous a révélé.', [
        'La régularité compte autant que la créativité',
        'L\'importance de la propreté et de l\'organisation en laboratoire',
      ]),
      F('pointsAmeliorer', 'Les points à améliorer', 'Honnêteté constructive sur vos marges de progrès.', [
        'Ma vitesse de façonnage encore en dessous des cadences professionnelles',
        'Ma connaissance des farines alternatives à approfondir',
      ]),
    ],
  },
  {
    id: 'conclusion',
    numero: '12',
    titre: 'Conclusion & finitions',
    sousTitre: 'Sections finales',
    consigne:
      'Vous refermez le rapport : bilan des expériences, perspectives professionnelles, puis annexes et bibliographie si nécessaire.',
    kind: 'notes',
    fields: [
      F('resumeExperiences', 'Résumé des principales expériences', 'En quelques phrases.', [
        'Six semaines intenses entre fournil et laboratoire',
        'Première vraie confrontation entre formation et réalité professionnelle',
      ]),
      F('perspectives', 'Perspectives dans le domaine', 'Suite envisagée du parcours.', [
        'Spécialisation en chocolaterie lors de la prochaine période',
        'Envie confirmée de travailler en pâtisserie fine après le diplôme',
      ]),
      F(
        'annexes',
        'Annexes (liste des documents)',
        'Documents joints en fin de rapport.',
        ['Fiches recettes utilisées', 'Photos de réalisations', 'Planning de production hebdomadaire'],
        'Optionnel',
      ),
      F(
        'bibliographie',
        'Bibliographie',
        'Sources consultées pendant le stage ou la rédaction.',
        ['Catalogue des formations IFMBP', 'Guide des bonnes pratiques HACCP'],
        'Optionnel',
      ),
    ],
  },
]

export const stepById = (id: string, steps = WIZARD_STEPS): WizardStep | undefined =>
  steps.find((s) => s.id === id)

export function progressOf(
  rapport: Rapport,
  steps = WIZARD_STEPS,
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
