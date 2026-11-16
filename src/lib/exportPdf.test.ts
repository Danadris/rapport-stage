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

  it('calls window.print synchronously (web/iOS path)', () => {
    // exportToPdf must call window.print() synchronously on the web/iOS path
    // so that iOS Safari's transient user-activation (gesture chain) is kept
    // alive. Any await before window.print() breaks the gesture on iOS.
    const printSpy = vi.spyOn(globalThis.window, 'print')
    exportToPdf()
    // print must have been called in the same synchronous turn — no await needed
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('does not throw when window.print is unavailable', () => {
    // @ts-expect-error test mock
    globalThis.window = {}
    expect(() => exportToPdf()).not.toThrow()
  })
})
