/**
 * Open Whiteboard — Dual-Mode Eraser Engine (StrokeEraser & PointEraser)
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 40049 & 804397 (chunks/40049.*.js)
 *     -> EraserMode: StrokeEraser (0) & PointEraser (1)
 *   - Module 45330 (chunks/45330.*.js, line 47)
 *     -> VelocityEraser: dynamic speed calculation (accumulatedDistance / s) with
 *        accelerationFactor (currentSpeedRatio & previousSpeedRatio) and speedSensitivityFactor (350)
 *   - Module 84781932 (chunks/BoardEditorComponent-84781932.*.js, lines 39-47)
 *     -> strokeEraseSink (rt: whole stroke deletion) & pointEraseSink (wt: strokeSplitter Bezier clipping)
 *   - Module 501270 (chunks/BoardEditorComponent-84781932.*.js, line 55)
 *     -> StrokeEraseHideSignal, PointEraseMaskSignal, undoRedoManager
 */

import type { CameraMatrix, Point } from '../canvas/camera';
import { screenToWorld } from '../canvas/camera';
import type { InkStrokeEntity, InkStrokePoint } from '../canvas/sceneGraph';
import { computeStrokeBounds } from '../canvas/sceneGraph';
import { sceneStore } from '../store/sceneStore';
import { inkingStore } from '../store/inkingStore';

export interface EraserCursorState {
  x: number;
  y: number;
  radius: number;
  isDown: boolean;
}

/**
 * Calculates perpendicular distance from point P to line segment AB
 */
function distToSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;

  if (lenSq === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  // Projection parameter t
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));

  const projX = a.x + t * dx;
  const projY = a.y + t * dy;

  return Math.hypot(p.x - projX, p.y - projY);
}

export class EraserToolEngine {
  private isErasing = false;

  // Velocity eraser state (Module 45330 line 47)
  private baseRadius = 16;
  private currentRadius = 16;
  private lastPosition: Point | null = null;
  private lastVelocityTime = -1;
  private accumulatedDistance = 0;
  private lastMeasuredSpeed = 1;
  private readonly speedSensitivityFactor = 350;
  private readonly minRadius = 14;
  private readonly maxRadius = 48;

  // Eraser indicator subscribers
  private cursorListeners = new Set<(cursor: EraserCursorState | null) => void>();
  private currentCursor: EraserCursorState | null = null;

  public subscribeCursor(listener: (cursor: EraserCursorState | null) => void): () => void {
    this.cursorListeners.add(listener);
    return () => this.cursorListeners.delete(listener);
  }

  public getCursor(): EraserCursorState | null {
    return this.currentCursor;
  }

  public isCurrentlyErasing(): boolean {
    return this.isErasing;
  }

  private emitCursor(cursor: EraserCursorState | null) {
    this.currentCursor = cursor;
    for (const listener of this.cursorListeners) {
      listener(cursor);
    }
  }

  public onPointerDown(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (e.button !== 0 && e.button !== 1) return;

    this.isErasing = true;
    this.lastPosition = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);
    this.lastVelocityTime = Date.now();
    this.accumulatedDistance = 0;
    this.currentRadius = this.baseRadius;

    this.emitCursor({
      x: this.lastPosition.x,
      y: this.lastPosition.y,
      radius: this.currentRadius,
      isDown: true,
    });

    this.performEraseAt(this.lastPosition, this.currentRadius);
  }

  public onPointerMove(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);

    // Update velocity-dependent eraser radius (Module 45330)
    if (this.lastPosition) {
      const dist = Math.hypot(worldPt.x - this.lastPosition.x, worldPt.y - this.lastPosition.y);
      this.accumulatedDistance += dist;

      const now = Date.now();
      const dt = (now - this.lastVelocityTime) / 1000;

      if (dt > 0.04) {
        const speed = this.accumulatedDistance / dt;
        // Acceleration / Deceleration smoothing
        const speedRatio = speed > this.lastMeasuredSpeed ? 0.7 : 0.3;
        this.lastMeasuredSpeed = speedRatio * speed + (1 - speedRatio) * this.lastMeasuredSpeed;

        const speedFactor = Math.max(1, this.lastMeasuredSpeed / this.speedSensitivityFactor);
        this.currentRadius = Math.min(this.maxRadius, Math.max(this.minRadius, this.baseRadius * speedFactor));

        this.accumulatedDistance = 0;
        this.lastVelocityTime = now;
      }
    }

    this.lastPosition = worldPt;

    this.emitCursor({
      x: worldPt.x,
      y: worldPt.y,
      radius: this.currentRadius,
      isDown: this.isErasing,
    });

    if (this.isErasing) {
      this.performEraseAt(worldPt, this.currentRadius);
    }
  }

  public onPointerUp(_e?: React.PointerEvent<HTMLDivElement> | PointerEvent) {
    if (!this.isErasing) return;
    this.isErasing = false;

    if (this.lastPosition) {
      this.emitCursor({
        x: this.lastPosition.x,
        y: this.lastPosition.y,
        radius: this.baseRadius,
        isDown: false,
      });
    }
  }

  public onPointerLeave() {
    this.isErasing = false;
    this.lastPosition = null;
    this.emitCursor(null);
  }

  public cancel() {
    this.isErasing = false;
    this.lastPosition = null;
    this.emitCursor(null);
  }

  /**
   * Performs hit-testing and execution for StrokeEraser or PointEraser
   */
  private performEraseAt(center: Point, eraserRadius: number) {
    const inkingState = inkingStore.getState();
    const mode = inkingState.eraser.mode;
    const allEntities = sceneStore.getAllEntities();

    // Collect all inking and highlighter strokes
    const strokeEntities: InkStrokeEntity[] = [];
    for (const ent of allEntities) {
      if (ent.type === 'stroke') {
        strokeEntities.push(ent as InkStrokeEntity);
      }
    }

    if (strokeEntities.length === 0) return;

    for (const stroke of strokeEntities) {
      // 1. Broadphase AABB rejection
      const effectiveRadius = eraserRadius + stroke.width / 2;
      const eraserAABB = {
        minX: center.x - effectiveRadius,
        maxX: center.x + effectiveRadius,
        minY: center.y - effectiveRadius,
        maxY: center.y + effectiveRadius,
      };

      if (
        stroke.bounds.maxX < eraserAABB.minX ||
        stroke.bounds.minX > eraserAABB.maxX ||
        stroke.bounds.maxY < eraserAABB.minY ||
        stroke.bounds.minY > eraserAABB.maxY
      ) {
        continue;
      }

      // 2. Narrowphase segment hit-test
      let hasHit = false;
      const points = stroke.points;

      for (let i = 0; i < points.length - 1; i++) {
        const d = distToSegment(center, points[i], points[i + 1]);
        if (d <= effectiveRadius) {
          hasHit = true;
          break;
        }
      }

      if (!hasHit && points.length === 1) {
        if (Math.hypot(center.x - points[0].x, center.y - points[0].y) <= effectiveRadius) {
          hasHit = true;
        }
      }

      if (!hasHit) continue;

      // 3. Action based on active Eraser Mode
      if (mode === 'StrokeEraser') {
        // Module 84781932 (class rt): Delete entire stroke entity
        sceneStore.removeEntity(stroke.id, true);
      } else {
        // Module 84781932 (class wt): Partial/Point Eraser (split stroke path)
        this.splitAndReplaceStroke(stroke, center, effectiveRadius);
      }
    }
  }

  /**
   * PointEraser: Splits stroke around eraser circle into continuous surviving segments
   */
  private splitAndReplaceStroke(
    stroke: InkStrokeEntity,
    center: Point,
    clipRadius: number
  ) {
    const survivingClusters: InkStrokePoint[][] = [];
    let currentCluster: InkStrokePoint[] = [];

    for (const pt of stroke.points) {
      const dist = Math.hypot(pt.x - center.x, pt.y - center.y);
      if (dist > clipRadius) {
        currentCluster.push(pt);
      } else {
        if (currentCluster.length > 0) {
          survivingClusters.push(currentCluster);
          currentCluster = [];
        }
      }
    }

    if (currentCluster.length > 0) {
      survivingClusters.push(currentCluster);
    }

    // Filter clusters that have at least 2 points (or single point dots)
    const validClusters = survivingClusters.filter((c) => c.length >= 1);

    if (validClusters.length === 0) {
      // Entire stroke was erased
      sceneStore.removeEntity(stroke.id, true);
    } else if (validClusters.length === 1 && validClusters[0].length === stroke.points.length) {
      // No points actually inside eraser radius (near-miss)
      return;
    } else {
      // Begin undo group for atomic replacement
      sceneStore.beginUndoGroup();

      // Remove the original stroke
      sceneStore.removeEntity(stroke.id, true);

      // Add each surviving fragment
      validClusters.forEach((cluster, idx) => {
        const newBounds = computeStrokeBounds(cluster, stroke.width, Boolean(stroke.arrowStart || stroke.arrowEnd));
        const subStroke: InkStrokeEntity = {
          ...stroke,
          id: `${stroke.id}_split_${idx}_${Date.now()}`,
          points: cluster,
          bounds: newBounds,
          // Arrow end is retained on the last fragment; arrow start on first fragment
          arrowStart: idx === 0 ? stroke.arrowStart : false,
          arrowEnd: idx === validClusters.length - 1 ? stroke.arrowEnd : false,
          updatedAt: Date.now(),
        };
        sceneStore.addEntity(subStroke, true);
      });

      sceneStore.endUndoGroup();
    }
  }
}

export const eraserTool = new EraserToolEngine();
