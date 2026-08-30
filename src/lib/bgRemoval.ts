import { Capacitor } from '@capacitor/core'

let worker: Worker | null = null
let nextRequestId = 1

type WorkerRequest = {
  id: number
  source: string
  publicPath?: string
}

type WorkerResponse = {
  id: number
  ok: boolean
  dataUrl?: string
  error?: string
}

const pending = new Map<number, {
  resolve: (dataUrl: string) => void
  reject: (error: Error) => void
}>()

const BG_REMOVAL_UNSUPPORTED_MESSAGE =
  "Ce mode de retrait du fond nécessite une version récente d'Android System WebView. Mettez-la à jour depuis le Play Store, ou utilisez un appareil plus récent."

function isBgRemovalSupported(): boolean {
  return typeof WebAssembly !== 'undefined' && typeof Worker !== 'undefined'
}

export function formatBgRemovalError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  return `Échec du détourage : ${message}`
}

function handleWorkerMessage(e: MessageEvent<WorkerResponse>) {
  const data = e.data
  const request = pending.get(data.id)
  if (!request) return

  pending.delete(data.id)
  if (data.ok && data.dataUrl) {
    request.resolve(data.dataUrl)
  } else {
    request.reject(new Error(data.error || 'Unknown error'))
  }
}

function handleWorkerError(e: ErrorEvent) {
  const error = new Error(e.message || 'Worker error')
  for (const request of pending.values()) {
    request.reject(error)
  }
  pending.clear()
  worker?.terminate()
  worker = null
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL('./bgWorker.ts', import.meta.url), { type: 'module' })
    worker.addEventListener('message', handleWorkerMessage)
    worker.addEventListener('error', handleWorkerError)
  }
  return worker
}

function getBgRemovalPublicPath(): string | undefined {
  if (Capacitor.getPlatform() !== 'android') return undefined
  return new URL('/bg-removal-data/dist/', window.location.origin).toString()
}

export function removeBg(dataUrl: string): Promise<string> {
  if (!isBgRemovalSupported()) {
    return Promise.reject(new Error(BG_REMOVAL_UNSUPPORTED_MESSAGE))
  }

  return new Promise((resolve, reject) => {
    const id = nextRequestId++
    pending.set(id, { resolve, reject })

    try {
      getWorker().postMessage({
        id,
        source: dataUrl,
        publicPath: getBgRemovalPublicPath(),
      } satisfies WorkerRequest)
    } catch (error) {
      pending.delete(id)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}
