import React, { createContext, useContext, useEffect, useLayoutEffect, useState } from 'react'
import {
  type FluentPalette,
  type ThemeMode,
  darkPalette,
  getThemeCssVariables,
  lightPalette,
  paperColors,
  gridColors,
} from './tokens'

interface ThemeContextValue {
  mode: ThemeMode
  isDark: boolean
  palette: FluentPalette
  paperColor: string
  toggleTheme: () => void
  setThemeMode: (mode: ThemeMode) => void
  setPaperColor: (colorHex: string) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

const THEME_STORAGE_KEY = 'whiteboard:themeMode'
const PAPER_STORAGE_KEY = 'whiteboard:paperColor'

interface ThemeProviderProps {
  children: React.ReactNode
  defaultMode?: ThemeMode
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({
  children,
  defaultMode = 'Light',
}) => {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    // Purge legacy custom paper color overrides
    try {
      localStorage.removeItem(PAPER_STORAGE_KEY)
    } catch {
      // ignore
    }
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'Light' || saved === 'Dark') return saved
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'Dark'
    return defaultMode
  })

  const isDark = mode === 'Dark'
  const palette = isDark ? darkPalette : lightPalette
  // Canvas surface is strictly mode-driven: pure white in Light, deep slate in Dark
  const paperColor = isDark ? paperColors.black : paperColors.white

  const setThemeMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(THEME_STORAGE_KEY, newMode)
  }

  const toggleTheme = () => {
    setThemeMode(mode === 'Light' ? 'Dark' : 'Light')
  }

  // Deprecated manual paper color: kept as backward-compatible stub
  const setPaperColor = (_colorHex: string) => {
    // No-op: canvas surface is automatically mode-driven
  }

  // Apply theme class and CSS variables to document.documentElement
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove('Light', 'Dark')
    root.classList.add(mode)

    const vars = getThemeCssVariables(mode)
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    const gridBase = isDark ? gridColors.black : gridColors.default
    const gridAccent = isDark ? gridColors.blackAccent : gridColors.accent

    root.style.setProperty('--wb-canvas-background', paperColor)
    root.style.setProperty('--wb-grid-base-color', gridBase)
    root.style.setProperty('--wb-grid-accent-color', gridAccent)
    root.style.setProperty('--wb-grid-dot-color', gridBase)
  }, [mode, isDark, paperColor])

  // Listen to OS color scheme changes if user hasn't explicitly set a preference
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    if (!mq) return

    const listener = (e: MediaQueryListEvent) => {
      const saved = localStorage.getItem(THEME_STORAGE_KEY)
      if (!saved) {
        setThemeMode(e.matches ? 'Dark' : 'Light')
      }
    }

    mq.addEventListener?.('change', listener)
    return () => mq.removeEventListener?.('change', listener)
  }, [])

  return (
    <ThemeContext.Provider
      value={{
        mode,
        isDark,
        palette,
        paperColor,
        toggleTheme,
        setThemeMode,
        setPaperColor,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
