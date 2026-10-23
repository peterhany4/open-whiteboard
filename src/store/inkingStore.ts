/**
 * Microsoft Whiteboard — Inking State Store
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 900158 (blueboard/chunks/40049.*.js) -> Pen enum (Pen1..Pen5, Highlighter, Eraser, Laser, Lasso, Ruler)
 *   - Module 804397 (blueboard/chunks/40049.*.js) -> Action creators (CHANGE_PEN, CHANGE_PEN_THICKNESS, etc.)
 *   - Module 786285 (blueboard/chunks/40049.*.js) -> Initial pen settings (fills, thicknesses, recent colors)
 *   - Module 4101 (blueboard/chunks/40049.*.js) -> Raw RGB color objects & Galaxy effect
 *   - Module 434554 (blueboard/chunks/8854.*.js) -> 15 Color swatches, thickness arrays [1,2,4,6,8,12], arrow modes
 *   - Module 133066 (blueboard/chunks/8854.*.js) -> Rainbow & Galaxy effect definitions
 *   - Module 578889 (blueboard/chunks/53113.*.js) -> State model & selectors
 */

import { useSyncExternalStore } from 'react';

export type PenSlot = 'Pen1' | 'Pen2' | 'Pen3' | 'Pen4' | 'Pen5' | 'PenEffect';
export type InkingTool = 'Select' | 'Hand' | PenSlot | 'Highlighter' | 'Laser' | 'Eraser' | 'Ruler' | 'FreeformLasso';
export type PenArrowMode = 'NoArrow' | 'InkSingleArrow' | 'InkDoubleArrow';
export type EraserMode = 'PointEraser' | 'StrokeEraser';

export interface ColorSwatch {
  name: string;
  color: string;
  effect?: 'rainbow' | 'galaxy';
  highContrastColor?: string;
}

// 1. Exact 15 Whiteboard Pen Palette Swatches (Module 434554: S)
export const PEN_COLOR_SWATCHES: ColorSwatch[] = [
  { name: 'Black', color: '#1F1F1F', highContrastColor: '#FFFFFF' },
  { name: 'Yellow', color: '#FED430' },
  { name: 'Light Orange', color: '#FBAE17' },
  { name: 'Orange', color: '#F36323' },
  { name: 'Red', color: '#E71224' },
  { name: 'Dark Red', color: '#C10051' },
  { name: 'Magenta', color: '#CF1278' },
  { name: 'Dark Purple', color: '#5B318D' },
  { name: 'Purple', color: '#914BB8' },
  { name: 'Light Blue', color: '#3ECCFD' },
  { name: 'Blue', color: '#0069BF' },
  { name: 'Light Green', color: '#7EC400' },
  { name: 'Green', color: '#02A556' },
  { name: 'Light Gray', color: '#EBEBEB' },
  { name: 'Gray', color: '#B6B6B6' },
];

// Special Effect Swatches (Module 434554: P, Module 133066)
export const EFFECT_SWATCHES: ColorSwatch[] = [
  { name: 'Rainbow', color: '#FF4E00', effect: 'rainbow' },
  { name: 'Galaxy', color: '#AE198D', effect: 'galaxy' },
];

// 2. Exact 15 Highlighter Palette Swatches (Module 434554: k)
export const HIGHLIGHTER_COLOR_SWATCHES: ColorSwatch[] = [
  { name: 'Yellow', color: '#FCFC00' },
  { name: 'Orange', color: '#FD842D' },
  { name: 'Red', color: '#EB1750' },
  { name: 'Pink', color: '#FD4CFC' },
  { name: 'Light Green', color: '#28F62D' },
  { name: 'Green', color: '#00B44B' },
  { name: 'Faded Green', color: '#A2D469' },
  { name: 'Purple', color: '#D7AFFD' },
  { name: 'Light Blue', color: '#2CFCFE' },
  { name: 'Blue', color: '#0E6AAC' },
  { name: 'Faded Blue', color: '#AAD8FD' },
  { name: 'Faded Red', color: '#FDACD4' },
  { name: 'Light Gray', color: '#F5F5F5' },
  { name: 'Gray', color: '#959595' },
  { name: 'Black', color: '#1F1F1F' },
];

// 3. Exact 6 Laser Pointer Colors (Module 434554: v)
export const LASER_COLOR_SWATCHES: ColorSwatch[] = [
  { name: 'Red', color: '#E3182D' },
  { name: 'Pink', color: '#FD4CFC' },
  { name: 'Light Orange', color: '#FBAE17' },
  { name: 'Yellow', color: '#FFFC00' },
  { name: 'Light Green', color: '#28F62D' },
  { name: 'Light Blue', color: '#2CFCFE' },
];

// 4. Thickness presets (Module 434554: u & p)
export const PEN_THICKNESSES = [1, 2, 4, 6, 8, 12] as const;
export const HIGHLIGHTER_THICKNESSES = [8, 12, 16, 24, 28, 32] as const;
export const LASER_THICKNESSES = [2, 4, 6, 8] as const;

export interface PenSlotState {
  color: string;
  thickness: number;
  arrowMode: PenArrowMode;
  effect?: 'rainbow' | 'galaxy';
  recentColors: string[];
}

export interface InkingState {
  selectedTool: InkingTool;
  lastSelectedPenSlot: PenSlot;
  pens: Record<PenSlot, PenSlotState>;
  highlighter: {
    color: string;
    thickness: number;
    opacity: number;
  };
  laser: {
    color: string;
    thickness: number;
  };
  eraser: {
    mode: EraserMode;
  };
  isRulerActive: boolean;
  activePopover: InkingTool | null;
  clearCanvasSignal: number;
}

// Default initial state according to Module 786285 / 578889: Select Tool is default on board entry!
const initialInkingState: InkingState = {
  selectedTool: 'Select',
  lastSelectedPenSlot: 'Pen1',
  pens: {
    Pen1: {
      color: '#1F1F1F',
      thickness: 2,
      arrowMode: 'NoArrow',
      recentColors: ['#1F1F1F', '#E71224', '#02A556', '#0069BF'],
    },
    Pen2: {
      color: '#E71224',
      thickness: 2,
      arrowMode: 'NoArrow',
      recentColors: ['#E71224', '#1F1F1F', '#02A556', '#0069BF'],
    },
    Pen3: {
      color: '#02A556',
      thickness: 2,
      arrowMode: 'NoArrow',
      recentColors: ['#02A556', '#1F1F1F', '#E71224', '#0069BF'],
    },
    Pen4: {
      color: '#0069BF',
      thickness: 2,
      arrowMode: 'NoArrow',
      recentColors: ['#0069BF', '#1F1F1F', '#E71224', '#02A556'],
    },
    Pen5: {
      color: '#00B44B',
      thickness: 2,
      arrowMode: 'NoArrow',
      recentColors: ['#00B44B', '#1F1F1F', '#E71224', '#0069BF'],
    },
    PenEffect: {
      color: '#AE198D',
      thickness: 2,
      arrowMode: 'NoArrow',
      effect: 'galaxy',
      recentColors: ['#AE198D', '#FF4E00', '#1F1F1F', '#0069BF'],
    },
  },
  highlighter: {
    color: '#FCFC00',
    thickness: 16,
    opacity: 0.5,
  },
  laser: {
    color: '#E3182D',
    thickness: 4,
  },
  eraser: {
    mode: 'PointEraser',
  },
  isRulerActive: false,
  activePopover: null,
  clearCanvasSignal: 0,
};

let currentState = initialInkingState;
const listeners = new Set<() => void>();

function emitChange() {
  for (const listener of listeners) {
    listener();
  }
}

export const inkingStore = {
  getState: () => currentState,

  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  selectTool: (tool: InkingTool) => {
    if (tool === 'Ruler') {
      // Ruler is a toggle widget, does not change the active drawing tool
      currentState = {
        ...currentState,
        isRulerActive: !currentState.isRulerActive,
      };
      emitChange();
      return;
    }

    const isPenSlot = tool.startsWith('Pen');
    currentState = {
      ...currentState,
      selectedTool: tool,
      lastSelectedPenSlot: isPenSlot ? (tool as PenSlot) : currentState.lastSelectedPenSlot,
    };
    emitChange();
  },

  selectSelectTool: () => {
    inkingStore.selectTool('Select');
  },

  selectHandTool: () => {
    inkingStore.selectTool('Hand');
  },

  togglePopover: (tool: InkingTool | null) => {
    currentState = {
      ...currentState,
      activePopover: currentState.activePopover === tool ? null : tool,
    };
    emitChange();
  },

  closePopover: () => {
    if (currentState.activePopover !== null) {
      currentState = { ...currentState, activePopover: null };
      emitChange();
    }
  },

  setPenThickness: (slot: PenSlot, thickness: number) => {
    const pen = currentState.pens[slot];
    if (!pen) return;
    currentState = {
      ...currentState,
      pens: {
        ...currentState.pens,
        [slot]: { ...pen, thickness },
      },
    };
    emitChange();
  },

  setPenColor: (slot: PenSlot, color: string, effect?: 'rainbow' | 'galaxy') => {
    const pen = currentState.pens[slot];
    if (!pen) return;
    const recent = [color, ...pen.recentColors.filter((c) => c !== color)].slice(0, 4);
    currentState = {
      ...currentState,
      pens: {
        ...currentState.pens,
        [slot]: {
          ...pen,
          color,
          effect,
          recentColors: recent,
        },
      },
    };
    emitChange();
  },

  setPenArrowMode: (slot: PenSlot, arrowMode: PenArrowMode) => {
    const pen = currentState.pens[slot];
    if (!pen) return;
    currentState = {
      ...currentState,
      pens: {
        ...currentState.pens,
        [slot]: { ...pen, arrowMode },
      },
    };
    emitChange();
  },

  setHighlighterThickness: (thickness: number) => {
    currentState = {
      ...currentState,
      highlighter: { ...currentState.highlighter, thickness },
    };
    emitChange();
  },

  setHighlighterColor: (color: string) => {
    currentState = {
      ...currentState,
      highlighter: { ...currentState.highlighter, color },
    };
    emitChange();
  },

  setLaserThickness: (thickness: number) => {
    currentState = {
      ...currentState,
      laser: { ...currentState.laser, thickness },
    };
    emitChange();
  },

  setLaserColor: (color: string) => {
    currentState = {
      ...currentState,
      laser: { ...currentState.laser, color },
    };
    emitChange();
  },

  setEraserMode: (mode: EraserMode) => {
    currentState = {
      ...currentState,
      eraser: { mode },
    };
    emitChange();
  },

  setRulerActive: (active: boolean) => {
    currentState = {
      ...currentState,
      isRulerActive: active,
    };
    emitChange();
  },

  clearCanvas: () => {
    currentState = {
      ...currentState,
      clearCanvasSignal: Date.now(),
      activePopover: null,
    };
    emitChange();
  },
};

/**
 * Custom hook to read and subscribe to inking store state
 */
export function useInkingStore(): InkingState {
  return useSyncExternalStore(inkingStore.subscribe, inkingStore.getState);
}

/**
 * Custom hook with selector for optimal re-rendering
 */
export function useInkingSelector<T>(selector: (state: InkingState) => T): T {
  return useSyncExternalStore(inkingStore.subscribe, () => selector(inkingStore.getState()));
}
