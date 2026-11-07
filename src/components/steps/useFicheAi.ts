import { useState } from 'react'
import { genererFicheTechnique } from '../../lib/ai'
import type { FicheTechnique } from '../../types'

export function useFicheAi({
  activeFiche,
  entrepriseContext,
  patchActive,
}: {
  activeFiche: FicheTechnique | null
  entrepriseContext: string
  patchActive: (patch: Partial<FicheTechnique>) => void
}) {
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)

  const handleAiGenerate = async () => {
    if (!activeFiche) return
    if (!activeFiche.nom.trim()) {
      setAiError("Renseignez d'abord le nom du produit.")
      return
    }
    setAiLoading(true)
    setAiError(null)
    try {
      const res = await genererFicheTechnique(activeFiche.nom, entrepriseContext)
      patchActive(res)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Erreur de génération')
    } finally {
      setAiLoading(false)
    }
  }

  return { aiLoading, aiError, handleAiGenerate }
}
