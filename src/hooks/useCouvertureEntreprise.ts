import type { Couverture, Entreprise, FicheTechnique, MaterielItem, Organigramme, Rapport, RapportStyle } from '../types'

export type SetRapportWithHistory = (
  updater: Rapport | ((prev: Rapport | null) => Rapport | null),
  options?: { isTextKeystroke?: boolean },
) => void

export function useCouvertureEntreprise({
  setRapportWithHistory,
}: {
  setRapportWithHistory: SetRapportWithHistory
}) {
  const patchCouverture = (patch: Partial<Couverture>) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, couverture: { ...r.couverture, ...patch }, updatedAt: Date.now() } : r),
      { isTextKeystroke: true },
    )

  const patchEntreprise = (patch: Partial<Entreprise>) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, entreprise: { ...r.entreprise, ...patch }, updatedAt: Date.now() } : r),
      { isTextKeystroke: true },
    )

  const patchOrganigramme = (organigramme: Organigramme, key?: string) =>
    setRapportWithHistory((r) => {
      if (!r) return r
      return {
        ...r,
        organigramme,
        ...(key ? { organigrammes: { ...(r.organigrammes ?? {}), [key]: organigramme } } : {}),
        updatedAt: Date.now(),
      }
    })

  const patchFicheTechniques = (fiches: FicheTechnique[]) =>
    setRapportWithHistory((r) => (r ? { ...r, ficheTechniques: fiches, updatedAt: Date.now() } : r))

  const patchMateriels = (materiels: MaterielItem[]) =>
    setRapportWithHistory((r) => (r ? { ...r, materiels, updatedAt: Date.now() } : r))

  const patchFicheTechnique = (ficheId: string, patch: Partial<FicheTechnique>) =>
    setRapportWithHistory((r) =>
      r
        ? {
            ...r,
            ficheTechniques: (r.ficheTechniques ?? []).map((fiche) =>
              fiche.id === ficheId ? { ...fiche, ...patch } : fiche,
            ),
            updatedAt: Date.now(),
          }
        : r,
    )

  const patchStyle = (patch: Partial<RapportStyle>) =>
    setRapportWithHistory((r) =>
      r
        ? {
            ...r,
            style: {
              ...(r.style || {
                primaryColor: '#2f5496',
                titleFont: 'Georgia, "Times New Roman", serif',
                bodyFont: '"Geist Sans", ui-sans-serif, system-ui, sans-serif',
              }),
              ...patch,
            },
            updatedAt: Date.now(),
          }
        : r,
    )

  return {
    patchCouverture,
    patchEntreprise,
    patchOrganigramme,
    patchFicheTechniques,
    patchMateriels,
    patchFicheTechnique,
    patchStyle,
  }
}
