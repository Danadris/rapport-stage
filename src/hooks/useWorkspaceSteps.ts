import type { Rapport, WizardStep } from '../types'
import { materializeSteps } from '../lib/blockModel'
import { useCouvertureEntreprise, type SetRapportWithHistory } from './useCouvertureEntreprise'
import { usePlanEditing } from './usePlanEditing'
import { usePreviewEdits } from './usePreviewEdits'

/**
 * Composer: delegates to three focused hooks (couverture/entreprise, plan, preview).
 * Keeps the original return shape so WorkspacePage is unchanged.
 */
export function useWorkspaceSteps({
  rapport,
  step,
  setStepId,
  setRapportWithHistory,
}: {
  rapport: Rapport
  step: WizardStep
  setStepId: (id: string) => void
  setRapportWithHistory: SetRapportWithHistory
}) {
  const identity = useCouvertureEntreprise({ setRapportWithHistory })
  const plan = usePlanEditing({ rapport, step, setStepId, setRapportWithHistory })
  const preview = usePreviewEdits({ step, setRapportWithHistory, patchCouverture: identity.patchCouverture, patchEntreprise: identity.patchEntreprise })

  return {
    ...identity,
    ...plan,
    ...preview,
    materializeSteps,
  }
}
