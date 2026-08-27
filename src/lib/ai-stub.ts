import type { Entreprise } from '../types'

export interface RechercheResultat {
  entreprise: Omit<Entreprise, 'nom' | 'ville' | 'logoDataUrl' | 'sourceRecherche'>
  sources: string[]
}

const MEDINA_RESULTAT: RechercheResultat = {
  entreprise: {
    organismeAccueil:
      'Pâtisserie artisanale spécialisée dans les gâteaux sur commande et une carte de saison renouvelée chaque semaine.',
    historique:
      'Fondée par une artisane passionnée, la maison s\'est construite autour d\'une conviction : la saveur avant la décoration. Elle travaille avec des producteurs locaux et fait évoluer sa carte au fil des saisons.',
    secteurActivite:
      'Pâtisserie artisanale : gâteaux personnalisés (jusqu\'à quatre étages), pâtisseries du jour, pains au levain.',
    missionsValeurs:
      'Artisanat, régularité et hospitalité. Chaque création est pensée pour être goûtée autant qu\'admirée.',
    activitesPrincipales:
      'Gâteaux personnalisés sur commande, collections de saveurs signature (pistache-rose, citron-myrtille, vanille de Madagascar) et carte hebdomadaire : cookies, muffins, cakes individuels, babkas, cinnamon rolls, pain au levain et focaccia.',
    equipements:
      'Four ventilateur et four à sole, pétrin à spirale, batteur planetary, chambres de fermentation réfrigérées, table à marbre, armoires de froid positif.',
    technologies:
      'Suivi HACCP des températures, pesée numérique, gestion des commandes personnalisées par fiche client.',
  },
  sources: ['medinacopatisserie.com', 'avis clients en ligne'],
}

export async function rechercheEntreprise(nom: string, ville: string): Promise<RechercheResultat> {
  await new Promise((resolve) => setTimeout(resolve, 1800))
  const base = MEDINA_RESULTAT
  const nomAffiche = nom.trim() || 'l\'entreprise'
  return {
    entreprise: {
      ...base.entreprise,
      historique: base.entreprise.historique.replace(/la maison/, nomAffiche),
      secteurActivite: ville.trim()
        ? `${base.entreprise.secteurActivite} Établissement situé à ${ville.trim()}.`
        : base.entreprise.secteurActivite,
    },
    sources: base.sources,
  }
}
