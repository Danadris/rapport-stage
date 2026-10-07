import { Archive, Download, Eye, FileText, Menu, PencilLine, Redo2, SlidersHorizontal, Undo2 } from 'lucide-react'
import { cx } from '../../lib/cx'
import type { Rapport, WizardStep } from '../../types'
import { SettingsPanel } from './SettingsPanel'
import type { RapportStyle } from '../../types'

export type WorkspaceMode = 'edition' | 'apercu'

export function StepNavBar({
  step,
  stepsCount,
  saveStatus,
  mode,
  setMode,
  wordCount,
  showSettings,
  setShowSettings,
  showExportMenu,
  setShowExportMenu,
  exportError,
  handleExportPdf,
  handleExportBackup,
  undo,
  redo,
  canUndo,
  canRedo,
  handleRenameStep,
  onOpenMobileMenu,
  style,
  patchStyle,
  zoom,
  setZoom,
}: {
  step: WizardStep
  stepsCount: number
  saveStatus: 'saved' | 'saving' | 'error'
  mode: WorkspaceMode
  setMode: (mode: WorkspaceMode) => void
  wordCount: number
  showSettings: boolean
  setShowSettings: (v: boolean | ((prev: boolean) => boolean)) => void
  showExportMenu: boolean
  setShowExportMenu: (v: boolean | ((prev: boolean) => boolean)) => void
  exportError: string | null
  handleExportPdf: () => void
  handleExportBackup: () => Promise<void> | void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  handleRenameStep: (stepId: string, newTitle: string) => void
  onOpenMobileMenu: () => void
  style?: Rapport['style']
  patchStyle: (patch: Partial<RapportStyle>) => void
  zoom: number
  setZoom: (zoom: number) => void
}) {
  return (
    <div className="sticky top-14 z-30" data-print-hide>
      {/* Step nav bar */}
      <div className="flex items-center justify-between gap-2 border-b border-line bg-cream/85 px-4 md:px-6 py-3 backdrop-blur-sm">
        <div className="min-w-0 flex items-center gap-2">
          <button className="flex h-10 w-10 shrink-0 items-center justify-center -ml-2 text-muted active:text-ink md:hidden" onClick={onOpenMobileMenu}>
            <Menu size={20} />
          </button>
          <div className="min-w-0 flex items-center gap-2">
            <div>
              <span className="block font-mono text-[10px] tracking-widest text-faint">{step.numero} / {stepsCount}</span>
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
        <SettingsPanel style={style} patchStyle={patchStyle} zoom={zoom} setZoom={setZoom} />
      )}
    </div>
  )
}
