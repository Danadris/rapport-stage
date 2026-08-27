import type { Couverture } from '../../types'
import { Field, Input, Textarea } from '../ui'
import { LogoUpload } from '../LogoUpload'
import { TagInput } from '../TagInput'

interface Props {
  value: Couverture
  onChange: (patch: Partial<Couverture>) => void
}

export function CouvertureStep({ value, onChange }: Props) {
  return (
    <div className="space-y-5">
      <Field label="Nom et prénom du stagiaire" htmlFor="nom">
        <Input
          id="nom"
          value={value.nomStagiaire}
          placeholder="Ex : Salma Benali"
          onChange={(e) => onChange({ nomStagiaire: e.target.value })}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-[auto_1fr]">
        <Field label="Période de stage n°" htmlFor="periode">
          <select
            id="periode"
            value={value.periodeNumero}
            onChange={(e) => onChange({ periodeNumero: e.target.value })}
            className="w-36 rounded-lg border border-line bg-paper px-3 py-2 text-sm text-ink transition-colors hover:border-line-strong focus:border-gold focus:outline-none"
          >
            <option value="">Choisir</option>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n}
                {n === 1 ? 're' : 'e'} période
              </option>
            ))}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Du" htmlFor="debut">
            <Input
              id="debut"
              type="date"
              value={value.periodeDebut}
              onChange={(e) => onChange({ periodeDebut: e.target.value })}
            />
          </Field>
          <Field label="Au" htmlFor="fin">
            <Input
              id="fin"
              type="date"
              value={value.periodeFin}
              onChange={(e) => onChange({ periodeFin: e.target.value })}
            />
          </Field>
        </div>
      </div>

      <Field label="Objectif de stage" hint="Selon l'objectif officiel de la période">
        <Textarea
          value={value.objectifStage}
          rows={3}
          counter
          maxLength={300}
          placeholder="Ex : Consolider les techniques de production en laboratoire et découvrir l'organisation d'une artisanale."
          onChange={(e) => onChange({ objectifStage: e.target.value })}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Tuteur pédagogique" htmlFor="tp">
          <Input
            id="tp"
            value={value.tuteurPedagogique}
            placeholder="Nom et prénom TP"
            onChange={(e) => onChange({ tuteurPedagogique: e.target.value })}
          />
        </Field>
        <Field label="Tuteur industriel" htmlFor="ti">
          <Input
            id="ti"
            value={value.tuteurIndustriel}
            placeholder="Nom et prénom TI"
            onChange={(e) => onChange({ tuteurIndustriel: e.target.value })}
          />
        </Field>
      </div>

      <Field label="Membres de jury" hint="Entrée pour ajouter">
        <TagInput
          values={value.membresJury}
          onChange={(membresJury) => onChange({ membresJury })}
          placeholder="Ex : M. Karim Tazi"
        />
      </Field>

      <LogoUpload
        label="Photo de l'activité de l'entreprise"
        value={value.photoActivite}
        onChange={(photoActivite) => onChange({ photoActivite })}
      />
    </div>
  )
}
