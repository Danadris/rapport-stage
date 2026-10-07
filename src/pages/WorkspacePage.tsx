import { ArrowLeft, ArrowRight, Download, Eye, PencilLine, Undo2, Redo2, Menu, X, RotateCcw, SlidersHorizontal, FileText, Archive } from 'lucide-react'
import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Stepper } from '../components/Stepper'
import { CouvertureStep } from '../components/steps/CouvertureStep'
import { EntrepriseFieldsStep, type EntFieldDef } from '../components/steps/EntrepriseFieldsStep'
import { EntrepriseStep } from '../components/steps/EntrepriseStep'
import { NotesStep } from '../components/steps/NotesStep'
import { OrganigrammeStep } from '../components/steps/OrganigrammeStep'
import { FicheTechniqueStep } from '../components/steps/FicheTechniqueStep'
import { PreviewPane } from '../components/workspace/PreviewPane'
import { SettingsPanel } from '../components/workspace/SettingsPanel'
import { progressOf, stepById, WIZARD_STEPS } from '../data/sections'
import { Button, Eyebrow, SkeletonRow } from '../components/ui'
import { cx } from '../lib/cx'
import { useWorkspacePersistence } from '../hooks/useWorkspacePersistence'
import { useWorkspaceSteps } from '../hooks/useWorkspaceSteps'

const PRESENTATION_FIELDS: EntFieldDef[] = [
  { key: 'organismeAccueil', label: "Organisme d'accueil", placeholder: "Nature de l'établissement, effectif…" },
  { key: 'historique', label: "Historique de l'entreprise", placeholder: 'Fondation, évolution, repères marquants…', long: true },
  { key: 'secteurActivite', label: "Secteur d'activité", placeholder: 'Boulangerie-pâtisserie artisanale…' },
  { key: 'missionsValeurs', label: 'Missions et valeurs', placeholder: "Savoir-faire, engagement qualité, esprit d'équipe…", long: true },
]

const ACTIVITES_FIELDS: EntFieldDef[] = [
  { key: 'activitesPrincipales', label: 'Activités principales', placeholder: 'Pains courants, viennoiserie, commandes spéciales…', long: true },
  { key: 'equipements', label: 'Équipements utilisés', placeholder: 'Fours, pétrins, chambres de fermentation…', long: true },
  { key: 'technologies', label: 'Technologies employées', placeholder: 'HACCP, gestion des commandes…' },
]

export function WorkspacePage() {
  const { id } = useParams()
  const [stepId, setStepId] = useState('couverture')
  const [mode, setMode] = useState<'edition' | 'apercu'>('edition')
  const [zoom, setZoom] = useState(100)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)


  const {
    rapport, loadingRapport, saveStatus, canUndo, canRedo,
    setRapportWithHistory, undo, redo,
    showExportMenu, setShowExportMenu, exportError, handleExportPdf, handleExportBackup,
  } = useWorkspacePersistence(id)

  const activeSteps = (rapport?.customSteps ?? WIZARD_STEPS)
  const step = stepById(stepId, activeSteps) ?? activeSteps[0]
  const stepIndex = activeSteps.findIndex((s) => s.id === step.id)
  const prev = activeSteps[stepIndex - 1]
  const next = activeSteps[stepIndex + 1]
  const { ratio } = rapport ? progressOf(rapport, activeSteps) : { ratio: 0 }

  const {
    patchCouverture, patchEntreprise, patchOrganigramme, patchFicheTechniques, patchMateriels, patchFicheTechnique, setFicheImages,
    patchStyle, setNote, setGeneratedNote, handleAddStep, handleDeleteStep, handleRenameStep,
    handleToggleStepKind, handleFieldOrganigrammeChange, handleToggleFieldMode, handleAddSubSection, handleDeleteSubSection,
    handleRenameSubSection, handleAddLevel3Item, handleDeleteLevel3Item, setImages, handlePreviewEdit, handlePreviewTitleEdit, clearSection,
  } = useWorkspaceSteps({ rapport: rapport!, step, setStepId, setRapportWithHistory })

  if (!id) return <Navigate to="/" replace />
  if (loadingRapport) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full items-start justify-center px-5 py-12">
        <div className="w-full max-w-4xl space-y-4 rounded-xl border border-line bg-paper p-6">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    )
  }
  if (!rapport) return <Navigate to="/" replace />



  const handleSelectStep = (id: string) => {
    setStepId(id)
    setIsMobileMenuOpen(false)
    if (mode === 'apercu') {
      setTimeout(() => {
        let targetId = id === 'entreprise' ? 'presentation' : id
        let candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-part="${targetId}"]`))
        if (candidates.length === 0 && id === 'entreprise') {
          targetId = id
          candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-part="${targetId}"]`))
        }
        if (id === 'fiche-technique') {
          candidates = Array.from(document.querySelectorAll<HTMLElement>(`[data-part^="fiche-technique-"]`))
        }
        const el = candidates.find((node) => node.offsetParent !== null) ?? candidates[0]
        if (el) {
          // Adjust for the sticky toolbar (top-14 is roughly 56px, plus header is 56px => 112px, offset 120px)
          const y = el.getBoundingClientRect().top + window.scrollY - 120
          window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' })
        }
      }, 50)
    }
  }

  const wordCount = (() => {
    if (!rapport) return 0
    const texts: string[] = []
    // entreprise fields
    for (const v of Object.values(rapport.entreprise)) {
      if (typeof v === 'string') texts.push(v)
    }
    // sections
    for (const sec of Object.values(rapport.sections)) {
      for (const v of Object.values(sec)) {
        if (typeof v === 'string') texts.push(v)
      }
    }
    // generated sections
    if (rapport.sectionsGenerated) {
      for (const sec of Object.values(rapport.sectionsGenerated)) {
        for (const v of Object.values(sec)) {
          if (typeof v === 'string') texts.push(v)
        }
      }
    }
    // organigramme
    if (rapport.organigramme?.nodes) {
      for (const n of rapport.organigramme.nodes) {
        if (n.title) texts.push(n.title)
        if (n.name && n.name !== '—') texts.push(n.name)
      }
    }
    return texts.join(' ').split(/\s+/).filter(Boolean).length
  })()

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full">
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/20 md:hidden" onClick={() => setIsMobileMenuOpen(false)} />
      )}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-[264px] shrink-0 flex-col border-r border-line bg-cream px-3 md:sticky md:top-14 md:z-auto md:h-[calc(100vh-3.5rem)] md:bg-transparent md:flex md:py-2",
          isMobileMenuOpen ? "flex" : "hidden"
        )}
        style={isMobileMenuOpen ? {
          paddingTop: 'calc(0.5rem + env(safe-area-inset-top, 0px))',
          paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))',
        } : undefined}
      >
        <div className="flex items-center justify-between px-3 pt-2 pb-3 md:hidden">
          <Eyebrow>Menu</Eyebrow>
          <button onClick={() => setIsMobileMenuOpen(false)} className="flex h-10 w-10 items-center justify-center -mr-1.5 text-muted hover:text-ink active:text-ink"><X size={18} /></button>
        </div>
        <div className="px-3 pt-2 pb-3">
          <div className="flex items-center justify-between">
            <Eyebrow>Progression</Eyebrow>
            <span className="font-mono text-[11px] text-faint">{Math.round(ratio * 100)}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-gold transition-all duration-300"
              style={{ width: `${ratio * 100}%` }}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          <Stepper 
            rapport={rapport} 
            steps={activeSteps} 
            currentId={step.id} 
            onSelect={handleSelectStep}
            onAddStep={handleAddStep}
            onDeleteStep={handleDeleteStep}
          />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col group relative">
        {/* Single sticky wrapper — step nav + style dropdown */}
        <div className="sticky top-14 z-30" data-print-hide>
          {/* Step nav bar */}
          <div className="flex items-center justify-between gap-2 border-b border-line bg-cream/85 px-4 md:px-6 py-3 backdrop-blur-sm">
            <div className="min-w-0 flex items-center gap-2">
              <button className="flex h-10 w-10 shrink-0 items-center justify-center -ml-2 text-muted active:text-ink md:hidden" onClick={() => setIsMobileMenuOpen(true)}>
                <Menu size={20} />
              </button>
              <div className="min-w-0 flex items-center gap-2">
                <div>
                  <span className="block font-mono text-[10px] tracking-widest text-faint">{step.numero} / {activeSteps.length}</span>
                    <input
                      type="text"
                      value={step.titre}
                      onChange={(e) => handleRenameStep(step.id, e.target.value)}
                      placeholder="Titre de la section (optionnel)"
                      className="truncate text-[14px] sm:text-[15px] font-semibold text-ink bg-transparent focus:outline-none focus:border-b focus:border-gold border-b border-transparent p-0 w-full placeholder:text-faint"
                    />
                </div>
                <span className={cx('mt-3 hidden text-[10px] sm:inline', saveStatus === 'error' ? 'text-danger' : 'text-faint')}>
                  {saveStatus === 'saving' ? 'Enregistrement...' : saveStatus === 'error' ? "Erreur d'enregistrement" : 'Enregistré'}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
              <div className="flex items-center gap-1">
                <button onClick={undo} disabled={!canUndo} title="Annuler" aria-label="Annuler" className="flex h-10 sm:h-auto items-center rounded-lg px-2.5 sm:px-1.5 py-1 sm:py-1.5 text-muted hover:text-ink active:bg-gold-soft/60 disabled:opacity-30"><Undo2 size={15} /></button>
                <button onClick={redo} disabled={!canRedo} title="Rétablir" aria-label="Rétablir" className="flex h-10 sm:h-auto items-center rounded-lg px-2.5 sm:px-1.5 py-1 sm:py-1.5 text-muted hover:text-ink active:bg-gold-soft/60 disabled:opacity-30"><Redo2 size={15} /></button>
              </div>
              
              {/* Style / PDF buttons integrated into nav bar for ALL sizes */}
              {mode === 'apercu' && (
                <div className="flex items-center gap-0.5 sm:gap-2">
                  <span className="hidden md:inline text-[11px] text-muted border-r border-line pr-3 mr-1">{wordCount.toLocaleString('fr-FR')} mots</span>
                  <button
                    onClick={() => setShowSettings(v => !v)}
                    className={cx(
                      'flex h-10 sm:h-auto items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-[13px] transition-colors active:bg-gold-soft/60',
                      showSettings ? 'bg-gold-soft font-medium text-gold-deep' : 'text-muted hover:text-ink'
                    )}
                    title="Style"
                  >
                    <SlidersHorizontal size={15} />
                    <span className="hidden sm:inline">Style</span>
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(v => !v)}
                      className={cx(
                        'flex h-10 sm:h-auto items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-[13px] transition-colors active:bg-gold-soft/60',
                        showExportMenu ? 'bg-gold-soft font-medium text-gold-deep' : 'text-muted hover:text-ink'
                      )}
                      title="Exporter"
                      aria-label="Exporter"
                    >
                      <Download size={15} />
                      <span className="hidden sm:inline">Exporter</span>
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-xl border border-line bg-paper shadow-lg">
                        <button
                          onClick={handleExportPdf}
                          className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-ink hover:bg-cream active:bg-gold-soft/60 transition-colors"
                        >
                          <FileText size={15} className="text-muted" />
                          <span>PDF du rapport</span>
                        </button>
                        <button
                          onClick={() => void handleExportBackup()}
                          className="flex w-full items-center gap-2.5 px-4 py-3 text-left text-[13px] text-ink hover:bg-cream active:bg-gold-soft/60 transition-colors"
                        >
                          <Archive size={15} className="text-muted" />
                          <span>Sauvegarde JSON</span>
                        </button>
                        {exportError && (
                          <p className="border-t border-line bg-danger/5 px-4 py-2 text-[11px] text-danger">{exportError}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="flex shrink-0 rounded-lg border border-line bg-paper p-0.5">
                {(
                  [
                    ['edition', 'Édition', PencilLine],
                    ['apercu', 'Aperçu', Eye],
                  ] as const
                ).map(([m, label, Icon]) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cx(
                      'flex h-9 sm:h-auto items-center gap-1.5 rounded-md px-2.5 sm:px-3 py-1 sm:py-1.5 text-[12px] sm:text-[13px] transition-colors duration-150 active:bg-gold-soft/60',
                      mode === m ? 'bg-gold-soft font-medium text-gold-deep' : 'text-muted hover:text-ink',
                    )}
                  >
                    <Icon size={14} />
                    <span className="hidden sm:inline">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* ── Unified Settings panel ── */}
          {mode === 'apercu' && showSettings && (
            <SettingsPanel style={rapport.style} patchStyle={patchStyle} zoom={zoom} setZoom={setZoom} />
          )}
        </div>

        {mode === 'edition' ? (
          <>
            <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-10 md:py-8">
              <p className="mb-7 text-sm leading-relaxed text-muted">{step.consigne}</p>
              {/* The organigramme format switch makes sense only for the section
                  that IS the organigramme — showing it on every custom step made
                  the 🏢 Organigramme button appear in Introduction, Contexte de
                  stage, etc. It is therefore only rendered for steps whose title
                  is (or whose format already is) the organigramme. */}
              {rapport.customSteps &&
                step.id.startsWith('custom-') &&
                (step.kind === 'organigramme' || step.titre.toLowerCase().includes('organigramme')) && (
                <div className="mb-6 flex items-center justify-between rounded-xl border border-line bg-paper px-4 py-2.5 shadow-xs">
                  <span className="text-xs font-medium text-muted">Format de cette section :</span>
                  <div className="flex gap-1 rounded-lg bg-cream p-1 border border-line/60">
                    <button
                      type="button"
                      onClick={() => handleToggleStepKind(step.id, 'notes')}
                      className={cx(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        step.kind === 'notes' ? "bg-paper text-ink shadow-xs" : "text-muted hover:text-ink"
                      )}
                    >
                      📝 Texte rédigé
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleStepKind(step.id, 'organigramme')}
                      className={cx(
                        "px-3 py-1 text-xs font-medium rounded-md transition-all",
                        step.kind === 'organigramme' ? "bg-paper text-gold-deep shadow-xs font-semibold" : "text-muted hover:text-ink"
                      )}
                    >
                      🏢 Organigramme
                    </button>
                  </div>
                </div>
              )}
              {step.kind === 'couverture' && (
                <CouvertureStep value={rapport.couverture} onChange={patchCouverture} />
              )}
              {step.kind === 'entreprise' && (
                <EntrepriseStep value={rapport.entreprise} onChange={patchEntreprise} />
              )}
              {step.kind === 'presentation' && (
                <EntrepriseFieldsStep
                  fields={PRESENTATION_FIELDS}
                  value={rapport.entreprise}
                  onChange={patchEntreprise}
                  images={rapport.images?.[step.id] ?? []}
                  onImagesChange={(imgs) => setImages(step.id, imgs)}
                />
              )}
              {step.kind === 'organigramme' && (
                <OrganigrammeStep
                  value={(rapport.organigrammes && rapport.organigrammes[step.id]) ?? rapport.organigramme ?? { nodes: [] }}
                  onChange={(val) => patchOrganigramme(val, step.id)}
                  entreprise={rapport.entreprise}
                />
              )}
              {step.kind === 'fiche-technique' && (
                <FicheTechniqueStep
                  fiches={rapport.ficheTechniques ?? []}
                  onChange={patchFicheTechniques}
                  materiels={rapport.materiels ?? []}
                  onMaterielsChange={patchMateriels}
                  getImages={(ficheId) => rapport.images?.[`fiche-technique-${ficheId}`] ?? []}
                  onImagesChange={setFicheImages}
                  entreprise={rapport.entreprise}
                />
              )}
              {step.kind === 'activites' && (
                <EntrepriseFieldsStep
                  fields={ACTIVITES_FIELDS}
                  value={rapport.entreprise}
                  onChange={patchEntreprise}
                  images={rapport.images?.[step.id] ?? []}
                  onImagesChange={(imgs) => setImages(step.id, imgs)}
                />
              )}
              {step.kind === 'notes' && (
                <NotesStep
                  stepId={step.id}
                  stepTitle={step.titre}
                  fields={step.fields}
                  values={rapport.sections[step.id] ?? {}}
                  generatedValues={rapport.sectionsGenerated?.[step.id] ?? {}}
                  onChange={setNote}
                  onGenerate={setGeneratedNote}
                  images={rapport.images?.[step.id] ?? []}
                  onImagesChange={(imgs) => setImages(step.id, imgs)}
                  isCustom
                  onAddSubSection={() => handleAddSubSection(step.id)}
                  onDeleteSubSection={(fieldId) => handleDeleteSubSection(step.id, fieldId)}
                  onRenameSubSection={(fieldId, newTitle) => handleRenameSubSection(step.id, fieldId, newTitle)}
                  onAddLevel3Item={(parentFieldId) => handleAddLevel3Item(step.id, parentFieldId)}
                  onDeleteLevel3Item={(fieldId) => handleDeleteLevel3Item(step.id, fieldId)}
                  organigramme={rapport.organigramme}
                  organigrammes={rapport.organigrammes}
                  onOrganigrammeChange={handleFieldOrganigrammeChange}
                  onToggleFieldMode={(fieldId, isOrg) => handleToggleFieldMode(step.id, fieldId, isOrg)}
                  entreprise={rapport.entreprise}
                />
              )}
              {step.kind !== 'couverture' && step.id !== 'remerciements' && step.id !== 'sommaire' && (
                <div className="mt-8 flex items-center justify-end border-t border-line/50 pt-4">
                  <label className="flex cursor-pointer items-center gap-2 text-[13px] text-muted hover:text-ink transition-colors">
                    <input
                      type="checkbox"
                      checked={rapport.pageBreaks?.[step.id] ?? true}
                      onChange={(e) => {
                        const val = e.target.checked
                        setRapportWithHistory((prev) => {
                          if (!prev) return prev
                          return { ...prev, pageBreaks: { ...(prev.pageBreaks || {}), [step.id]: val }, updatedAt: Date.now() }
                        })
                      }}
                      className="h-3.5 w-3.5 rounded border-neutral-300 text-gold-deep focus:ring-gold-deep"
                    />
                    <span className="font-medium">Commencer sur une nouvelle page</span>
                  </label>
                </div>
              )}
            </div>
            <div
              className="sticky bottom-0 flex items-center justify-between border-t border-line bg-cream/90 px-4 md:px-10 pt-3 backdrop-blur-sm"
              style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}
            >
              <Button size="sm" disabled={!prev} onClick={() => prev && setStepId(prev.id)}>
                <ArrowLeft size={14} />
                <span className="hidden sm:inline">{prev ? prev.titre : 'Début'}</span>
              </Button>
              <Button size="sm" variant="ghost" onClick={clearSection} className="text-red-500 hover:text-red-600 hover:bg-red-50" title="Réinitialiser la section">
                <RotateCcw size={14} />
                <span className="hidden sm:inline">Réinitialiser</span>
              </Button>
              <Button size="sm" variant="primary" disabled={!next} onClick={() => next && setStepId(next.id)}>
                <span className="hidden sm:inline">{next ? next.titre : 'Fin'}</span>
                <ArrowRight size={14} />
              </Button>
            </div>
          </>
        ) : (
          <PreviewPane
            rapport={rapport}
            onEdit={handlePreviewEdit}
            onImagesChange={setImages}
            onFicheChange={patchFicheTechnique}
            onTitleEdit={handlePreviewTitleEdit}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  )
}
