import { useState } from 'react'
import { genererParagraphe, type LongueurAI } from '../../lib/ai'

/**
 * The IA-drafting state shared by a level-2 subtitle box and a level-3 point
 * box: the length picker, the pending call, the error, and the final text that
 * stays closed until there is something in it.
 */
export function useAiDraft({
  stepTitle,
  fieldLabel,
  current,
  generated,
  onGenerate,
}: {
  stepTitle: string
  fieldLabel: string
  current: string
  generated: string
  onGenerate: (value: string) => void
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [longueur, setLongueur] = useState<LongueurAI>('moyen')
  const [finalOpen, setFinalOpen] = useState(false)
  const hasFinal = finalOpen || generated.trim() !== ''
  const canGenerate = current.trim() !== ''

  const generate = async () => {
    if (!canGenerate) return
    setLoading(true)
    setError(null)
    try {
      const res = await genererParagraphe(stepTitle, fieldLabel, current, longueur)
      onGenerate(res)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur de génération')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, longueur, setLongueur, hasFinal, finalOpen, setFinalOpen, canGenerate, generate }
}
