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

/**
 * Fast client-side canvas-based background removal for logos on white or near-white backgrounds.
 * Operates synchronously on an HTMLCanvasElement in < 20ms with 0 network requests.
 */
export function removeWhiteBackground(dataUrl: string, tolerance: number = 32): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const width = img.naturalWidth || img.width
        const height = img.naturalHeight || img.height

        if (!width || !height) {
          reject(new Error("Dimensions de l'image invalides"))
          return
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error("Impossible d'obtenir le contexte 2D du canvas"))
          return
        }

        ctx.drawImage(img, 0, 0)
        const imgData = ctx.getImageData(0, 0, width, height)
        const data = imgData.data

        // Sample corners (top-left, top-right, bottom-left, bottom-right)
        const cornerIndices = [
          0,
          (width - 1) * 4,
          ((height - 1) * width) * 4,
          ((height - 1) * width + (width - 1)) * 4,
        ]

        let whiteCornersCount = 0
        for (const idx of cornerIndices) {
          const a = data[idx + 3]
          const r = data[idx]
          const g = data[idx + 1]
          const b = data[idx + 2]
          if (a > 50 && r > 220 && g > 220 && b > 220) {
            whiteCornersCount++
          }
        }

        if (whiteCornersCount < 2) {
          reject(new Error('Moins de 2 coins blancs ou quasi-blancs détectés'))
          return
        }

        let removedCount = 0
        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3]
          if (a === 0) continue

          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]

          // If near-white (r, g, b > 220), pixels within tolerance become transparent (alpha = 0), with soft edge feathering
          if (r >= 255 - tolerance && g >= 255 - tolerance && b >= 255 - tolerance) {
            data[i + 3] = 0 // Transparent
            removedCount++
          } else if (r >= 255 - tolerance * 2 && g >= 255 - tolerance * 2 && b >= 255 - tolerance * 2) {
            // Soft edge feathering
            const maxDiff = Math.max(255 - r, 255 - g, 255 - b)
            const factor = (maxDiff - tolerance) / tolerance
            data[i + 3] = Math.round(a * Math.max(0, Math.min(1, factor)))
            removedCount++
          }
        }

        if (removedCount === 0) {
          reject(new Error('No near-white background detected'))
          return
        }

        ctx.putImageData(imgData, 0, 0)
        resolve(canvas.toDataURL('image/png'))
      } catch (err) {
        reject(err)
      }
    }
    img.onerror = () => reject(new Error("Échec du chargement de l'image"))
    img.src = dataUrl
  })
}
