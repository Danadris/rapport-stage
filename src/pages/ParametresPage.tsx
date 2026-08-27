import { AlertCircle, CheckCircle2, Download, KeyRound, Monitor, Moon, Palette, Sun, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { createBackup, importBackup, loadSettings, saveSettings } from '../lib/storage'
import { applyTheme, loadTheme, saveTheme, THEME_PRESETS } from '../lib/themes'
import { loadDarkPref, saveDarkPref, type DarkPref } from '../lib/darkMode'
import { Badge, Button, Eyebrow, Field, Input } from '../components/ui'
import type { Settings } from '../types'

export function ParametresPage() {
  const [settings, setSettings] = useState<Settings>({ geminiKey: '' })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [themeId, setThemeId] = useState(() => loadTheme())
  const [darkPref, setDarkPref] = useState<DarkPref>(() => loadDarkPref())
  const [backupStatus, setBackupStatus] = useState<{ tone: 'success' | 'error'; text: string } | null>(null)
  const [exportingBackup, setExportingBackup] = useState(false)
  const [importingBackup, setImportingBackup] = useState(false)
  const backupInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false

    void loadSettings()
      .then((stored) => {
        if (!cancelled) setSettings(stored)
      })
      .catch(() => {
        if (!cancelled) setSettingsError('Lecture des paramètres impossible.')
      })
      .finally(() => {
        if (!cancelled) setSettingsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const persistSettings = async (nextSettings: Settings) => {
    setSettingsSaving(true)
    setSettingsError(null)
    try {
      await saveSettings(nextSettings)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2000)
    } catch {
      setSettingsError('Enregistrement des paramètres impossible.')
    } finally {
      setSettingsSaving(false)
    }
  }

  const enregistrer = () => {
    void persistSettings(settings)
  }

  const exporterSauvegarde = async () => {
    setExportingBackup(true)
    setBackupStatus(null)
    try {
      const backup = await createBackup()
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `rapport-stage-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
      setBackupStatus({ tone: 'success', text: `${backup.rapports.length} rapport(s) exporté(s).` })
    } catch {
      setBackupStatus({ tone: 'error', text: "L'export de la sauvegarde a échoué." })
    } finally {
      setExportingBackup(false)
    }
  }

  const importerSauvegarde = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    setImportingBackup(true)
    setBackupStatus(null)
    try {
      const result = await importBackup(await file.text())
      setBackupStatus({
        tone: 'success',
        text: `${result.imported} rapport(s) importé(s). Total local : ${result.total}.`,
      })
    } catch (err) {
      setBackupStatus({
        tone: 'error',
        text: err instanceof Error ? err.message : "L'import de la sauvegarde a échoué.",
      })
    } finally {
      setImportingBackup(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl px-5 pb-20">
      <header className="pt-12 pb-8">
        <Eyebrow>Configuration</Eyebrow>
        <h1 className="mt-3 font-serif text-[26px] text-ink">Paramètres</h1>
      </header>

      <section className="space-y-5">
        <div className="rounded-xl border border-line bg-paper p-5">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <KeyRound size={16} className="text-gold-deep" />
              <h2 className="text-sm font-semibold text-ink">Clé Gemini</h2>
            </div>
            {settings.geminiKey ? <Badge>Configurée</Badge> : <Badge tone="neutral">Non configurée</Badge>}
          </div>
          <Field
            label="Clé d'API"
            hint="Stockée uniquement sur cet appareil"
            htmlFor="gemini-key"
          >
            <Input
              id="gemini-key"
              type="password"
              value={settings.geminiKey}
              placeholder="AIza…"
              disabled={settingsLoading || settingsSaving}
              onChange={(e) => {
                setSettings({ geminiKey: e.target.value })
                setSaved(false)
                setSettingsError(null)
              }}
            />
          </Field>
          <p className="mt-2 text-xs leading-relaxed text-muted">
            Optionnelle. Sans clé, l'app utilise le mode local.
          </p>
          <div className="mt-4 flex items-center gap-3">
            <Button variant="primary" size="sm" onClick={enregistrer} loading={settingsSaving} disabled={settingsLoading}>
              Enregistrer
            </Button>
            {settings.geminiKey && (
              <Button
                size="sm"
                variant="ghost"
                disabled={settingsLoading || settingsSaving}
                onClick={() => {
                  const cleared = { geminiKey: '' }
                  setSettings(cleared)
                  void persistSettings(cleared)
                }}
              >
                Effacer
              </Button>
            )}
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-gold-deep">
                <CheckCircle2 size={14} />
                Enregistré
              </span>
            )}
            {settingsError && (
              <span className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle size={14} />
                {settingsError}
              </span>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-line bg-paper p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <Download size={16} className="text-gold-deep" />
              <h2 className="text-sm font-semibold text-ink">Sauvegarde locale</h2>
            </div>
            <Badge tone="neutral">JSON</Badge>
          </div>
          <p className="mb-4 text-xs leading-relaxed text-muted">
            Rapports stockés sur cet appareil. Exportez avant de changer d'appareil.
          </p>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importerSauvegarde}
          />
          <div className="flex flex-wrap gap-3">
            <Button size="sm" variant="primary" onClick={exporterSauvegarde} loading={exportingBackup}>
              <Download size={14} />
              Exporter mes rapports
            </Button>
            <Button size="sm" onClick={() => backupInputRef.current?.click()} loading={importingBackup}>
              <Upload size={14} />
              Importer une sauvegarde
            </Button>
          </div>
          {backupStatus && (
            <p
              className={`mt-3 flex items-center gap-1.5 text-xs ${
                backupStatus.tone === 'success' ? 'text-gold-deep' : 'text-danger'
              }`}
            >
              {backupStatus.tone === 'success' ? <CheckCircle2 size={14} /> : <AlertCircle size={14} />}
              {backupStatus.text}
            </p>
          )}
        </div>

        <div className="rounded-xl border border-line bg-paper p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Palette size={16} className="text-gold-deep" />
            <h2 className="text-sm font-semibold text-ink">Couleur</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {THEME_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => {
                  applyTheme(preset)
                  saveTheme(preset.id)
                  setThemeId(preset.id)
                }}
                className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] transition-all duration-150 ${
                  themeId === preset.id
                    ? 'border-gold-deep bg-gold-soft/50 font-medium text-ink shadow-sm'
                    : 'border-line bg-cream text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full border-2 ${
                    themeId === preset.id ? 'border-gold-deep' : 'border-line-strong'
                  }`}
                  style={{ backgroundColor: preset.swatch }}
                />
                {preset.name}
              </button>
            ))}
          </div>
        </div>
        <div className="rounded-xl border border-line bg-paper p-5">
          <div className="mb-4 flex items-center gap-2.5">
            <Palette size={16} className="text-gold-deep" />
            <h2 className="text-sm font-semibold text-ink">Apparence</h2>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              { id: 'light', label: 'Clair', Icon: Sun },
              { id: 'dark', label: 'Sombre', Icon: Moon },
              { id: 'system', label: 'Système', Icon: Monitor },
            ].map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  saveDarkPref(id as DarkPref)
                  setDarkPref(id as DarkPref)
                }}
                className={`flex items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[13px] transition-all duration-150 ${
                  darkPref === id
                    ? 'border-gold-deep bg-gold-soft/50 font-medium text-ink shadow-sm'
                    : 'border-line bg-cream text-muted hover:border-line-strong hover:text-ink'
                }`}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
