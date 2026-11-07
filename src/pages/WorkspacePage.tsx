import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { PreviewPane } from '../components/workspace/PreviewPane'
import { StepNavBar } from '../components/workspace/StepNavBar'
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar'
import { wordCountOf } from '../hooks/useWordCount'
import { WorkspaceEditor } from '../components/workspace/WorkspaceEditor'
import { SplitHandle } from '../components/workspace/SplitHandle'
import { PanelRightClose, PanelRightOpen } from 'lucide-react'
import { progressOf, stepById, WIZARD_STEPS } from '../data/sections'
import type { Organigramme, TextBlock } from '../types'
import type { PreviewActions } from '../components/PreviewA4'
import { SkeletonRow } from '../components/ui'
import { useWorkspacePersistence } from '../hooks/useWorkspacePersistence'
import { useWorkspaceSteps } from '../hooks/useWorkspaceSteps'

// The preview column beside the form: wide enough to read a page, narrow enough
// to leave the writing column the room. Remembered per browser, because the right
// width depends on the screen and on the person.
const SPLIT_MIN_W = 320
const SPLIT_MAX_W = 620
const SPLIT_DEFAULT_W = 420
const SPLIT_W_KEY = 'rs:split-width'

const clampSplitW = (width: number, viewportW: number) => {
  // Never wider than 46% of the screen, so the writing column always keeps the
  // larger share — but never narrower than the floor either.
  const max = Math.max(SPLIT_MIN_W, Math.min(SPLIT_MAX_W, Math.round(viewportW * 0.46)))
  return Math.min(max, Math.max(SPLIT_MIN_W, Math.round(width)))
}

export function WorkspacePage() {
  const { id } = useParams()
  const [stepId, setStepId] = useState('couverture')
  const [mode, setMode] = useState<'edition' | 'apercu'>('edition')
  const [zoom, setZoom] = useState(100)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  // Both side panels collapse, so the writing column can take the room it needs.
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [previewCollapsed, setPreviewCollapsed] = useState(false)

  // Split edition: the form beside a live preview, so a formatting change is
  // seen without leaving the text. Below this width there is no room for both,
  // and the Aperçu mode alone stays the way to check the document.
  const [isSplit, setIsSplit] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(min-width: 1280px)').matches,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1280px)')
    const onChange = () => setIsSplit(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const splitPreviewRef = useRef<HTMLDivElement>(null)

  const [splitW, setSplitW] = useState(() => {
    if (typeof window === 'undefined') return SPLIT_DEFAULT_W
    const saved = Number(window.localStorage.getItem(SPLIT_W_KEY))
    return Number.isFinite(saved) && saved > 0 ? clampSplitW(saved, window.innerWidth) : SPLIT_DEFAULT_W
  })
  useEffect(() => {
    try {
      window.localStorage.setItem(SPLIT_W_KEY, String(splitW))
    } catch {
      // Private browsing: the width simply does not survive a reload.
    }
  }, [splitW])

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

  // Brings a step's page into view. Aperçu mode scrolls the window; the split
  // view scrolls the preview column instead, so the section being written is the
  // one on screen. Measured in viewport space so the preview's zoom cancels out.
  const scrollStepIntoView = useCallback((container: HTMLElement, stepId: string) => {
    const targetId = stepId === 'entreprise' ? 'presentation' : stepId
    let candidates = Array.from(container.querySelectorAll<HTMLElement>(`[data-part="${targetId}"]`))
    if (candidates.length === 0 && stepId === 'entreprise') {
      candidates = Array.from(container.querySelectorAll<HTMLElement>(`[data-part="entreprise"]`))
    }
    if (stepId === 'fiche-technique') {
      candidates = Array.from(container.querySelectorAll<HTMLElement>(`[data-part^="fiche-technique-"]`))
    }
    const el = candidates.find((node) => node.offsetParent !== null) ?? candidates[0]
    if (!el) return
    const top = el.getBoundingClientRect().top - container.getBoundingClientRect().top + container.scrollTop
    container.scrollTo({ top: Math.max(0, top - 24), behavior: 'smooth' })
  }, [])

  useEffect(() => {
    if (!isSplit || mode !== 'edition') return
    // After the step has re-rendered, so the page being measured exists.
    const timer = setTimeout(() => {
      if (splitPreviewRef.current) scrollStepIntoView(splitPreviewRef.current, step.id)
    }, 60)
    return () => clearTimeout(timer)
  }, [step.id, isSplit, mode, scrollStepIntoView])

  const {
    patchCouverture, patchEntreprise, patchOrganigramme, patchFicheTechniques, patchMateriels, patchFicheTechnique, setFicheImages,
    patchStyle, setNote, setGeneratedNote, handleAddStep, handleDeleteStep, handleRenameStep,
    handleToggleStepKind, handleFieldOrganigrammeChange, handleToggleFieldMode, handleAddSubSection, handleDeleteSubSection,
    handleRenameSubSection, handleAddLevel3Item, handleDeleteLevel3Item, setImages, setTextBlocks, setBlockOrder, moveBlockToSection, handlePreviewEdit, handlePreviewTitleEdit, clearSection,
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

  const wordCount = wordCountOf(rapport)

  // Charts are edited on the page in the split view and in Aperçu: the write goes
  // through the same patch as the form, keyed by the chart it belongs to.

  const handleOrganigrammeChange = (key: string, next: Organigramme) => {
    patchOrganigramme(next, key)
  }

  // Paragraphs are added, edited and removed straight on the page; the preview
  // hands over the whole list for the section and this persists it.
  const handleTextBlocksChange = (sectionKey: string, blocks: TextBlock[]) => {
    setTextBlocks(sectionKey, blocks)
  }

  const handleBlockOrderChange = (sectionKey: string, order: string[]) => {
    setBlockOrder(sectionKey, order)
  }

  const handleBlockMove = (
    fromSection: string,
    blockKey: string,
    toSection: string,
    index: number,
    sourceKeys: string[],
    targetKeys: string[],
  ) => {
    moveBlockToSection(fromSection, blockKey, toSection, index, sourceKeys, targetKeys)
  }

  // The add button lives in the Style panel, so it adds to the section the
  // student is on rather than to whichever section happens to be on screen.
  const handleAddParagraph = () => {
    if (!rapport) return
    const current = rapport.textBlocks?.[step.id] ?? []
    setTextBlocks(step.id, [...current, { id: crypto.randomUUID(), text: '' }])
  }

  // Everything the document can be asked to do, as one object: these callbacks
  // travel to PartContent, and a prop per capability meant every new feature
  // grew three signatures to keep in step.
  const previewActions: PreviewActions = {
    onEdit: handlePreviewEdit,
    onCoverChange: patchCouverture,
    onStyleChange: patchStyle,
    onOrganigrammeChange: handleOrganigrammeChange,
    onTextBlocksChange: handleTextBlocksChange,
    onBlockOrderChange: handleBlockOrderChange,
    onBlockMove: handleBlockMove,
    onImagesChange: setImages,
    onFicheChange: patchFicheTechnique,
    onTitleEdit: handlePreviewTitleEdit,
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-3.5rem)] w-full">
      <WorkspaceSidebar
        rapport={rapport}
        activeSteps={activeSteps}
        step={step}
        ratio={ratio}
        isMobileMenuOpen={isMobileMenuOpen}
        setIsMobileMenuOpen={setIsMobileMenuOpen}
        onSelectStep={handleSelectStep}
        onAddStep={handleAddStep}
        onDeleteStep={handleDeleteStep}
        collapsed={sidebarCollapsed}
      />

      <div className="flex min-w-0 flex-1 flex-col group relative">
        {/* Single sticky wrapper — step nav + style dropdown */}
        <StepNavBar
          step={step}
          stepsCount={activeSteps.length}
          saveStatus={saveStatus}
          mode={mode}
          setMode={setMode}
          wordCount={wordCount}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          // The Style panel is not only a preview control any more: it also holds
          // the paragraph button, so it has to open wherever you are working —
          // in edition mode, not just with a page on screen.
          styleAvailable
          showExportMenu={showExportMenu}
          setShowExportMenu={setShowExportMenu}
          exportError={exportError}
          handleExportPdf={handleExportPdf}
          handleExportBackup={handleExportBackup}
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          handleRenameStep={handleRenameStep}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
          onToggleSidebar={() => setSidebarCollapsed((v) => !v)}
          style={rapport.style}
          patchStyle={patchStyle}
          zoom={zoom}
          setZoom={setZoom}
          addParagraph={{
            sectionLabel: step.titre || 'cette section',
            count: rapport?.textBlocks?.[step.id]?.length ?? 0,
            onAdd: handleAddParagraph,
          }}
        />

        {mode === 'edition' ? (
          isSplit ? (
            // Split edition: the document beside the text — sticky, and scrolling
            // on its own so it stays put while the form scrolls.
            <div className="flex min-w-0 flex-1 items-start px-4 md:px-6 print:!block print:!px-0">
              {/* Print prints the document, which is the preview — the form must
                  not end up on the page, nor squeeze the page into its column. */}
              <div className="min-w-0 flex-1 print:!hidden">
                <WorkspaceEditor
                  dense
                  rapport={rapport}
                  step={step}
                  prev={prev}
                  next={next}
                  setStepId={setStepId}
                  setRapportWithHistory={setRapportWithHistory}
                  patchCouverture={patchCouverture}
                  patchEntreprise={patchEntreprise}
                  patchOrganigramme={patchOrganigramme}
                  patchFicheTechniques={patchFicheTechniques}
                  patchMateriels={patchMateriels}
                  setFicheImages={setFicheImages}
                  setNote={setNote}
                  setGeneratedNote={setGeneratedNote}
                  setImages={setImages}
                  handleToggleStepKind={handleToggleStepKind}
                  handleFieldOrganigrammeChange={handleFieldOrganigrammeChange}
                  handleToggleFieldMode={handleToggleFieldMode}
                  handleAddSubSection={handleAddSubSection}
                  handleDeleteSubSection={handleDeleteSubSection}
                  handleRenameSubSection={handleRenameSubSection}
                  handleAddLevel3Item={handleAddLevel3Item}
                  handleDeleteLevel3Item={handleDeleteLevel3Item}
                  clearSection={clearSection}
                />
              </div>
              {/* Sticky and as tall as the preview, so the grip never scrolls out
                  of reach while the form beside it keeps scrolling. */}
              {previewCollapsed ? (
                <div className="sticky top-[6.5rem] h-[calc(100vh-8.5rem)] w-9 shrink-0 border-l border-line bg-cream/40 print:hidden">
                  <button
                    type="button"
                    onClick={() => setPreviewCollapsed(false)}
                    title="Afficher l'aperçu"
                    aria-label="Afficher l'aperçu"
                    className="flex h-full w-full cursor-pointer items-start justify-center pt-3 text-muted transition-colors hover:text-ink"
                  >
                    <PanelRightOpen size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <SplitHandle
                    className="sticky top-[6.5rem] h-[calc(100vh-8.5rem)]"
                    value={splitW}
                    min={SPLIT_MIN_W}
                    max={SPLIT_MAX_W}
                    defaultValue={SPLIT_DEFAULT_W}
                    onChange={setSplitW}
                  />
                  {/* Its own scroll area: a whole report is taller than the screen,
                      and the document has to stay reachable while the form scrolls.
                      Print resets the height, or the document would be clipped to
                      one screen on the way to the PDF. */}
                  <div
                    style={{ width: splitW }}
                    className="sticky top-[6.5rem] h-[calc(100vh-8.5rem)] shrink-0 print:!static print:!h-auto"
                  >
                    {/* Sibling of the scroll area, not inside it: a button inside
                        would scroll away with the document. */}
                    <button
                      type="button"
                      onClick={() => setPreviewCollapsed(true)}
                      title="Masquer l'aperçu"
                      aria-label="Masquer l'aperçu"
                      className="absolute right-2 top-2 z-40 flex h-8 w-8 items-center justify-center rounded-full border border-neutral-300 bg-white/90 text-neutral-500 shadow-sm backdrop-blur-xs transition-colors hover:bg-white hover:text-neutral-900 print:hidden"
                    >
                      <PanelRightClose size={14} />
                    </button>
                    <div
                      ref={splitPreviewRef}
                      className="h-full overflow-y-auto print:!h-auto print:!overflow-visible"
                    >
                      <PreviewPane
                        compact
                        rapport={rapport}
                        actions={previewActions}
                        zoom={zoom}
                      />
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <WorkspaceEditor
              rapport={rapport}
              step={step}
              prev={prev}
              next={next}
              setStepId={setStepId}
              setRapportWithHistory={setRapportWithHistory}
              patchCouverture={patchCouverture}
              patchEntreprise={patchEntreprise}
              patchOrganigramme={patchOrganigramme}
              patchFicheTechniques={patchFicheTechniques}
              patchMateriels={patchMateriels}
              setFicheImages={setFicheImages}
              setNote={setNote}
              setGeneratedNote={setGeneratedNote}
              setImages={setImages}
              handleToggleStepKind={handleToggleStepKind}
              handleFieldOrganigrammeChange={handleFieldOrganigrammeChange}
              handleToggleFieldMode={handleToggleFieldMode}
              handleAddSubSection={handleAddSubSection}
              handleDeleteSubSection={handleDeleteSubSection}
              handleRenameSubSection={handleRenameSubSection}
              handleAddLevel3Item={handleAddLevel3Item}
              handleDeleteLevel3Item={handleDeleteLevel3Item}
              clearSection={clearSection}
            />
          )
        ) : (
          <PreviewPane
            rapport={rapport}
            actions={previewActions}
            zoom={zoom}
          />
        )}
      </div>
    </div>
  )
}
