import { openDB, type IDBPDatabase } from 'idb'
import type { ReportMeta, ReportData, StoredImage, Rapport, ImageReference, SectionImage, Settings } from '../types'
import { progressOf } from '../data/sections'
import { demoRapport } from './demo'

// ---------------------------------------------------------------------------
// Database Schema (V3.1)
// ---------------------------------------------------------------------------

const DB_NAME = 'rapport-stage-v3'
const DB_VERSION = 2

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
  settings: {
    key: string
    value: Settings
  }
  _settingsMigration: {
    key: string
    value: boolean
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

      // settings — single doc store (added in v2, replaces V1 'rs:settings:v1')
      if (!db.objectStoreNames.contains('settings')) {
        db.createObjectStore('settings')
      }

      // _settingsMigration — flags one-time V1 settings copy
      if (!db.objectStoreNames.contains('_settingsMigration')) {
        db.createObjectStore('_settingsMigration')
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
  const reportData = buildReportData(rapport, newImages)

  // 3. Create ReportMeta
  const reportMeta = buildReportMeta(rapport)

  // 4. Save both transactionally
  const tx = db.transaction(['reportData', 'reportMeta'], 'readwrite')
  tx.objectStore('reportData').put(reportData)
  tx.objectStore('reportMeta').put(reportMeta)
  await tx.done

  console.log(`[Migration] ✓ Report ${rapport.id} migrated successfully`)
}

/**
 * Helper to build ReportMeta from a Rapport
 */
export function buildReportMeta(rapport: Rapport): ReportMeta {
  const progress = progressOf(rapport, rapport.customSteps)
  return {
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
}

/**
 * Helper to build ReportData from a Rapport
 */
export function buildReportData(
  rapport: Rapport,
  images: Record<string, ImageReference[]> = {},
): ReportData {
  return {
    id: rapport.id,
    createdAt: rapport.createdAt,
    updatedAt: rapport.updatedAt,
    couverture: rapport.couverture,
    entreprise: rapport.entreprise,
    sections: rapport.sections,
    sectionsGenerated: rapport.sectionsGenerated,
    style: rapport.style,
    pageBreaks: rapport.pageBreaks,
    customSteps: rapport.customSteps,
    images,
    textBlocks: rapport.textBlocks,
    blockOrder: rapport.blockOrder,
    titleOverrides: rapport.titleOverrides,
    organigramme: rapport.organigramme,
    organigrammes: rapport.organigrammes,
    ficheTechniques: rapport.ficheTechniques,
    materiels: rapport.materiels,
  }
}

// ---------------------------------------------------------------------------
// Settings (replaces V1 'rs:settings:v1')
// ---------------------------------------------------------------------------

const SETTINGS_KEY = 'app-settings'
const EMPTY_SETTINGS: Settings = { geminiKey: '', geminiModel: '' }

/** Read V1 settings directly from the old DB / localStorage (read-only, one-time). */
async function readV1Settings(): Promise<Settings | null> {
  // Try old IndexedDB first
  try {
    const v1 = await new Promise<Settings | null>((resolve) => {
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
        const getReq = tx.objectStore('kv').get('rs:settings:v1')
        getReq.onsuccess = () => {
          oldDb.close()
          const data = getReq.result
          resolve(data && typeof data === 'object' ? (data as Settings) : null)
        }
        getReq.onerror = () => {
          oldDb.close()
          resolve(null)
        }
      }
    })
    if (v1) return v1
  } catch {
    // fall through to localStorage
  }
  try {
    const raw = localStorage.getItem('rs:settings:v1')
    if (raw) return JSON.parse(raw) as Settings
  } catch {
    // ignore
  }
  return null
}

export async function loadSettings(): Promise<Settings> {
  const db = await getDb()
  const migrated = await db.get('_settingsMigration', 'done').catch(() => undefined)
  if (!migrated) {
    const v1 = await readV1Settings()
    if (v1) {
      await db.put('settings', v1, SETTINGS_KEY)
    }
    await db.put('_settingsMigration', true, 'done')
  }
  return (await db.get('settings', SETTINGS_KEY)) ?? EMPTY_SETTINGS
}

export async function saveSettings(settings: Settings): Promise<void> {
  const db = await getDb()
  await db.put('settings', settings, SETTINGS_KEY)
  await db.put('_settingsMigration', true, 'done').catch(() => {})
}

// ---------------------------------------------------------------------------
// Rapport adapter: in-memory Rapport (dataUrls) <-> V3 stores (Blobs)
// ---------------------------------------------------------------------------

async function dataUrlToBlob(dataUrl: string): Promise<{ blob: Blob; mimeType: string }> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return { blob, mimeType: blob.type || 'image/png' }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}


/** Convert all section images from dataUrls to Blobs + references. */
async function splitRapportImages(
  reportId: string,
  images: Record<string, SectionImage[]> | undefined,
): Promise<{ refs: Record<string, ImageReference[]>; stored: StoredImage[] }> {
  const refs: Record<string, ImageReference[]> = {}
  const stored: StoredImage[] = []
  if (!images) return { refs, stored }
  for (const [sectionId, list] of Object.entries(images)) {
    if (!list?.length) continue
    refs[sectionId] = []
    for (const img of list) {
      if (!img.dataUrl || !img.dataUrl.startsWith('data:')) {
        // Empty or non-data URL (transition state) — keep a ref without blob
        refs[sectionId].push({
          id: img.id,
          imageId: img.id,
          side: img.side,
          size: img.size,
          caption: img.caption,
          positioning: img.positioning,
          x: img.x,
          y: img.y,
          blockIndex: img.blockIndex,
        })
        continue
      }
      const { blob, mimeType } = await dataUrlToBlob(img.dataUrl)
      const { width, height } = await getImageDimensions(img.dataUrl)
      const imageId = `img_${crypto.randomUUID()}`
      stored.push({
        id: imageId,
        reportId,
        blob,
        mimeType,
        width,
        height,
        size: blob.size,
        createdAt: Date.now(),
      })
      refs[sectionId].push({
        id: img.id,
        imageId,
        side: img.side,
        size: img.size,
        caption: img.caption,
        positioning: img.positioning,
        x: img.x,
        y: img.y,
        blockIndex: img.blockIndex,
      })
    }
  }
  return { refs, stored }
}

/** Hydrate section images from Blobs back to dataUrls. */
async function hydrateRapportImages(
  _reportId: string,
  refs: Record<string, unknown> | undefined,
): Promise<Record<string, SectionImage[]>> {
  const out: Record<string, SectionImage[]> = {}
  if (!refs) return out
  const db = await getDb()
  for (const [sectionId, list] of Object.entries(refs as Record<string, Array<Record<string, unknown>>>)) {
    if (!Array.isArray(list)) continue
    out[sectionId] = []
    for (const ref of list) {
      // Legacy dual-write rows stored full SectionImage (with dataUrl) directly
      if (typeof ref.dataUrl === 'string' && ref.dataUrl) {
        out[sectionId].push(ref as unknown as SectionImage)
        continue
      }
      const imageId = ref.imageId as string | undefined
      const stored = imageId ? await db.get('images', imageId).catch(() => undefined) : undefined
      const dataUrl = stored?.blob ? await blobToDataUrl(stored.blob) : ''
      out[sectionId].push({
        id: ref.id as string,
        dataUrl,
        side: (ref.side as SectionImage['side']) ?? 'center',
        size: (ref.size as SectionImage['size']) ?? 'M',
        caption: ref.caption as string | undefined,
        positioning: ref.positioning as SectionImage['positioning'],
        x: ref.x as number | undefined,
        y: ref.y as number | undefined,
        blockIndex: ref.blockIndex as number | undefined,
      })
    }
  }
  return out
}

function reportDataToRapport(data: ReportData, meta: ReportMeta, images: Record<string, SectionImage[]>): Rapport {
  return {
    id: data.id,
    createdAt: data.createdAt ?? meta.createdAt,
    updatedAt: meta.updatedAt,
    couverture: data.couverture,
    entreprise: data.entreprise,
    sections: data.sections,
    sectionsGenerated: data.sectionsGenerated,
    images: Object.keys(images).length ? images : undefined,
    textBlocks: data.textBlocks,
    blockOrder: data.blockOrder,
    style: data.style,
    pageBreaks: data.pageBreaks,
    customSteps: data.customSteps,
    titleOverrides: data.titleOverrides,
    organigramme: data.organigramme,
    organigrammes: data.organigrammes,
    ficheTechniques: data.ficheTechniques,
    materiels: data.materiels,
  }
}

/** Load one report as in-memory Rapport (with dataUrl images). */
export async function getRapport(id: string): Promise<Rapport | undefined> {
  const db = await getDb()
  const data = await db.get('reportData', id)
  if (!data) return undefined
  const meta = await db.get('reportMeta', id)
  const images = await hydrateRapportImages(id, data.images as Record<string, unknown> | undefined)
  return reportDataToRapport(
    data,
    meta ?? buildReportMeta(reportDataToRapport(data, {} as ReportMeta, {})),
    images,
  )
}

/** Load all reports, sorted by updatedAt desc. */
export async function loadRapports(): Promise<Rapport[]> {
  const metas = await loadAllMeta()
  const out: Rapport[] = []
  for (const meta of metas) {
    const r = await getRapport(meta.id)
    if (r) out.push(r)
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt)
}

/**
 * Persist an in-memory Rapport to V3 stores.
 * Section images are converted dataUrl -> Blob and stored separately.
 * Old stored blobs for this report are replaced (not leaked).
 */
export async function persistRapport(rapport: Rapport): Promise<void> {
  const db = await getDb()
  const existing = await db.get('reportData', rapport.id).catch(() => undefined)
  const prevRefs = existing?.images as Record<string, Array<{ imageId?: string }>> | undefined
  const prevImageIds = prevRefs
    ? Object.values(prevRefs).flat().map((r) => r.imageId).filter((x): x is string => Boolean(x))
    : []
  const { refs, stored } = await splitRapportImages(rapport.id, rapport.images)
  const data = buildReportData({ ...rapport, updatedAt: Date.now() }, refs)
  const meta = buildReportMeta({ ...data, updatedAt: Date.now() } as unknown as Rapport)
  const tx = db.transaction(['reportData', 'reportMeta', 'images'], 'readwrite')
  tx.objectStore('reportData').put(data)
  tx.objectStore('reportMeta').put({ ...meta, updatedAt: Date.now() })
  for (const s of stored) tx.objectStore('images').put(s)
  for (const oldId of prevImageIds) tx.objectStore('images').delete(oldId)
  await tx.done
}

export async function removeRapport(id: string): Promise<void> {
  await deleteReport(id)
}

/** Seed the demo report once when the store is empty. */
export async function ensureDemoReport(): Promise<void> {
  const metas = await loadAllMeta()
  if (metas.length > 0) return
  await persistRapport(demoRapport())
}
