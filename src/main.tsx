import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, loadTheme, THEME_PRESETS } from './lib/themes'
import { applyDark, loadDarkPref } from './lib/darkMode'
import { migrateV1toV3IfNeeded, ensureDemoReport } from './lib/storageV3'
if (import.meta.env.DEV) {
  void import('./lib/migrationTest').catch(() => {})
}

applyTheme(THEME_PRESETS.find(t => t.id === loadTheme()) ?? THEME_PRESETS[0])
applyDark(loadDarkPref())

// One-time V1 -> V3 migration (read-only on old DB, never modified). Then seed demo if empty.
migrateV1toV3IfNeeded()
  .then(() => ensureDemoReport())
  .catch((err) => console.error('[V3 Migration] Unexpected error:', err))

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
