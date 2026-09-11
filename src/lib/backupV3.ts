import { loadAllMeta, loadReportData, loadImagesByReportId, saveMeta, saveReportData, saveImage } from './storageV3'
import type { ReportMeta, ReportData, StoredImage } from '../types'

export interface BackupPayloadV3 {
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
  let parsed: any
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Le fichier de sauvegarde est illisible.')
  }

  // Handle V3 format
  if (parsed && parsed.app === 'rapport-stage' && parsed.version === 3 && Array.isArray(parsed.reports)) {
    const v3 = parsed as BackupPayloadV3
    let count = 0

    // Restore images as Blobs in IndexedDB
    if (Array.isArray(v3.images)) {
      for (const img of v3.images) {
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
    }

    // Restore reports and metadata
    for (const item of v3.reports) {
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
    : parsed && Array.isArray(parsed.rapports)
      ? parsed.rapports
      : null

  if (v1Reports && v1Reports.length > 0) {
    let count = 0
    for (const r of v1Reports) {
      if (!r.id) continue

      // Convert V1 images if present
      const newImages: Record<string, any[]> = {}
      if (r.images) {
        for (const [sectionId, oldImages] of Object.entries(r.images as Record<string, any[]>)) {
          newImages[sectionId] = []
          for (const oldImg of oldImages) {
            const storedImageId = `img_${crypto.randomUUID()}`
            const blob = await dataUrlToBlob(oldImg.dataUrl)
            await saveImage({
              id: storedImageId,
              reportId: r.id,
              blob,
              mimeType: 'image/png',
              width: 1,
              height: 1,
              size: blob.size,
              createdAt: Date.now(),
            })
            newImages[sectionId].push({
              ...oldImg,
              imageId: storedImageId,
            })
          }
        }
      }

      await saveReportData({
        id: r.id,
        couverture: r.couverture,
        entreprise: r.entreprise,
        sections: r.sections,
        sectionsGenerated: r.sectionsGenerated,
        style: r.style,
        pageBreaks: r.pageBreaks,
        customSteps: r.customSteps,
        images: newImages,
      })

      await saveMeta({
        id: r.id,
        createdAt: r.createdAt || Date.now(),
        updatedAt: Date.now(),
        studentName: r.couverture?.nomStagiaire || '',
        companyName: r.entreprise?.nom || '',
        periodeNumero: r.couverture?.periodeNumero || '',
        sourceRecherche: r.entreprise?.sourceRecherche ?? null,
        progressDone: 0,
        progressTotal: 10,
      })
      count++
    }

    const total = (await loadAllMeta()).length
    return { imported: count, total }
  }

  throw new Error("Format de sauvegarde non reconnu.")
}
