import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, loadTheme, THEME_PRESETS } from './lib/themes'
import { applyDark, loadDarkPref } from './lib/darkMode'
import { migrateV1toV3IfNeeded } from './lib/storageV3'
import './lib/migrationTest'

applyTheme(THEME_PRESETS.find(t => t.id === loadTheme()) ?? THEME_PRESETS[0])
applyDark(loadDarkPref())

// Kick off V1 → V3.1 migration in the background.
// This is non-blocking: the app renders immediately on the old V1 data layer,
// while the migration silently populates the new V3 stores in IndexedDB.
// The old storage.ts is NOT modified — both systems coexist safely.
migrateV1toV3IfNeeded().catch((err) =>
  console.error('[V3 Migration] Unexpected error:', err),
)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
