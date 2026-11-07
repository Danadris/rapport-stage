import { useEffect, useRef } from 'react'
import { persistRapport } from '../lib/storageV3'
import type { Rapport } from '../types'

/** Debounced autosave: writes to V3 whenever rapport is in 'saving' state. */
export function useRapportAutosave(
  rapport: Rapport | null,
  loadingRapport: boolean,
  saveStatus: 'saved' | 'saving' | 'error',
  setSaveStatus: React.Dispatch<React.SetStateAction<'saved' | 'saving' | 'error'>>,
) {
  const saveTimer = useRef<number | undefined>(undefined)
  const saveSeq = useRef(0)

  useEffect(() => {
    if (!rapport || loadingRapport || saveStatus !== 'saving') return
    window.clearTimeout(saveTimer.current)
    const seq = ++saveSeq.current
    saveTimer.current = window.setTimeout(() => {
      void persistRapport(rapport)
        .then(() => {
          if (saveSeq.current === seq) setSaveStatus('saved')
        })
        .catch(() => {
          if (saveSeq.current === seq) setSaveStatus('error')
        })
    }, 400)
    return () => window.clearTimeout(saveTimer.current)
  }, [rapport, loadingRapport, saveStatus, setSaveStatus])
}
