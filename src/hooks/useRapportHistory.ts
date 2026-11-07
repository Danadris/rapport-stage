import { useEffect, useRef, useState } from 'react'
import type { Rapport, SectionImage } from '../types'

/**
 * Undo/redo history with binary stripping. setRapportWithHistory is the single
 * mutation entry: every edit goes through it, so history + saveStatus stay uniform.
 */
export function useRapportHistory(
  _rapport: Rapport | null,
  setRapport: React.Dispatch<React.SetStateAction<Rapport | null>>,
  setSaveStatus: React.Dispatch<React.SetStateAction<'saved' | 'saving' | 'error'>>,
) {
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)
  const historyRef = useRef<Rapport[]>([])
  const futureRef = useRef<Rapport[]>([])
  const imageLiveUrls = useRef(new Map<string, string>())
  const lastEditTime = useRef(0)

  const stripBinaryForHistory = (r: Rapport): Rapport => {
    if (!r.images) return r
    const lightImages: Record<string, SectionImage[]> = {}
    for (const [sectionId, imgs] of Object.entries(r.images)) {
      lightImages[sectionId] = imgs.map((img) => {
        if (img.dataUrl) imageLiveUrls.current.set(img.id, img.dataUrl)
        return { ...img, dataUrl: img.dataUrl.startsWith('data:') ? '' : img.dataUrl }
      })
    }
    return { ...r, images: lightImages }
  }

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
    options?: { isTextKeystroke?: boolean },
  ) => {
    setRapport((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      if (prev && next && prev !== next) {
        const now = Date.now()
        const isCoalescing = options?.isTextKeystroke && now - lastEditTime.current < 600
        if (!isCoalescing) {
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

  const resetHistory = () => {
    historyRef.current = []
    futureRef.current = []
    setCanUndo(false)
    setCanRedo(false)
  }

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

  return { canUndo, setCanUndo, canRedo, setCanRedo, setRapportWithHistory, undo, redo, resetHistory }
}
