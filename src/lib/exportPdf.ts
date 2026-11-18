import { Capacitor, registerPlugin } from '@capacitor/core'
import type { jsPDF } from 'jspdf'

interface NativePrintPlugin {
  print(options: { title: string }): Promise<{ jobName: string }>
}

const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint')

/** The A4 sheets are 794×1123 CSS px on screen — the exact A4 aspect ratio. */
const A4_CSS_W = 794
const A4_CSS_H = 1123
const A4_MM_W = 210
const A4_MM_H = 297
const PDF_FILE = 'rapport-stage.pdf'

/**
 * iOS browsers other than Safari (Chrome, Firefox, Edge, Opera, DuckDuckGo)
 * all render with WebKit, but their print path mishandles this app's A4 preview:
 * it adds blank pages and shrinks/scales the sheets. Printing the document is
 * therefore not trustworthy there. For those browsers we build the PDF from the
 * on-screen A4 sheets instead, one captured sheet per PDF page.
 *
 * Safari and desktop browsers keep `window.print()` — it produces a smaller,
 * text-selectable PDF and already paginates correctly.
 */
export function needsClientSidePdf(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent || ''
  const iPadOS = navigator.platform === 'MacIntel' && (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints > 1
  const isIOS = /iPad|iPhone|iPod/.test(ua) || iPadOS
  if (!isIOS) return false
  return /(CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo|GSA)/.test(ua)
}

/**
 * Keep the captured sheet identical to the printed one: drop the editing-only
 * chrome that is `print:hidden` in the app, and drop empty editors so their
 * faint placeholder hints do not leak into the PDF.
 */
function keepPrintContent(node: HTMLElement): boolean {
  // html-to-image calls the filter for every cloned node, including text
  // nodes, which have no `matches()`.
  if (!node || typeof node.matches !== 'function') return true
  if (node.matches('[data-print-hide], header, aside, nav')) return false
  if (node.classList.contains('print:hidden')) return false
  if (node.matches('[contenteditable="true"]:empty')) return false
  return true
}

/** Share the generated file (native sheet on iPhone) or fall back to a download. */
async function deliverPdf(pdf: jsPDF): Promise<void> {
  const blob = pdf.output('blob')
  const file = new File([blob], PDF_FILE, { type: 'application/pdf' })

  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.canShare === 'function' &&
    navigator.canShare({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], title: 'Rapport de stage' })
      return
    } catch (error) {
      // The user cancelling the share sheet is a normal outcome — do not then
      // force a download. Any other failure (lost activation, unsupported)
      // falls through to the download below.
      if (error instanceof DOMException && error.name === 'AbortError') return
    }
  }
  pdf.save(PDF_FILE)
}

/** Capture every A4 sheet into its own PDF page, exactly as it appears on screen. */
async function buildClientPdf(): Promise<void> {
  // Loaded only on the browsers that actually need it — no cost for Safari,
  // desktop or Android users.
  const [{ getFontEmbedCSS, toCanvas }, { jsPDF }] = await Promise.all([
    import('html-to-image'),
    import('jspdf'),
  ])

  const pages = Array.from(document.querySelectorAll<HTMLElement>('.a4-page'))
  if (pages.length === 0) throw new Error('Aperçu A4 absent — export impossible.')

  // Fonts are embedded once and reused for every sheet (embedding is the slow
  // part). If embedding fails, carry on: the browser then uses fallback fonts
  // rather than losing the whole export.
  let fontEmbedCSS: string | undefined
  try {
    fontEmbedCSS = await getFontEmbedCSS(pages[0])
  } catch {
    // continue without precomputed font CSS
  }

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  pdf.setProperties({ title: 'Rapport de stage' })

  for (let i = 0; i < pages.length; i++) {
    const canvas = await toCanvas(pages[i], {
      width: A4_CSS_W,
      height: A4_CSS_H,
      pixelRatio: 2,
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipAutoScale: true,
      fontEmbedCSS,
      filter: keepPrintContent,
    })
    if (i > 0) pdf.addPage()
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.9), 'JPEG', 0, 0, A4_MM_W, A4_MM_H, undefined, 'FAST')
  }

  await deliverPdf(pdf)
}

/**
 * Export the current page as a PDF / print.
 *
 * - Android: native Capacitor print plugin (legitimately async).
 * - iOS Chrome/Firefox/Edge/...: client-side PDF built from the A4 sheets.
 * - Web / iOS Safari / desktop: `window.print()` synchronously, so Safari's
 *   transient user activation (gesture chain) stays alive.
 */
export function exportToPdf(): void | Promise<void> {
  if (Capacitor.getPlatform() === 'android') {
    return NativePrint.print({ title: 'Rapport de stage' })
      .then(() => { /* native print succeeded */ })
      .catch((error) => {
        console.warn('Native print unavailable, falling back to browser print.', error)
        if (typeof window !== 'undefined' && typeof window.print === 'function') {
          window.print()
        }
      })
  }

  if (needsClientSidePdf()) {
    return buildClientPdf().catch((error) => {
      // Last resort: still offer the browser print dialog if capture failed.
      console.warn('Client-side PDF generation failed, falling back to browser print.', error)
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print()
      }
    })
  }

  // Web / iOS Safari: must be synchronous — no await before this line.
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
  }
}
