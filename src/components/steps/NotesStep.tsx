import { Plus } from 'lucide-react'
import type { NoteField, Organigramme, Entreprise, SectionImage } from '../../types'
import { Button } from '../ui'
import { ImageManager } from '../ImageManager'
import { FieldBox, Level3Box } from './NoteFields'

interface Props {
  stepId: string
  stepTitle: string
  fields: NoteField[]
  values: Record<string, string>
  generatedValues: Record<string, string>
  onChange: (fieldId: string, value: string) => void
  onGenerate: (fieldId: string, value: string) => void
  images: SectionImage[]
  onImagesChange: (images: SectionImage[]) => void
  isCustom?: boolean
  onAddSubSection?: () => void
  onDeleteSubSection?: (fieldId: string) => void
  onRenameSubSection?: (fieldId: string, newLabel: string) => void
  onAddLevel3Item?: (parentFieldId: string) => void
  onDeleteLevel3Item?: (fieldId: string) => void
  organigramme?: Organigramme
  organigrammes?: Record<string, Organigramme>
  onOrganigrammeChange?: (fieldId: string, org: Organigramme) => void
  onToggleFieldMode?: (fieldId: string, isOrg: boolean) => void
  entreprise?: Entreprise
}

export function NotesStep({
  stepTitle,
  fields,
  values,
  generatedValues,
  onChange,
  onGenerate,
  images,
  onImagesChange,
  isCustom,
  onAddSubSection,
  onDeleteSubSection,
  onRenameSubSection,
  onAddLevel3Item,
  onDeleteLevel3Item,
  organigramme,
  organigrammes,
  onOrganigrammeChange,
  onToggleFieldMode,
  entreprise,
}: Props) {
  const level2Fields = fields.filter((f) => !f.parentId)

  const getFieldOrg = (fieldId: string): Organigramme => {
    if (organigrammes?.[fieldId]?.nodes?.length) return organigrammes[fieldId]
    return organigramme ?? { nodes: [] }
  }

  return (
    <div className="space-y-10">
      {level2Fields.map((f, idx) => {
        const level3Children = fields.filter((c) => c.parentId === f.id)
        const hasLevel3 = isCustom && level3Children.length > 0

        return (
          <div key={f.id} className="space-y-4">
            {isCustom && (
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[11px] font-mono font-bold text-faint">{idx + 1}.</span>
              </div>
            )}

            <FieldBox
              f={f}
              stepTitle={stepTitle}
              current={values[f.id] ?? ''}
              generated={generatedValues[f.id] ?? ''}
              onChange={onChange}
              onGenerate={onGenerate}
              isCustom={isCustom}
              onRename={isCustom && onRenameSubSection ? (val) => onRenameSubSection(f.id, val) : undefined}
              onDelete={isCustom && onDeleteSubSection && level2Fields.length > 1 ? () => onDeleteSubSection(f.id) : undefined}
              organigrammeData={getFieldOrg(f.id)}
              onOrganigrammeChange={onOrganigrammeChange ? (val) => onOrganigrammeChange(f.id, val) : undefined}
              onToggleMode={onToggleFieldMode ? (isOrg) => onToggleFieldMode(f.id, isOrg) : undefined}
              entreprise={entreprise}
            />

            {hasLevel3 && (
              <div className="space-y-5 mt-2">
                {level3Children.map((child) => (
                  <Level3Box
                    key={child.id}
                    f={child}
                    stepTitle={stepTitle}
                    current={values[child.id] ?? ''}
                    generated={generatedValues[child.id] ?? ''}
                    onChange={onChange}
                    onGenerate={onGenerate}
                    onRename={onRenameSubSection ? (val) => onRenameSubSection(child.id, val) : undefined}
                    onDelete={onDeleteLevel3Item ? () => onDeleteLevel3Item(child.id) : undefined}
                    organigrammeData={getFieldOrg(child.id)}
                    onOrganigrammeChange={onOrganigrammeChange ? (val) => onOrganigrammeChange(child.id, val) : undefined}
                    onToggleMode={onToggleFieldMode ? (isOrg) => onToggleFieldMode(child.id, isOrg) : undefined}
                    entreprise={entreprise}
                  />
                ))}
              </div>
            )}

            {isCustom && onAddLevel3Item && (
              <div className="pl-4">
                <button
                  type="button"
                  onClick={() => onAddLevel3Item(f.id)}
                  className="inline-flex items-center gap-1.5 text-[12px] text-faint hover:text-gold-deep transition-colors"
                >
                  <Plus size={13} />
                  Ajouter un point ({String.fromCharCode(97 + level3Children.length)}/
                </button>
              </div>
            )}
          </div>
        )
      })}

      {isCustom && onAddSubSection && (
        <div className="flex justify-center pt-2">
          <Button variant="secondary" size="sm" onClick={onAddSubSection}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1.5"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
            Ajouter un sous-titre
          </Button>
        </div>
      )}

      <div className="pt-4 border-t border-line">
        <ImageManager images={images} onChange={onImagesChange} />
      </div>
    </div>
  )
}
