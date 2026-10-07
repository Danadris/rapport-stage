import { useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { PreviewPane } from '../components/workspace/PreviewPane'
import { StepNavBar } from '../components/workspace/StepNavBar'
import { WorkspaceSidebar } from '../components/workspace/WorkspaceSidebar'
import { wordCountOf } from '../hooks/useWordCount'
import { WorkspaceEditor } from '../components/workspace/WorkspaceEditor'
import { progressOf, stepById, WIZARD_STEPS } from '../data/sections'
import { SkeletonRow } from '../components/ui'
import { useWorkspacePersistence } from '../hooks/useWorkspacePersistence'
import { useWorkspaceSteps } from '../hooks/useWorkspaceSteps'

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

  const wordCount = wordCountOf(rapport)

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
          style={rapport.style}
          patchStyle={patchStyle}
          zoom={zoom}
          setZoom={setZoom}
        />

        {mode === 'edition' ? (
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
