/**
 * Open Whiteboard — Select Tool & Marquee Selection Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Module 179019 & 40049: toolsDockBaseBar Select Tool cursor & interaction model
 * - Module 84781932: Hit-testing of canvas entities (ink strokes, shapes, notes, images, text)
 * - Single-click hit testing with sub-pixel tolerance
 * - Live rectangular marquee drag with group selection
 */

import type { CameraMatrix, Point } from '../canvas/camera';
import { screenToWorld } from '../canvas/camera';
import type { InkStrokeEntity, ImageEntity, AABB } from '../canvas/sceneGraph';
import { sceneStore } from '../store/sceneStore';
import { selectionStore } from '../store/selectionStore';

export interface LiveMarqueeState {
  isMarqueeActive: boolean;
  worldBox: AABB;
  screenBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
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

/**
 * Checks if line segment (p1, p2) intersects axis-aligned line segment (q1, q2)
 */
function lineSegmentsIntersect(p1: Point, p2: Point, q1: Point, q2: Point): boolean {
  function ccw(a: Point, b: Point, c: Point): boolean {
    return (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  }
  return ccw(p1, q1, q2) !== ccw(p2, q1, q2) && ccw(p1, p2, q1) !== ccw(p1, p2, q2);
}

export class SelectToolEngine {
  private isPointerDown = false;
  private hasDragged = false;
  private startClientPt: Point = { x: 0, y: 0 };
  private startWorldPt: Point = { x: 0, y: 0 };

  private liveListeners = new Set<(state: LiveMarqueeState | null) => void>();
  private currentState: LiveMarqueeState | null = null;

  public subscribe(listener: (state: LiveMarqueeState | null) => void): () => void {
    this.liveListeners.add(listener);
    return () => this.liveListeners.delete(listener);
  }

  public getState(): LiveMarqueeState | null {
    return this.currentState;
  }

  public isMarqueeActive(): boolean {
    return this.hasDragged && this.isPointerDown;
  }

  private emitState(state: LiveMarqueeState | null) {
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

    this.isPointerDown = true;
    this.hasDragged = false;
    this.startClientPt = { x: e.clientX, y: e.clientY };
    this.startWorldPt = screenToWorld(this.startClientPt, camera, viewportRect);
  }

  public onPointerMove(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (!this.isPointerDown) return;

    const dragDistance = Math.hypot(
      e.clientX - this.startClientPt.x,
      e.clientY - this.startClientPt.y
    );

    // Threshold of 4px before activating marquee box
    if (dragDistance >= 4) {
      this.hasDragged = true;
      const currentWorldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);

      const worldMinX = Math.min(this.startWorldPt.x, currentWorldPt.x);
      const worldMaxX = Math.max(this.startWorldPt.x, currentWorldPt.x);
      const worldMinY = Math.min(this.startWorldPt.y, currentWorldPt.y);
      const worldMaxY = Math.max(this.startWorldPt.y, currentWorldPt.y);

      const vpLeft = viewportRect ? viewportRect.left : 0;
      const vpTop = viewportRect ? viewportRect.top : 0;

      const screenX = Math.min(this.startClientPt.x, e.clientX) - vpLeft;
      const screenY = Math.min(this.startClientPt.y, e.clientY) - vpTop;
      const screenW = Math.abs(e.clientX - this.startClientPt.x);
      const screenH = Math.abs(e.clientY - this.startClientPt.y);

      this.emitState({
        isMarqueeActive: true,
        worldBox: {
          minX: worldMinX,
          minY: worldMinY,
          maxX: worldMaxX,
          maxY: worldMaxY,
        },
        screenBox: {
          x: screenX,
          y: screenY,
          width: screenW,
          height: screenH,
        },
      });
    }
  }

  public onPointerUp(
    e?: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera?: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (!this.isPointerDown) return;

    const isAdditive = Boolean(e && (e.shiftKey || e.ctrlKey || e.metaKey));
    const clientX = e ? e.clientX : this.startClientPt.x;
    const clientY = e ? e.clientY : this.startClientPt.y;

    if (!this.hasDragged) {
      // 1. Single Click / Tap Selection: Hit test at pointer coordinates
      if (camera) {
        const clickWorld = screenToWorld({ x: clientX, y: clientY }, camera, viewportRect);
        this.hitTestSingleClick(clickWorld, isAdditive);
      }
    } else {
      // 2. Marquee Selection: Select all entities inside or intersecting the bounding box
      if (this.currentState) {
        this.hitTestMarquee(this.currentState.worldBox, isAdditive);
      }
    }

    this.cleanup();
  }

  public cancel() {
    this.cleanup();
  }

  private cleanup() {
    this.isPointerDown = false;
    this.hasDragged = false;
    this.emitState(null);
  }

  /**
   * Hit tests a single click against all scene entities (highest z-index first)
   */
  public hitTestSingleClick(p: Point, isAdditive: boolean): boolean {
    const allEntities = sceneStore.getAllEntities();

    // Test in reverse order (topmost zIndex first)
    for (let i = allEntities.length - 1; i >= 0; i--) {
      const entity = allEntities[i];

      const b = entity.bounds;
      const hitMargin = 8;
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
        const radius = Math.max(8, (stroke.width || 2) / 2 + 6);
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
          return true;
        }
      } else {
        // Box entity (note, text, shape, image, reaction, notegrid)
        if (isAdditive && selectionStore.isSelected(entity.id)) {
          selectionStore.deselect(entity.id);
        } else {
          selectionStore.select(entity.id, isAdditive);
        }
        return true;
      }
    }

    // Clicked on empty space: clear selection unless modifier is active
    if (!isAdditive) {
      selectionStore.clearSelection();
    }
    return false;
  }

  /**
   * Hit tests a rectangular marquee box against all scene entities
   */
  public hitTestMarquee(box: AABB, isAdditive: boolean) {
    const allEntities = sceneStore.getAllEntities();
    const hitIds: string[] = [];

    const boxCorners: Point[] = [
      { x: box.minX, y: box.minY },
      { x: box.maxX, y: box.minY },
      { x: box.maxX, y: box.maxY },
      { x: box.minX, y: box.maxY },
    ];

    for (const entity of allEntities) {
      // Immunity: Locked items and locked-to-background images are never selected by marquee
      if (entity.isLocked || (entity.type === 'image' && (entity as ImageEntity).isLockedToBackground)) {
        continue;
      }

      const b = entity.bounds;
      // 1. Fast AABB intersection culling
      const overlaps =
        b.minX <= box.maxX &&
        b.maxX >= box.minX &&
        b.minY <= box.maxY &&
        b.maxY >= box.minY;

      if (!overlaps) continue;

      if (entity.type === 'stroke') {
        const stroke = entity as InkStrokeEntity;
        let strokeHit = false;

        // Check if any points are inside box
        for (const pt of stroke.points) {
          if (pt.x >= box.minX && pt.x <= box.maxX && pt.y >= box.minY && pt.y <= box.maxY) {
            strokeHit = true;
            break;
          }
        }

        // Check if any stroke segment intersects the 4 borders of the marquee box
        if (!strokeHit) {
          for (let s = 0; s < stroke.points.length - 1; s++) {
            const p1 = stroke.points[s];
            const p2 = stroke.points[s + 1];
            for (let c = 0; c < 4; c++) {
              const q1 = boxCorners[c];
              const q2 = boxCorners[(c + 1) % 4];
              if (lineSegmentsIntersect(p1, p2, q1, q2)) {
                strokeHit = true;
                break;
              }
            }
            if (strokeHit) break;
          }
        }

        if (strokeHit) {
          hitIds.push(entity.id);
        }
      } else {
        // Box entities: If entity bounding box overlaps marquee box, select it
        hitIds.push(entity.id);
      }
    }

    if (hitIds.length > 0) {
      selectionStore.selectMultiple(hitIds, isAdditive);
    } else if (!isAdditive) {
      selectionStore.clearSelection();
    }
  }
}

export const selectTool = new SelectToolEngine();
