const STORAGE_KEY = 'rs:theme:v1'

export interface ThemePreset {
  id: string
  name: string
  accent: string
  accentDeep: string
  accentSoft: string
  swatch: string // hex for preview
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: 'or-antique',
    name: 'Or antique',
    accent: 'oklch(0.8 0.06 85)',
    accentDeep: 'oklch(0.48 0.07 78)',
    accentSoft: 'oklch(0.945 0.022 88)',
    swatch: '#cab99c',
  },
  {
    id: 'bleu-ifmbp',
    name: 'Bleu IFMBP',
    accent: 'oklch(0.55 0.15 250)',
    accentDeep: 'oklch(0.40 0.12 250)',
    accentSoft: 'oklch(0.94 0.03 250)',
    swatch: '#4472c4',
  },
  {
    id: 'rouge-patissier',
    name: 'Rouge pâtissier',
    accent: 'oklch(0.60 0.18 25)',
    accentDeep: 'oklch(0.45 0.14 25)',
    accentSoft: 'oklch(0.95 0.025 25)',
    swatch: '#c0392b',
  },
  {
    id: 'vert-menthe',
    name: 'Vert menthe',
    accent: 'oklch(0.70 0.12 160)',
    accentDeep: 'oklch(0.45 0.10 160)',
    accentSoft: 'oklch(0.95 0.025 160)',
    swatch: '#27ae60',
  },
]

export function applyTheme(preset: ThemePreset): void {
  const s = document.documentElement.style
  s.setProperty('--color-gold', preset.accent)
  s.setProperty('--color-gold-deep', preset.accentDeep)
  s.setProperty('--color-gold-soft', preset.accentSoft)
}

export function loadTheme(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || 'or-antique'
  } catch {
    return 'or-antique'
  }
}

export function saveTheme(id: string): void {
  localStorage.setItem(STORAGE_KEY, id)
}
