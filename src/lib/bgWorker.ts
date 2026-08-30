import { removeBackground } from '@imgly/background-removal'

const ctx = self as any

type WorkerRequest = {
  id: number
  source: string
  publicPath?: string
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

async function assertSelfHostedAssets(publicPath: string) {
  const response = await fetch(new URL('resources.json', publicPath))
  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok || contentType.includes('text/html')) {
    throw new Error('Assets de détourage manquants. Lancez bash scripts/fetch-bg-assets.sh puis reconstruisez/synchronisez Android.')
  }
}

async function loadImageSource(source: string): Promise<Blob> {
  const response = await fetch(source)
  const contentType = response.headers.get('content-type') ?? ''

  if (!response.ok || contentType.includes('text/html')) {
    throw new Error("L'image à détourer est introuvable ou n'est pas servie comme image.")
  }

  return response.blob()
}

ctx.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  const { id, source, publicPath } = e.data

  try {
    if (publicPath) await assertSelfHostedAssets(publicPath)
    const image = await loadImageSource(source)
    const blob = await removeBackground(image, {
      ...(publicPath ? { publicPath } : {}),
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
