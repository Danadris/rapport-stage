import { Capacitor, registerPlugin } from '@capacitor/core'

interface NativePrintPlugin {
  print(options: { title: string }): Promise<{ jobName: string }>
}

const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint')

export async function exportToPdf() {
  if (typeof document !== 'undefined' && 'fonts' in document) {
    if (document.fonts.status !== 'loaded') {
      try {
        await document.fonts.ready
      } catch {
        // Continue even if font loading fails
      }
    }
  }

  if (Capacitor.getPlatform() === 'android') {
    try {
      await NativePrint.print({ title: 'Rapport de stage' })
      return
    } catch (error) {
      console.warn('Native print unavailable, falling back to browser print.', error)
    }
  }

  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
  }
}
