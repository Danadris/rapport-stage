import type { Couverture, Entreprise, Organigramme, FicheTechnique, MaterielItem, Rapport, RapportStyle, SectionImage, WizardStep } from '../types'
import { emptyCouverture } from '../types'
import { WIZARD_STEPS } from '../data/sections'

export function useWorkspaceSteps({
  rapport,
  step,
  setStepId,
  setRapportWithHistory,
}: {
  rapport: Rapport
  step: WizardStep
  setStepId: (id: string) => void
  setRapportWithHistory: (
    updater: Rapport | ((prev: Rapport | null) => Rapport | null),
    options?: { isTextKeystroke?: boolean },
  ) => void
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
    setRapportWithHistory(
      (r) => {
        if (!r) return r
        return {
          ...r,
          organigramme,
          ...(key ? { organigrammes: { ...(r.organigrammes ?? {}), [key]: organigramme } } : {}),
          updatedAt: Date.now(),
        }
      },
    )

  const patchFicheTechniques = (fiches: FicheTechnique[]) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, ficheTechniques: fiches, updatedAt: Date.now() } : r),
    )

  const patchMateriels = (materiels: MaterielItem[]) =>
    setRapportWithHistory(
      (r) => (r ? { ...r, materiels, updatedAt: Date.now() } : r),
    )

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

  const setFicheImages = (ficheId: string, imgs: SectionImage[]) =>
    setImages(`fiche-technique-${ficheId}`, imgs)

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

  const setNote = (fieldId: string, value: string) =>
    setRapportWithHistory(
      (r) =>
        r
          ? {
              ...r,
              sections: {
                ...r.sections,
                [step.id]: { ...(r.sections[step.id] ?? {}), [fieldId]: value },
              },
              updatedAt: Date.now(),
            }
          : r,
      { isTextKeystroke: true },
    )

  const setGeneratedNote = (fieldId: string, value: string) =>
    setRapportWithHistory((r) =>
      r
        ? {
            ...r,
            sectionsGenerated: {
              ...(r.sectionsGenerated ?? {}),
              [step.id]: { ...(r.sectionsGenerated?.[step.id] ?? {}), [fieldId]: value },
            },
            updatedAt: Date.now(),
          }
        : r,
    )

  /** Copies the official plan into customSteps so the user can edit/add/delete sections. */
  const materializeSteps = (): WizardStep[] =>
    WIZARD_STEPS.map((s) => ({ ...s, fields: s.fields.map((f) => ({ ...f })) }))

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
    const stepIdx = base.findIndex(s => s.id === stepIdToDelete)
    if (stepIdx === -1) return

    // Redirect if we are deleting the current step
    if (stepIdToDelete === step.id) {
       const prevStep = base[stepIdx - 1]
       if (prevStep) setStepId(prevStep.id)
    }

    setRapportWithHistory((r) => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updatedSteps = steps.filter(s => s.id !== stepIdToDelete)
      // Renumber remaining steps (skipping the 2 fixed steps)
      for (let i = 2; i < updatedSteps.length; i++) {
        updatedSteps[i].numero = String(i + 1).padStart(2, '0')
      }
      return { ...r, customSteps: updatedSteps, updatedAt: Date.now() }
    })
  }

  const handleRenameStep = (stepId: string, newTitle: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const isOrg = newTitle.toLowerCase().includes('organigramme')
      const updated = steps.map(s => s.id === stepId ? { 
        ...s, 
        titre: newTitle,
        ...(isOrg ? { kind: 'organigramme' as const } : {}),
      } : s)
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleToggleStepKind = (stepId: string, kind: 'notes' | 'organigramme') => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return {
          ...s,
          kind,
          fields: kind === 'notes' && s.fields.length === 0
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
        organigrammes: {
          ...(r.organigrammes ?? {}),
          [fieldId]: org,
        },
        updatedAt: Date.now(),
      }
    })
  }

  const handleToggleFieldMode = (stepId: string, fieldId: string, isOrg: boolean) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return {
          ...s,
          fields: s.fields.map(f => f.id === fieldId ? { ...f, isOrganigramme: isOrg } : f)
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleAddSubSection = (stepId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        const newFieldId = crypto.randomUUID()
        return {
          ...s,
          fields: [
            ...s.fields,
            {
              id: newFieldId,
              label: 'Nouveau sous-titre',
              placeholder: 'Vos notes pour cette section…',
              examples: [],
            }
          ]
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleDeleteSubSection = (stepId: string, fieldId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId && f.parentId !== fieldId) }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleRenameSubSection = (stepId: string, fieldId: string, newLabel: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const isOrg = newLabel.toLowerCase().includes('organigramme')
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return {
          ...s,
          fields: s.fields.map(f => {
            if (f.id !== fieldId) return f
            return {
              ...f,
              label: newLabel,
              ...(isOrg ? { isOrganigramme: true } : {}),
            }
          })
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleAddLevel3Item = (stepId: string, parentFieldId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        const children = s.fields.filter(f => f.parentId === parentFieldId)
        const letter = String.fromCharCode(97 + children.length) // a, b, c...
        const prefix = `${letter}/`
        return {
          ...s,
          fields: [
            ...s.fields,
            {
              id: crypto.randomUUID(),
              label: '',
              placeholder: 'Vos notes pour ce point…',
              examples: [],
              parentId: parentFieldId,
              prefix,
            }
          ]
        }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }

  const handleDeleteLevel3Item = (stepId: string, fieldId: string) => {
    setRapportWithHistory(r => {
      if (!r) return r
      const steps = r.customSteps ? r.customSteps : materializeSteps()
      const updated = steps.map(s => {
        if (s.id !== stepId) return s
        return { ...s, fields: s.fields.filter(f => f.id !== fieldId) }
      })
      return { ...r, customSteps: updated, updatedAt: Date.now() }
    })
  }


  const setImages = (sectionId: string, imgs: SectionImage[]) =>
    setRapportWithHistory((r) =>
      r ? { ...r, images: { ...(r.images ?? {}), [sectionId]: imgs }, updatedAt: Date.now() } : r,
    )

  const handlePreviewEdit = (source: 'entreprise' | 'section', field: string, value: string) => {
    if (source === 'entreprise') {
      patchEntreprise({ [field]: value } as Partial<Entreprise>)
    } else {
      // field format is "stepId:fieldId"
      const [stepId, fieldId] = field.split(':')
      setRapportWithHistory((r) =>
        r
          ? {
              ...r,
              sectionsGenerated: {
                ...(r.sectionsGenerated ?? {}),
                [stepId]: { ...(r.sectionsGenerated?.[stepId] ?? {}), [fieldId]: value },
              },
              updatedAt: Date.now(),
            }
          : r,
      )
    }
  }

  const handlePreviewTitleEdit = (field: string, value: string) => {
    if (field.startsWith('stepTitle:')) {
      const stepId = field.slice('stepTitle:'.length)
      setRapportWithHistory((r) =>
        r
          ? {
              ...r,
              customSteps: r.customSteps?.map((s) => (s.id === stepId ? { ...s, titre: value } : s)),
              updatedAt: Date.now(),
            }
          : r,
      )
      return
    }
    if (field.startsWith('titleOverride:')) {
      const key = field.slice('titleOverride:'.length)
      setRapportWithHistory((r) =>
        r
          ? {
              ...r,
              titleOverrides: { ...(r.titleOverrides ?? {}), [key]: value },
              updatedAt: Date.now(),
            }
          : r,
      )
      return
    }
    if (field.startsWith('fieldLabel:')) {
      const [stepId, fieldId] = field.slice('fieldLabel:'.length).split(':')
      setRapportWithHistory((r) =>
        r
          ? {
              ...r,
              customSteps: r.customSteps?.map((s) =>
                s.id === stepId && 'fields' in s && s.fields
                  ? { ...s, fields: s.fields.map((f) => (f.id === fieldId ? { ...f, label: value } : f)) }
                  : s,
              ),
              updatedAt: Date.now(),
            }
          : r,
      )
    }
  }

  const clearSection = () => {
    if (window.confirm("Êtes-vous sûr de vouloir vider cette section ?")) {
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
          newEntreprise = {
            ...newEntreprise,
            nom: '',
            ville: '',
            sourceRecherche: null,
            logoDataUrl: undefined,
          }
        } else if (step.kind === 'organigramme') {
          newOrganigramme = { nodes: [] }
        } else if (step.kind === 'fiche-technique') {
          newFiches = []
          newMateriels = []
        } else if (step.kind === 'presentation') {
          newEntreprise = {
            ...newEntreprise,
            organismeAccueil: '',
            historique: '',
            secteurActivite: '',
            missionsValeurs: '',
          }
        } else if (step.kind === 'activites') {
          newEntreprise = {
            ...newEntreprise,
            activitesPrincipales: '',
            equipements: '',
            technologies: '',
          }
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
  }

  return {
    patchCouverture,
    patchEntreprise,
    patchOrganigramme,
    patchFicheTechniques,
    patchMateriels,
    patchFicheTechnique,
    patchStyle,
    setNote,
    setGeneratedNote,
    materializeSteps,
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
    setImages,
    setFicheImages,
    handlePreviewEdit,
    handlePreviewTitleEdit,
    clearSection,
  }
}
