import type { Entreprise, SectionImage } from '../../types'
import { Badge, Field, Input, Textarea } from '../ui'
import { ImageManager } from '../ImageManager'

interface Props {
  value: Entreprise
  onChange: (patch: Partial<Entreprise>) => void
  images: SectionImage[]
  onImagesChange: (images: SectionImage[]) => void
}

export interface EntFieldDef {
  key: keyof Entreprise
  label: string
  placeholder: string
  long?: boolean
}

export function EntrepriseFieldsStep({ fields, value, onChange, images, onImagesChange }: Props & { fields: EntFieldDef[] }) {
  return (
    <div className="space-y-6">
      {value.sourceRecherche === 'ia' && (
        <div className="flex items-center justify-between rounded-lg bg-gold-soft/60 px-4 py-2.5 text-[13px] text-gold-deep">
          Rempli par la recherche automatique
          <Badge>À vérifier</Badge>
        </div>
      )}
      {fields.map((f) => (
        <Field key={f.key} label={f.label}>
          {f.long ? (
            <Textarea
              rows={3}
              counter
              value={(value[f.key] as string) ?? ''}
              onChange={(e) => onChange({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
            />
          ) : (
            <Input
              value={(value[f.key] as string) ?? ''}
              onChange={(e) => onChange({ [f.key]: e.target.value })}
              placeholder={f.placeholder}
            />
          )}
        </Field>
      ))}
      <ImageManager images={images} onChange={onImagesChange} />
      {value.sourceRecherche === 'ia' && (
        <div className="flex justify-end border-t border-line pt-4">
          <button
            onClick={() => onChange({ sourceRecherche: null })}
            className="text-xs text-muted transition-colors hover:text-gold-deep"
          >
            J'ai vérifié ces informations
          </button>
        </div>
      )}
    </div>
  )
}
