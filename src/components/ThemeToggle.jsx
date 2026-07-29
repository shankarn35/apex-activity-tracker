import { Sun, Moon } from 'lucide-react'
import { useThemeStore } from '../store/themeStore'

export default function ThemeToggle() {
  const theme = useThemeStore((state) => state.theme)
  const toggleTheme = useThemeStore((state) => state.toggleTheme)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
    >
      {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
    </button>
  )
}
