/**
 * Open Whiteboard — Canvas Navigation & Shell UI Store
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 891771 (blueboard/chunks/8854.*.js) -> Camera transform, scaleBy, scaleTo, min/max scale limits
 *   - Module 560673 (blueboard/chunks/40049.*.js) -> Create panel categories (Notes, Text, Shapes, Reactions, Documents, Images)
 *   - Module 576456 (blueboard/chunks/8854.*.js) -> Create panel state (isPanelOpen, activePanel, subPanels)
 *   - Module 796400 (blueboard/chunks/46453.*.js) -> Undo / Redo revision state
 */

import { useSyncExternalStore } from 'react';
import {
  initialCamera,
  calculateZoomAtPoint,
  calculatePan,
  MIN_SCALE,
  MAX_SCALE,
  DEFAULT_SCALE,
} from '../canvas/camera';
import type { CameraMatrix, Point } from '../canvas/camera';
import type { GridPatternType } from '../canvas/grid';
import type { AABB } from '../canvas/sceneGraph';

export type CreateCategory =
  | 'Content'
  | 'Notes'
  | 'Text'
  | 'Shapes'
  | 'Reactions'
  | 'Images'
  | 'Documents';

export interface CanvasState {
  // Authoritative Camera Matrix
  camera: CameraMatrix;
  zoom: number; // convenience getter for camera.scale
  pan: { x: number; y: number }; // convenience getter for camera positions

  // Panning interaction state
  isPanning: boolean;
  isSpacePressed: boolean;

  // Background Grid Pattern (Module BoardEditorComponent line 15)
  gridPattern: GridPatternType;

  // Shell State
  boardTitle: string;
  isCreatePanelOpen: boolean;
  activeCreateCategory: CreateCategory;
  isSettingsOpen: boolean;

  // History state
  canUndo: boolean;
  canRedo: boolean;
  undoStackLength: number;
}

const ZOOM_STEP = 1.25;
const GRID_STORAGE_KEY = 'whiteboard:gridPattern';

function getInitialGridPattern(): GridPatternType {
  if (typeof window === 'undefined') return 'Dot';
  const saved = localStorage.getItem(GRID_STORAGE_KEY) as GridPatternType | null;
  const validPatterns: GridPatternType[] = [
    'Dot',
    'Cubic',
    'Graph',
    'CubicDot',
    'CompactRule',
    'WideRule',
    'SlantedCubic',
    'Triangular',
    'Neutral',
  ];
  return saved && validPatterns.includes(saved) ? saved : 'Dot';
}

const initialCanvasState: CanvasState = {
  camera: initialCamera,
  zoom: DEFAULT_SCALE,
  pan: { x: 0, y: 0 },
  isPanning: false,
  isSpacePressed: false,
  gridPattern: getInitialGridPattern(),
  boardTitle: 'Untitled whiteboard',
  isCreatePanelOpen: false,
  activeCreateCategory: 'Content',
  isSettingsOpen: false,
  canUndo: false,
  canRedo: false,
  undoStackLength: 0,
};

let currentCanvasState = initialCanvasState;
const canvasListeners = new Set<() => void>();

function emitCanvasChange() {
  for (const listener of canvasListeners) {
    listener();
  }
}

export const canvasStore = {
  getState: () => currentCanvasState,

  subscribe: (listener: () => void) => {
    canvasListeners.add(listener);
    return () => canvasListeners.delete(listener);
  },

  // Direct camera matrix update
  setCamera: (camera: CameraMatrix) => {
    currentCanvasState = {
      ...currentCanvasState,
      camera,
      zoom: camera.scale,
      pan: { x: camera.positionX, y: camera.positionY },
    };
    emitCanvasChange();
  },

  // Pan by delta screen pixels
  panBy: (dx: number, dy: number) => {
    const updated = calculatePan(currentCanvasState.camera, dx, dy);
    currentCanvasState = {
      ...currentCanvasState,
      camera: updated,
      zoom: updated.scale,
      pan: { x: updated.positionX, y: updated.positionY },
    };
    emitCanvasChange();
  },

  // Zoom centered at a specific screen point
  zoomAtPoint: (
    targetScale: number,
    cursorScreenPt: Point,
    viewportRect?: DOMRect | null
  ) => {
    const updated = calculateZoomAtPoint(
      currentCanvasState.camera,
      targetScale,
      cursorScreenPt,
      viewportRect
    );
    currentCanvasState = {
      ...currentCanvasState,
      camera: updated,
      zoom: updated.scale,
      pan: { x: updated.positionX, y: updated.positionY },
    };
    emitCanvasChange();
  },

  // Zoom In centered at screen point (or screen center)
  zoomIn: (centerScreenPt?: Point, viewportRect?: DOMRect | null) => {
    const pt = centerScreenPt ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const targetScale = Math.min(MAX_SCALE, currentCanvasState.camera.scale * ZOOM_STEP);
    canvasStore.zoomAtPoint(targetScale, pt, viewportRect);
  },

  // Zoom Out centered at screen point (or screen center)
  zoomOut: (centerScreenPt?: Point, viewportRect?: DOMRect | null) => {
    const pt = centerScreenPt ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    const targetScale = Math.max(MIN_SCALE, currentCanvasState.camera.scale / ZOOM_STEP);
    canvasStore.zoomAtPoint(targetScale, pt, viewportRect);
  },

  // Reset Camera to 100% (1.0) and center
  resetZoom: (centerScreenPt?: Point, viewportRect?: DOMRect | null) => {
    const pt = centerScreenPt ?? {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    };
    canvasStore.zoomAtPoint(1.0, pt, viewportRect);
  },

  fitToScreen: (targetBounds?: AABB | null, viewportSize?: { width: number; height: number }) => {
    const vpWidth = viewportSize?.width ?? (typeof window !== 'undefined' ? window.innerWidth : 1920);
    const vpHeight = viewportSize?.height ?? (typeof window !== 'undefined' ? window.innerHeight : 1080);

    if (!targetBounds) {
      canvasStore.setCamera({ scale: 1.0, positionX: 0, positionY: 0 });
      return;
    }

    const boundsWidth = targetBounds.maxX - targetBounds.minX;
    const boundsHeight = targetBounds.maxY - targetBounds.minY;

    if (boundsWidth <= 0 || boundsHeight <= 0) {
      canvasStore.setCamera({ scale: 1.0, positionX: 0, positionY: 0 });
      return;
    }

    // Module 8854 line 5 framing formula: center bounds with padding margin
    const availableWidth = vpWidth * 0.85;
    const availableHeight = vpHeight * 0.85;
    const targetScale = Math.min(1.0, Math.min(availableWidth / boundsWidth, availableHeight / boundsHeight));
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));

    const centerX = (targetBounds.minX + targetBounds.maxX) / 2;
    const centerY = (targetBounds.minY + targetBounds.maxY) / 2;

    const newPositionX = vpWidth / 2 - centerX * clampedScale;
    const newPositionY = vpHeight / 2 - centerY * clampedScale;

    canvasStore.setCamera({
      scale: parseFloat(clampedScale.toFixed(4)),
      positionX: parseFloat(newPositionX.toFixed(2)),
      positionY: parseFloat(newPositionY.toFixed(2)),
    });
  },

  setIsPanning: (isPanning: boolean) => {
    if (currentCanvasState.isPanning !== isPanning) {
      currentCanvasState = { ...currentCanvasState, isPanning };
      emitCanvasChange();
    }
  },

  setIsSpacePressed: (isSpacePressed: boolean) => {
    if (currentCanvasState.isSpacePressed !== isSpacePressed) {
      currentCanvasState = { ...currentCanvasState, isSpacePressed };
      emitCanvasChange();
    }
  },

  // Create Flyout Panel Actions (Module 560673)
  toggleCreatePanel: () => {
    currentCanvasState = {
      ...currentCanvasState,
      isCreatePanelOpen: !currentCanvasState.isCreatePanelOpen,
    };
    emitCanvasChange();
  },

  openCreatePanel: (category: CreateCategory = 'Content') => {
    currentCanvasState = {
      ...currentCanvasState,
      isCreatePanelOpen: true,
      activeCreateCategory: category,
    };
    emitCanvasChange();
  },

  closeCreatePanel: () => {
    if (currentCanvasState.isCreatePanelOpen) {
      currentCanvasState = {
        ...currentCanvasState,
        isCreatePanelOpen: false,
      };
      emitCanvasChange();
    }
  },

  setCreateCategory: (category: CreateCategory) => {
    currentCanvasState = {
      ...currentCanvasState,
      activeCreateCategory: category,
    };
    emitCanvasChange();
  },

  // Settings Menu
  toggleSettings: () => {
    currentCanvasState = {
      ...currentCanvasState,
      isSettingsOpen: !currentCanvasState.isSettingsOpen,
    };
    emitCanvasChange();
  },

  closeSettings: () => {
    if (currentCanvasState.isSettingsOpen) {
      currentCanvasState = {
        ...currentCanvasState,
        isSettingsOpen: false,
      };
      emitCanvasChange();
    }
  },

  setBoardTitle: (title: string) => {
    currentCanvasState = { ...currentCanvasState, boardTitle: title };
    emitCanvasChange();
  },

  // Grid Pattern Selection (Module BoardEditorComponent line 15)
  setGridPattern: (pattern: GridPatternType) => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(GRID_STORAGE_KEY, pattern);
      } catch {
        // Ignore storage errors
      }
    }
    currentCanvasState = { ...currentCanvasState, gridPattern: pattern };
    emitCanvasChange();
  },

  // History Undo/Redo signals
  triggerUndo: () => {
    window.dispatchEvent(new CustomEvent('wb-undo'));
  },

  triggerRedo: () => {
    window.dispatchEvent(new CustomEvent('wb-redo'));
  },

  setHistoryStatus: (canUndo: boolean, canRedo: boolean) => {
    currentCanvasState = { ...currentCanvasState, canUndo, canRedo };
    emitCanvasChange();
  },
};

export function useCanvasStore(): CanvasState {
  return useSyncExternalStore(canvasStore.subscribe, canvasStore.getState);
}

export function useCanvasSelector<T>(selector: (state: CanvasState) => T): T {
  return useSyncExternalStore(canvasStore.subscribe, () => selector(canvasStore.getState()));
}
