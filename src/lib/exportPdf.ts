import { Capacitor, registerPlugin } from '@capacitor/core'

interface NativePrintPlugin {
  print(options: { title: string }): Promise<{ jobName: string }>
}

const NativePrint = registerPlugin<NativePrintPlugin>('NativePrint')

/**
 * Export the current page as a PDF / print.
 *
 * iOS Safari has two critical constraints:
 *  1. `window.print()` must be called **synchronously** within a user-gesture
 *     handler — any `await` before it breaks the transient activation and
 *     Safari will silently ignore or block the print dialog.
 *  2. Fonts are preloaded by the app shell, so we do not need to await them
 *     here; waiting only costs the gesture context on iOS.
 *
 * Android uses a native Capacitor plugin (which is legitimately async).
 * All other platforms (web, iOS Safari, desktop) call `window.print()` directly.
 */
export function exportToPdf(): void | Promise<void> {
  // Android: native print dialog via Capacitor plugin (async is fine here
  // because Capacitor wraps a native call, not Safari's transient activation).
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

  // Web / iOS Safari: must be synchronous — no await before this line.
  if (typeof window !== 'undefined' && typeof window.print === 'function') {
    window.print()
  }
}
