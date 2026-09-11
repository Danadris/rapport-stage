import { ArrowRight, FileText, Plus, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { progressOf } from '../data/sections'
import { createRapport } from '../lib/demo'
import { persistRapport, removeRapport, loadRapports } from '../lib/storage'
import { loadAllMeta, deleteMeta, deleteReportData, deleteImagesByReportId, persistReport as persistReportV3 } from '../lib/storageV3'
import type { ReportMeta, WizardStep } from '../types'
import { useEffect, useState } from 'react'
import { Badge, Button, Eyebrow, SkeletonRow } from '../components/ui'
import { PlanPickerModal } from '../components/PlanPickerModal'

function DraftRow({ meta, onOpen, onDelete }: { meta: ReportMeta; onOpen: () => void; onDelete: () => void }) {
  const [confirming, setConfirming] = useState(false)
  const pct = meta.progressTotal > 0 ? Math.round((meta.progressDone / meta.progressTotal) * 100) : 0
  const titre = meta.companyName || 'Rapport sans titre'
  const date = new Date(meta.updatedAt).toLocaleDateString('fr-FR', {
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
            {meta.sourceRecherche === 'ia' && <Badge>Recherché</Badge>}
          </span>
          <span className="mt-0.5 block truncate text-xs text-faint">
            {[meta.studentName || 'Stagiaire', `Période ${meta.periodeNumero || '?'}`, date].join(' · ')}
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
  const [metas, setMetas] = useState<ReportMeta[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [showPlanPicker, setShowPlanPicker] = useState(false)

  const fetchMetas = async (): Promise<ReportMeta[]> => {
    // Try V3 first. If empty, fall back to V1 and build meta on the fly.
    let list = await loadAllMeta()
    if (list.length === 0) {
      // V3 not populated yet (migration may still be running).
      // Fall back to V1 so the user always sees their data.
      const v1 = await loadRapports()
      list = v1.map((r): ReportMeta => ({
        id: r.id,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        studentName: r.couverture.nomStagiaire || '',
        companyName: r.entreprise.nom || '',
        periodeNumero: r.couverture.periodeNumero || '',
        sourceRecherche: r.entreprise.sourceRecherche ?? null,
        progressDone: progressOf(r, r.customSteps).done,
        progressTotal: progressOf(r, r.customSteps).total,
      }))
    }
    return list
  }

  const refresh = async () => {
    const list = await fetchMetas()
    setMetas(list)
  }

  useEffect(() => {
    let alive = true
    void fetchMetas().then((list) => {
      if (alive) {
        setMetas(list)
        setLoading(false)
      }
    })
    return () => {
      alive = false
    }
  }, [])

  const handleNew = async (customSteps?: WizardStep[]) => {
    setShowPlanPicker(false)
    const rapport = createRapport({ customSteps })
    // V1 save (primary)
    await persistRapport(rapport)
    // V3 dual-write
    try {
      const progress = progressOf(rapport, rapport.customSteps)
      await persistReportV3(
        {
          id: rapport.id,
          couverture: rapport.couverture,
          entreprise: rapport.entreprise,
          sections: rapport.sections,
          sectionsGenerated: rapport.sectionsGenerated,
          style: rapport.style,
          pageBreaks: rapport.pageBreaks,
          customSteps: rapport.customSteps,
          images: {},
        },
        {
          id: rapport.id,
          createdAt: rapport.createdAt,
          updatedAt: rapport.updatedAt,
          studentName: rapport.couverture.nomStagiaire || '',
          companyName: rapport.entreprise.nom || '',
          periodeNumero: rapport.couverture.periodeNumero || '',
          sourceRecherche: rapport.entreprise.sourceRecherche ?? null,
          progressDone: progress.done,
          progressTotal: progress.total,
        },
      )
    } catch {
      // V3 failure is non-critical during dual-write phase
    }
    navigate(`/rapport/${rapport.id}`)
  }

  const handleDelete = async (id: string) => {
    // Delete from V1
    await removeRapport(id)
    // Delete from V3 (if migrated)
    try {
      await deleteImagesByReportId(id)
      await deleteReportData(id)
      await deleteMeta(id)
    } catch {
      // V3 may not have this report yet, that's fine
    }
    await refresh()
  }

  const drafts = metas ?? []

  return (
    <div className="mx-auto max-w-3xl px-5 pb-20">
      {showPlanPicker && (
        <PlanPickerModal
          onConfirm={handleNew}
          onClose={() => setShowPlanPicker(false)}
        />
      )}

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
          <Button variant="primary" onClick={() => setShowPlanPicker(true)}>
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
            <Button variant="primary" size="sm" className="mt-5" onClick={() => setShowPlanPicker(true)}>
              <Plus size={14} />
              Créer
            </Button>
          </div>
        ) : (
          <div className="rounded-xl border border-line bg-paper/60">
            {drafts.map((m) => (
              <DraftRow
                key={m.id}
                meta={m}
                onOpen={() => navigate(`/rapport/${m.id}`)}
                onDelete={() => handleDelete(m.id)}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
