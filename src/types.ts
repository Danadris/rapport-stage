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
  /** Exact width in px; overrides the S/M/L preset when set */
  width?: number
  /** Clockwise rotation in degrees (0/90/180/270) */
  rotate?: number
  /** Mirror the image horizontally */
  flip?: boolean
  /** 'flow' = inline float (default), 'free' = absolute positioning like Word floating image */
  positioning?: 'flow' | 'free'
  /** Pixel offset from left of page content area (only used when positioning === 'free') */
  x?: number
  /** Pixel offset from top of page (only used when positioning === 'free') */
  y?: number
  /** Which text block (paragraph/title) this image is attached to. Defaults to array index. */
  blockIndex?: number
}

type SectionNotes = Record<string, string>
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
  /** Drawn width in page px, set from the preview; absent = natural size. */
  width?: number
  /** Tree direction, set from the preview. */
  orientation?: 'vertical' | 'horizontal'
  /** How the chart is drawn, set from the preview. */
  shape?: OrgShape
}

/** The three chart shapes. `tree` and `tree-side` are trees; `list` is indented. */
export type OrgShape = 'tree' | 'tree-side' | 'list'

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
  /** Override for level-1 titles; falls back to primaryColor. */
  titleColor?: string
  /** Override for subtitles and the a/, b/, c/ prefixes; falls back to primaryColor. */
  subtitleColor?: string
  ifmbpLogo?: string
  coverRibbonWidth?: number
  coverBannerPadding?: number
}

/** A paragraph added from the preview, independent of the section's fields. */
export interface TextBlock {
  id: string
  text: string
  /** 'flow' = between the paragraphs (default), 'free' = placed anywhere on the page like a Word text box */
  positioning?: 'flow' | 'free'
  /**
   * Offset from the block's own place in the flow, in page px (only when
   * positioning === 'free'). Unit-relative — unlike images, which store
   * copy-relative offsets — so the box renders exactly where it is put,
   * whatever holds it.
   */
  x?: number
  /** Offset from the block's own place in the flow, in page px (only when positioning === 'free') */
  y?: number
  /** Box width in page px when free. Defaults to 280. */
  width?: number
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
  /** Free paragraphs added from the preview, keyed by section id. */
  textBlocks?: Record<string, TextBlock[]>
  /** Display order of a section's blocks, keyed by section id — overrides the plan's. */
  blockOrder?: Record<string, string[]>
  style?: RapportStyle
  pageBreaks?: Record<string, boolean>
  /** Custom plan defined by the user. undefined = use official WIZARD_STEPS */
  customSteps?: WizardStep[]
  /** Titles of fixed sections (presentation, activités, annexes…) renamed/removed from the aperçu */
  titleOverrides?: Record<string, string>
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
  createdAt?: number
  updatedAt?: number
  couverture: Couverture
  entreprise: Entreprise
  sections: Sections
  sectionsGenerated?: Sections
  style?: RapportStyle
  pageBreaks?: Record<string, boolean>
  customSteps?: WizardStep[]
  images?: Record<string, ImageReference[]> // No Base64 data here!
  textBlocks?: Record<string, TextBlock[]>
  blockOrder?: Record<string, string[]>
  titleOverrides?: Record<string, string>
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
