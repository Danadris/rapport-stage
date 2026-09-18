import { GoogleGenAI, Type } from '@google/genai'
import type { Entreprise, FicheIngredient, OrgNode } from '../types'
import { loadSettings } from './storage'
import { rechercheEntreprise as rechercheEntrepriseLocale, genererOrganigrammeOffline } from './ai-stub'

export interface FicheGenerationResult {
  famille: string
  nbPieces: string
  poidsUnitaire: string
  duree: string
  ingredients: FicheIngredient[]
  materiel: string
  etapes: string
  conseils: string
}

const FICHE_FAMILLES = ['pain', 'viennoiserie', 'patisserie', 'traiteur', 'autre']

function detectFamille(nom: string): string {
  const n = nom.toLowerCase()
  if (/(baguette|pain|miche|boule|ciabatta|focaccia|fougasse|tradition|levain)/.test(n)) return 'pain'
  if (/(croissant|viennois|pain au chocolat|chausson|brioche|palmier|pain aux raisins|feuillet)/.test(n)) return 'viennoiserie'
  if (/(tarte|entremet|éclair|eclair|macaron|millefeuille|religieuse|choux|chou|saint-honoré|gateau|gâteau|flan|tiramisu|mousse)/.test(n)) return 'patisserie'
  if (/(sandwich|salade|quiche|pizza|plat|traiteur)/.test(n)) return 'traiteur'
  return 'autre'
}

const OFFLINE_FICHES: Record<string, { ingredient: string; quantite: string }[]> = {
  pain: [
    { ingredient: 'Farine de blé T65', quantite: '500 g' },
    { ingredient: 'Eau à 25°C', quantite: '320 g' },
    { ingredient: 'Sel fin', quantite: '10 g' },
    { ingredient: 'Levure boulangère fraîche', quantite: '8 g' },
  ],
  viennoiserie: [
    { ingredient: 'Farine de blé T55', quantite: '500 g' },
    { ingredient: 'Lait entier', quantite: '250 g' },
    { ingredient: 'Beurre de tourage AOP', quantite: '250 g' },
    { ingredient: 'Sucre semoule', quantite: '60 g' },
    { ingredient: 'Levure boulangère fraîche', quantite: '20 g' },
    { ingredient: 'Sel fin', quantite: '10 g' },
  ],
  patisserie: [
    { ingredient: 'Farine de blé T55', quantite: '200 g' },
    { ingredient: 'Œufs entiers', quantite: '4 unités' },
    { ingredient: 'Sucre semoule', quantite: '150 g' },
    { ingredient: 'Beurre doux', quantite: '150 g' },
    { ingredient: 'Crème liquide entière', quantite: '250 g' },
    { ingredient: 'Chocolat noir 64%', quantite: '200 g' },
  ],
  traiteur: [
    { ingredient: 'Pâte à quiche (farine, beurre, eau)', quantite: '250 g' },
    { ingredient: 'Œufs entiers', quantite: '3 unités' },
    { ingredient: 'Crème fraîche épaisse', quantite: '200 g' },
    { ingredient: 'Garniture du jour (fromage, légumes)', quantite: '150 g' },
  ],
  autre: [
    { ingredient: 'Farine de blé T55', quantite: '500 g' },
    { ingredient: 'Œufs entiers', quantite: '3 unités' },
    { ingredient: 'Beurre doux', quantite: '200 g' },
    { ingredient: 'Sucre semoule', quantite: '120 g' },
    { ingredient: 'Lait entier', quantite: '200 g' },
  ],
}

function genererFicheOffline(nom: string): FicheGenerationResult {
  const famille = detectFamille(nom)
  const base = OFFLINE_FICHES[famille] ?? OFFLINE_FICHES.autre
  return {
    famille,
    nbPieces: '12',
    poidsUnitaire: '80 g',
    duree: '2h30',
    ingredients: base.map((i) => ({ id: crypto.randomUUID(), ...i })),
    materiel: 'Pétrin, batteur, plan de travail inox, balance de précision, thermomètre, moules adaptés, plaque de cuisson, spatule coudée.',
    etapes: [
      `Peser tous les ingrédients pour la réalisation du ${nom}.`,
      "Mélanger les ingrédients secs, puis incorporer progressivement les liquides.",
      "Travailler la pâte jusqu'à une texture homogène et souple.",
      "Laisser reposer selon les indications du produit, dans un endroit tempéré.",
      'Façonner, détailler et disposer sur les supports de cuisson.',
      'Enfourner et surveiller la cuisson jusqu’à une coloration régulière.',
      'Laisser refroidir sur grille avant dressage ou conditionnement.',
    ].join('\n'),
    conseils: "Respecter les temps de repos et la température ambiante pour une régularité parfaite. Ajuster l'hydratation selon la farine utilisée.",
  }
}

export async function genererFicheTechnique(
  productName: string,
  entrepriseContext?: string,
): Promise<FicheGenerationResult> {
  const client = await getClient()

  if (!client || !productName.trim()) {
    return genererFicheOffline(productName)
  }

  const contextBlock = entrepriseContext?.trim()
    ? `Informations sur l'entreprise d'accueil (pour le vocabulaire métier) :\n${entrepriseContext.trim()}\n\n`
    : ''

  const prompt = `Tu es un chef boulanger-pâtissier expérimenté. Rédige une fiche technique professionnelle et réaliste pour le produit "${productName.trim()}".
${contextBlock}Respecte scrupuleusement le vocabulaire métier de la boulangerie-pâtisserie (temps de pousse, cuisson vapeur, hydratation, TH, etc.).
Les ingrédients doivent être réalistes et exprimés en grammes pour des quantités adaptées à un laboratoire artisanal (10 à 30 pièces).
Les étapes doivent être numérotées (1., 2., 3., ...) et précises.
Réponds uniquement en JSON.`

  const response = await client.ai.models.generateContent({
    model: client.model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          famille: { type: Type.STRING, description: "Une de : pain, viennoiserie, patisserie, traiteur, autre" },
          nbPieces: { type: Type.STRING, description: 'Nombre de pièces réalisées, ex : 12' },
          poidsUnitaire: { type: Type.STRING, description: 'Poids unitaire en grammes, ex : 80 g' },
          duree: { type: Type.STRING, description: 'Durée totale de réalisation, ex : 2h30' },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ingredient: { type: Type.STRING },
                quantite: { type: Type.STRING },
              },
              required: ['ingredient', 'quantite'],
            },
          },
          materiel: { type: Type.STRING, description: 'Matériel nécessaire, séparé par des virgules' },
          etapes: { type: Type.STRING, description: 'Étapes numérotées, séparées par des retours à la ligne' },
          conseils: { type: Type.STRING, description: 'Conseils & astuces professionnels' },
        },
        required: ['famille', 'nbPieces', 'poidsUnitaire', 'duree', 'ingredients', 'materiel', 'etapes', 'conseils'],
      },
    },
  })

  if (!response.text) {
    throw new Error('Réponse vide')
  }

  const data = JSON.parse(response.text)
  const famille = FICHE_FAMILLES.includes(data.famille) ? data.famille : detectFamille(productName)

  return {
    famille,
    nbPieces: String(data.nbPieces ?? ''),
    poidsUnitaire: String(data.poidsUnitaire ?? ''),
    duree: String(data.duree ?? ''),
    ingredients: (Array.isArray(data.ingredients) ? data.ingredients : [])
      .filter((i: any) => i && i.ingredient)
      .map((i: any) => ({ id: crypto.randomUUID(), ingredient: String(i.ingredient), quantite: String(i.quantite ?? '') })),
    materiel: String(data.materiel ?? ''),
    etapes: String(data.etapes ?? ''),
    conseils: String(data.conseils ?? ''),
  }
}

export interface RechercheResultat {
  entreprise: Omit<Entreprise, 'nom' | 'ville' | 'logoDataUrl' | 'sourceRecherche'>
  sources: string[]
}

async function getClient() {
  const settings = await loadSettings()
  const key = settings.geminiKey.trim()
  if (!key) return null
  return {
    ai: new GoogleGenAI({ apiKey: key }),
    model: settings.geminiModel?.trim() || 'gemini-3.5-flash-lite',
  }
}

function sentenceCase(text: string): string {
  const clean = text.trim().replace(/\s+/g, ' ')
  if (!clean) return ''
  return clean.charAt(0).toUpperCase() + clean.slice(1)
}

function punctuate(text: string): string {
  const clean = sentenceCase(text)
  return /[.!?]$/.test(clean) ? clean : `${clean}.`
}

function generateOfflineParagraph(section: string, field: string, notes: string): string {
  const clean = punctuate(notes)
  const lowerField = field.toLowerCase()
  const lowerSection = section.toLowerCase()

  if (!clean) return ''

  if (lowerField.includes('annexes') || lowerField.includes('bibliographie')) {
    return clean
  }

  if (lowerSection.includes('remerciements')) {
    return `Je tiens à remercier les personnes qui m'ont accompagné pendant cette période de stage. ${clean}`
  }

  if (lowerField.includes('objectif')) {
    return `L'objectif principal de cette partie du stage était clair : ${clean} Cette orientation m'a permis de relier les apprentissages de l'institut aux exigences concrètes du métier.`
  }

  if (lowerField.includes('compétence')) {
    return `${clean} Ces acquis m'ont aidé à travailler avec plus de rigueur, d'autonomie et de précision dans un environnement professionnel.`
  }

  if (lowerField.includes('problématique') || lowerField.includes('difficult')) {
    return `${clean} Cette difficulté a été utile, car elle m'a obligé à observer davantage, à demander conseil et à corriger progressivement ma méthode de travail.`
  }

  if (lowerField.includes('tâche') || lowerField.includes('mission')) {
    return `${clean} Ces missions m'ont permis de mieux comprendre l'organisation quotidienne du laboratoire et l'importance de respecter les gestes, les délais et les règles d'hygiène.`
  }

  return `${clean} Cette expérience a contribué à ma progression professionnelle et m'a donné une vision plus précise du travail en boulangerie-pâtisserie.`
}

export async function rechercheEntreprise(nom: string, ville: string): Promise<RechercheResultat> {
  const client = await getClient()

  if (!client) {
    const res = await rechercheEntrepriseLocale(nom, ville)
    return { ...res, sources: ['Mode sans IA : exemple local à vérifier'] }
  }

  const schema = {
    type: Type.OBJECT,
    properties: {
      organismeAccueil: {
        type: Type.STRING,
        description: 'Brève description de l\'organisme (type de boulangerie/pâtisserie)',
      },
      historique: {
        type: Type.STRING,
        description: 'Historique de l\'entreprise',
      },
      secteurActivite: {
        type: Type.STRING,
        description: 'Secteur d\'activité détaillé',
      },
      missionsValeurs: {
        type: Type.STRING,
        description: 'Missions et valeurs de l\'entreprise',
      },
      activitesPrincipales: {
        type: Type.STRING,
        description: 'Activités principales, produits phares',
      },
      equipements: {
        type: Type.STRING,
        description: 'Exemples d\'équipements utilisés (fours, pétrins, etc.)',
      },
      technologies: {
        type: Type.STRING,
        description: 'Technologies employées (gestion, suivi HACCP, etc.)',
      },
    },
    required: [
      'organismeAccueil',
      'historique',
      'secteurActivite',
      'missionsValeurs',
      'activitesPrincipales',
      'equipements',
      'technologies',
    ],
  }

  const prompt = `Recherche des informations sur l'entreprise "${nom}" située à "${ville}".
Si l'entreprise est connue, utilise des informations réelles.
Si l'entreprise n'est pas très connue, génère des informations vraisemblables et professionnelles pour une boulangerie/pâtisserie artisanale qui correspond à ce nom, en utilisant le vocabulaire métier.
Réponds uniquement en JSON.`

  const response = await client.ai.models.generateContent({
    model: client.model,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: schema,
    },
  })

  if (!response.text) {
    throw new Error('Réponse vide')
  }

  const data = JSON.parse(response.text)
  return { entreprise: data, sources: ['Généré par Gemini AI'] }
}

export async function genererParagraphe(section: string, field: string, notes: string): Promise<string> {
  const client = await getClient()

  if (!client) {
    return generateOfflineParagraph(section, field, notes)
  }

  const prompt = `Tu es un assistant qui aide un apprenti boulanger/pâtissier à rédiger son rapport de stage.
À partir des notes de l'apprenti concernant la partie "${section}" (champ: "${field}"), rédige un ou deux paragraphes professionnels, clairs et bien formulés.
Le ton doit être celui d'un artisan compétent, sérieux mais sans être excessivement administratif. Utilise un vocabulaire métier précis si pertinent. Ne réponds que par le texte généré final, sans introduction ni conclusion de ta part.
Notes de l'apprenti :
"${notes}"`

  const response = await client.ai.models.generateContent({
    model: client.model,
    contents: prompt,
  })

  return (response.text || '').trim()
}

export async function genererOrganigramme(
  companyContext: string,
  freeText: string,
): Promise<OrgNode[]> {
  const client = await getClient()

  const promptText = [
    companyContext.trim() ? `Informations sur l'entreprise :\n${companyContext.trim()}` : '',
    freeText.trim() ? `Description de la structure par le stagiaire :\n${freeText.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  if (!promptText.trim() || !client) {
    return genererOrganigrammeOffline()
  }

  try {
    const prompt = `Tu es un assistant qui génère des organigrammes d'entreprise pour des rapports de stage.
À partir des informations suivantes, génère un organigramme JSON hiérarchique réaliste, cohérent et adapté à la taille de l'entreprise.

${promptText}

Règles :
1. Crée entre 3 et 12 postes pertinents.
2. Le poste le plus haut placé (ex: Directeur Général, Gérant, Chef d'entreprise) n'a pas de parentId (ou parentId null).
3. Tous les autres postes ont un "parentId" qui correspond exactement à l'"id" de leur responsable direct.
4. "name": Nom et prénom de la personne si mentionné, sinon "—" ou un nom plausible.
5. "title": Intitulé du poste clair (ex: "Directeur Général", "Chef de Fournil", "Responsable Pâtisserie", "Boulanger", "Vendeur en boutique").`

    const response = await client.ai.models.generateContent({
      model: client.model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              name: { type: Type.STRING },
              title: { type: Type.STRING },
              parentId: { type: Type.STRING },
            },
            required: ['id', 'name', 'title'],
          },
        },
      },
    })

    const raw = response.text ?? '[]'
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return genererOrganigrammeOffline()
    }

    return parsed.map((n: any) => ({
      id: String(n.id || crypto.randomUUID()),
      name: String(n.name || '—'),
      title: String(n.title || 'Poste'),
      parentId: n.parentId ? String(n.parentId) : undefined,
    }))
  } catch (err) {
    console.warn('AI org chart generation error, falling back to offline stub', err)
    return genererOrganigrammeOffline()
  }
}

