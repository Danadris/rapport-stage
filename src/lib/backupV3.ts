import { loadAllMeta, loadReportData, loadImagesByReportId, saveMeta, saveReportData, saveImage, persistRapport } from './storageV3'
import type { ReportMeta, ReportData, StoredImage, Rapport } from '../types'

interface BackupPayloadV3 {
  app: 'rapport-stage'
  version: 3
  exportedAt: string
  reports: Array<{
    meta: ReportMeta
    data: ReportData
  }>
  images: Array<{
    id: string
    reportId: string
    mimeType: string
    width: number
    height: number
    size: number
    dataUrl: string
  }>
}

/**
 * Converts a Blob to a Base64 data URL for portable file export
 */
function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/**
 * Converts a Base64 data URL to a Blob for database storage
 */
async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const res = await fetch(dataUrl)
  return res.blob()
}

/**
 * Exports all reports, metadata, and image blobs from V3 into a single JSON backup.
 */
export async function createBackupV3(): Promise<BackupPayloadV3> {
  const allMeta = await loadAllMeta()
  const reports: BackupPayloadV3['reports'] = []
  const exportedImages: BackupPayloadV3['images'] = []

  for (const meta of allMeta) {
    const data = await loadReportData(meta.id)
    if (data) {
      reports.push({ meta, data })
    }

    const images = await loadImagesByReportId(meta.id)
    for (const img of images) {
      const dataUrl = await blobToDataUrl(img.blob)
      exportedImages.push({
        id: img.id,
        reportId: img.reportId,
        mimeType: img.mimeType,
        width: img.width,
        height: img.height,
        size: img.size,
        dataUrl,
      })
    }
  }

  return {
    app: 'rapport-stage',
    version: 3,
    exportedAt: new Date().toISOString(),
    reports,
    images: exportedImages,
  }
}

/**
 * Imports a backup file into the V3 database.
 * Supports both V3 (Object Stores with Blobs) and V1 (legacy JSON array).
 */
export async function importBackupV3(raw: string): Promise<{ imported: number; total: number }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Le fichier de sauvegarde est illisible.')
  }

  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null

  // Handle V3 format
  if (isRecord(parsed) && parsed.app === 'rapport-stage' && parsed.version === 3 && Array.isArray(parsed.reports)) {
    const v3 = parsed as unknown as BackupPayloadV3
    const images = Array.isArray(v3.images) ? v3.images : []
    const reports = v3.reports ?? []
    let count = 0

    // Restore images as Blobs in IndexedDB
    for (const img of images) {
      if (!img?.dataUrl) continue
      const blob = await dataUrlToBlob(img.dataUrl)
      const stored: StoredImage = {
        id: img.id,
        reportId: img.reportId,
        blob,
        mimeType: img.mimeType,
        width: img.width,
        height: img.height,
        size: img.size,
        createdAt: Date.now(),
      }
      await saveImage(stored)
    }

    // Restore reports and metadata
    for (const item of reports) {
      if (item.meta && item.data) {
        await saveReportData(item.data)
        await saveMeta({ ...item.meta, updatedAt: Date.now() })
        count++
      }
    }

    const total = (await loadAllMeta()).length
    return { imported: count, total }
  }

  // Handle Legacy V1 format
  const v1Reports = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.rapports)
      ? (parsed.rapports as unknown[])
      : null

  if (v1Reports && v1Reports.length > 0) {
    let count = 0
    for (const r of v1Reports) {
      if (!isRecord(r) || typeof r.id !== 'string') continue
      const rapport = r as unknown as Rapport
      // persistRapport converts dataUrl images to Blobs and writes V3 stores
      await persistRapport({ ...rapport, updatedAt: Date.now() })
      count++
    }

    const total = (await loadAllMeta()).length
    return { imported: count, total }
  }

  throw new Error("Format de sauvegarde non reconnu.")
}
