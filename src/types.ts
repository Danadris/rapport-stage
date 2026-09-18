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
  photoActiviteFit?: 'contain' | 'cover'
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
  parentId?: string  // Present if this is a Level 3 sub-item under a Level 2 field
  prefix?: string    // e.g. "a/", "b/" — auto-assigned for Level 3 items
  isOrganigramme?: boolean // Explicit toggle or override for organigramme mode
}

export interface OrgNode {
  id: string
  name: string      // e.g. "M. Ahmed Benali"
  title: string     // e.g. "Directeur Général"
  parentId?: string // undefined = root node
}

export interface Organigramme {
  nodes: OrgNode[]
}

export type StepKind = 'couverture' | 'entreprise' | 'organigramme' | 'presentation' | 'activites' | 'notes' | 'fiche-technique'

export interface FicheIngredient {
  id: string
  ingredient: string
  quantite: string
}

export interface MaterielItem {
  id: string
  nom: string
  utilisation: string
  imageDataUrl?: string
  /** Display size in the "Matériel utilisé" page. Defaults to 'M'. */
  size?: 'S' | 'M' | 'L'
}

export interface FicheTechnique {
  id: string
  nom: string
  famille: string        // 'pain' | 'viennoiserie' | 'patisserie' | 'traiteur' | 'autre'
  nbPieces: string
  poidsUnitaire: string
  duree: string
  ingredients: FicheIngredient[]
  materiel: string
  etapes: string         // numbered steps as free text
  conseils: string       // optional
  hiddenTitles?: Array<'ingredients' | 'materiel' | 'realisation' | 'conseils'>
}

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
  organigramme?: Organigramme
  organigrammes?: Record<string, Organigramme>
  ficheTechniques?: FicheTechnique[]
  materiels?: MaterielItem[]
}

// --- V3.1 Architecture Types ---

export interface ReportMeta {
  id: string
  createdAt: number
  updatedAt: number
  studentName: string
  companyName: string
  periodeNumero: string
  sourceRecherche: 'ia' | 'manuel' | null
  progressDone: number
  progressTotal: number
}

export interface ImageReference {
  id: string
  imageId: string // References StoredImage.id
  side: 'left' | 'right' | 'center'
  size: 'S' | 'M' | 'L'
  caption?: string
  positioning?: 'flow' | 'free'
  x?: number
  y?: number
  blockIndex?: number
}

export interface ReportData {
  id: string
  couverture: Couverture
  entreprise: Entreprise
  sections: Sections
  sectionsGenerated?: Sections
  style?: RapportStyle
  pageBreaks?: Record<string, boolean>
  customSteps?: WizardStep[]
  images?: Record<string, ImageReference[]> // No Base64 data here!
  organigramme?: Organigramme
  organigrammes?: Record<string, Organigramme>
  ficheTechniques?: FicheTechnique[]
  materiels?: MaterielItem[]
}

export interface StoredImage {
  id: string          // Primary Key
  reportId: string    // Indexed for cascade deletes
  blob: Blob          // Raw binary data
  mimeType: string
  width: number
  height: number
  size: number
  createdAt: number
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
