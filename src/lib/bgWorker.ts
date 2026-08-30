import { removeBackground } from '@imgly/background-removal'

const ctx = self as any

type WorkerRequest = {
  id: number
  dataUrl: string
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, dataUrl } = e.data

  try {
    const publicPath = new URL('/bg-removal-data/dist/', self.location.origin).toString()
    const blob = await removeBackground(dataUrl, {
      publicPath,
      model: 'isnet_quint8',
      device: 'cpu',
      proxyToWorker: false,
    })
    const result = await blobToDataUrl(blob)
    ctx.postMessage({ id, ok: true, dataUrl: result })
  } catch (err) {
    ctx.postMessage({ id, ok: false, error: err instanceof Error ? err.message : String(err) })
  }
}
