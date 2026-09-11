import { openDB, type IDBPDatabase } from 'idb'
import type { ReportMeta, ReportData, StoredImage, Rapport, ImageReference } from '../types'
import { progressOf } from '../data/sections'

// ---------------------------------------------------------------------------
// Database Schema (V3.1)
// ---------------------------------------------------------------------------

const DB_NAME = 'rapport-stage-v3'
const DB_VERSION = 1

interface RapportStageDBSchema {
  reportMeta: {
    key: string
    value: ReportMeta
    indexes: {
      'by-updatedAt': number
      'by-createdAt': number
      'by-studentName': string
      'by-companyName': string
    }
  }
  reportData: {
    key: string
    value: ReportData
  }
  images: {
    key: string
    value: StoredImage
    indexes: {
      'by-reportId': string
    }
  }
  _migration: {
    key: string
    value: MigrationState | boolean
  }
}

interface MigrationState {
  status: 'in_progress' | 'validating' | 'complete' | 'failed'
  startedAt: number
  completedAt?: number
  migratedReportIds: string[]
  failedReportIds: string[]
  totalV1Reports: number
}

// ---------------------------------------------------------------------------
// Database Connection (Singleton)
// ---------------------------------------------------------------------------

let dbPromise: Promise<IDBPDatabase<RapportStageDBSchema>> | null = null

export function getDb(): Promise<IDBPDatabase<RapportStageDBSchema>> {
  if (dbPromise) return dbPromise
  dbPromise = openDB<RapportStageDBSchema>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // reportMeta — lightweight dashboard data
      if (!db.objectStoreNames.contains('reportMeta')) {
        const metaStore = db.createObjectStore('reportMeta', { keyPath: 'id' })
        metaStore.createIndex('by-updatedAt', 'updatedAt')
        metaStore.createIndex('by-createdAt', 'createdAt')
        metaStore.createIndex('by-studentName', 'studentName')
        metaStore.createIndex('by-companyName', 'companyName')
      }

      // reportData — full report content (no binary blobs)
      if (!db.objectStoreNames.contains('reportData')) {
        db.createObjectStore('reportData', { keyPath: 'id' })
      }

      // images — binary Blob storage
      if (!db.objectStoreNames.contains('images')) {
        const imageStore = db.createObjectStore('images', { keyPath: 'id' })
        imageStore.createIndex('by-reportId', 'reportId')
      }

      // _migration — migration state (NOT localStorage)
      if (!db.objectStoreNames.contains('_migration')) {
        db.createObjectStore('_migration')
      }
    },
  })
  return dbPromise
}

// ---------------------------------------------------------------------------
// Repository: ReportMeta
// ---------------------------------------------------------------------------

export async function loadAllMeta(): Promise<ReportMeta[]> {
  const db = await getDb()
  return db.getAllFromIndex('reportMeta', 'by-updatedAt')
}

export async function loadMeta(id: string): Promise<ReportMeta | undefined> {
  const db = await getDb()
  return db.get('reportMeta', id)
}

export async function saveMeta(meta: ReportMeta): Promise<void> {
  const db = await getDb()
  await db.put('reportMeta', meta)
}

export async function deleteMeta(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('reportMeta', id)
}

// ---------------------------------------------------------------------------
// Repository: ReportData
// ---------------------------------------------------------------------------

export async function loadReportData(id: string): Promise<ReportData | undefined> {
  const db = await getDb()
  return db.get('reportData', id)
}

export async function saveReportData(data: ReportData): Promise<void> {
  const db = await getDb()
  await db.put('reportData', data)
}

export async function deleteReportData(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('reportData', id)
}

// ---------------------------------------------------------------------------
// Repository: Images
// ---------------------------------------------------------------------------

export async function loadImage(id: string): Promise<StoredImage | undefined> {
  const db = await getDb()
  return db.get('images', id)
}

export async function loadImagesByReportId(reportId: string): Promise<StoredImage[]> {
  const db = await getDb()
  return db.getAllFromIndex('images', 'by-reportId', reportId)
}

export async function saveImage(image: StoredImage): Promise<void> {
  const db = await getDb()
  await db.put('images', image)
}

export async function deleteImage(id: string): Promise<void> {
  const db = await getDb()
  await db.delete('images', id)
}

export async function deleteImagesByReportId(reportId: string): Promise<void> {
  const db = await getDb()
  const images = await db.getAllKeysFromIndex('images', 'by-reportId', reportId)
  const tx = db.transaction('images', 'readwrite')
  for (const key of images) {
    tx.store.delete(key)
  }
  await tx.done
}

// ---------------------------------------------------------------------------
// Composite Operations
// ---------------------------------------------------------------------------

/** Save report data AND update its meta entry in one go. */
export async function persistReport(data: ReportData, meta: ReportMeta): Promise<void> {
  const db = await getDb()
  const tx = db.transaction(['reportData', 'reportMeta'], 'readwrite')
  tx.objectStore('reportData').put(data)
  tx.objectStore('reportMeta').put(meta)
  await tx.done
}

/** Delete a report, its data, and all associated images. */
export async function deleteReport(id: string): Promise<void> {
  await deleteImagesByReportId(id)
  const db = await getDb()
  const tx = db.transaction(['reportData', 'reportMeta'], 'readwrite')
  tx.objectStore('reportData').delete(id)
  tx.objectStore('reportMeta').delete(id)
  await tx.done
}

// ---------------------------------------------------------------------------
// MIGRATION: V1 → V3.1
//
// Rules:
// 1. V1 data is NEVER modified or deleted by this code.
// 2. Migration state lives in IndexedDB (_migration store), not localStorage.
// 3. Migration is idempotent: re-running it skips already-migrated reports.
// 4. Migration is resumable: if interrupted, it picks up where it left off.
// 5. V1 is only retired AFTER deep validation of every report + every image.
// ---------------------------------------------------------------------------

/** Convert a Base64 dataUrl to a Blob */
async function base64ToBlob(dataUrl: string): Promise<{ blob: Blob; mimeType: string }> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return { blob, mimeType: blob.type || 'image/png' }
}

/** Get image dimensions from a dataUrl */
function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = dataUrl
  })
}

/** Read V1 reports from the old database (read-only, never mutates V1). */
async function readV1Reports(): Promise<Rapport[] | null> {
  return new Promise((resolve) => {
    const req = indexedDB.open('rapport-stage-db', 1)
    req.onerror = () => resolve(null)
    req.onsuccess = () => {
      const oldDb = req.result
      if (!oldDb.objectStoreNames.contains('kv')) {
        oldDb.close()
        resolve(null)
        return
      }
      const tx = oldDb.transaction('kv', 'readonly')
      const store = tx.objectStore('kv')
      const getReq = store.get('rs:rapports:v1')
      getReq.onsuccess = () => {
        oldDb.close()
        const data = getReq.result
        if (Array.isArray(data) && data.length > 0) {
          resolve(data as Rapport[])
        } else {
          resolve(null)
        }
      }
      getReq.onerror = () => {
        oldDb.close()
        resolve(null)
      }
    }
  })
}

/** Deep validation: verify every report and every image blob exists and is consistent. */
async function validateMigration(v1Reports: Rapport[]): Promise<boolean> {
  const db = await getDb()
  let valid = true

  for (const rapport of v1Reports) {
    const meta = await db.get('reportMeta', rapport.id)
    const data = await db.get('reportData', rapport.id)

    if (!meta) {
      console.error(`[Migration Validation] Missing reportMeta for ${rapport.id}`)
      valid = false
      continue
    }
    if (!data) {
      console.error(`[Migration Validation] Missing reportData for ${rapport.id}`)
      valid = false
      continue
    }

    // Validate images
    if (rapport.images) {
      for (const [sectionId, oldImages] of Object.entries(rapport.images)) {
        const refs = data.images?.[sectionId] ?? []

        if (oldImages.length !== refs.length) {
          console.error(`[Migration Validation] Image count mismatch in report ${rapport.id}, section ${sectionId}: expected ${oldImages.length}, got ${refs.length}`)
          valid = false
          continue
        }

        for (const ref of refs) {
          const storedBlob = await db.get('images', ref.imageId)
          if (!storedBlob) {
            console.error(`[Migration Validation] Missing image blob ${ref.imageId} for report ${rapport.id}`)
            valid = false
          } else {
            if (storedBlob.reportId !== rapport.id) {
              console.error(`[Migration Validation] Image ${ref.imageId} has wrong reportId: ${storedBlob.reportId} !== ${rapport.id}`)
              valid = false
            }
            if (storedBlob.size === 0 || !storedBlob.blob) {
              console.error(`[Migration Validation] Image ${ref.imageId} has empty or missing blob data`)
              valid = false
            }
          }
        }
      }
    }
  }

  return valid
}

/** Main migration entry point. Safe to call on every app start. */
export async function migrateV1toV3IfNeeded(): Promise<void> {
  const db = await getDb()

  // Check migration state
  const state = await db.get('_migration', 'v1_to_v3') as MigrationState | undefined
  if (state?.status === 'complete') return // Already done

  // Read V1 (read-only, never modified)
  const v1Reports = await readV1Reports()
  if (!v1Reports) {
    // No V1 data found, mark migration as complete (nothing to migrate)
    const completeState: MigrationState = {
      status: 'complete',
      startedAt: Date.now(),
      completedAt: Date.now(),
      migratedReportIds: [],
      failedReportIds: [],
      totalV1Reports: 0,
    }
    await db.put('_migration', completeState, 'v1_to_v3')
    return
  }

  // Initialize or resume migration state
  const migrationState: MigrationState = state ?? {
    status: 'in_progress',
    startedAt: Date.now(),
    migratedReportIds: [],
    failedReportIds: [],
    totalV1Reports: v1Reports.length,
  }
  migrationState.status = 'in_progress'
  await db.put('_migration', migrationState, 'v1_to_v3')

  console.log(`[Migration] V1 → V3.1: ${v1Reports.length} reports to process (${migrationState.migratedReportIds.length} already done)`)

  // Migrate each report
  for (const rapport of v1Reports) {
    // Skip if already migrated (idempotent)
    if (migrationState.migratedReportIds.includes(rapport.id)) continue

    try {
      await migrateOneReport(rapport)
      migrationState.migratedReportIds.push(rapport.id)
    } catch (err) {
      console.error(`[Migration] Failed to migrate report ${rapport.id}:`, err)
      if (!migrationState.failedReportIds.includes(rapport.id)) {
        migrationState.failedReportIds.push(rapport.id)
      }
    }

    // Persist progress after each report (resumable)
    await db.put('_migration', migrationState, 'v1_to_v3')
  }

  // Deep validation
  migrationState.status = 'validating'
  await db.put('_migration', migrationState, 'v1_to_v3')

  const isValid = await validateMigration(v1Reports)

  if (isValid && migrationState.failedReportIds.length === 0) {
    migrationState.status = 'complete'
    migrationState.completedAt = Date.now()
    console.log('[Migration] ✅ V1 → V3.1 migration complete and validated!')
  } else {
    migrationState.status = 'failed'
    console.error('[Migration] ❌ Validation failed. V1 data remains intact and untouched.')
  }

  await db.put('_migration', migrationState, 'v1_to_v3')
}

/** Migrate a single V1 Rapport into V3 stores. */
async function migrateOneReport(rapport: Rapport): Promise<void> {
  const db = await getDb()

  // 1. Convert images from Base64 to Blob
  const newImages: Record<string, ImageReference[]> = {}

  if (rapport.images) {
    for (const [sectionId, oldImages] of Object.entries(rapport.images)) {
      newImages[sectionId] = []
      for (const oldImg of oldImages) {
        const storedImageId = `img_${crypto.randomUUID()}`

        // Convert Base64 → Blob
        const { blob, mimeType } = await base64ToBlob(oldImg.dataUrl)
        const { width, height } = await getImageDimensions(oldImg.dataUrl)

        // Save Blob to images store
        await db.put('images', {
          id: storedImageId,
          reportId: rapport.id,
          blob,
          mimeType,
          width,
          height,
          size: blob.size,
          createdAt: Date.now(),
        })

        // Create lightweight reference
        newImages[sectionId].push({
          id: oldImg.id,
          imageId: storedImageId,
          side: oldImg.side,
          size: oldImg.size,
          caption: oldImg.caption,
          positioning: oldImg.positioning,
          x: oldImg.x,
          y: oldImg.y,
          blockIndex: oldImg.blockIndex,
        })
      }
    }
  }

  // 2. Create ReportData (no binary data)
  const reportData: ReportData = {
    id: rapport.id,
    couverture: rapport.couverture,
    entreprise: rapport.entreprise,
    sections: rapport.sections,
    sectionsGenerated: rapport.sectionsGenerated,
    style: rapport.style,
    pageBreaks: rapport.pageBreaks,
    customSteps: rapport.customSteps,
    images: newImages,
  }

  // 3. Create ReportMeta
  const progress = progressOf(rapport, rapport.customSteps)
  const reportMeta: ReportMeta = {
    id: rapport.id,
    createdAt: rapport.createdAt,
    updatedAt: rapport.updatedAt,
    studentName: rapport.couverture.nomStagiaire || '',
    companyName: rapport.entreprise.nom || '',
    periodeNumero: rapport.couverture.periodeNumero || '',
    sourceRecherche: rapport.entreprise.sourceRecherche ?? null,
    progressDone: progress.done,
    progressTotal: progress.total,
  }

  // 4. Save both transactionally
  const tx = db.transaction(['reportData', 'reportMeta'], 'readwrite')
  tx.objectStore('reportData').put(reportData)
  tx.objectStore('reportMeta').put(reportMeta)
  await tx.done

  console.log(`[Migration] ✓ Report ${rapport.id} migrated successfully`)
}
