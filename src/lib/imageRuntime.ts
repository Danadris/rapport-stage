// Cache of active object URLs: imageId -> Object URL
const activeObjectUrls = new Map<string, { url: string; reportId: string }>()

/**
 * Reads a picked image as a data URL. Rejects if the browser cannot read the
 * file; callers reset their input right after so the same file can be chosen
 * twice in a row.
 */
export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('unreadable image'))
    }
    reader.onerror = () => reject(reader.error ?? new Error('read failed'))
    reader.readAsDataURL(file)
  })
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
