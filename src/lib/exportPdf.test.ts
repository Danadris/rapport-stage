import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { exportToPdf, needsClientSidePdf } from './exportPdf'

const mockToCanvas = vi.fn()
const mockGetFontEmbedCSS = vi.fn()
const mockPdf = {
  setProperties: vi.fn(),
  addPage: vi.fn(),
  addImage: vi.fn(),
  output: vi.fn(() => new Blob(['pdf'], { type: 'application/pdf' })),
  save: vi.fn(),
}

vi.mock('html-to-image', () => ({
  toCanvas: (...args: unknown[]) => mockToCanvas(...args),
  getFontEmbedCSS: (...args: unknown[]) => mockGetFontEmbedCSS(...args),
}))

vi.mock('jspdf', () => ({
  jsPDF: class {
    setProperties = mockPdf.setProperties
    addPage = mockPdf.addPage
    addImage = mockPdf.addImage
    output = mockPdf.output
    save = mockPdf.save
  },
}))

const IOS_CHROME_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/118.0.0.0 Mobile/15E148 Safari/604.1'
const IOS_SAFARI_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const DESKTOP_CHROME_UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36'

describe('exportToPdf', () => {
  const originalWindow = globalThis.window
  const originalDocument = globalThis.document

  beforeEach(() => {
    vi.clearAllMocks()
    const mockPrint = vi.fn()
    // @ts-expect-error test mock
    globalThis.window = { print: mockPrint }
    globalThis.document = {
      fonts: {
        status: 'loaded',
        ready: Promise.resolve() as unknown as Promise<FontFaceSet>,
      },
      querySelectorAll: vi.fn(() => [{}, {}]),
      querySelector: vi.fn(() => null),
    } as unknown as Document
    vi.stubGlobal('navigator', { userAgent: DESKTOP_CHROME_UA, platform: 'Linux x86_64' })
    mockToCanvas.mockResolvedValue({ toDataURL: () => 'data:image/jpeg;base64,AAAA' })
    mockGetFontEmbedCSS.mockResolvedValue('')
  })

  afterEach(() => {
    globalThis.window = originalWindow
    globalThis.document = originalDocument
    vi.unstubAllGlobals()
  })

  it('calls window.print synchronously (web/desktop path)', () => {
    // exportToPdf must call window.print() synchronously so Safari's transient
    // user-activation (gesture chain) is kept alive. Any await before it breaks it.
    const printSpy = vi.spyOn(globalThis.window, 'print')
    exportToPdf()
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('does not throw when window.print is unavailable', () => {
    // @ts-expect-error test mock
    globalThis.window = {}
    expect(() => exportToPdf()).not.toThrow()
  })

  it('detects iOS non-Safari browsers but not Safari or desktop', () => {
    vi.stubGlobal('navigator', { userAgent: IOS_CHROME_UA, platform: 'iPhone' })
    expect(needsClientSidePdf()).toBe(true)

    vi.stubGlobal('navigator', { userAgent: IOS_SAFARI_UA, platform: 'iPhone' })
    expect(needsClientSidePdf()).toBe(false)

    vi.stubGlobal('navigator', { userAgent: DESKTOP_CHROME_UA, platform: 'Linux x86_64' })
    expect(needsClientSidePdf()).toBe(false)
  })

  it('keeps window.print on iOS Safari', () => {
    vi.stubGlobal('navigator', { userAgent: IOS_SAFARI_UA, platform: 'iPhone' })
    const printSpy = vi.spyOn(globalThis.window, 'print')
    exportToPdf()
    expect(printSpy).toHaveBeenCalledTimes(1)
  })

  it('builds a one-page-per-sheet PDF on iOS Chrome instead of printing', async () => {
    vi.stubGlobal('navigator', { userAgent: IOS_CHROME_UA, platform: 'iPhone' })
    const printSpy = vi.spyOn(globalThis.window, 'print')

    const result = exportToPdf()
    expect(result).toBeInstanceOf(Promise)
    await result

    expect(printSpy).not.toHaveBeenCalled()
    expect(mockToCanvas).toHaveBeenCalledTimes(2)
    // two sheets -> one addPage for the second one
    expect(mockPdf.addPage).toHaveBeenCalledTimes(1)
    expect(mockPdf.addImage).toHaveBeenCalledTimes(2)
    expect(mockPdf.save).toHaveBeenCalledWith('rapport-stage.pdf')
  })
})
