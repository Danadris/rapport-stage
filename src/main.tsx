import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { applyTheme, loadTheme, THEME_PRESETS } from './lib/themes'
import { applyDark, loadDarkPref } from './lib/darkMode'

applyTheme(THEME_PRESETS.find(t => t.id === loadTheme()) ?? THEME_PRESETS[0])
applyDark(loadDarkPref())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
