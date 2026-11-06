/**
 * Open Whiteboard — Canvas Object Clipboard Serialization & Clipboard Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules: Module 517955 & 84781932 (Entity duplication & clipboard serialization)
 */

import type {
  CanvasEntity,
  InkStrokeEntity,
  NoteEntity,
  NoteGridEntity,
  TextEntity,
  ShapeEntity,
  ImageEntity,
  ReactionEntity,
  PDFDocumentEntity,
} from '../canvas/sceneGraph';
import { computeStrokeBounds, computeEntityBounds } from '../canvas/sceneGraph';
import { sceneStore } from '../store/sceneStore';
import { selectionStore } from '../store/selectionStore';
import { canvasStore } from '../store/canvasStore';
import { screenToWorld } from '../canvas/camera';
import { historyManager } from '../canvas/history';

export const CLIPBOARD_PAYLOAD_TYPE = 'open-whiteboard-entities';
export const CLIPBOARD_PAYLOAD_VERSION = 1;

export interface WhiteboardClipboardPayload {
  type: typeof CLIPBOARD_PAYLOAD_TYPE;
  version: number;
  entities: CanvasEntity[];
  copiedAt: number;
}

// In-memory fallback buffer (ensures copy/paste works even when system clipboard permissions are blocked)
let inMemoryClipboardBuffer: CanvasEntity[] | null = null;

// Cumulative offset tracker for consecutive Ctrl+V pastes
let consecutivePasteStep = 1;

/**
 * Serializes an array of canvas entities into the standard Open Whiteboard clipboard format.
 */
export function serializeEntitiesToClipboard(entities: CanvasEntity[]): string {
  const payload: WhiteboardClipboardPayload = {
    type: CLIPBOARD_PAYLOAD_TYPE,
    version: CLIPBOARD_PAYLOAD_VERSION,
    entities: JSON.parse(JSON.stringify(entities)),
    copiedAt: Date.now(),
  };
  return JSON.stringify(payload, null, 2);
}

/**
 * Validates and parses a string to see if it represents an Open Whiteboard clipboard payload.
 */
export function parseClipboardPayload(text: string): WhiteboardClipboardPayload | null {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  try {
    const data = JSON.parse(trimmed);
    if (
      data &&
      data.type === CLIPBOARD_PAYLOAD_TYPE &&
      Array.isArray(data.entities) &&
      data.entities.length > 0
    ) {
      return data as WhiteboardClipboardPayload;
    }
  } catch {
    // Non-JSON clipboard data
  }
  return null;
}

/**
 * Copies the provided entities to both system clipboard and in-memory buffer.
 */
export async function copyEntitiesToClipboard(entities: CanvasEntity[]): Promise<boolean> {
  if (!entities || entities.length === 0) return false;

  // Reset consecutive paste offset step on new copy
  consecutivePasteStep = 1;

  // Always update in-memory buffer
  inMemoryClipboardBuffer = JSON.parse(JSON.stringify(entities));

  const jsonString = serializeEntitiesToClipboard(entities);

  // Attempt to write to system clipboard
  try {
    if (navigator?.clipboard?.writeText) {
      await navigator.clipboard.writeText(jsonString);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] System clipboard writeText unavailable or permission denied:', err);
  }

  return true;
}

/**
 * Copies all currently selected canvas entities to clipboard.
 */
export async function copySelectedToClipboard(): Promise<boolean> {
  const selected = selectionStore.getSelectedEntities();
  if (selected.length === 0) return false;
  return copyEntitiesToClipboard(selected);
}

/**
 * Reads Open Whiteboard entities from system clipboard or in-memory fallback.
 */
export async function getClipboardEntities(): Promise<CanvasEntity[] | null> {
  // 1. Try reading from system clipboard
  try {
    if (navigator?.clipboard?.readText) {
      const text = await navigator.clipboard.readText();
      const payload = parseClipboardPayload(text);
      if (payload && payload.entities && payload.entities.length > 0) {
        return payload.entities;
      }
    }
  } catch (err) {
    // Permission denied or not focused
  }

  // 2. Fall back to in-memory buffer
  if (inMemoryClipboardBuffer && inMemoryClipboardBuffer.length > 0) {
    return JSON.parse(JSON.stringify(inMemoryClipboardBuffer));
  }

  return null;
}

/**
 * Deserializes and clones entities with spatial offset, generates fresh IDs,
 * commits to sceneStore with atomic undo/redo, and selects newly pasted items.
 */
export function pasteEntities(
  entities: CanvasEntity[],
  customOffset?: { dx: number; dy: number }
): string[] {
  if (!entities || entities.length === 0) return [];

  const offset = customOffset ?? {
    dx: 24 * consecutivePasteStep,
    dy: 24 * consecutivePasteStep,
  };
  consecutivePasteStep++;

  const newIds: string[] = [];
  const clonedEntities: CanvasEntity[] = [];

  for (const entity of entities) {
    const newId = `${entity.type}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    newIds.push(newId);

    if (entity.type === 'stroke') {
      const stroke = entity as InkStrokeEntity;
      const points = stroke.points.map((p) => ({
        ...p,
        x: p.x + offset.dx,
        y: p.y + offset.dy,
      }));
      const bounds = computeStrokeBounds(
        points,
        stroke.width,
        Boolean(stroke.arrowStart || stroke.arrowEnd)
      );
      const clonedStroke: InkStrokeEntity = {
        ...stroke,
        id: newId,
        points,
        bounds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      clonedEntities.push(clonedStroke);
    } else if (entity.type === 'noteGrid') {
      const grid = entity as NoteGridEntity;
      const newX = grid.x + offset.dx;
      const newY = grid.y + offset.dy;
      const clonedGrid: NoteGridEntity = {
        ...grid,
        id: newId,
        x: newX,
        y: newY,
        notes: grid.notes.map((n) => ({
          ...n,
          id: `note_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        })),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      clonedGrid.bounds = computeEntityBounds(clonedGrid);
      clonedEntities.push(clonedGrid);
    } else {
      const box = entity as
        | NoteEntity
        | TextEntity
        | ShapeEntity
        | ImageEntity
        | ReactionEntity
        | PDFDocumentEntity;
      const newX = box.x + offset.dx;
      const newY = box.y + offset.dy;
      const clonedBox: CanvasEntity = {
        ...box,
        id: newId,
        x: newX,
        y: newY,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      clonedBox.bounds = computeEntityBounds(clonedBox);
      clonedEntities.push(clonedBox);
    }
  }

  historyManager.inUndoGroup('Paste Objects', () => {
    for (const ent of clonedEntities) {
      sceneStore.addEntity(ent, true);
    }
  });

  selectionStore.selectMultiple(newIds);
  return newIds;
}

/**
 * Pastes an image Blob into the scene, centering it in the active camera viewport,
 * records in Undo/Redo history, and selects the new Image entity.
 */
export async function pasteImageBlob(
  blob: Blob,
  worldPos?: { x: number; y: number }
): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const img = new Image();
      img.onload = () => {
        let w = img.naturalWidth || 360;
        let h = img.naturalHeight || 270;
        const maxDim = 480;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        let center = worldPos;
        if (!center) {
          const camera = canvasStore.getState().camera;
          const viewportEl = typeof document !== 'undefined' ? document.querySelector('.whiteboard-canvas-viewport') : null;
          const rect = viewportEl?.getBoundingClientRect();
          const screenCenter = {
            x: rect ? rect.left + rect.width / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 500),
            y: rect ? rect.top + rect.height / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 400),
          };
          center = screenToWorld(screenCenter, camera, rect);
        }

        const timestamp = Date.now();
        const id = `image_paste_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;
        const x = Math.round(center.x - w / 2);
        const y = Math.round(center.y - h / 2);

        const imageEntity: ImageEntity = {
          id,
          type: 'image',
          x,
          y,
          width: w,
          height: h,
          src: dataUrl,
          isLockedToBackground: false,
          isLocked: false,
          fileName: 'Pasted Image',
          zIndex: 100,
          bounds: {
            minX: x,
            minY: y,
            maxX: x + w,
            maxY: y + h,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        historyManager.inUndoGroup('Paste Image', () => {
          sceneStore.addEntity(imageEntity, true);
        });
        selectionStore.select(id);
        resolve(id);
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(blob);
  });
}

/**
 * Pastes external plain text as a new TextEntity centered in the active viewport.
 */
export function pastePlainText(
  text: string,
  worldPos?: { x: number; y: number }
): string {
  let center = worldPos;
  if (!center) {
    const camera = canvasStore.getState().camera;
    const viewportEl = typeof document !== 'undefined' ? document.querySelector('.whiteboard-canvas-viewport') : null;
    const rect = viewportEl?.getBoundingClientRect();
    const screenCenter = {
      x: rect ? rect.left + rect.width / 2 : (typeof window !== 'undefined' ? window.innerWidth / 2 : 500),
      y: rect ? rect.top + rect.height / 2 : (typeof window !== 'undefined' ? window.innerHeight / 2 : 400),
    };
    center = screenToWorld(screenCenter, camera, rect);
  }

  const timestamp = Date.now();
  const id = `text_paste_${timestamp}_${Math.random().toString(36).slice(2, 6)}`;
  const width = Math.min(400, Math.max(200, text.length * 9));
  const height = 60;
  const x = Math.round(center.x - width / 2);
  const y = Math.round(center.y - height / 2);

  const textEntity: TextEntity = {
    id,
    type: 'text',
    x,
    y,
    width,
    height,
    text,
    fontSize: 18,
    color: '#1F1F1F',
    zIndex: 200,
    bounds: {
      minX: x,
      minY: y,
      maxX: x + width,
      maxY: y + height,
    },
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  historyManager.inUndoGroup('Paste Text', () => {
    sceneStore.addEntity(textEntity, true);
  });
  selectionStore.select(id);
  return id;
}

/**
 * Universal paste orchestrator:
 * 1. Checks serialized canvas entities (system clipboard or in-memory fallback).
 * 2. Checks image blobs from system clipboard.
 * 3. Checks external text string from system clipboard.
 */
export async function executeUniversalPaste(): Promise<boolean> {
  // 1. Try serialized entities
  try {
    const entities = await getClipboardEntities();
    if (entities && entities.length > 0) {
      pasteEntities(entities);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard] Failed reading entities:', err);
  }

  // 2. Try image blobs in navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.read) {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          const id = await pasteImageBlob(blob);
          if (id) return true;
        }
      }
    } catch {}
  }

  // 3. Try plain text in navigator.clipboard
  if (typeof navigator !== 'undefined' && navigator.clipboard?.readText) {
    try {
      const text = await navigator.clipboard.readText();
      if (text && text.trim().length > 0) {
        const payload = parseClipboardPayload(text);
        if (payload && payload.entities && payload.entities.length > 0) {
          pasteEntities(payload.entities);
          return true;
        }
        pastePlainText(text.trim());
        return true;
      }
    } catch {}
  }

  return false;
}

export function getInMemoryClipboardBuffer(): CanvasEntity[] | null {
  return inMemoryClipboardBuffer ? JSON.parse(JSON.stringify(inMemoryClipboardBuffer)) : null;
}
