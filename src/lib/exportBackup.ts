import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { createBackupV3 } from './backupV3'

export interface BackupExportResult {
  reportCount: number
}

/**
 * Single backup export: JSON stringify -> native Share (Android) or download (web).
 * Used by ParametresPage and useWorkspacePersistence so dialog text stays in the callers.
 */
export async function exportBackup(onStatus?: (msg: string) => void): Promise<BackupExportResult> {
  const payload = await createBackupV3()
  const json = JSON.stringify(payload, null, 2)
  const fileName = `rapport-stage-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
  const reportCount = payload.reports?.length ?? 0

  if (Capacitor.isNativePlatform()) {
    await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
    const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
    await Share.share({
      title: 'Rapport de stage — sauvegarde',
      files: [uri],
      dialogTitle: `Exporter ${reportCount} rapport(s)`,
    })
  } else {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  onStatus?.(`${reportCount} rapport(s) exporté(s).`)
  return { reportCount }
}
