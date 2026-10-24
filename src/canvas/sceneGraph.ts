/**
 * Open Whiteboard — Spatial Scene Graph & Viewport Culling Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 770023 (blueboard/chunks/8854.*.js, lines 14-16)
 *     -> Canvas children bounding box math: Su(), zX() [min/max of left, top, right, bottom]
 *   - Module 8854 (blueboard/chunks/8854.*.js, line 5)
 *     -> Viewport framing and fitToScreen calculation Y(e, { bounds, destinationBounds, paddingFraction })
 *   - Module 93425 (blueboard/chunks/93425.*.js, lines 67-68)
 *     -> Canvas Child stamp types: Note, NoteGrid, PlainText, Shape, Hyperlink, Image
 *   - Module 84781932 (blueboard/chunks/BoardEditorComponent-84781932.*.js, lines 21-23)
 *     -> Ink stroke data structure and bounding box calculations
 */

import type { CameraMatrix } from './camera';

/**
 * Axis-Aligned 2D Bounding Box in World Coordinates
 */
export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export type CanvasEntityType =
  | 'stroke'
  | 'note'
  | 'noteGrid'
  | 'text'
  | 'shape'
  | 'reaction'
  | 'image'
  | 'pdf_document';

export interface BaseEntity {
  id: string;
  type: CanvasEntityType;
  zIndex: number;
  bounds: AABB;
  isLocked?: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface InkStrokePoint {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export interface InkStrokeEntity extends BaseEntity {
  type: 'stroke';
  tool: 'pen' | 'highlighter' | 'laser';
  color: string;
  width: number;
  points: InkStrokePoint[];
  isHighlighter?: boolean;
  arrowStart?: boolean;
  arrowEnd?: boolean;
  effect?: 'rainbow' | 'galaxy';
}

export interface NoteEntity extends BaseEntity {
  type: 'note';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: string; // e.g. '#FFF1A8' (yellow), '#D4F5B0' (green), etc.
  reactions?: string[];
}

export interface NoteGridItem {
  id: string;
  text: string;
  color: string;
  reactions?: string[];
}

export interface NoteGridEntity extends BaseEntity {
  type: 'noteGrid';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  notes: NoteGridItem[];
}

export interface TextEntity extends BaseEntity {
  type: 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSize: number;
  color: string;
}

export type ShapeKind = 'rectangle' | 'circle' | 'diamond' | 'triangle' | 'arrow' | 'parallelogram' | 'line';

export interface ShapeEntity extends BaseEntity {
  type: 'shape';
  x: number;
  y: number;
  width: number;
  height: number;
  shapeType: ShapeKind;
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  text?: string;
  fontSize?: number;
  textColor?: string;
}

export type ReactionKind = 'like' | 'heart' | 'check' | 'question' | 'celebrate';

export interface ReactionEntity extends BaseEntity {
  type: 'reaction';
  x: number;
  y: number;
  size: number;
  reactionType: ReactionKind;
}

export interface ImageEntity extends BaseEntity {
  type: 'image';
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
  isLockedToBackground: boolean;
  fileName?: string;
}

export interface PDFHighlightRect {
  relX: number; // 0..1 relative to page width
  relY: number; // 0..1 relative to page height
  width: number; // 0..1 relative to page width
  height: number; // 0..1 relative to page height
}

export interface PDFHighlightAnnotation {
  id: string;
  pageNumber: number;
  color: string;
  rects: PDFHighlightRect[];
  freehandD?: string;
  strokeWidth?: number;
  text?: string;
  createdAt: number;
}

export interface PDFDocumentEntity extends BaseEntity {
  type: 'pdf_document';
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  pdfUrl?: string;
  pdfData: string;
  currentPage: number;
  totalPages: number;
  isLocked?: boolean;
  highlights?: PDFHighlightAnnotation[];
}

export type CanvasEntity =
  | InkStrokeEntity
  | NoteEntity
  | NoteGridEntity
  | TextEntity
  | ShapeEntity
  | ReactionEntity
  | ImageEntity
  | PDFDocumentEntity;

/**
 * Computes bounding box for an inking stroke, including stroke thickness padding.
 */
export function computeStrokeBounds(
  points: InkStrokePoint[],
  strokeWidth: number,
  hasArrows: boolean = false
): AABB {
  if (points.length === 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }

  // Margin accounts for stroke thickness antialiasing and arrowhead wings (~4.5 * strokeWidth)
  const padding = hasArrows
    ? Math.max(strokeWidth * 4.5, 18)
    : strokeWidth / 2 + 2;

  return {
    minX: minX - padding,
    minY: minY - padding,
    maxX: maxX + padding,
    maxY: maxY + padding,
  };
}

/**
 * Computes rectangular bounding box.
 */
export function computeBoxBounds(x: number, y: number, width: number, height: number): AABB {
  return {
    minX: x,
    minY: y,
    maxX: x + width,
    maxY: y + height,
  };
}

/**
 * Computes authoritative bounds for any canvas entity.
 */
export function computeEntityBounds(entity: CanvasEntity): AABB {
  switch (entity.type) {
    case 'stroke':
      return computeStrokeBounds(
        entity.points,
        entity.width,
        Boolean(entity.arrowStart || entity.arrowEnd)
      );
    case 'note':
    case 'noteGrid':
    case 'text':
    case 'shape':
    case 'image':
    case 'pdf_document':
      return computeBoxBounds(entity.x, entity.y, entity.width, entity.height);
    case 'reaction':
      return computeBoxBounds(entity.x, entity.y, entity.size, entity.size);
    default:
      return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  }
}

/**
 * Converts screen viewport to world-space AABB with configurable margin buffer
 * to prevent visual pop-in during fast panning.
 */
export function getViewportWorldBounds(
  camera: CameraMatrix,
  viewport: { width: number; height: number },
  paddingMargin: number = 80
): AABB {
  const left = -camera.positionX / camera.scale - paddingMargin;
  const top = -camera.positionY / camera.scale - paddingMargin;
  const right = (viewport.width - camera.positionX) / camera.scale + paddingMargin;
  const bottom = (viewport.height - camera.positionY) / camera.scale + paddingMargin;

  return {
    minX: left,
    minY: top,
    maxX: right,
    maxY: bottom,
  };
}

/**
 * Fast 2D AABB intersection test.
 */
export function intersectsAABB(a: AABB, b: AABB): boolean {
  return !(
    a.maxX < b.minX ||
    a.minX > b.maxX ||
    a.maxY < b.minY ||
    a.minY > b.maxY
  );
}

/**
 * Computes total union bounding box across a set of entities (Module 770023).
 */
export function getUnionBounds(boundsList: AABB[]): AABB | null {
  if (boundsList.length === 0) return null;

  let minX = boundsList[0].minX;
  let minY = boundsList[0].minY;
  let maxX = boundsList[0].maxX;
  let maxY = boundsList[0].maxY;

  for (let i = 1; i < boundsList.length; i++) {
    const b = boundsList[i];
    if (b.minX < minX) minX = b.minX;
    if (b.minY < minY) minY = b.minY;
    if (b.maxX > maxX) maxX = b.maxX;
    if (b.maxY > maxY) maxY = b.maxY;
  }

  return { minX, minY, maxX, maxY };
}
