import { GoogleGenAI, Type } from '@google/genai'
import type { Entreprise } from '../types'
import { loadSettings } from './storage'
import { rechercheEntreprise as rechercheEntrepriseLocale } from './ai-stub'

export interface RechercheResultat {
  entreprise: Omit<Entreprise, 'nom' | 'ville' | 'logoDataUrl' | 'sourceRecherche'>
  sources: string[]
}

async function getClient() {
  const settings = await loadSettings()
  const key = settings.geminiKey.trim()
  return key ? new GoogleGenAI({ apiKey: key }) : null
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
  const ai = await getClient()

  if (!ai) {
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
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
  const ai = await getClient()

  if (!ai) {
    return generateOfflineParagraph(section, field, notes)
  }

  const prompt = `Tu es un assistant qui aide un apprenti boulanger/pâtissier à rédiger son rapport de stage.
À partir des notes de l'apprenti concernant la partie "${section}" (champ: "${field}"), rédige un ou deux paragraphes professionnels, clairs et bien formulés.
Le ton doit être celui d'un artisan compétent, sérieux mais sans être excessivement administratif. Utilise un vocabulaire métier précis si pertinent. Ne réponds que par le texte généré final, sans introduction ni conclusion de ta part.
Notes de l'apprenti :
"${notes}"`

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  })

  return (response.text || '').trim()
}
