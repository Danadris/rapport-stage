import { ArrowRight, FileText, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { progressOf } from '../data/sections'
import { createRapport } from '../lib/demo'
import { loadRapports, persistRapport, removeRapport } from '../lib/storage'
import type { Rapport } from '../types'
import { useEffect, useState } from 'react'
import { Badge, Button, Eyebrow, SkeletonRow } from '../components/ui'

function DraftRow({ rapport, onOpen, onDelete }: { rapport: Rapport; onOpen: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const { ratio } = progressOf(rapport)
  const pct = Math.round(ratio * 100)
  const titre = rapport.entreprise.nom || 'Rapport sans titre'
  const date = new Date(rapport.updatedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <div className="group flex items-center gap-4 border-b border-line px-2 py-3.5 transition-colors duration-150 last:border-b-0 hover:bg-paper">
      <button onClick={onOpen} className="flex flex-1 items-center gap-3.5 text-left">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-cream text-muted group-hover:text-gold-deep">
          <FileText size={16} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-medium text-ink">{titre}</span>
            {rapport.entreprise.sourceRecherche === 'ia' && <Badge>Recherché</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-faint">
            {[rapport.couverture.nomStagiaire || 'Stagiaire', `Période ${rapport.couverture.periodeNumero || '?'}`, date].join(' · ')}
          </span>
        </span>
        <span className="hidden items-center gap-2 sm:flex">
          <span className="h-1 w-24 overflow-hidden rounded-full bg-line">
            <span className="block h-full rounded-full bg-gold transition-all duration-300" style={{ width: `${pct}%` }} />
          </span>
          <span className="w-8 font-mono text-[11px] text-faint">{pct}%</span>
        </span>
      </button>
      {confirming ? (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="danger" onClick={onDelete}>
            Supprimer
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
            Annuler
          </Button>
        </div>
      ) : (
        <button
          aria-label={`Supprimer ${titre}`}
          onClick={() => setConfirming(true)}
          className="rounded-lg p-2 text-faint opacity-0 transition-all duration-150 group-hover:opacity-100 hover:bg-danger/10 hover:text-danger"
        >
          <Trash2 size={15} />
        </button>
      )}
    </div>
  )
}

export function HomePage() {
  const navigate = useNavigate()
  const [rapports, setRapports] = useState<Rapport[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    loadRapports()
      .then((list) => {
        if (alive) setRapports(list)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
  }, [])

  const handleNew = async () => {
    const rapport = createRapport()
    await persistRapport(rapport)
    navigate(`/rapport/${rapport.id}`)
  }

  const drafts = rapports ?? []

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      <section className="pt-14 pb-12">
        <Eyebrow>IFMBP Casablanca</Eyebrow>
        <h1 className="mt-4 font-serif text-[30px] leading-tight text-ink">
          Rapport de stage,
          <br />
          sans page blanche.
        </h1>
        <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-muted">
          Complétez les étapes, vérifiez l'aperçu A4, exportez en PDF.
        </p>
        <div className="mt-6 flex items-center gap-3">
          <Button variant="primary" onClick={handleNew}>
            <Plus size={15} />
            Nouveau
          </Button>
          {drafts.length > 0 && (
            <Button variant="ghost" onClick={() => navigate(`/rapport/${drafts[0].id}`)}>
              Reprendre
              <ArrowRight size={15} />
            </Button>
          )}
        </div>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between px-2">
          <h2 className="text-[13px] font-medium tracking-wide text-ink uppercase">Brouillons</h2>
          <span className="font-mono text-[11px] text-faint">{drafts.length} local</span>
        </div>
        {loading ? (
          <div className="rounded-xl border border-line bg-paper/60 p-4">
            <SkeletonRow />
            <div className="mt-3">
              <SkeletonRow />
            </div>
            <div className="mt-3 w-2/3">
              <SkeletonRow />
            </div>
          </div>
        ) : drafts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line-strong px-6 py-12 text-center">
            <FileText size={22} className="mx-auto text-faint" />
            <p className="mt-3 text-sm font-medium text-ink">Aucun brouillon</p>
            <p className="mx-auto mt-1 max-w-xs text-xs leading-relaxed text-muted">
              Le questionnaire suit le canevas officiel.
            </p>
            <Button variant="primary" size="sm" className="mt-5" onClick={handleNew}>
              <Plus size={14} />
              Créer
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-paper/60">
            {drafts.map((r) => (
              <DraftRow
                key={r.id}
                rapport={r}
                onOpen={() => navigate(`/rapport/${r.id}`)}
                onDelete={async () => {
                  await removeRapport(r.id)
                  setRapports(await loadRapports())
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
