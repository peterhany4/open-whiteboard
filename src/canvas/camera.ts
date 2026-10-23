/**
 * Open Whiteboard — Camera Transform Matrix & Spatial Math
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 891771 (blueboard/chunks/8854.*.js) -> Camera transform state, M() scaleCenter math, panZoomTo
 *   - Module 415906 (blueboard/chunks/8854.*.js) -> Scale limits (minScale: 0.1, maxScale: 10.0)
 *   - Module 241369 (blueboard/chunks/8854.*.js) -> Viewport bounds & screen-to-world mapping
 */

import React from 'react';

export interface Point {
  x: number;
  y: number;
}

export interface CameraMatrix {
  scale: number; // 0.1 (10%) to 10.0 (1000%)
  positionX: number; // Translation X in screen pixels
  positionY: number; // Translation Y in screen pixels
}

export const MIN_SCALE = 0.1; // 10%
export const MAX_SCALE = 10.0; // 1000%
export const DEFAULT_SCALE = 1.0; // 100%

export const initialCamera: CameraMatrix = {
  scale: DEFAULT_SCALE,
  positionX: 0,
  positionY: 0,
};

/**
 * Maps screen coordinates (clientX, clientY) to world canvas coordinates (worldX, worldY).
 *
 * Formula:
 *   screenX = (worldX * scale) + positionX + viewportRect.left
 *   worldX  = (screenX - positionX - viewportRect.left) / scale
 */
export function screenToWorld(
  screenPt: Point,
  camera: CameraMatrix,
  viewportRect?: DOMRect | null
): Point {
  const originX = viewportRect ? viewportRect.left : 0;
  const originY = viewportRect ? viewportRect.top : 0;

  const localScreenX = screenPt.x - originX;
  const localScreenY = screenPt.y - originY;

  return {
    x: (localScreenX - camera.positionX) / camera.scale,
    y: (localScreenY - camera.positionY) / camera.scale,
  };
}

/**
 * Maps world canvas coordinates (worldX, worldY) to screen pixel coordinates.
 */
export function worldToScreen(
  worldPt: Point,
  camera: CameraMatrix,
  viewportRect?: DOMRect | null
): Point {
  const originX = viewportRect ? viewportRect.left : 0;
  const originY = viewportRect ? viewportRect.top : 0;

  return {
    x: worldPt.x * camera.scale + camera.positionX + originX,
    y: worldPt.y * camera.scale + camera.positionY + originY,
  };
}

/**
 * Calculates new camera matrix for cursor-centered zooming (Module 891771: M).
 *
 * Keeps the world point directly beneath the cursor stationary before and after the zoom.
 */
export function calculateZoomAtPoint(
  currentCamera: CameraMatrix,
  targetScale: number,
  cursorScreenPt: Point,
  viewportRect?: DOMRect | null
): CameraMatrix {
  const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, targetScale));
  if (clampedScale === currentCamera.scale) {
    return currentCamera;
  }

  const originX = viewportRect ? viewportRect.left : 0;
  const originY = viewportRect ? viewportRect.top : 0;

  const cursorX = cursorScreenPt.x - originX;
  const cursorY = cursorScreenPt.y - originY;

  // Zoom ratio
  const ratio = clampedScale / currentCamera.scale;

  // Whiteboard formula (Module 891771: positionX = e - (e - l) * c)
  const newPositionX = cursorX - (cursorX - currentCamera.positionX) * ratio;
  const newPositionY = cursorY - (cursorY - currentCamera.positionY) * ratio;

  return {
    scale: parseFloat(clampedScale.toFixed(4)),
    positionX: parseFloat(newPositionX.toFixed(2)),
    positionY: parseFloat(newPositionY.toFixed(2)),
  };
}

/**
 * Calculates new camera matrix after panning by (dx, dy) screen pixels.
 */
export function calculatePan(
  currentCamera: CameraMatrix,
  dx: number,
  dy: number
): CameraMatrix {
  return {
    ...currentCamera,
    positionX: currentCamera.positionX + dx,
    positionY: currentCamera.positionY + dy,
  };
}

/**
 * Produces hardware-accelerated CSS transform style for the canvas container.
 */
export function toTransformStyle(camera: CameraMatrix): React.CSSProperties {
  return {
    transform: `translate3d(${camera.positionX}px, ${camera.positionY}px, 0) scale(${camera.scale})`,
    transformOrigin: '0 0',
    willChange: 'transform',
  };
}
