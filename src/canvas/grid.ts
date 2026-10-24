/**
 * Open Whiteboard — Adaptive Background Grid Math & Pattern Specifications
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - BoardEditorComponent-852bcd1f (chunks/BoardEditorComponent-852bcd1f.*.js, lines 10-16)
 *     -> Enum values: CompactRule (0), Cubic (1), CubicDot (2), Dot (3), Graph (4),
 *        Neutral (5), SlantedCubic (6), Triangular (7), WideRule (8)
 *     -> Scale threshold: scale < 0.2 automatically switches to Neutral to avoid Moiré noise
 *     -> Grid dimensions: lt={16,16}, at={16,16}, rt={44,44}, Qe={13.5,13.5},
 *        wt={44,44}, gt={2*sqrt(128), 2*sqrt(128)}, bt={Ct, 16}, g={36,36}
 *   - Module 897381 (chunks/91464.*.js / BoardEditorComponent Dt.z)
 *     -> Hardware-accelerated translate formula:
 *        i = positionX / scale, C = positionY / scale
 *        o = (width ? i % width : 0) - width - i
 *        c = (height ? C % height : 0) - height - C
 *        translate3d(o px, c px, 0)
 *   - Module 922127 (chunks/6076.*.js)
 *     -> Grid dot contrast: default 'rgba(64, 64, 64, .188)', blackPaper 'rgba(255, 255, 255, .22)'
 */

import type { CameraMatrix } from './camera';

export type GridPatternType =
  | 'Dot'          // Default: dots spaced 16px
  | 'Cubic'        // Square grid (16px)
  | 'Graph'        // Engineering graph grid (36px with 2px minor divisions)
  | 'CubicDot'     // Square grid with center dots (44px)
  | 'CompactRule'  // Narrow ruled lines (13.5px)
  | 'WideRule'     // Wide ruled lines (44px)
  | 'SlantedCubic' // Isometric / diagonal diamond grid (22.63px)
  | 'Triangular'   // Triangular grid (9.24px x 16px)
  | 'Neutral';     // Blank / None

export interface GridDimension {
  width: number;
  height: number;
}

// Exact pattern cell dimensions from BoardEditorComponent-852bcd1f
const SLANTED_CUBIC_SIZE = 2 * Math.sqrt(128); // ~22.6274px
const TRIANGULAR_WIDTH = 16 / (2 * Math.sin(Math.PI / 3)); // ~9.2376px

export const GRID_DIMENSIONS: Record<GridPatternType, GridDimension> = {
  Dot: { width: 16, height: 16 },
  Cubic: { width: 16, height: 16 },
  Graph: { width: 36, height: 36 },
  CubicDot: { width: 44, height: 44 },
  CompactRule: { width: 13.5, height: 13.5 },
  WideRule: { width: 44, height: 44 },
  SlantedCubic: { width: SLANTED_CUBIC_SIZE, height: SLANTED_CUBIC_SIZE },
  Triangular: { width: TRIANGULAR_WIDTH, height: 16 },
  Neutral: { width: 0, height: 0 },
};

export interface GridThemeColors {
  background: string;
  base: string;
  accent: string;
}

export const GRID_THEME_COLORS: Record<'Light' | 'Dark', GridThemeColors> = {
  Light: {
    background: '#FFFFFF',
    base: '#D2D0CE',
    accent: '#B3B0AD',
  },
  Dark: {
    background: '#1E1E1E',
    base: '#3B3A39',
    accent: '#5D5A58',
  },
};

export function getGridColors(mode: 'Light' | 'Dark'): GridThemeColors {
  return GRID_THEME_COLORS[mode] || GRID_THEME_COLORS.Light;
}

export const MOIRE_SUPPRESSION_THRESHOLD = 0.2; // 20% zoom scale

/**
 * Returns effective pattern, suppressing grid to Neutral when scale < 0.2
 * (Module BoardEditorComponent line 15: y < .2 ? xt.y.EnumValues.Neutral : e)
 */
export function getEffectiveGridPattern(
  pattern: GridPatternType,
  scale: number
): GridPatternType {
  if (scale < MOIRE_SUPPRESSION_THRESHOLD) {
    return 'Neutral';
  }
  return pattern;
}

/**
 * Calculates hardware-accelerated grid SVG translation (Module 897381: Dt.z)
 * Keeps pattern perfectly aligned with viewport boundaries during infinite pan.
 */
export function calculateGridTransform(
  camera: CameraMatrix,
  dimensions: GridDimension,
  hardwareAccelerated: boolean = true
): string {
  const { width: a, height: n } = dimensions;
  if (!a || !n) {
    return hardwareAccelerated ? 'translate3d(0px, 0px, 0)' : 'translate(0px, 0px)';
  }

  const i = camera.positionX / camera.scale;
  const C = camera.positionY / camera.scale;

  // Remainder modulo wrapping formula from Whiteboard Module 897381
  const o = (a ? i % a : 0) - a - i;
  const c = (n ? C % n : 0) - n - C;

  return hardwareAccelerated
    ? `translate3d(${o.toFixed(2)}px, ${c.toFixed(2)}px, 0)`
    : `translate(${o.toFixed(2)}px, ${c.toFixed(2)}px)`;
}

/**
 * Calculates SVG element dimensions to completely cover viewport plus 2 margin tiles.
 * (Module BoardEditorComponent line 16: width: (b/y + 2*g.width), height: (C/y + 2*g.height))
 */
export function calculateGridDimensions(
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
  dimensions: GridDimension
): { width: number; height: number } {
  return {
    width: viewportWidth / scale + 2 * dimensions.width,
    height: viewportHeight / scale + 2 * dimensions.height,
  };
}
