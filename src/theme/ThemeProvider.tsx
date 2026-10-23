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
    const saved = localStorage.getItem(THEME_STORAGE_KEY)
    if (saved === 'Light' || saved === 'Dark') return saved
    if (window.matchMedia?.('(prefers-color-scheme: dark)').matches) return 'Dark'
    return defaultMode
  })

  const [paperColor, setPaperColorState] = useState<string>(() => {
    const saved = localStorage.getItem(PAPER_STORAGE_KEY)
    if (saved) return saved
    return mode === 'Dark' ? paperColors.black : paperColors.white
  })

  const isDark = mode === 'Dark'
  const palette = isDark ? darkPalette : lightPalette

  const setThemeMode = (newMode: ThemeMode) => {
    setModeState(newMode)
    localStorage.setItem(THEME_STORAGE_KEY, newMode)
    // Synchronize default paper color if user hadn't set a custom one
    if (newMode === 'Dark' && paperColor === paperColors.white) {
      setPaperColorState(paperColors.black)
    } else if (newMode === 'Light' && paperColor === paperColors.black) {
      setPaperColorState(paperColors.white)
    }
  }

  const toggleTheme = () => {
    setThemeMode(mode === 'Light' ? 'Dark' : 'Light')
  }

  const setPaperColor = (colorHex: string) => {
    setPaperColorState(colorHex)
    localStorage.setItem(PAPER_STORAGE_KEY, colorHex)
  }

  // Apply theme class and CSS variables to document.documentElement (Whiteboard pattern)
  useLayoutEffect(() => {
    const root = document.documentElement
    root.classList.remove('Light', 'Dark')
    root.classList.add(mode)

    const vars = getThemeCssVariables(mode)
    Object.entries(vars).forEach(([key, value]) => {
      root.style.setProperty(key, value)
    })

    // Override canvas background variable with current paperColor
    root.style.setProperty('--wb-canvas-background', paperColor)
    const isDarkPaper =
      paperColor.toLowerCase() === paperColors.black.toLowerCase() ||
      (mode === 'Dark' && paperColor.toLowerCase() === '#1f1f1f')
    root.style.setProperty('--wb-grid-dot-color', isDarkPaper ? gridColors.black : gridColors.default)
  }, [mode, paperColor])

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
