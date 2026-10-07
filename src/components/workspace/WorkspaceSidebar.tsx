import { X } from 'lucide-react'
import { Stepper } from '../Stepper'
import { Eyebrow } from '../ui'
import { cx } from '../../lib/cx'
import type { Rapport, WizardStep } from '../../types'

export function WorkspaceSidebar({
  rapport,
  activeSteps,
  step,
  ratio,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  onSelectStep,
  onAddStep,
  onDeleteStep,
}: {
  rapport: Rapport
  activeSteps: WizardStep[]
  step: WizardStep
  ratio: number
  isMobileMenuOpen: boolean
  setIsMobileMenuOpen: (open: boolean) => void
  onSelectStep: (id: string) => void
  onAddStep: () => void
  onDeleteStep: (stepId: string) => void
}) {
  return (
    <>
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
            onSelect={onSelectStep}
            onAddStep={onAddStep}
            onDeleteStep={onDeleteStep}
          />
        </div>
      </aside>
    </>
  )
}
