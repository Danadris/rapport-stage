import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportToPdf } from './exportPdf'

describe('exportToPdf', () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  beforeEach(() => {
    vi.restoreAllMocks()
    const mockPrint = vi.fn()
    // @ts-expect-error test mock
    globalThis.window = {
      print: mockPrint,
    }
    globalThis.document = {
      fonts: {
        status: 'loaded',
        ready: Promise.resolve() as unknown as Promise<FontFaceSet>,
      },
    } as unknown as Document
  })

  afterEach(() => {
    globalThis.window = originalWindow
    globalThis.document = originalDocument
  })

  it('calls window.print when fonts are already loaded', async () => {
    const printSpy = vi.spyOn(globalThis.window, 'print')
    await exportToPdf()
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('waits for fonts when status is loading', async () => {
    let resolved = false
    const fontPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        resolved = true
        resolve()
      }, 50)
    })

    globalThis.document = {
      fonts: {
        status: 'loading',
        ready: fontPromise as unknown as Promise<FontFaceSet>,
      },
    } as unknown as Document

    const printSpy = vi.spyOn(globalThis.window, 'print')
    await exportToPdf()
    expect(resolved).toBe(true)
    expect(printSpy).toHaveBeenCalledTimes(1)
  })
})
