import { AlertCircle, CheckCircle2, Download, KeyRound, Moon, Monitor, Palette, Sun, Upload } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { useEffect, useRef, useState, type ChangeEvent, type ReactNode } from 'react'
import { cx } from '../lib/cx'
import { createBackup, importBackup, loadSettings, saveSettings } from '../lib/storage'
import { createBackupV3, importBackupV3 } from '../lib/backupV3'
import { applyTheme, loadTheme, saveTheme, THEME_PRESETS } from '../lib/themes'
import { loadDarkPref, saveDarkPref, type DarkPref } from '../lib/darkMode'
import { Badge, Button, Eyebrow, Field, Input } from '../components/ui'
import type { Settings } from '../types'

/** One titled block. The page is a grid of these, not a stack of tall cards. */
function SettingsCard({
  icon: Icon,
  title,
  badge,
  className,
  children,
}: {
  icon: typeof KeyRound
  title: string
  badge?: ReactNode
  /** Spans both columns when it needs the width. */
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cx('rounded-xl border border-line bg-paper p-4', className)}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Icon size={15} className="text-gold-deep" />
          <h2 className="text-[13px] font-semibold text-ink">{title}</h2>
        </div>
        {badge}
      </div>
      {children}
    </div>
  )
}

/**
 * Icon-only choice: sun / moon / monitor are the same everywhere, so the label
 * would spend width saying what the picture already says. Names stay in the
 * title and in aria-label for hover, screen readers and the touch ring.
 */
function IconChoice({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: Array<{ value: string; label: string; Icon: typeof Sun }>
  onChange: (value: DarkPref) => void
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">{label}</span>
      <div className="flex items-center gap-0.5 self-start rounded-lg border border-line bg-paper p-0.5">
        {options.map(({ value: optionValue, label: optionLabel, Icon }) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue as DarkPref)}
            title={optionLabel}
            aria-label={optionLabel}
            aria-pressed={optionValue === value}
            className={cx(
              'flex h-7 w-8 cursor-pointer items-center justify-center rounded-md transition-colors',
              optionValue === value ? 'bg-gold-soft text-gold-deep' : 'text-muted hover:text-ink',
            )}
          >
            <Icon size={14} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function ParametresPage() {
  const [settings, setSettings] = useState<Settings>({ geminiKey: '', geminiModel: '' })
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [themeId, setThemeId] = useState(() => loadTheme())
  const [darkPref, setDarkPref] = useState(() => loadDarkPref())
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
      let backupPayload: any = await createBackupV3()
      // If V3 has no reports yet, fall back to V1
      if (backupPayload.reports.length === 0) {
        backupPayload = await createBackup()
      }

      const json = JSON.stringify(backupPayload, null, 2)
      const fileName = `rapport-stage-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
      const reportCount = backupPayload.reports?.length ?? backupPayload.rapports?.length ?? 0

      if (Capacitor.isNativePlatform()) {
        // On a phone the plain browser download doesn't exist, so write the
        // backup to the app cache and open the native share sheet: the user
        // picks "Save to Files" (or Drive, WhatsApp, …) to store it anywhere.
        await Filesystem.writeFile({ path: fileName, data: json, directory: Directory.Cache, encoding: Encoding.UTF8 })
        const { uri } = await Filesystem.getUri({ path: fileName, directory: Directory.Cache })
        await Share.share({
          title: 'Rapport de stage — sauvegarde',
          files: [uri],
          dialogTitle: `Exporter ${reportCount} rapport(s)`,
        })
        setBackupStatus({
          tone: 'success',
          text: `${reportCount} rapport(s) exporté(s). Dans le menu de partage, choisissez « Enregistrer dans Fichiers » pour sélectionner l'emplacement.`,
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
        setBackupStatus({ tone: 'success', text: `${reportCount} rapport(s) exporté(s) avec succès.` })
      }
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
      const text = await file.text()
      let result: { imported: number; total: number }
      try {
        result = await importBackupV3(text)
      } catch {
        // Fallback to legacy V1 import
        result = await importBackup(text)
      }

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
    <div className="mx-auto max-w-3xl px-5 pb-16">
      <header className="pt-8 pb-5">
        <Eyebrow>Configuration</Eyebrow>
        <h1 className="mt-2 font-serif text-[22px] text-ink">Paramètres</h1>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <SettingsCard
          icon={KeyRound}
          title="Clé Gemini"
          badge={
            settings.geminiKey ? (
              <Badge>
                <CheckCircle2 size={11} />
                Configurée
              </Badge>
            ) : (
              <Badge tone="neutral">Optionnelle</Badge>
            )
          }
        >
          <div className="space-y-3">
            <Field label="Clé d'API" hint="Stockée uniquement sur cet appareil" htmlFor="gemini-key">
              <Input
                id="gemini-key"
                type="password"
                value={settings.geminiKey}
                placeholder="AIza…"
                disabled={settingsLoading || settingsSaving}
                onChange={(e) => {
                  setSettings({ ...settings, geminiKey: e.target.value })
                  setSaved(false)
                  setSettingsError(null)
                }}
              />
            </Field>

            <Field label="Modèle d'IA" hint="Vide = modèle par défaut" htmlFor="gemini-model">
              <Input
                id="gemini-model"
                type="text"
                value={settings.geminiModel || ''}
                placeholder="ex: gemini-3.5-flash-lite"
                disabled={settingsLoading || settingsSaving}
                onChange={(e) => {
                  setSettings({ ...settings, geminiModel: e.target.value })
                  setSaved(false)
                  setSettingsError(null)
                }}
              />
            </Field>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button variant="primary" size="sm" onClick={enregistrer} loading={settingsSaving} disabled={settingsLoading}>
              Enregistrer
            </Button>
            {settings.geminiKey && (
              <Button
                size="sm"
                variant="ghost"
                disabled={settingsLoading || settingsSaving}
                onClick={() => {
                  const cleared = { ...settings, geminiKey: '' }
                  setSettings(cleared)
                  void persistSettings(cleared)
                }}
              >
                Effacer
              </Button>
            )}
            {saved && (
              <span className="flex items-center gap-1.5 text-xs text-gold-deep">
                <CheckCircle2 size={13} />
                Enregistré
              </span>
            )}
            {settingsError && (
              <span className="flex items-center gap-1.5 text-xs text-danger">
                <AlertCircle size={13} />
                {settingsError}
              </span>
            )}
          </div>
        </SettingsCard>

        <SettingsCard
          icon={Download}
          title="Sauvegarde locale"
          badge={<Badge tone="neutral">JSON</Badge>}
        >
          <p className="mb-3 text-[11px] leading-relaxed text-muted">
            Rapports stockés sur cet appareil — exportez-les avant d'en changer. Sur mobile, le menu de partage
            s'ouvre : choisissez « Enregistrer dans Fichiers ».
          </p>
          <input
            ref={backupInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={importerSauvegarde}
          />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="primary" onClick={exporterSauvegarde} loading={exportingBackup}>
              <Download size={13} />
              Exporter
            </Button>
            <Button size="sm" onClick={() => backupInputRef.current?.click()} loading={importingBackup}>
              <Upload size={13} />
              Importer
            </Button>
          </div>
          {backupStatus && (
            <p
              className={cx(
                'mt-2.5 flex items-start gap-1.5 text-[11px] leading-relaxed',
                backupStatus.tone === 'success' ? 'text-gold-deep' : 'text-danger',
              )}
            >
              {backupStatus.tone === 'success' ? <CheckCircle2 size={13} className="mt-px shrink-0" /> : <AlertCircle size={13} className="mt-px shrink-0" />}
              {backupStatus.text}
            </p>
          )}
        </SettingsCard>

        <SettingsCard icon={Palette} title="Apparence" className="md:col-span-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:gap-8">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted">Thème</span>
              <div className="flex flex-wrap gap-1.5">
                {THEME_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => {
                      applyTheme(preset)
                      saveTheme(preset.id)
                      setThemeId(preset.id)
                    }}
                    aria-pressed={themeId === preset.id}
                    className={cx(
                      'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-[12px] transition-colors duration-150',
                      themeId === preset.id
                        ? 'border-gold-deep bg-gold-soft/50 font-medium text-ink shadow-sm'
                        : 'border-line bg-cream text-muted hover:border-line-strong hover:text-ink',
                    )}
                  >
                    <span
                      className={cx(
                        'inline-block h-3.5 w-3.5 rounded-full border-2',
                        themeId === preset.id ? 'border-gold-deep' : 'border-line-strong',
                      )}
                      style={{ backgroundColor: preset.swatch }}
                    />
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>
            <IconChoice
              label="Mode"
              value={darkPref}
              onChange={(next) => {
                saveDarkPref(next)
                setDarkPref(next)
              }}
              options={[
                { value: 'light', label: 'Clair', Icon: Sun },
                { value: 'dark', label: 'Sombre', Icon: Moon },
                { value: 'system', label: 'Système', Icon: Monitor },
              ]}
            />
          </div>
        </SettingsCard>
      </div>
    </div>
  )
}
