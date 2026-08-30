import { useCallback, useRef, useState } from 'react'
import { formatBgRemovalError, removeBg } from '../lib/bgRemoval'

export function useBackgroundRemoval() {
  const [activeId, setActiveId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const activeIdRef = useRef<string | null>(null)

  const clearError = useCallback(() => setError(null), [])

  const removeBackground = useCallback(
    async (id: string, dataUrl: string, onDone: (dataUrl: string) => void) => {
      if (activeIdRef.current) return

      try {
        activeIdRef.current = id
        setActiveId(id)
        setError(null)
        const noBg = await removeBg(dataUrl)
        onDone(noBg)
      } catch (err) {
        console.error('Failed to remove bg', err)
        setError(formatBgRemovalError(err))
      } finally {
        activeIdRef.current = null
        setActiveId(null)
      }
    },
    [],
  )

  return { activeId, error, clearError, removeBackground }
}
