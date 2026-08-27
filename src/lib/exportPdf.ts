export async function exportToPdf() {
  if ('fonts' in document) {
    await document.fonts.ready
  }

  await new Promise((resolve) => requestAnimationFrame(resolve))
  window.print()
}
