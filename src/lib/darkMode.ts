const KEY = 'rs:dark-mode:v1'
export type DarkPref = 'light' | 'dark' | 'system'

export function loadDarkPref(): DarkPref {
  const saved = localStorage.getItem(KEY)
  return saved === 'dark' || saved === 'system' || saved === 'light' ? saved : 'light'
}

export function saveDarkPref(pref: DarkPref) {
  localStorage.setItem(KEY, pref)
  applyDark(pref)
}

export function applyDark(pref: DarkPref) {
  const isDark = pref === 'dark' || (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('light', pref === 'light')
  document.documentElement.classList.toggle('dark', isDark)
}
