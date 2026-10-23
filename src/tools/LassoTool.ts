/**
 * Microsoft Whiteboard — Freeform Lasso & Object Selection Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 84781932 (chunks/BoardEditorComponent-84781932.*.js, lines 31-34)
 *     -> class Kt extends Q.V (FreeformLasso tool)
 *     -> lightAndDarkThemefillStyle: "rgba(0, 120, 215, 0.2)"
 *     -> lightAndDarkThemestrokeStyle: "rgb(0, 120, 215)"
 *     -> hitTestAndSelectCanvasObjects() point-in-polygon containment test
 *   - Module 6097: LassoStroke streaming & closed polygon renderer
 */

import type { CameraMatrix, Point } from '../canvas/camera';
import { screenToWorld } from '../canvas/camera';
import type { InkStrokeEntity, ImageEntity, AABB } from '../canvas/sceneGraph';
import { sceneStore } from '../store/sceneStore';
import { selectionStore } from '../store/selectionStore';

export interface LiveLassoState {
  isLassoing: boolean;
  points: Point[];
  pathD: string;
}

/**
 * Standard Ray-Casting algorithm for 2D Point-in-Polygon containment test.
 */
export function isPointInPolygon(p: Point, poly: Point[]): boolean {
  if (poly.length < 3) return false;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;

    const intersect =
      yi > p.y !== yj > p.y &&
      p.x < ((xj - xi) * (p.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Computes minimum distance from a point to a line segment (v, w)
 */
function distToSegment(p: Point, v: Point, w: Point): number {
  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
  if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projX = v.x + t * (w.x - v.x);
  const projY = v.y + t * (w.y - v.y);
  return Math.hypot(p.x - projX, p.y - projY);
}

export class LassoToolEngine {
  private isLassoing = false;
  private rawPoints: Point[] = [];
  private startClientPt: Point = { x: 0, y: 0 };

  private liveListeners = new Set<(state: LiveLassoState | null) => void>();
  private currentState: LiveLassoState | null = null;

  public subscribe(listener: (state: LiveLassoState | null) => void): () => void {
    this.liveListeners.add(listener);
    return () => this.liveListeners.delete(listener);
  }

  public getState(): LiveLassoState | null {
    return this.currentState;
  }

  public isCurrentlyLassoing(): boolean {
    return this.isLassoing;
  }

  private emitState(state: LiveLassoState | null) {
    this.currentState = state;
    for (const listener of this.liveListeners) {
      listener(state);
    }
  }

  public onPointerDown(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (e.button !== 0) return;

    this.isLassoing = true;
    this.startClientPt = { x: e.clientX, y: e.clientY };

    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);
    this.rawPoints = [worldPt];

    this.updateLiveLasso();
  }

  public onPointerMove(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (!this.isLassoing) return;

    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);
    const lastPt = this.rawPoints[this.rawPoints.length - 1];

    // Filter tiny micro-movements (< 2px in world coords)
    if (Math.hypot(worldPt.x - lastPt.x, worldPt.y - lastPt.y) >= 2) {
      this.rawPoints.push(worldPt);
      this.updateLiveLasso();
    }
  }

  public onPointerUp(
    e?: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera?: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (!this.isLassoing) return;
    this.isLassoing = false;

    const isAdditive = Boolean(e && (e.shiftKey || e.ctrlKey || e.metaKey));
    const clientX = e ? e.clientX : this.startClientPt.x;
    const clientY = e ? e.clientY : this.startClientPt.y;

    const totalDragDistance = Math.hypot(
      clientX - this.startClientPt.x,
      clientY - this.startClientPt.y
    );

    // 1. Single Click Selection (pointer moved < 6px)
    if (totalDragDistance < 6 || this.rawPoints.length < 3) {
      if (camera) {
        const clickWorld = screenToWorld({ x: clientX, y: clientY }, camera, viewportRect);
        this.hitTestSingleClick(clickWorld, isAdditive);
      }
      this.cleanup();
      return;
    }

    // 2. Polygonal Freeform Lasso Hit-Testing (Module 84781932: hitTestAndSelectCanvasObjects)
    const polygon = [...this.rawPoints];
    const hitIds = this.hitTestPolygon(polygon);

    if (hitIds.length > 0) {
      selectionStore.selectMultiple(hitIds, isAdditive);
    } else if (!isAdditive) {
      selectionStore.clearSelection();
    }

    this.cleanup();
  }

  public cancel() {
    this.cleanup();
  }

  private cleanup() {
    this.isLassoing = false;
    this.rawPoints = [];
    this.emitState(null);
  }

  private updateLiveLasso() {
    if (this.rawPoints.length === 0) {
      this.emitState(null);
      return;
    }

    let pathD = `M ${this.rawPoints[0].x.toFixed(1)} ${this.rawPoints[0].y.toFixed(1)}`;
    for (let i = 1; i < this.rawPoints.length; i++) {
      pathD += ` L ${this.rawPoints[i].x.toFixed(1)} ${this.rawPoints[i].y.toFixed(1)}`;
    }
    // Close polygon back to start for translucent fill preview
    pathD += ' Z';

    this.emitState({
      isLassoing: true,
      points: [...this.rawPoints],
      pathD,
    });
  }

  /**
   * Hit tests a single click against all scene entities (highest z-index first)
   */
  private hitTestSingleClick(p: Point, isAdditive: boolean) {
    const allEntities = sceneStore.getAllEntities();
    // Test in reverse order (topmost zIndex first)
    for (let i = allEntities.length - 1; i >= 0; i--) {
      const entity = allEntities[i];

      // Immunity: Locked items and locked-to-background images cannot be selected via click
      if (entity.isLocked || (entity.type === 'image' && (entity as ImageEntity).isLockedToBackground)) {
        continue;
      }

      // Quick bounding box check with 4px hit tolerance
      const b = entity.bounds;
      const hitMargin = 6;
      if (
        p.x < b.minX - hitMargin ||
        p.x > b.maxX + hitMargin ||
        p.y < b.minY - hitMargin ||
        p.y > b.maxY + hitMargin
      ) {
        continue;
      }

      // Detailed geometric hit test
      if (entity.type === 'stroke') {
        const stroke = entity as InkStrokeEntity;
        const radius = Math.max(8, stroke.width / 2 + 6);
        let hit = false;
        for (let j = 0; j < stroke.points.length - 1; j++) {
          if (distToSegment(p, stroke.points[j], stroke.points[j + 1]) <= radius) {
            hit = true;
            break;
          }
        }
        if (hit) {
          if (isAdditive && selectionStore.isSelected(entity.id)) {
            selectionStore.deselect(entity.id);
          } else {
            selectionStore.select(entity.id, isAdditive);
          }
          return;
        }
      } else {
        // Box entity (note, text, shape, image, reaction)
        if (isAdditive && selectionStore.isSelected(entity.id)) {
          selectionStore.deselect(entity.id);
        } else {
          selectionStore.select(entity.id, isAdditive);
        }
        return;
      }
    }

    // Clicked empty space
    if (!isAdditive) {
      selectionStore.clearSelection();
    }
  }

  /**
   * Spatial hit-testing across all canvas entities using Point-in-Polygon containment
   */
  public hitTestPolygon(polygon: Point[]): string[] {
    const allEntities = sceneStore.getAllEntities();
    const hitIds: string[] = [];

    // Calculate lasso bounding box for fast culling
    let polyMinX = Infinity,
      polyMinY = Infinity,
      polyMaxX = -Infinity,
      polyMaxY = -Infinity;
    for (const pt of polygon) {
      if (pt.x < polyMinX) polyMinX = pt.x;
      if (pt.y < polyMinY) polyMinY = pt.y;
      if (pt.x > polyMaxX) polyMaxX = pt.x;
      if (pt.y > polyMaxY) polyMaxY = pt.y;
    }

    const polyAABB: AABB = {
      minX: polyMinX,
      minY: polyMinY,
      maxX: polyMaxX,
      maxY: polyMaxY,
    };

    for (const entity of allEntities) {
      // Immunity: Locked items and locked-to-background images are never selected by lasso
      if (entity.isLocked || (entity.type === 'image' && (entity as ImageEntity).isLockedToBackground)) {
        continue;
      }

      // 1. Fast AABB intersection culling
      const b = entity.bounds;
      const overlaps =
        b.minX <= polyAABB.maxX &&
        b.maxX >= polyAABB.minX &&
        b.minY <= polyAABB.maxY &&
        b.maxY >= polyAABB.minY;

      if (!overlaps) continue;

      // 2. Entity-specific containment testing
      if (entity.type === 'stroke') {
        const stroke = entity as InkStrokeEntity;
        // Check if any sample points or stroke center falls inside the lasso
        let strokeHit = false;

        // Center of bounds check
        const centerPt: Point = {
          x: (b.minX + b.maxX) / 2,
          y: (b.minY + b.maxY) / 2,
        };
        if (isPointInPolygon(centerPt, polygon)) {
          strokeHit = true;
        } else {
          // Check sampled points along stroke
          const step = Math.max(1, Math.floor(stroke.points.length / 10));
          for (let i = 0; i < stroke.points.length; i += step) {
            if (isPointInPolygon(stroke.points[i], polygon)) {
              strokeHit = true;
              break;
            }
          }
        }

        if (strokeHit) {
          hitIds.push(entity.id);
        }
      } else {
        // Box entities: Note, Text, Shape, Image, Reaction
        const center: Point = {
          x: (b.minX + b.maxX) / 2,
          y: (b.minY + b.maxY) / 2,
        };

        const corners: Point[] = [
          center,
          { x: b.minX, y: b.minY },
          { x: b.maxX, y: b.minY },
          { x: b.maxX, y: b.maxY },
          { x: b.minX, y: b.maxY },
        ];

        let boxHit = false;
        for (const pt of corners) {
          if (isPointInPolygon(pt, polygon)) {
            boxHit = true;
            break;
          }
        }

        // Also check if any lasso polygon point is inside the entity's box
        if (!boxHit) {
          for (const polyPt of polygon) {
            if (
              polyPt.x >= b.minX &&
              polyPt.x <= b.maxX &&
              polyPt.y >= b.minY &&
              polyPt.y <= b.maxY
            ) {
              boxHit = true;
              break;
            }
          }
        }

        if (boxHit) {
          hitIds.push(entity.id);
        }
      }
    }

    return hitIds;
  }
}

export const lassoTool = new LassoToolEngine();
