import type { Rapport } from '../types'

export function wordCountOf(rapport: Rapport | null): number {
  if (!rapport) return 0
  const texts: string[] = []
  // entreprise fields
  for (const v of Object.values(rapport.entreprise)) {
    if (typeof v === 'string') texts.push(v)
  }
  // sections
  for (const sec of Object.values(rapport.sections)) {
    for (const v of Object.values(sec)) {
      if (typeof v === 'string') texts.push(v)
    }
  }
  // generated sections
  if (rapport.sectionsGenerated) {
    for (const sec of Object.values(rapport.sectionsGenerated)) {
      for (const v of Object.values(sec)) {
        if (typeof v === 'string') texts.push(v)
      }
    }
  }
  // organigramme
  if (rapport.organigramme?.nodes) {
    for (const n of rapport.organigramme.nodes) {
      if (n.title) texts.push(n.title)
      if (n.name && n.name !== '—') texts.push(n.name)
    }
  }
  return texts.join(' ').split(/\s+/).filter(Boolean).length
}
