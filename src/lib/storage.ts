const DB_NAME = 'rapport-stage-db'
const DB_VERSION = 1
const STORE_NAME = 'kv'
const RAPPORTS_KEY = 'rs:rapports:v1'
const SETTINGS_KEY = 'rs:settings:v1'
const MIGRATION_KEY = 'rs:migrated-to-indexeddb:v1'

import type { Rapport, Settings } from '../types'
import { createRapport, demoRapport } from './demo'

interface BackupPayload {
  app: 'rapport-stage'
  version: 1
  exportedAt: string
  rapports: Rapport[]
}

type StoredValue = Rapport[] | Settings | boolean

let dbPromise: Promise<IDBDatabase> | null = null

function canUseIndexedDb(): boolean {
  return typeof indexedDB !== 'undefined'
}

function openDb(): Promise<IDBDatabase> {
  if (!canUseIndexedDb()) return Promise.reject(new Error('IndexedDB indisponible.'))
  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      request.result.createObjectStore(STORE_NAME)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error("Ouverture du stockage impossible."))
  })

  return dbPromise
}

function legacyRead<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function legacyWrite(key: string, value: StoredValue): void {
  localStorage.setItem(key, JSON.stringify(value))
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const request = tx.objectStore(STORE_NAME).get(key)
    request.onsuccess = () => resolve(request.result as T | undefined)
    request.onerror = () => reject(request.error ?? new Error('Lecture du stockage impossible.'))
  })
}

async function idbSet(key: string, value: StoredValue): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    tx.objectStore(STORE_NAME).put(value, key)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('Ecriture du stockage impossible.'))
  })
}

async function migrateLegacyStorage(): Promise<void> {
  try {
    if ((await idbGet<boolean>(MIGRATION_KEY)) === true) return

    const rapports = localStorage.getItem(RAPPORTS_KEY)
    if (rapports !== null) {
      await idbSet(RAPPORTS_KEY, legacyRead<Rapport[]>(RAPPORTS_KEY, []))
    }

    const settings = localStorage.getItem(SETTINGS_KEY)
    if (settings !== null) {
      await idbSet(SETTINGS_KEY, legacyRead<Settings>(SETTINGS_KEY, { geminiKey: '' }))
    }

    await idbSet(MIGRATION_KEY, true)
  } catch {
    // localStorage fallback remains available if IndexedDB fails.
  }
}

function sortRapports(list: Rapport[]): Rapport[] {
  return [...list].sort((a, b) => b.updatedAt - a.updatedAt)
}

async function readRapports(): Promise<Rapport[]> {
  await migrateLegacyStorage()
  try {
    return (await idbGet<Rapport[]>(RAPPORTS_KEY)) ?? []
  } catch {
    return legacyRead<Rapport[]>(RAPPORTS_KEY, [])
  }
}

async function writeRapports(list: Rapport[]): Promise<void> {
  const sorted = sortRapports(list)
  try {
    await idbSet(RAPPORTS_KEY, sorted)
  } catch {
    legacyWrite(RAPPORTS_KEY, sorted)
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isRapportLike(value: unknown): value is Rapport {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'number' &&
    typeof value.updatedAt === 'number' &&
    isRecord(value.couverture) &&
    isRecord(value.entreprise) &&
    isRecord(value.sections)
  )
}

export async function loadRapports(): Promise<Rapport[]> {
  await migrateLegacyStorage()

  let stored: Rapport[] | undefined
  try {
    stored = await idbGet<Rapport[]>(RAPPORTS_KEY)
  } catch {
    stored = localStorage.getItem(RAPPORTS_KEY) === null ? undefined : legacyRead<Rapport[]>(RAPPORTS_KEY, [])
  }

  if (stored === undefined) {
    const seeded = [demoRapport()]
    await writeRapports(seeded)
    return seeded
  }

  return sortRapports(stored)
}

export async function getRapport(id: string): Promise<Rapport | undefined> {
  return (await readRapports()).find((r) => r.id === id)
}

export async function persistRapport(rapport: Rapport): Promise<void> {
  const list = await readRapports()
  const idx = list.findIndex((r) => r.id === rapport.id)
  if (idx >= 0) list[idx] = rapport
  else list.push(rapport)
  await writeRapports(list)
}

export async function removeRapport(id: string): Promise<void> {
  await writeRapports((await readRapports()).filter((r) => r.id !== id))
}

export async function createBackup(): Promise<BackupPayload> {
  return {
    app: 'rapport-stage',
    version: 1,
    exportedAt: new Date().toISOString(),
    rapports: await readRapports(),
  }
}

export async function importBackup(raw: string): Promise<{ imported: number; total: number }> {
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('Le fichier de sauvegarde est illisible.')
  }

  const rapports = Array.isArray(parsed)
    ? parsed
    : isRecord(parsed) && Array.isArray(parsed.rapports)
      ? parsed.rapports
      : null

  if (!rapports) {
    throw new Error("Ce fichier n'est pas une sauvegarde Rapport de stage valide.")
  }

  const validRapports = rapports.filter(isRapportLike)
  if (validRapports.length === 0) {
    throw new Error('Aucun rapport valide trouvé dans cette sauvegarde.')
  }

  const merged = new Map((await readRapports()).map((rapport) => [rapport.id, rapport]))
  for (const rapport of validRapports) {
    merged.set(rapport.id, { ...rapport, updatedAt: Date.now() })
  }

  const next = sortRapports([...merged.values()])
  await writeRapports(next)
  return { imported: validRapports.length, total: next.length }
}

export async function loadSettings(): Promise<Settings> {
  await migrateLegacyStorage()
  try {
    return (await idbGet<Settings>(SETTINGS_KEY)) ?? { geminiKey: '' }
  } catch {
    return legacyRead<Settings>(SETTINGS_KEY, { geminiKey: '' })
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  try {
    await idbSet(SETTINGS_KEY, settings)
  } catch {
    legacyWrite(SETTINGS_KEY, settings)
  }
}

export { createRapport }
