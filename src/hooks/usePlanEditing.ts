import type { Organigramme, Rapport, WizardStep } from '../types'
import { emptyCouverture } from '../types'
import { materializeSteps } from '../lib/blockModel'
import type { SetRapportWithHistory } from './useCouvertureEntreprise'

export function usePlanEditing({
  rapport,
  step,
  setStepId,
  setRapportWithHistory,
}: {
  rapport: Rapport
  step: WizardStep
  setStepId: (id: string) => void
  setRapportWithHistory: SetRapportWithHistory
}) {
  const handleAddStep = () => {
    const working = rapport.customSteps ?? materializeSteps()
    const id = crypto.randomUUID()
    const newStep = {
      id: `custom-${id}`,
      numero: String(working.length + 1).padStart(2, '0'),
      titre: `Nouvelle section`,
      sousTitre: 'Section personnalisée',
      consigne: 'Décrivez librement le contenu de cette section.',
      kind: 'notes' as const,
      fields: [
        {
          id: 'contenu',
          label: 'Nouvelle section',
          placeholder: 'Vos notes pour cette section…',
          examples: [],
        },
      ],
    }
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      return { ...r, customSteps: [...steps, newStep], updatedAt: Date.now() }
    })
    setStepId(newStep.id)
  }

  const handleDeleteStep = (stepIdToDelete: string) => {
    const base = rapport.customSteps ?? materializeSteps()
    const stepIdx = base.findIndex((s) => s.id === stepIdToDelete)
    if (stepIdx === -1) return
    if (stepIdToDelete === step.id) {
      const prevStep = base[stepIdx - 1]
      if (prevStep) setStepId(prevStep.id)
    }
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updatedSteps = steps.filter((s) => s.id !== stepIdToDelete)
      for (let i = 2; i < updatedSteps.length; i++) {
        updatedSteps[i].numero = String(i + 1).padStart(2, '0')
      }
      return { ...r, customSteps: updatedSteps, updatedAt: Date.now() }
    })
  }

  const handleRenameStep = (stepId: string, newTitle: string) => {
    setRapportWithHistory(
      (r) => {
        if (!r) return r
        const steps = r.customSteps ? r.customSteps : materializeSteps()
        const isOrg = newTitle.toLowerCase().includes('organigramme')
        const updated = steps.map((s) =>
          s.id === stepId ? { ...s, titre: newTitle, ...(isOrg ? { kind: 'organigramme' as const } : {}) } : s,
        )
        return { ...r, customSteps: updated, updatedAt: Date.now() }
      },
      { isTextKeystroke: true },
    )
  }

  const handleToggleStepKind = (stepId: string, kind: 'notes' | 'organigramme') => {
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map((s) => {
        if (s.id !== stepId) return s
        return {
          ...s,
          kind,
          fields:
            kind === 'notes' && s.fields.length === 0
              ? [{ id: 'contenu', label: s.titre, placeholder: 'Vos notes pour cette section…', examples: [] }]
              : s.fields,
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleFieldOrganigrammeChange = (fieldId: string, org: Organigramme) => {
    setRapportWithHistory((r) => {
      if (!r) return r
      return {
        ...r,
        organigramme: org,
        organigrammes: { ...(r.organigrammes ?? {}), [fieldId]: org },
        updatedAt: Date.now(),
      }
    })
  }

  const handleToggleFieldMode = (stepId: string, fieldId: string, isOrg: boolean) => {
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map((s) => {
        if (s.id !== stepId) return s
        return { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, isOrganigramme: isOrg } : f)) }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleAddSubSection = (stepId: string) => {
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map((s) => {
        if (s.id !== stepId) return s
        const newFieldId = crypto.randomUUID()
        return {
          ...s,
          fields: [...s.fields, { id: newFieldId, label: 'Nouveau sous-titre', placeholder: 'Vos notes pour cette section…', examples: [] }],
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleDeleteSubSection = (stepId: string, fieldId: string) => {
    setRapportWithHistory(
      (r) => {
        if (!r) return r
        const steps = r.customSteps ? r.customSteps : materializeSteps()
        const updated = steps.map((s) => {
          if (s.id !== stepId) return s
          return { ...s, fields: s.fields.filter((f) => f.id !== fieldId && f.parentId !== fieldId) }
        })
        return { ...r, customSteps: updated, updatedAt: Date.now() }
      },
      { isTextKeystroke: true },
    )
  }

  const handleRenameSubSection = (stepId: string, fieldId: string, newLabel: string) => {
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const isOrg = newLabel.toLowerCase().includes('organigramme')
      const updated = steps.map((s) => {
        if (s.id !== stepId) return s
        return {
          ...s,
          fields: s.fields.map((f) => {
            if (f.id !== fieldId) return f
            return { ...f, label: newLabel, ...(isOrg ? { isOrganigramme: true } : {}) }
          }),
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleAddLevel3Item = (stepId: string, parentFieldId: string) => {
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map((s) => {
        if (s.id !== stepId) return s
        const children = s.fields.filter((f) => f.parentId === parentFieldId)
        const letter = String.fromCharCode(97 + children.length)
        const prefix = `${letter}/`
        return {
          ...s,
          fields: [
            ...s.fields,
            { id: crypto.randomUUID(), label: '', placeholder: 'Vos notes pour ce point…', examples: [], parentId: parentFieldId, prefix },
          ],
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleDeleteLevel3Item = (stepId: string, fieldId: string) => {
    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map((s) => {
        if (s.id !== stepId) return s
        return { ...s, fields: s.fields.filter((f) => f.id !== fieldId) }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const clearSection = () => {
    if (!window.confirm("Êtes-vous sûr de vouloir vider cette section ?")) return
    setRapportWithHistory((r) => {
      if (!r) return r
      const newSections = { ...r.sections }
      delete newSections[step.id]
      const newSectionsGenerated = { ...r.sectionsGenerated }
      if (newSectionsGenerated) delete newSectionsGenerated[step.id]
      const newImages = { ...r.images }
      delete newImages[step.id]
      if (step.kind === 'fiche-technique') {
        for (const key of Object.keys(newImages)) {
          if (key.startsWith('fiche-technique-')) delete newImages[key]
        }
      }
      let newCouverture = r.couverture
      let newEntreprise = r.entreprise
      let newOrganigramme = r.organigramme
      let newFiches = r.ficheTechniques
      let newMateriels = r.materiels
      if (step.kind === 'couverture') {
        newCouverture = emptyCouverture()
      } else if (step.kind === 'entreprise') {
        newEntreprise = { ...newEntreprise, nom: '', ville: '', sourceRecherche: null, logoDataUrl: undefined }
      } else if (step.kind === 'organigramme') {
        newOrganigramme = { nodes: [] }
      } else if (step.kind === 'fiche-technique') {
        newFiches = []
        newMateriels = []
      } else if (step.kind === 'presentation') {
        newEntreprise = { ...newEntreprise, organismeAccueil: '', historique: '', secteurActivite: '', missionsValeurs: '' }
      } else if (step.kind === 'activites') {
        newEntreprise = { ...newEntreprise, activitesPrincipales: '', equipements: '', technologies: '' }
      }
      return {
        ...r,
        couverture: newCouverture,
        entreprise: newEntreprise,
        organigramme: newOrganigramme,
        ficheTechniques: newFiches,
        materiels: newMateriels,
        sections: newSections,
        sectionsGenerated: newSectionsGenerated,
        images: newImages,
        updatedAt: Date.now(),
      }
    })
  }

  return {
    handleAddStep,
    handleDeleteStep,
    handleRenameStep,
    handleToggleStepKind,
    handleFieldOrganigrammeChange,
    handleToggleFieldMode,
    handleAddSubSection,
    handleDeleteSubSection,
    handleRenameSubSection,
    handleAddLevel3Item,
    handleDeleteLevel3Item,
    clearSection,
  }
}
