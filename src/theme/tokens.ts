/**
 * Open Whiteboard — Theme Tokens & Color Palette
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 260008 (blueboard/chunks/91115.5e248032ced3f17ba330.js:102-104) -> Fluent UI Light/Dark Palettes
 *   - Module 922127 (blueboard/chunks/6076.641ada7b35e65a4417d4.js:21-24) -> Canvas Paper Colors & Dot Grid
 *   - Module 944277 (blueboard/chunks/82132.32e681f6a6b906015540.js) -> Fluent UI Elevation Shadows
 *   - Module 79604 / 818015 (blueboard/chunks/79604.d65de851cdc6a1295bd5.js) -> Fluent UI v9 CSS Variable Mapping
 *   - Module 50285 (blueboard/chunks/50285.722940917ee0ff2c2e7e.js) -> Acrylic Backdrop & Floating Ribbon
 */

export type ThemeMode = 'Light' | 'Dark'

export interface FluentPalette {
  themeDarker: string
  themeDark: string
  themeDarkAlt: string
  themePrimary: string
  themeSecondary: string
  themeTertiary: string
  themeLight: string
  themeLighter: string
  neutralDark: string
  neutralPrimary: string
  neutralPrimaryAlt: string
  neutralSecondary: string
  neutralSecondaryAlt: string
  neutralTertiary: string
  neutralTertiaryAlt: string
  neutralQuaternary: string
  neutralQuaternaryAlt: string
  neutralLight: string
  neutralLighter: string
  neutralLighterAlt: string
  black: string
  white: string
}

export interface ShadowTokens {
  shadow2: string
  shadow4: string
  shadow8: string
  shadow16: string
  shadow28: string
  shadow64: string
}

export interface PaperColor {
  name: string
  color: string
  label: string
}

// 1. Fluent UI Light Mode Palette (Module 260008: vp / l)
export const lightPalette: FluentPalette = {
  themeDarker: '#0e336a',
  themeDark: '#13458f',
  themeDarkAlt: '#1651aa',
  themePrimary: '#185abd', // Whiteboard signature blue
  themeSecondary: '#2e6ac5',
  themeTertiary: '#6794d7',
  themeLight: '#aec6eb',
  themeLighter: '#d2e0f4',
  neutralDark: '#252423',
  neutralPrimary: '#323130',
  neutralPrimaryAlt: '#605E5C',
  neutralSecondary: '#797775',
  neutralSecondaryAlt: '#8A8886',
  neutralTertiary: '#B3B0AD',
  neutralTertiaryAlt: '#BEBBB8',
  neutralQuaternary: '#C8C6C4',
  neutralQuaternaryAlt: '#D2D0CE',
  neutralLight: '#E1DFDD',
  neutralLighter: '#EDEBE9',
  neutralLighterAlt: '#F3F2F1',
  black: '#000000',
  white: '#FFFFFF',
}

// 2. Fluent UI Dark Mode Palette (Module 260008: sE / d)
export const darkPalette: FluentPalette = {
  themeDarker: '#82ABF1',
  themeDark: '#598FEC',
  themeDarkAlt: '#3D7CE8',
  themePrimary: '#296FE6', // Whiteboard dark mode vibrant blue
  themeSecondary: '#2461CA',
  themeTertiary: '#19428A',
  themeLight: '#0C2145',
  themeLighter: '#071225',
  neutralDark: '#F3F2F1',
  neutralPrimary: '#D2D0CE',
  neutralPrimaryAlt: '#B3B0AD',
  neutralSecondary: '#979593',
  neutralSecondaryAlt: '#797775',
  neutralTertiary: '#605E5C',
  neutralTertiaryAlt: '#484644',
  neutralQuaternary: '#3B3A39',
  neutralQuaternaryAlt: '#292827',
  neutralLight: '#323130',
  neutralLighter: '#1B1A19',
  neutralLighterAlt: '#252423',
  black: '#FFFFFF',
  white: '#000000',
}

// 3. Exact Paper Background Colors (Module 922127: eZ)
export const paperColors: Record<string, string> = {
  white: '#FFFFFF',
  yellow: '#FEEE9E',
  blue: '#CCECF7',
  orange: '#FDE0CF',
  pink: '#FED6D6',
  purple: '#E4D1EE',
  black: '#1F1F1F', // Dark mode default canvas surface
  gray10: '#F0F0F0',
  gray15: '#DDDDDD',
  gray20: '#E1E1E1',
  green: '#E5F3CC',
}

// 4. Dot Grid Colors (Module 922127: hm)
export const gridColors = {
  default: 'rgba(64, 64, 64, 0.188)', // Light paper grid dot
  black: 'rgba(255, 255, 255, 0.22)',  // Dark paper grid dot (or rgba(64,64,64,0.376))
}

// 5. Elevation Shadows Generator (Module 944277)
export function createElevationShadows(ambient: string, key: string): ShadowTokens {
  return {
    shadow2: `0 0 2px ${ambient}, 0 1px 2px ${key}`,
    shadow4: `0 0 2px ${ambient}, 0 2px 4px ${key}`,
    shadow8: `0 0 2px ${ambient}, 0 4px 8px ${key}`,
    shadow16: `0 0 2px ${ambient}, 0 8px 16px ${key}`,
    shadow28: `0 0 8px ${ambient}, 0 14px 28px ${key}`,
    shadow64: `0 0 8px ${ambient}, 0 32px 64px ${key}`,
  }
}

export const lightShadows: ShadowTokens = createElevationShadows('rgba(0,0,0,0.12)', 'rgba(0,0,0,0.14)')
export const darkShadows: ShadowTokens = createElevationShadows('rgba(0,0,0,0.24)', 'rgba(0,0,0,0.28)')

// 6. Acrylic & Floating Ribbon Glass Tokens (Module 50285 / Module 33391)
export const acrylicTokens = {
  light: {
    background: 'rgba(255, 255, 255, 0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(0, 0, 0, 0.08)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12), 0 1px 3px rgba(0, 0, 0, 0.08)',
  },
  dark: {
    background: 'rgba(37, 36, 35, 0.85)',
    backdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.12)',
    boxShadow: '0 4px 16px rgba(0, 0, 0, 0.35), 0 1px 3px rgba(0, 0, 0, 0.2)',
  },
}

// 7. Typography & Layout Constants
export const typography = {
  fontFamily: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`,
  fontSizeBase: '14px',
  fontSizeSmall: '12px',
  fontSizeTitle: '16px',
  fontWeightRegular: 400,
  fontWeightSemibold: 600,
}

export const layoutTokens = {
  ribbonBorderRadius: '12px',
  ribbonButtonRadius: '8px',
  cardBorderRadius: '8px',
  hudPillRadius: '20px',
  headerHeight: '48px',
  ribbonHeight: '52px',
}

// 8. Generate CSS Variable Dictionary for a given ThemeMode
export function getThemeCssVariables(mode: ThemeMode) {
  const isDark = mode === 'Dark'
  const palette = isDark ? darkPalette : lightPalette
  const shadows = isDark ? darkShadows : lightShadows
  const acrylic = isDark ? acrylicTokens.dark : acrylicTokens.light
  const canvasBg = isDark ? paperColors.black : paperColors.white
  const gridDot = isDark ? gridColors.black : gridColors.default

  return {
    // Canvas Surface
    '--wb-canvas-background': canvasBg,
    '--wb-grid-dot-color': gridDot,

    // Fluent UI Core Palette
    '--themePrimary': palette.themePrimary,
    '--themeDark': palette.themeDark,
    '--themeDarker': palette.themeDarker,
    '--themeLight': palette.themeLight,
    '--themeLighter': palette.themeLighter,
    '--neutralPrimary': palette.neutralPrimary,
    '--neutralSecondary': palette.neutralSecondary,
    '--neutralTertiary': palette.neutralTertiary,
    '--neutralLight': palette.neutralLight,
    '--neutralLighter': palette.neutralLighter,
    '--neutralLighterAlt': palette.neutralLighterAlt,
    '--white': palette.white,
    '--black': palette.black,

    // Fluent UI v9 Neutral tokens (Module 818015)
    '--colorNeutralBackground1': isDark ? '#252423' : '#FFFFFF',
    '--colorNeutralBackground1Hover': isDark ? '#292827' : '#F3F2F1',
    '--colorNeutralBackground1Pressed': isDark ? '#1F1E1D' : '#EDEBE9',
    '--colorNeutralBackground2': isDark ? '#1F1E1D' : '#F3F2F1',
    '--colorNeutralForeground1': isDark ? '#F3F2F1' : '#242424',
    '--colorNeutralForeground2': isDark ? '#D2D0CE' : '#616161',
    '--colorNeutralForeground3': isDark ? '#979593' : '#707070',
    '--colorNeutralForegroundDisabled': isDark ? '#605E5C' : '#A19F9D',
    '--colorNeutralStroke1': isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
    '--colorNeutralStroke1Hover': isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.16)',
    '--colorBrandBackground': palette.themePrimary,
    '--colorBrandForeground': '#FFFFFF',

    // Elevation Shadows (Module 944277)
    '--shadow2': shadows.shadow2,
    '--shadow4': shadows.shadow4,
    '--shadow8': shadows.shadow8,
    '--shadow16': shadows.shadow16,
    '--shadow28': shadows.shadow28,
    '--shadow64': shadows.shadow64,

    // Acrylic Glass Tokens
    '--wb-acrylic-background': acrylic.background,
    '--wb-acrylic-backdrop-filter': acrylic.backdropFilter,
    '--wb-acrylic-border': acrylic.border,
    '--wb-acrylic-shadow': acrylic.boxShadow,
    '--wb-menu-background': isDark ? '#252423' : '#FFFFFF',
    '--wb-menu-hover': isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',

    // Layout
    '--wb-ribbon-border-radius': layoutTokens.ribbonBorderRadius,
    '--wb-ribbon-button-radius': layoutTokens.ribbonButtonRadius,
    '--wb-card-border-radius': layoutTokens.cardBorderRadius,
    '--wb-hud-pill-radius': layoutTokens.hudPillRadius,
  }
}
