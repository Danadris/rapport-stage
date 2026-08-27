export async function removeBg(dataUrl: string): Promise<string> {
  const { removeBackground } = await import('@imgly/background-removal')
  const blob = await removeBackground(dataUrl)
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
