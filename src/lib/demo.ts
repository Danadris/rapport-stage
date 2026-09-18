import type { Rapport } from '../types'
import { emptyCouverture, emptyEntreprise } from '../types'
import demoPain from '../assets/demo/pain-levain.jpg'
import demoEntremets from '../assets/demo/entremets.jpg'

export function createRapport(partial?: Partial<Rapport>): Rapport {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    couverture: emptyCouverture(),
    entreprise: emptyEntreprise(),
    sections: {},
    images: {},
    ...partial,
  }
}

export function demoRapport(): Rapport {
  const painId = 'demo-fiche-pain-levain'
  const entremetsId = 'demo-fiche-entremets'
  return createRapport({
    couverture: {
      ...emptyCouverture(),
      nomStagiaire: 'Salma Benali',
      periodeNumero: '3',
      periodeDebut: '2026-05-04',
      periodeFin: '2026-06-12',
      objectifStage:
        'Consolider les techniques de production en laboratoire de pâtisserie et découvrir l\'organisation d\'une artisanale.',
      tuteurPedagogique: 'M. Rachid Bennani',
      tuteurIndustriel: 'Mme Amina Cherkaoui',
      membresJury: ['M. Karim Tazi', 'Mme Leila Ouazzani'],
    },
    entreprise: {
      nom: 'Medina & Co Pâtisserie',
      ville: 'Casablanca',
      sourceRecherche: 'ia',
      organismeAccueil:
        'Pâtisserie artisanale spécialisée dans les gâteaux sur commande et une carte de saison renouvelée régulièrement.',
      historique:
        'Fondée par une artisane passionnée, Medina & Co s\'est construite autour d\'une conviction : la saveur avant la décoration. La maison travaille avec des producteurs locaux et adapte sa carte au fil des saisons.',
      secteurActivite: 'Pâtisserie artisanale : gâteaux personnalisés, pâtisseries du jour et pains au levain.',
      missionsValeurs:
        'Artisanat, régularité et hospitalité. Chaque création est pensée pour être goûtée autant qu\'admirée.',
      activitesPrincipales:
        'Gâteaux personnalisés (étages, mariages), collections de saveurs signature, et une carte de marché hebdomadaire : cookies, muffins, cakes individuels, babas, pain au levain et focaccia.',
      equipements:
        'Four ventilateur, four à sole, pétrin à spirale, batteur planetary, chambres de fermentation et de froid positive, table à marbre.',
      technologies:
        'Gestion des commandes personnalisées sur fiche client, pesée numérique, suivi HACCP des températures.',
    },
    sections: {
      remerciements: {
        personnes:
          'Mme Amina Cherkaoui, cheffe du laboratoire ; toute l\'équipe de pâtisserie ; M. Rachid Bennani, mon tuteur pédagogique à l\'institut.',
        raisons:
          'La cheffe m\'a confié des responsabilités réelles dès la deuxième semaine et prenait le temps de corriger mes finitions. L\'équipe m\'a intégré au rythme du laboratoire sans rien me épargner, ce qui m\'a fait progresser très vite.',
      },
      introduction: {
        presentationBreve:
          'Stagiaire en formation Technicien Spécialisé Boulangerie-Pâtisserie à l\'IFMBP, j\'ai effectué un stage de six semaines au sein de Medina & Co Pâtisserie à Casablanca, une maison artisanale de huit personnes réparties entre laboratoire et boutique.',
        objectifsIntro:
          'Ce stage devait me permettre de mettre en pratique les techniques vues en atelier, de découvrir le rythme réel d\'une production artisanale et de me perfectionner en entremets montés.',
      },
      contexte: {
        rechercheStage:
          'Le stage a été trouvé par démarches personnelle : après le dépôt de plusieurs candidatures dans les boutiques du quartier, Medina & Co a répondu favorablement et m\'a reçu pour un essai d\'une journée avant de valider la période.',
      },
      objectifs: {
        objectifsFixes:
          'Maîtriser la réalisation complète d\'un entremets monté, apprendre à gérer les quantités de production journalières et observer l\'application concrète des règles HACCP en laboratoire professionnel.',
      },
      deroulement: {
        departements:
          'Semaines 1-2 : laboratoire pâtisserie, bases et crèmes. Semaine 3 : viennoiserie et pains au levain. Semaines 4-5 : gâteaux sur commande avec la cheffe. Semaine 6 : boutique, mise en vitrine et vente.',
        tachesConfiees:
          'Préparation quotidienne des crèmes (pâtissière, diplomate, ganache montée), réalisation des fonds de tarte, participation au montage des entremets de commande, mise en place du laboratoire dès l\'ouverture.',
      },
      taches: {
        missionsDetaillees:
          'Ma mission principale a été la réalisation encadrée d\'une commande de trente entremets montés pour un événement : planification des temps, préparation des inserts, biscuit cuillère, mousse pistache-raspberry, glaçage miroir et finitions décoratives.',
        competencesDeveloppees:
          'Tempérage du chocolat et régularité des glaçages miroir, gestion des temps de repos en parallèle de plusieurs productions, communication efficace pendant les moments de forte activité.',
        problematiquesRencontrees:
          'Mes premiers glaçages étaient trop épais faute de température maîtrisée ; la cheffe m\'a fait reprendre les bases du tempérage et j\'ai établi une fiche de suivi des températures que l\'équipe utilise désormais.',
      },
      bilan: {
        competencesAcquises:
          'Autonomie complète sur la gamme des crèmes de base, confiance dans le montage d\'entremets professionnels et rigueur renforcée sur la traçabilité des températures.',
        enseignementsTires:
          'La régularité compte autant que la créativité dans le métier : c\'est elle qui fidélise la clientèle d\'une artisanale.',
        pointsAmeliorer:
          'Ma vitesse de montage reste en dessous des cadences professionnelles lors des grosses commandes ; je dois aussi approfondir les pâtes levées sucrées.',
      },
      conclusion: {
        resumeExperiences:
          'Six semaines intenses entre laboratoire et boutique qui m\'ont permis de confronter ma formation à la réalité d\'une production artisanale exigeante, avec des responsables prêtes à transmettre.',
        perspectives:
          'Je souhaite me spécialiser en chocolaterie lors de la prochaine période de stage et viser, après le diplôme, un poste en pâtisserie fine où la carte évolue avec les saisons.',
        annexes: 'Fiches recettes utilisées au laboratoire ; photos de réalisations ; planning de production hebdomadaire.',
        bibliographie: 'Catalogue des formations IFMBP ; guide interne des bonnes pratiques HACCP de Medina & Co.',
      },
    },
    images: {
      presentation: [
        {
          id: 'img-demo-1',
          dataUrl: demoEntremets,
          side: 'right',
          size: 'S',
          caption: 'Figure 1 : Entremets de saison en vitrine',
        },
      ],
      taches: [
        {
          id: 'img-demo-2',
          dataUrl: demoPain,
          side: 'right',
          size: 'S',
          caption: 'Figure 2 : Pain au levain façonné au laboratoire',
        },
        {
          id: 'img-demo-3',
          dataUrl: demoEntremets,
          side: 'left',
          size: 'M',
          caption: 'Figure 3 : Entremets montés en fin de journée',
        },
      ],
      [`fiche-technique-${painId}`]: [
        {
          id: 'img-demo-fiche-pain',
          dataUrl: demoPain,
          side: 'right',
          size: 'M',
        },
      ],
      [`fiche-technique-${entremetsId}`]: [
        {
          id: 'img-demo-fiche-entremets',
          dataUrl: demoEntremets,
          side: 'right',
          size: 'M',
        },
      ],
    },
    materiels: [
      {
        id: 'demo-materiel-petrin',
        nom: 'Pétrin à spirale',
        utilisation: 'Utilisé pour le pétrissage des pâtes levées et le développement du réseau glutineux.',
        imageDataUrl: demoPain,
      },
      {
        id: 'demo-materiel-batteur',
        nom: 'Robot pâtissier',
        utilisation: 'Utilisé pour monter les crèmes, réaliser les mousses et homogénéiser les appareils.',
        imageDataUrl: demoEntremets,
      },
    ],
    ficheTechniques: [
      {
        id: entremetsId,
        nom: 'Entremets pistache-framboise',
        famille: 'patisserie',
        nbPieces: '10',
        poidsUnitaire: '180 g',
        duree: '3h30 + repos',
        ingredients: [
          { id: 'ing-ft2-1', ingredient: 'Biscuit cuillère', quantite: '1 plaque' },
          { id: 'ing-ft2-2', ingredient: 'Insert framboise', quantite: '300 g' },
          { id: 'ing-ft2-3', ingredient: 'Mousse pistache', quantite: '600 g' },
          { id: 'ing-ft2-4', ingredient: 'Glaçage miroir', quantite: '350 g' },
        ],
        materiel: 'Cercle à entremets Ø18cm, flexipat, bâche plastique, pistolet, thermomètre, robot pâtissier.',
        etapes:
          '1. Étaler le biscuit cuillère sur 1 cm et le détailler aux dimensions du cercle.\n2. Coulé l\'insert framboise et le congeler.\n3. Réaliser la mousse pistache et la couler à moitié dans le cercle.\n4. Insérer l\'insert framboise puis finir de mouler.\n5. Démouler après congélation complète.\n6. Napper de glaçage miroir à 35°C puis décorer.',
        conseils:
          'Vérifier la température du glaçage avant le nappage : trop froid il fige, trop chaud il dégouline. Travailler la mousse rapidement pour qu\'elle ne tranche pas.',
      },
      {
        id: painId,
        nom: 'Pain au levain tradition',
        famille: 'pain',
        nbPieces: '8',
        poidsUnitaire: '750 g',
        duree: '6h + fermentation',
        ingredients: [
          { id: 'ing-ft1-1', ingredient: 'Farine T65', quantite: '1000 g' },
          { id: 'ing-ft1-2', ingredient: 'Eau', quantite: '700 g' },
          { id: 'ing-ft1-3', ingredient: 'Levain liquide', quantite: '400 g' },
          { id: 'ing-ft1-4', ingredient: 'Sel', quantite: '20 g' },
        ],
        materiel: 'Pétrin à spirale, bannetons, couche, lame de scarification, four à sole avec pierre.',
        etapes:
          '1. Autolyse farine et eau pendant 30 minutes.\n2. Incorporer le levain, puis le sel en fin de pétrissage.\n3. Pointer à température ambiante pendant 3 heures avec un rabat.\n4. Diviser en pâtons de 750 g et bannetonner.\n5. Apprêt de 12 heures au froid.\n6. Scarifier et enfourner à 250°C avec buée.',
        conseils:
          'La température de la pâte doit rester autour de 22-24°C. Ne pas hésiter à prolonger l\'autolyse pour développer le réseau sans pétrir trop fort.',
      },
    ],
  })
}
