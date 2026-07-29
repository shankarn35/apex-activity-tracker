import { create } from 'zustand'

const STORAGE_KEY = 'theme'

function readStoredTheme() {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

export const useThemeStore = create((set, get) => ({
  theme: readStoredTheme(),
  toggleTheme: () => {
    const next = get().theme === 'dark' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, next)
    document.documentElement.setAttribute('data-theme', next)
    set({ theme: next })
  },
}))
