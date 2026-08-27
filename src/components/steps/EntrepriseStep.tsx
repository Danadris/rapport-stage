import { AlertCircle, ArrowRight, CheckCircle2, Info, Search } from 'lucide-react'
import { useState } from 'react'
import type { Entreprise } from '../../types'
import { rechercheEntreprise, type RechercheResultat } from '../../lib/ai'
import { Badge, Button, Field, Input, SkeletonRow } from '../ui'
import { LogoUpload } from '../LogoUpload'

interface Props {
  value: Entreprise
  onChange: (patch: Partial<Entreprise>) => void
}

const SEARCHED_FIELD_COUNT = 7

export function EntrepriseStep({ value, onChange }: Props) {
  const [nomRecherche, setNomRecherche] = useState('')
  const [villeRecherche, setVilleRecherche] = useState('')
  const [loading, setLoading] = useState(false)
  const [resultat, setResultat] = useState<RechercheResultat | null>(null)
  const [error, setError] = useState<string | null>(null)

  const lancerRecherche = async () => {
    if (nomRecherche.trim() === '') return
    setLoading(true)
    setResultat(null)
    setError(null)
    try {
      const res = await rechercheEntreprise(nomRecherche, villeRecherche)
      setResultat(res)
      onChange({
        ...res.entreprise,
        nom: nomRecherche.trim(),
        ville: villeRecherche.trim(),
        sourceRecherche: 'ia',
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'La recherche automatique a échoué.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-line bg-paper p-5">
        <Field label="Nom de l'entreprise" htmlFor="ent-nom">
          <Input
            id="ent-nom"
            value={nomRecherche}
            placeholder="Ex : Medina & Co Pâtisserie"
            onChange={(e) => setNomRecherche(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && lancerRecherche()}
          />
        </Field>
        <div className="mt-4">
          <Field label="Ville" hint="Facultatif" htmlFor="ent-ville">
            <Input
              id="ent-ville"
              value={villeRecherche}
              placeholder="Ex : Casablanca"
              onChange={(e) => setVilleRecherche(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && lancerRecherche()}
            />
          </Field>
        </div>
        <Button
          variant="primary"
          className="mt-5 w-full"
          loading={loading}
          disabled={nomRecherche.trim() === ''}
          onClick={lancerRecherche}
        >
          {!loading && <Search size={15} />}
          {loading ? 'Recherche...' : 'Rechercher'}
        </Button>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger/5 px-3 py-2.5 text-[13px] leading-relaxed text-danger">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <p>
              {error} Remplissez les champs manuellement.
            </p>
          </div>
        )}

        {loading && (
          <div className="mt-5 space-y-2.5 border-t border-line pt-4">
            <SkeletonRow />
            <SkeletonRow />
            <div className="w-2/3">
              <SkeletonRow />
            </div>
          </div>
        )}

        {resultat && !loading && (
          <div className="mt-5 space-y-3 border-t border-line pt-4">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-gold-deep">
              <CheckCircle2 size={15} className="shrink-0" />
              {SEARCHED_FIELD_COUNT} champs remplis, à vérifier
              <span className="font-mono text-[11px] text-faint">sources : {resultat.sources.join(', ')}</span>
            </p>
          </div>
        )}
      </div>

      {value.sourceRecherche === 'ia' && (
        <div className="flex items-start gap-2.5 rounded-lg bg-gold-soft/60 px-4 py-3 text-[13px] leading-relaxed text-gold-deep">
          <Info size={15} className="mt-0.5 shrink-0" />
          <p>
            Relisez les sections <span className="font-medium">05</span> et <span className="font-medium">06</span> avant export.
          </p>
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-[1fr_200px]">
        <Field label="Nom de l'entreprise" htmlFor="nom-final">
          <Input id="nom-final" value={value.nom} onChange={(e) => onChange({ nom: e.target.value })} />
        </Field>
        <Field label="Ville" htmlFor="ville-final">
          <Input id="ville-final" value={value.ville} onChange={(e) => onChange({ ville: e.target.value })} />
        </Field>
      </div>

      <LogoUpload
        label="Logo de l'entreprise"
        aspect="square"
        value={value.logoDataUrl}
        onChange={(logoDataUrl) => onChange({ logoDataUrl })}
      />

      {value.sourceRecherche === null && value.nom !== '' && (
        <div className="flex justify-end">
          <Badge tone="neutral">Saisie manuelle</Badge>
        </div>
      )}

      {value.sourceRecherche === 'ia' && (
        <div className="flex items-center justify-between border-t border-line pt-4">
          <Badge>À vérifier dans les sections 05 et 06</Badge>
          <ArrowRight size={14} className="text-faint" />
        </div>
      )}
    </div>
  )
}
