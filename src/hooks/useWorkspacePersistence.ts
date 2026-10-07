import { useEffect, useRef, useState } from 'react'
import { getRapport, persistRapport, createBackup } from '../lib/storage'
import { persistReport as persistReportV3, buildReportMeta, buildReportData } from '../lib/storageV3'
import { revokeReportUrls } from '../lib/imageRuntime'
import { createBackupV3 } from '../lib/backupV3'
import { exportToPdf } from '../lib/exportPdf'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import type { Rapport, SectionImage } from '../types'

export function useWorkspacePersistence(id: string | undefined) {
  const [rapport, setRapport] = useState<Rapport | null>(null)
  const [loadedRapportId, setLoadedRapportId] = useState<string | null>(null)
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const saveTimer = useRef<number | undefined>(undefined)
  const saveSeq = useRef(0)

  const historyRef = useRef<Rapport[]>([])
  const futureRef = useRef<Rapport[]>([])
  const imageLiveUrls = useRef(new Map<string, string>())
  const lastEditTime = useRef(0)
  const loadingRapport = Boolean(id && loadedRapportId !== id)

  // Strips large Base64 binary strings from history snapshots to prevent RAM leaks
  const stripBinaryForHistory = (r: Rapport): Rapport => {
    if (!r.images) return r
    const lightImages: Record<string, SectionImage[]> = {}
    for (const [sectionId, imgs] of Object.entries(r.images)) {
      lightImages[sectionId] = imgs.map((img) => {
        // Cache the live URL so it can be restored on undo/redo
        if (img.dataUrl) imageLiveUrls.current.set(img.id, img.dataUrl)
        return {
          ...img,
          dataUrl: img.dataUrl.startsWith('data:') ? '' : img.dataUrl,
        }
      })
    }
    return { ...r, images: lightImages }
  }

  // Restores live image URLs into a snapshot retrieved from undo/redo
  const restoreLiveImages = (r: Rapport): Rapport => {
    if (!r.images) return r
    const restoredImages: Record<string, SectionImage[]> = {}
    for (const [sectionId, imgs] of Object.entries(r.images)) {
      restoredImages[sectionId] = imgs.map((img) => {
        if (!img.dataUrl && imageLiveUrls.current.has(img.id)) {
          return { ...img, dataUrl: imageLiveUrls.current.get(img.id)! }
        }
        return img
      })
    }
    return { ...r, images: restoredImages }
  }

  const setRapportWithHistory = (
    updater: Rapport | ((prev: Rapport | null) => Rapport | null),
    options?: { isTextKeystroke?: boolean }
  ) => {
    setRapport((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (prev && next && prev !== next) {
        const now = Date.now()
        const isCoalescing = options?.isTextKeystroke && now - lastEditTime.current < 600

        if (!isCoalescing) {
          // Never duplicate large binary data in history
          historyRef.current = [...historyRef.current.slice(-49), stripBinaryForHistory(prev)]
          futureRef.current = []
          setCanUndo(true)
          setCanRedo(false)
        }
        lastEditTime.current = now
        setSaveStatus('saving')
      }
      return next
    })
  }

  useEffect(() => {
    let cancelled = false

    if (!id) return

    void getRapport(id)
      .then((found) => {
        if (cancelled) return
        setRapport(found ?? null)
        setLoadedRapportId(id)
        historyRef.current = []
        futureRef.current = []
        setCanUndo(false)
        setCanRedo(false)
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
      // Revoke active Object URLs when leaving workspace to prevent memory leaks
      revokeReportUrls(id)
    }
  }, [id])

  const undo = () => {
    if (historyRef.current.length === 0) return
    setRapport((prev) => {
      const previousRaw = historyRef.current[historyRef.current.length - 1]
      historyRef.current = historyRef.current.slice(0, -1)
      if (prev) futureRef.current = [stripBinaryForHistory(prev), ...futureRef.current]
      setCanUndo(historyRef.current.length > 0)
      setCanRedo(true)
      setSaveStatus('saving')
      return restoreLiveImages(previousRaw)
    })
  }

  const redo = () => {
    if (futureRef.current.length === 0) return
    setRapport((prev) => {
      const nextRaw = futureRef.current[0]
      futureRef.current = futureRef.current.slice(1)
      if (prev) historyRef.current = [...historyRef.current, stripBinaryForHistory(prev)]
      setCanUndo(true)
      setCanRedo(futureRef.current.length > 0)
      setSaveStatus('saving')
      return restoreLiveImages(nextRaw)
    })
  }

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo() }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo() }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleExportPdf = () => {
    setShowExportMenu(false)
    void exportToPdf()
  }

  const handleExportBackup = async () => {
    setShowExportMenu(false)
    setExportError(null)
    try {
      let backupPayload: any = await createBackupV3()
      if (backupPayload.reports.length === 0) {
        backupPayload = await createBackup()
      }
      const json = JSON.stringify(backupPayload, null, 2)
      const fileName = `rapport-stage-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
      if (Capacitor.isNativePlatform()) {
        await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
        await Share.share({ title: 'Rapport de stage — sauvegarde', files: [uri], dialogTitle: 'Exporter la sauvegarde' })
      } else {
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = fileName
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      }
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

  useEffect(() => {
    if (!rapport || loadingRapport || saveStatus !== 'saving') return
    window.clearTimeout(saveTimer.current)
    const seq = ++saveSeq.current
    saveTimer.current = window.setTimeout(() => {
      // V1 save (primary — workspace still loads from V1)
      void persistRapport(rapport)
        .then(() => {
          if (saveSeq.current === seq) setSaveStatus('saved')
        })
        .catch(() => {
          if (saveSeq.current === seq) setSaveStatus('error')
        })

      // V3 dual-write (fire-and-forget, keeps V3 stores in sync)
      try {
        const meta = buildReportMeta(rapport)
        const data = buildReportData(rapport, (rapport.images as any) ?? {})
        void persistReportV3(data, meta).catch(() => {
          // V3 write failure is non-critical during dual-write phase
        })
      } catch {
        // Never let V3 errors affect the V1 save path
      }
    }, 400)
    return () => window.clearTimeout(saveTimer.current)
  }, [rapport, loadingRapport, saveStatus])

  return {
    rapport,
    setRapport,
    loadingRapport,
    saveStatus,
    setSaveStatus,
    canUndo,
    setCanUndo,
    canRedo,
    setCanRedo,
    setRapportWithHistory,
    undo,
    redo,
    showExportMenu,
    setShowExportMenu,
    exportError,
    handleExportPdf,
    handleExportBackup,
  }
}
