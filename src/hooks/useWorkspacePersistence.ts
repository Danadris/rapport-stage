import { useEffect, useState } from 'react'
import { getRapport } from '../lib/storageV3'
import { revokeReportUrls } from '../lib/imageRuntime'
import { exportBackup } from '../lib/exportBackup'
import { exportToPdf } from '../lib/exportPdf'
import { useRapportHistory } from './useRapportHistory'
import { useRapportAutosave } from './useRapportAutosave'
import type { Rapport } from '../types'

export function useWorkspacePersistence(id: string | undefined) {
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [loadedRapportId, setLoadedRapportId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const loadingRapport = Boolean(id && loadedRapportId !== id)

  const history = useRapportHistory(rapport, setRapport, setSaveStatus)
  useRapportAutosave(rapport, loadingRapport, saveStatus, setSaveStatus)

  useEffect(() => {
    let cancelled = false
    if (!id) return
    void getRapport(id)
      .then((found) => {
        if (cancelled) return
        setRapport(found ?? null)
        setLoadedRapportId(id)
        history.resetHistory()
        setSaveStatus('saved')
      })
      .catch(() => {
        if (cancelled) return
        setRapport(null)
        setLoadedRapportId(id)
        setSaveStatus('error')
      })
    return () => {
      cancelled = true
      revokeReportUrls(id)
    }
  }, [id])

  const handleExportPdf = () => {
    setShowExportMenu(false)
    void exportToPdf()
  }

  const handleExportBackup = async () => {
    setShowExportMenu(false)
    setExportError(null)
    try {
      await exportBackup()
    } catch {
      setExportError("L'export de la sauvegarde a échoué.")
    }
  }

  useEffect(() => {
    if (!showExportMenu) return
    const close = () => setShowExportMenu(false)
    const t = window.setTimeout(() => document.addEventListener('click', close), 0)
    return () => {
      window.clearTimeout(t)
      document.removeEventListener('click', close)
    }
  }, [showExportMenu])

  return {
    rapport,
    setRapport,
    loadingRapport,
    saveStatus,
    setSaveStatus,
    ...history,
    showExportMenu,
    setShowExportMenu,
    exportError,
    handleExportPdf,
    handleExportBackup,
  }
}
