import { Capacitor, registerPlugin } from '@capacitor/core'

interface NativePrintPlugin {
  print(options: { title: string }): Promise<{ jobName: string }>
}

const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint')

export async function exportToPdf() {
  if ('fonts' in document) {
    await document.fonts.ready
  }

  await new Promise((resolve) => requestAnimationFrame(resolve))

  if (Capacitor.getPlatform() === 'android') {
    try {
      await NativePrint.print({ title: 'Rapport de stage' })
      return
    } catch (error) {
      console.warn('Native print unavailable, falling back to browser print.', error)
    }
  }

  window.print()
}
