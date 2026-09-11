import { loadImage, saveImage } from './storageV3'
import type { ImageReference, StoredImage } from '../types'

// Cache of active object URLs: imageId -> Object URL
const activeObjectUrls = new Map<string, { url: string; reportId: string }>()

/**
 * Converts a Base64 data URL to a Blob
 */
export async function dataUrlToBlob(dataUrl: string): Promise<{ blob: Blob; mimeType: string }> {
  const res = await fetch(dataUrl)
  const blob = await res.blob()
  return { blob, mimeType: blob.type || 'image/png' }
}

/**
 * Extracts width & height from a Blob or URL
 */
export function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => resolve({ width: 0, height: 0 })
    img.src = src
  })
}

/**
 * Stores a new image Blob in IndexedDB and creates an active Object URL for it.
 */
export async function storeImageBlob(
  reportId: string,
  blob: Blob,
  mimeType: string,
  imageId?: string,
): Promise<{ imageId: string; url: string; width: number; height: number }> {
  const finalImageId = imageId || `img_${crypto.randomUUID()}`
  const objectUrl = URL.createObjectURL(blob)
  const { width, height } = await getImageDimensions(objectUrl)

  const stored: StoredImage = {
    id: finalImageId,
    reportId,
    blob,
    mimeType: mimeType || blob.type || 'image/png',
    width,
    height,
    size: blob.size,
    createdAt: Date.now(),
  }

  await saveImage(stored)
  activeObjectUrls.set(finalImageId, { url: objectUrl, reportId })

  return {
    imageId: finalImageId,
    url: objectUrl,
    width,
    height,
  }
}

/**
 * Resolves an imageId to an active Object URL.
 * Reuses existing cached Object URL or creates a new one from IndexedDB Blob.
 */
export async function resolveImageUrl(reportId: string, imageId: string): Promise<string | undefined> {
  const cached = activeObjectUrls.get(imageId)
  if (cached) return cached.url

  const stored = await loadImage(imageId)
  if (!stored || !stored.blob) return undefined

  const url = URL.createObjectURL(stored.blob)
  activeObjectUrls.set(imageId, { url, reportId })
  return url
}

/**
 * Resolves all ImageReferences for a report into displayable images with object URLs.
 */
export async function resolveReportImages(
  reportId: string,
  imageRefsMap: Record<string, ImageReference[]>,
): Promise<Record<string, Array<ImageReference & { dataUrl: string }>>> {
  const result: Record<string, Array<ImageReference & { dataUrl: string }>> = {}

  for (const [sectionId, refs] of Object.entries(imageRefsMap)) {
    result[sectionId] = []
    for (const ref of refs) {
      let url = await resolveImageUrl(reportId, ref.imageId)
      if (!url) {
        url = ''
      }
      result[sectionId].push({
        ...ref,
        dataUrl: url,
      })
    }
  }

  return result
}

/**
 * Revokes all Object URLs associated with a report.
 * Strictly called on React component unmount to prevent memory leaks,
 * while ensuring URLs stay alive during editing and Undo/Redo operations.
 */
export function revokeReportUrls(reportId: string): void {
  for (const [imageId, entry] of activeObjectUrls.entries()) {
    if (entry.reportId === reportId) {
      URL.revokeObjectURL(entry.url)
      activeObjectUrls.delete(imageId)
    }
  }
}
