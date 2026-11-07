import type { Couverture, Entreprise, SectionImage, TextBlock, WizardStep } from '../types'
import { moveBlock } from '../lib/blockModel'
import type { SetRapportWithHistory } from './useCouvertureEntreprise'

export function usePreviewEdits({
  step,
  setRapportWithHistory,
  patchCouverture,
  patchEntreprise,
}: {
  step: WizardStep
  setRapportWithHistory: SetRapportWithHistory
  patchCouverture: (patch: Partial<Couverture>) => void
  patchEntreprise: (patch: Partial<Entreprise>) => void
}) {
  const setNote = (fieldId: string, value: string) =>
    setRapportWithHistory(
      (r) =>
        r
          ? {
              ...r,
              sections: { ...r.sections, [step.id]: { ...(r.sections[step.id] ?? {}), [fieldId]: value } },
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

  const setImages = (sectionId: string, imgs: SectionImage[]) =>
    setRapportWithHistory((r) =>
      r ? { ...r, images: { ...(r.images ?? {}), [sectionId]: imgs }, updatedAt: Date.now() } : r,
    )

  const setFicheImages = (ficheId: string, imgs: SectionImage[]) => setImages(`fiche-technique-${ficheId}`, imgs)

  const setTextBlocks = (sectionId: string, blocks: TextBlock[]) =>
    setRapportWithHistory((r) =>
      r ? { ...r, textBlocks: { ...(r.textBlocks ?? {}), [sectionId]: blocks }, updatedAt: Date.now() } : r,
    )

  const setBlockOrder = (sectionId: string, order: string[]) =>
    setRapportWithHistory((r) =>
      r ? { ...r, blockOrder: { ...(r.blockOrder ?? {}), [sectionId]: order }, updatedAt: Date.now() } : r,
    )

  const moveBlockToSection = (
    fromSection: string,
    blockKey: string,
    toSection: string,
    index: number,
    sourceKeys: string[],
    targetKeys: string[],
  ) => {
    setRapportWithHistory((r) => (r ? (moveBlock(r, fromSection, blockKey, toSection, index, sourceKeys, targetKeys) ?? r) : r))
  }

  const handlePreviewEdit = (source: 'entreprise' | 'section' | 'couverture', field: string, value: string) => {
    if (source === 'couverture') {
      if (field === 'membresJury') {
        const list = value.split(',').map((s) => s.trim()).filter(Boolean)
        patchCouverture({ membresJury: list })
      } else {
        patchCouverture({ [field]: value } as Partial<Couverture>)
      }
    } else if (source === 'entreprise') {
      patchEntreprise({ [field]: value } as Partial<Entreprise>)
    } else {
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
              titleOverrides: r.customSteps ? r.titleOverrides : { ...(r.titleOverrides ?? {}), [`step:${stepId}`]: value },
              updatedAt: Date.now(),
            }
          : r,
      )
      return
    }
    if (field.startsWith('titleOverride:')) {
      const key = field.slice('titleOverride:'.length)
      setRapportWithHistory((r) =>
        r ? { ...r, titleOverrides: { ...(r.titleOverrides ?? {}), [key]: value }, updatedAt: Date.now() } : r,
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

  return {
    setNote,
    setGeneratedNote,
    setImages,
    setFicheImages,
    setTextBlocks,
    setBlockOrder,
    moveBlockToSection,
    handlePreviewEdit,
    handlePreviewTitleEdit,
  }
}
