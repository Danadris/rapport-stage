export interface Couverture {
  nomStagiaire: string
  periodeNumero: string
  periodeDebut: string
  periodeFin: string
  objectifStage: string
  tuteurPedagogique: string
  tuteurIndustriel: string
  membresJury: string[]
  photoActivite?: string
}

export interface Entreprise {
  nom: string
  ville: string
  logoDataUrl?: string
  sourceRecherche: 'ia' | 'manuel' | null
  organismeAccueil: string
  historique: string
  secteurActivite: string
  missionsValeurs: string
  activitesPrincipales: string
  equipements: string
  technologies: string
}

export interface SectionImage {
  id: string
  dataUrl: string
  side: 'left' | 'right' | 'center'
  size: 'S' | 'M' | 'L'
  caption?: string
  /** 'flow' = inline float (default), 'free' = absolute positioning like Word floating image */
  positioning?: 'flow' | 'free'
  /** Pixel offset from left of page content area (only used when positioning === 'free') */
  x?: number
  /** Pixel offset from top of page (only used when positioning === 'free') */
  y?: number
  /** Which text block (paragraph/title) this image is attached to. Defaults to array index. */
  blockIndex?: number
}

export type SectionNotes = Record<string, string>
export type Sections = Record<string, SectionNotes>

export interface NoteField {
  id: string
  label: string
  hint?: string
  placeholder: string
  examples: string[]
}

export type StepKind = 'couverture' | 'entreprise' | 'presentation' | 'activites' | 'notes'

export interface WizardStep {
  id: string
  numero: string
  titre: string
  sousTitre: string
  consigne: string
  kind: StepKind
  fields: NoteField[]
}

export interface RapportStyle {
  primaryColor: string
  titleFont: string
  bodyFont: string
  titleSize?: number
  subtitleSize?: number
  bodySize?: number
  lineSpacing?: number
  margins?: 'narrow' | 'normal' | 'wide'
  textAlign?: 'left' | 'center' | 'justify'
}

export interface Rapport {
  id: string
  createdAt: number
  updatedAt: number
  couverture: Couverture
  entreprise: Entreprise
  sections: Sections
  sectionsGenerated?: Sections
  images?: Record<string, SectionImage[]>
  style?: RapportStyle
  pageBreaks?: Record<string, boolean>
  /** Custom plan defined by the user. undefined = use official WIZARD_STEPS */
  customSteps?: WizardStep[]
}

export interface Settings {
  geminiKey: string
  geminiModel?: string
}

export const emptyCouverture = (): Couverture => ({
  nomStagiaire: '',
  periodeNumero: '',
  periodeDebut: '',
  periodeFin: '',
  objectifStage: '',
  tuteurPedagogique: '',
  tuteurIndustriel: '',
  membresJury: [],
})

export const emptyEntreprise = (): Entreprise => ({
  nom: '',
  ville: '',
  sourceRecherche: null,
  organismeAccueil: '',
  historique: '',
  secteurActivite: '',
  missionsValeurs: '',
  activitesPrincipales: '',
  equipements: '',
  technologies: '',
})
