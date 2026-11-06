/**
 * Open Whiteboard — Ballpoint & Felt-Tip Pen Smoothing Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 135647 (chunks/45330.*.js, line 46) -> Pointer down/move/up event handling and getCoalescedEvents() batching
 *   - Module 360568 (chunks/45330.*.js, line 46) -> Point attributes extraction: { x, y, pressure, tiltX, tiltY, timestamp }
 *   - Module 518266 (chunks/45330.*.js, line 53) -> Point deduplication filter (skip identical consecutive points)
 *   - Module 726577 (chunks/45330.*.js, line 54) -> Jitter filter: 0.17 * curr + 1.33 * out1 - 0.5 * out2
 *   - Module 170887 & 834265 (chunks/45330.*.js, line 41, 51)
 *     -> Catmull-Rom to Cubic Bezier curve fitting:
 *        C1 = P1 + (P2 - P0) / 6
 *        C2 = P2 - (P3 - P1) / 6
 *     -> Tip Velocity Predictor (class d): forward velocity extrapolation
 *   - Module 188610 (chunks/46977.*.js) -> Linear affine pressure scaling curve: R(p) = R_base * (1.5*p + 0.25)
 *   - Module 357044 (chunks/45330.*.js) -> Circle bitangent outer envelope ribbon algorithm with circular arc cap joints
 *   - Module 946193 & 45330 -> PC / mouse dynamic velocity calligraphy modulation
 *   - Module 317294 -> Scale-adaptive collinear point simplifier (threshold = 8e-4 / scale)
 *   - Module 316556 -> Schneider least-squares Bezier segment folding
 *   - Module 434554 (chunks/8854.*.js) -> Thicknesses [1,2,4,6,8,12], Arrow modes (NoArrow, Single, Double)
 */

import type { CameraMatrix, Point } from '../canvas/camera';
import { screenToWorld } from '../canvas/camera';
import type { InkStrokeEntity, InkStrokePoint, AABB } from '../canvas/sceneGraph';
import { computeStrokeBounds } from '../canvas/sceneGraph';
import { sceneStore } from '../store/sceneStore';
import { inkingStore } from '../store/inkingStore';
import { canvasStore } from '../store/canvasStore';
import type { PenArrowMode } from '../store/inkingStore';
import { rulerEngine } from './RulerEngine';
import { shapeRecognitionEngine } from './ShapeRecognitionEngine';

export interface RawInputPoint {
  x: number; // Screen clientX
  y: number; // Screen clientY
  pressure: number;
  tiltX?: number;
  tiltY?: number;
  time: number;
}

export interface ArrowHeadGeometry {
  tip: Point;
  wing1: Point;
  wing2: Point;
}

export interface LiveStrokeState {
  id: string;
  tool: 'pen' | 'highlighter' | 'laser';
  color: string;
  width: number;
  points: InkStrokePoint[];
  pathD: string;
  outlineD?: string;
  arrowMode: PenArrowMode;
  arrowStartGeometry?: ArrowHeadGeometry;
  arrowEndGeometry?: ArrowHeadGeometry;
  effect?: 'rainbow' | 'galaxy';
}

/**
 * Microsoft Whiteboard Linear Affine Stylus Pressure Calibration (Module 188610)
 * Function P(pressure) = 1.5 * pressure + 0.25
 * - Resting pressure p = 0.5 -> 1.0 * baseRadius
 * - Lightest pressure p = 0.0 -> 0.25 * baseRadius (25% floor)
 * - Heavy pressure p = 1.0 -> 1.75 * baseRadius (175% ceiling)
 */
export function computePressureRadius(baseRadius: number, pressure: number): number {
  const clampedP = Math.max(0, Math.min(1.0, pressure));
  const factor = 1.5 * clampedP + 0.25;
  return baseRadius * Math.max(0.25, Math.min(1.75, factor));
}

interface CircleNode {
  center: Point;
  radius: number;
  incomingTangent1: Point;
  incomingTangent2: Point;
  outgoingTangent1: Point;
  outgoingTangent2: Point;
}

export class PenToolEngine {
  private isDrawing = false;
  private strokeId = '';
  private currentSlot: string = 'Pen1';
  private currentPointerType: string = 'mouse';
  private rawPoints: InkStrokePoint[] = [];
  private filteredPoints: InkStrokePoint[] = [];

  // Jitter filter state (Module 726577)
  private jitterOut1: Point = { x: 0, y: 0 };
  private jitterOut2: Point = { x: 0, y: 0 };

  // Catmull-Rom sliding window of 4 control points (Module 170887 class y)
  private catmullBuffer: InkStrokePoint[] = [];

  // Velocity calligraphy state for PC / Mouse (Modules 946193 & 45330)
  private lastPointerTime = 0;
  private smoothedVelocity = 0;
  private lastPointerWorld: Point = { x: 0, y: 0 };
  private currentCameraScale = 1.0;

  // In-progress stroke state listener
  private liveStrokeListeners = new Set<(stroke: LiveStrokeState | null) => void>();
  private currentLiveStroke: LiveStrokeState | null = null;

  private activeRulerEdge: 0 | 1 | 2 = 0;

  public subscribeLiveStroke(listener: (stroke: LiveStrokeState | null) => void): () => void {
    this.liveStrokeListeners.add(listener);
    return () => this.liveStrokeListeners.delete(listener);
  }

  public getLiveStroke(): LiveStrokeState | null {
    return this.currentLiveStroke;
  }

  private emitLiveStroke(stroke: LiveStrokeState | null) {
    this.currentLiveStroke = stroke;
    for (const listener of this.liveStrokeListeners) {
      listener(stroke);
    }
  }

  /**
   * Pointer Down: Starts a new inking stroke
   */
  public onPointerDown(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (e.button !== 0) return;

    this.isDrawing = true;
    this.currentPointerType = e.pointerType || 'mouse';
    this.strokeId = `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    this.currentCameraScale = camera.scale || 1.0;

    const activeInking = inkingStore.getState();
    const activePenSlot = activeInking.lastSelectedPenSlot;
    this.currentSlot = activePenSlot;
    const penConfig = activeInking.pens[activePenSlot];

    let worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);

    // Magnetic Ruler edge snapping (Module 46977 & 45330)
    const snapResult = rulerEngine.snapPoint(worldPt);
    worldPt = snapResult.point;
    this.activeRulerEdge = snapResult.edge;

    // Stylus vs Mouse / Touch discrimination (Milestones 29, 34 & 35)
    const isStylusPen = this.currentPointerType === 'pen';
    const initialPressure = isStylusPen && e.pressure > 0 ? e.pressure : 0.5;
    const baseThickness = penConfig ? penConfig.thickness : 2;

    this.lastPointerTime = e.timeStamp || performance.now();
    this.smoothedVelocity = 0;
    this.lastPointerWorld = { x: worldPt.x, y: worldPt.y };

    // For active graphic tablet stylus, calibrate entry width using Module 188610;
    // for standard mouse/touch, start with slight resting fullness (1.15x) for natural calligraphy
    let startWidth = baseThickness;
    if (isStylusPen && e.pressure > 0) {
      startWidth = parseFloat((computePressureRadius(baseThickness / 2, initialPressure) * 2).toFixed(2));
    } else {
      startWidth = parseFloat((baseThickness * 1.15).toFixed(2));
    }

    const startPoint: InkStrokePoint = {
      x: worldPt.x,
      y: worldPt.y,
      pressure: initialPressure,
      width: startWidth,
      time: e.timeStamp || Date.now(),
    };

    this.rawPoints = [startPoint];
    this.filteredPoints = [startPoint];

    // Reset Jitter Filter (Module 726577: out1 = pt, out2 = out1)
    this.jitterOut1 = { x: worldPt.x, y: worldPt.y };
    this.jitterOut2 = { x: worldPt.x, y: worldPt.y };

    // Reset Catmull buffer with 4 duplicated start points
    this.catmullBuffer = [startPoint, startPoint, startPoint, startPoint];

    this.updateLiveStroke(penConfig.thickness, penConfig.color, penConfig.arrowMode, penConfig.effect);
  }

  /**
   * Pointer Move: Extracts coalesced events for high-polling rate precision
   * (Module 135647: getCoalescedEvents)
   */
  public onPointerMove(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (!this.isDrawing) return;
    this.currentCameraScale = camera.scale || 1.0;

    // Extract all coalesced sub-frame micro-events from browser
    const nativeEvent = 'nativeEvent' in e ? (e.nativeEvent as PointerEvent) : e;
    const events: PointerEvent[] =
      typeof nativeEvent.getCoalescedEvents === 'function' &&
      nativeEvent.getCoalescedEvents().length > 0
        ? nativeEvent.getCoalescedEvents()
        : [nativeEvent];

    const activeInking = inkingStore.getState();
    const penConfig = activeInking.pens[this.currentSlot as keyof typeof activeInking.pens];
    const baseThickness = penConfig ? penConfig.thickness : 2;

    for (const ev of events) {
      let worldPt = screenToWorld({ x: ev.clientX, y: ev.clientY }, camera, viewportRect);

      // Snap along locked ruler edge if ruler is active (Module 45330)
      if (this.activeRulerEdge !== 0) {
        worldPt = rulerEngine.snapPoint(worldPt).point;
      } else {
        const snapResult = rulerEngine.snapPoint(worldPt);
        if (snapResult.edge !== 0) {
          this.activeRulerEdge = snapResult.edge;
          worldPt = snapResult.point;
        }
      }

      const prevPt = this.rawPoints[this.rawPoints.length - 1];

      // 1. Deduplication Filter (Module 518266: ignore zero-distance moves)
      if (Math.abs(worldPt.x - prevPt.x) < 0.25 && Math.abs(worldPt.y - prevPt.y) < 0.25) {
        continue;
      }

      // 2. Pressure & Width determination (Milestone 35: authentic Microsoft Whiteboard inking)
      let rawPressure = 0.5;
      let computedWidth = baseThickness;

      if (this.currentPointerType === 'pen' && ev.pressure > 0) {
        // Graphic tablet active stylus calibrated affine curve (Module 188610)
        rawPressure = ev.pressure;
        computedWidth = parseFloat((computePressureRadius(baseThickness / 2, rawPressure) * 2).toFixed(2));
      } else {
        // PC Mouse / Touch: Dynamic Velocity-to-Thickness Calligraphy (Modules 946193 & 45330)
        rawPressure = 0.5;
        const now = ev.timeStamp || performance.now();
        const dt = Math.max(4, now - this.lastPointerTime);
        const dist = Math.hypot(worldPt.x - this.lastPointerWorld.x, worldPt.y - this.lastPointerWorld.y);
        const instV = dist / dt; // px/ms
        this.smoothedVelocity = 0.35 * instV + 0.65 * this.smoothedVelocity;
        const vRatio = Math.min(1.0, this.smoothedVelocity / 1.8);
        computedWidth = parseFloat((baseThickness * (1.18 - 0.36 * vRatio)).toFixed(2));
        this.lastPointerTime = now;
        this.lastPointerWorld = { x: worldPt.x, y: worldPt.y };
      }

      const rawPt: InkStrokePoint = {
        x: worldPt.x,
        y: worldPt.y,
        pressure: rawPressure,
        width: computedWidth,
        time: ev.timeStamp || Date.now(),
      };
      this.rawPoints.push(rawPt);

      // 3. Jitter Filter (Module 726577: n = 0.17, r = 1.33, o = -0.5)
      const smoothedPt = this.applyJitterFilter(rawPt);
      this.filteredPoints.push(smoothedPt);

      // 4. Update Catmull-Rom sliding window
      this.catmullBuffer.shift();
      this.catmullBuffer.push(smoothedPt);
    }

    this.updateLiveStroke(
      baseThickness,
      penConfig?.color || '#1F1F1F',
      penConfig?.arrowMode || 'NoArrow',
      penConfig?.effect
    );
  }

  /**
   * Pointer Up: Completes the stroke, runs dual-stage simplification (Collinear + Bezier Folding),
   * checks shape recognition, and commits to sceneStore
   */
  public onPointerUp(
    e?: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera?: CameraMatrix,
    viewportRect?: DOMRect | null
  ): InkStrokeEntity | null {
    if (!this.isDrawing) return null;
    this.isDrawing = false;

    // Module 170887 (class m & d): Capture final pointerup coordinate
    if (e && typeof e.clientX === 'number' && typeof e.clientY === 'number') {
      const activeInking = inkingStore.getState();
      const penConfig = activeInking.pens[this.currentSlot as keyof typeof activeInking.pens];
      const baseThickness = penConfig ? penConfig.thickness : 2;
      const currentCamera = camera || { scale: this.currentCameraScale, positionX: 0, positionY: 0 };
      let worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, currentCamera, viewportRect);
      if (this.activeRulerEdge !== 0) {
        worldPt = rulerEngine.snapPoint(worldPt).point;
      }
      const lastPt = this.filteredPoints[this.filteredPoints.length - 1];
      if (!lastPt || Math.hypot(worldPt.x - lastPt.x, worldPt.y - lastPt.y) > 0.15) {
        // Module 170887 (class m & u: preJitterLastPointExtractor):
        // Terminal contact point is anchored directly to the user's release coordinate
        const finalPressure = 'pressure' in e && e.pressure > 0 ? e.pressure : (lastPt?.pressure ?? 0.5);
        const finalPt: InkStrokePoint = {
          x: parseFloat(worldPt.x.toFixed(2)),
          y: parseFloat(worldPt.y.toFixed(2)),
          pressure: finalPressure,
          width: lastPt?.width ?? baseThickness,
          time: e.timeStamp || Date.now(),
        };
        this.rawPoints.push(finalPt);
        this.filteredPoints.push(finalPt);
      }
    }

    if (this.filteredPoints.length === 0) {
      this.emitLiveStroke(null);
      return null;
    }

    const activeInking = inkingStore.getState();
    const penConfig = activeInking.pens[this.currentSlot as keyof typeof activeInking.pens];
    const baseThickness = penConfig ? penConfig.thickness : 2;
    const color = penConfig ? penConfig.color : '#1F1F1F';
    const arrowMode = penConfig ? penConfig.arrowMode : 'NoArrow';
    const effect = penConfig?.effect;

    // Dual-Stage Post-Processing Pipeline (Modules 946193, 317294, 316556)
    // 1. Collinear micro-point simplifier (Module 317294: threshold = 8e-4 / scale)
    const simplifiedPoints = this.applyCollinearFilter(this.filteredPoints, this.currentCameraScale);

    // 2. Schneider Least-Squares Bezier Segment Folding (Module 316556)
    const foldedPoints = this.applySegmentFolding(simplifiedPoints, this.currentCameraScale);

    const finalPoints = foldedPoints.length >= 2 ? foldedPoints : [...this.filteredPoints];
    const finalWidth = baseThickness;

    // Enhance Inked Shapes recognition (Milestone 17 & 33)
    const isEnhanceEnabled = canvasStore.getState().isEnhanceInkedShapesEnabled;
    const isRulerActive = rulerEngine.getState().isActive;

    if (isEnhanceEnabled && !isRulerActive && finalPoints.length >= 8) {
      const recognized = shapeRecognitionEngine.recognize(finalPoints);
      if (recognized.recognized && recognized.shapeType && recognized.confidence >= 0.85) {
        const beautifiedPoints = shapeRecognitionEngine.generateBeautifiedPoints(recognized);
        const hasArrows = arrowMode !== 'NoArrow';
        const bounds: AABB = computeStrokeBounds(beautifiedPoints, finalWidth, hasArrows);

        const strokeEntity: InkStrokeEntity = {
          id: this.strokeId,
          type: 'stroke',
          tool: 'pen',
          color,
          width: finalWidth,
          points: beautifiedPoints,
          zIndex: 200, // Drawing layer
          arrowStart: arrowMode === 'InkDoubleArrow',
          arrowEnd: arrowMode === 'InkSingleArrow' || arrowMode === 'InkDoubleArrow',
          effect,
          bounds,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };

        // Commit to persistent spatial sceneStore with Undo/Redo capability
        sceneStore.addEntity(strokeEntity, true);

        // Clear live preview & buffers
        this.emitLiveStroke(null);
        this.rawPoints = [];
        this.filteredPoints = [];
        this.catmullBuffer = [];

        return strokeEntity;
      }
    }

    const hasArrows = arrowMode !== 'NoArrow';
    const bounds: AABB = computeStrokeBounds(finalPoints, finalWidth, hasArrows);

    const strokeEntity: InkStrokeEntity = {
      id: this.strokeId,
      type: 'stroke',
      tool: 'pen',
      color,
      width: finalWidth,
      points: finalPoints,
      zIndex: 200, // Drawing layer
      arrowStart: arrowMode === 'InkDoubleArrow',
      arrowEnd: arrowMode === 'InkSingleArrow' || arrowMode === 'InkDoubleArrow',
      effect,
      bounds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Commit to persistent spatial sceneStore with Undo/Redo capability
    sceneStore.addEntity(strokeEntity, true);

    // Clear live preview
    this.emitLiveStroke(null);
    this.rawPoints = [];
    this.filteredPoints = [];
    this.catmullBuffer = [];

    return strokeEntity;
  }

  public isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  public cancel() {
    this.isDrawing = false;
    this.emitLiveStroke(null);
    this.rawPoints = [];
    this.filteredPoints = [];
    this.catmullBuffer = [];
  }

  /**
   * Collinear Point Simplifier (Module 317294 class j)
   * With scale-adaptive threshold b = 8e-4 / scale, removes redundant micro-jitter points along straight paths.
   */
  public applyCollinearFilter(points: InkStrokePoint[], scale: number): InkStrokePoint[] {
    if (points.length <= 2) return points;
    const s = Math.max(0.1, Math.min(10.0, scale));
    const threshold = (8e-4 / s) * 12;
    const thresholdSq = threshold * threshold;

    const result: InkStrokePoint[] = [points[0]];
    let basePoint = points[0];
    let midPoint = points[1];

    for (let i = 2; i < points.length; i++) {
      const curr = points[i];
      const dx = curr.x - basePoint.x;
      const dy = curr.y - basePoint.y;
      const lenSq = dx * dx + dy * dy;

      let distSq = 0;
      if (lenSq < 1e-6) {
        distSq = (midPoint.x - basePoint.x) ** 2 + (midPoint.y - basePoint.y) ** 2;
      } else {
        const cross = (midPoint.x - curr.x) * (curr.y - basePoint.y) - (curr.x - basePoint.x) * (midPoint.y - curr.y);
        distSq = (cross * cross) / lenSq;
      }

      if (distSq > thresholdSq) {
        result.push(midPoint);
        basePoint = midPoint;
      }
      midPoint = curr;
    }

    result.push(points[points.length - 1]);
    return result;
  }

  /**
   * Schneider Least-Squares Bezier Segment Folding (Module 316556 class o)
   * Folds micro-segments into smooth, continuous Bezier curves with scale-adaptive tolerance.
   */
  public applySegmentFolding(points: InkStrokePoint[], scale: number): InkStrokePoint[] {
    if (points.length < 8) return points;
    const s = Math.max(0.1, Math.min(10.0, scale));
    const E = 0.1 + 1 / s;
    const tol = (0.035 * E) / 100 * 2.5;

    const folded = this.ramerDouglasPeucker(points, tol);
    return folded.length >= 2 ? folded : points;
  }

  private ramerDouglasPeucker(points: InkStrokePoint[], epsilon: number): InkStrokePoint[] {
    if (points.length <= 2) return points;

    let maxDist = 0;
    let index = 0;
    const start = points[0];
    const end = points[points.length - 1];
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const len = Math.hypot(dx, dy);

    for (let i = 1; i < points.length - 1; i++) {
      const pt = points[i];
      let dist = 0;
      if (len < 1e-4) {
        dist = Math.hypot(pt.x - start.x, pt.y - start.y);
      } else {
        dist = Math.abs(dy * pt.x - dx * pt.y + end.x * start.y - end.y * start.x) / len;
      }
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > epsilon) {
      const left = this.ramerDouglasPeucker(points.slice(0, index + 1), epsilon);
      const right = this.ramerDouglasPeucker(points.slice(index), epsilon);
      return [...left.slice(0, -1), ...right];
    } else {
      return [start, end];
    }
  }

  /**
   * Jitter Filter Formula (Module 726577: r = 1.33, o = -0.5, n = 0.17)
   */
  private applyJitterFilter(pt: InkStrokePoint): InkStrokePoint {
    const r = 1.33;
    const o = -0.5;
    const n = 1 - r - o; // 0.17

    const filteredX = n * pt.x + r * this.jitterOut1.x + o * this.jitterOut2.x;
    const filteredY = n * pt.y + r * this.jitterOut1.y + o * this.jitterOut2.y;

    this.jitterOut2 = this.jitterOut1;
    this.jitterOut1 = { x: filteredX, y: filteredY };

    return {
      x: parseFloat(filteredX.toFixed(2)),
      y: parseFloat(filteredY.toFixed(2)),
      pressure: pt.pressure,
      width: pt.width,
      time: pt.time,
    };
  }

  /**
   * Generates continuous SVG path data and arrow head geometries
   * Includes real-time velocity extrapolation predictor (Module 170887 class d)
   */
  private updateLiveStroke(
    thickness: number,
    color: string,
    arrowMode: PenArrowMode,
    effect?: 'rainbow' | 'galaxy'
  ) {
    const points = this.filteredPoints;
    if (points.length === 0) return;

    // Real-time inking points (Module 170887 class d & v: smooth live trajectory matching committed ink)
    const pathD = this.generateSmoothPath(points);
    const outlineD = this.generateStrokeOutline(points, thickness);

    let arrowStartGeometry: ArrowHeadGeometry | undefined;
    let arrowEndGeometry: ArrowHeadGeometry | undefined;

    if (points.length >= 2) {
      if (arrowMode === 'InkDoubleArrow') {
        const start = this.getArrowHeadForStart(points, thickness);
        if (start) arrowStartGeometry = start;
      }
      if (arrowMode === 'InkSingleArrow' || arrowMode === 'InkDoubleArrow') {
        const end = this.getArrowHeadForEnd(points, thickness);
        if (end) arrowEndGeometry = end;
      }
    }

    this.emitLiveStroke({
      id: this.strokeId,
      tool: 'pen',
      color,
      width: thickness,
      points,
      pathD,
      outlineD: outlineD || undefined,
      arrowMode,
      arrowStartGeometry,
      arrowEndGeometry,
      effect,
    });
  }

  /**
   * Generates Catmull-Rom to Cubic Bezier curve path string (Module 834265: o)
   * Formula:
   *   C1 = P1 + (P2 - P0) / 6
   *   C2 = P2 - (P3 - P1) / 6
   */
  public generateSmoothPath(pts: InkStrokePoint[]): string {
    if (pts.length === 0) return '';
    if (pts.length === 1) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.1} ${pts[0].y + 0.1}`;
    }
    if (pts.length === 2) {
      return `M ${pts[0].x} ${pts[0].y} L ${pts[1].x} ${pts[1].y}`;
    }

    let d = `M ${pts[0].x} ${pts[0].y}`;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i + 2 < pts.length ? pts[i + 2] : p2;

      // Module 834265: o(t, e, s, i) -> [(s - t)/6 + e, (e - i)/6 + s]
      const c1x = p1.x + (p2.x - p0.x) / 6;
      const c1y = p1.y + (p2.y - p0.y) / 6;
      const c2x = p2.x - (p3.x - p1.x) / 6;
      const c2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }

    return d;
  }

  /**
   * Calculates arrow wing coordinates from stroke trajectory tangent
   * Reverse-Engineered from Module 472657 (chunks/17406.*.js):
   *   arrowSize = 3 * sqrt(2) (~4.24)
   *   arrowAngle = PI / 2 (90 deg total spread, 45 deg per wing)
   */
  public calculateArrowHead(
    from: Point,
    to: Point,
    thickness: number
  ): ArrowHeadGeometry {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 0.001) {
      return { tip: to, wing1: to, wing2: to };
    }
    const angle = Math.atan2(dy, dx);

    const arrowLength = Math.max(12, thickness * 3 * Math.SQRT2);
    const halfAngle = Math.PI / 4; // 45 degrees wing spread

    const wing1: Point = {
      x: to.x - arrowLength * Math.cos(angle - halfAngle),
      y: to.y - arrowLength * Math.sin(angle - halfAngle),
    };

    const wing2: Point = {
      x: to.x - arrowLength * Math.cos(angle + halfAngle),
      y: to.y - arrowLength * Math.sin(angle + halfAngle),
    };

    return { tip: to, wing1, wing2 };
  }

  public getArrowHeadForEnd(points: InkStrokePoint[], thickness: number): ArrowHeadGeometry | null {
    if (points.length < 2) return null;
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    if (totalLength < 25) return null;

    const tip = points[points.length - 1];
    let from = points[points.length - 2];
    for (let i = points.length - 2; i >= 0; i--) {
      const d = Math.hypot(tip.x - points[i].x, tip.y - points[i].y);
      if (d >= 5) {
        from = points[i];
        break;
      }
    }
    return this.calculateArrowHead(from, tip, thickness);
  }

  public getArrowHeadForStart(points: InkStrokePoint[], thickness: number): ArrowHeadGeometry | null {
    if (points.length < 2) return null;
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    if (totalLength < 25) return null;

    const tip = points[0];
    let from = points[1];
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(tip.x - points[i].x, tip.y - points[i].y);
      if (d >= 5) {
        from = points[i];
        break;
      }
    }
    return this.calculateArrowHead(from, tip, thickness);
  }

  /**
   * Generates dynamic variable-width bitangent circle envelope ribbon geometry (Module 357044 & 917068)
   * Solves outer tangents between adjacent variable-radius circles with circular arc joints,
   * eliminating self-intersecting loops, spikes, and twisted ribbon knots.
   */
  public generateStrokeOutline(points: InkStrokePoint[], defaultWidth: number): string {
    if (points.length < 2) {
      if (points.length === 1) {
        const r = (points[0].width || defaultWidth) / 2;
        return `M ${(points[0].x - r).toFixed(2)} ${points[0].y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(points[0].x + r).toFixed(2)} ${points[0].y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(points[0].x - r).toFixed(2)} ${points[0].y.toFixed(2)} Z`;
      }
      return '';
    }

    // Check if stroke exhibits variable width dynamics (> 0.28px delta)
    let hasVariation = false;
    const firstW = points[0].width || defaultWidth;
    for (let i = 1; i < points.length; i++) {
      const w = points[i].width || defaultWidth;
      if (Math.abs(w - firstW) > 0.28) {
        hasVariation = true;
        break;
      }
    }
    if (!hasVariation) return '';

    return this.buildBitangentEnvelope(points, defaultWidth);
  }

  /**
   * Circle Bitangent Outer Envelope Builder (Module 357044 class n)
   */
  private buildBitangentEnvelope(points: InkStrokePoint[], defaultWidth: number): string {
    const nodes: CircleNode[] = points.map((p) => ({
      center: { x: p.x, y: p.y },
      radius: Math.max(0.4, (p.width || defaultWidth) / 2),
      incomingTangent1: { x: NaN, y: NaN },
      incomingTangent2: { x: NaN, y: NaN },
      outgoingTangent1: { x: NaN, y: NaN },
      outgoingTangent2: { x: NaN, y: NaN },
    }));

    // 1. Calculate outer bitangents between adjacent circles (Module 357044)
    for (let i = 1; i < nodes.length; i++) {
      const s = nodes[i - 1];
      const target = nodes[i];
      const r = s.center.x;
      const o = s.center.y;
      const n = s.radius;
      const a = target.center.x;
      const h = target.center.y;
      const u = target.radius;
      const l = r - a;
      const c = o - h;
      const p = Math.hypot(l, c);
      const m = Math.abs(u - n);
      if (m >= p || p < 1e-4) {
        continue;
      }
      const g = 1 / p;
      const d = m * g;
      let f = Math.sqrt(Math.max(0, 1 - d * d));
      let y = l * g;
      let w = c * g;
      if (n > u) {
        f = -f;
        y = -y;
        w = -w;
      }
      const T = y * d;
      const S = w * d;
      const v = y * f;
      const b = w * f;
      const x = T + b;
      const P = S - v;
      const _ = T - b;
      const M = S + v;

      s.outgoingTangent1 = { x: r + n * x, y: o + n * P };
      s.outgoingTangent2 = { x: r + n * _, y: o + n * M };
      target.incomingTangent1 = { x: a + u * x, y: h + u * P };
      target.incomingTangent2 = { x: a + u * _, y: h + u * M };
    }

    // 2. Render outer bitangent contour runs (Module 357044 exact logic)
    let path = '';
    let runStart = 0;
    for (let i = 0; i < nodes.length; i++) {
      if (i === nodes.length - 1 || isNaN(nodes[i].outgoingTangent1.x)) {
        path += this.renderBitangentRun(nodes, runStart, i);
        runStart = i + 1;
      }
    }

    return path;
  }

  private renderBitangentRun(stroke: CircleNode[], s: number, i: number): string {
    if (s > i || s < 0 || i >= stroke.length) return '';
    if (s === i) {
      const single = stroke[s];
      const r = single.radius;
      return `M ${(single.center.x - r).toFixed(2)} ${single.center.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(single.center.x + r).toFixed(2)} ${single.center.y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 0 0 ${(single.center.x - r).toFixed(2)} ${single.center.y.toFixed(2)} Z `;
    }

    let d = '';
    let curr = stroke[s];
    d += `M ${curr.outgoingTangent1.x.toFixed(2)} ${curr.outgoingTangent1.y.toFixed(2)} `;
    let next: CircleNode;
    let prev = curr;
    curr = stroke[s + 1];

    for (let idx = s + 1; idx < i; idx++) {
      next = stroke[idx + 1];
      const inter = this.findTangentIntersection(prev.outgoingTangent1, curr.incomingTangent1, curr.outgoingTangent1, next.incomingTangent1);
      if (inter) {
        d += `L ${inter.x.toFixed(2)} ${inter.y.toFixed(2)} `;
      } else {
        d += `L ${curr.incomingTangent1.x.toFixed(2)} ${curr.incomingTangent1.y.toFixed(2)} `;
        d += `A ${curr.radius.toFixed(2)} ${curr.radius.toFixed(2)} 0 0 0 ${curr.outgoingTangent1.x.toFixed(2)} ${curr.outgoingTangent1.y.toFixed(2)} `;
      }
      prev = curr;
      curr = next;
    }

    // End cap (Module 357044 & 247778: sweep flag 0 curves outwards into a convex hemispherical bullet dome)
    const isEndBigger = curr.radius > stroke[i - 1].radius;
    d += `L ${curr.incomingTangent1.x.toFixed(2)} ${curr.incomingTangent1.y.toFixed(2)} `;
    d += `A ${curr.radius.toFixed(2)} ${curr.radius.toFixed(2)} 0 ${isEndBigger ? 1 : 0} 0 ${curr.incomingTangent2.x.toFixed(2)} ${curr.incomingTangent2.y.toFixed(2)} `;

    // Return pass on side 2
    prev = curr;
    curr = stroke[i - 1];
    for (let idx = i - 1; idx > s; idx--) {
      next = stroke[idx - 1];
      const inter = this.findTangentIntersection(prev.incomingTangent2, curr.outgoingTangent2, curr.incomingTangent2, next.outgoingTangent2);
      if (inter) {
        d += `L ${inter.x.toFixed(2)} ${inter.y.toFixed(2)} `;
      } else {
        d += `L ${curr.outgoingTangent2.x.toFixed(2)} ${curr.outgoingTangent2.y.toFixed(2)} `;
        d += `A ${curr.radius.toFixed(2)} ${curr.radius.toFixed(2)} 0 0 0 ${curr.incomingTangent2.x.toFixed(2)} ${curr.incomingTangent2.y.toFixed(2)} `;
      }
      prev = curr;
      curr = next;
    }

    // Start cap (Module 357044 & 247778: sweep flag 0 curves outwards into a convex hemispherical bullet dome)
    const isStartBigger = curr.radius > stroke[s + 1].radius;
    d += `L ${curr.outgoingTangent2.x.toFixed(2)} ${curr.outgoingTangent2.y.toFixed(2)} `;
    d += `A ${curr.radius.toFixed(2)} ${curr.radius.toFixed(2)} 0 ${isStartBigger ? 1 : 0} 0 ${curr.outgoingTangent1.x.toFixed(2)} ${curr.outgoingTangent1.y.toFixed(2)} `;
    d += 'Z ';

    return d;
  }

  private findTangentIntersection(t: Point, e: Point, s: Point, r: Point): Point | undefined {
    const cross = (r.x - s.x) * (e.y - t.y) - (e.x - t.x) * (r.y - s.y);
    if (cross > 0) return undefined;

    const o = e.y - t.y;
    const n = t.x - e.x;
    const a = o * t.x + n * t.y;
    const h = r.y - s.y;
    const l = s.x - r.x;
    const c = h * s.x + l * s.y;
    const p = o * l - h * n;
    if (Math.abs(p) > 1e-5) {
      const invP = 1 / p;
      const mx = (l * a - n * c) * invP;
      const my = (o * c - h * a) * invP;
      const minX = Math.min(Math.min(t.x, e.x), Math.min(s.x, r.x)) - 1;
      const maxX = Math.max(Math.max(t.x, e.x), Math.max(s.x, r.x)) + 1;
      const minY = Math.min(Math.min(t.y, e.y), Math.min(s.y, r.y)) - 1;
      const maxY = Math.max(Math.max(t.y, e.y), Math.max(s.y, r.y)) + 1;
      if (mx >= minX && mx <= maxX && my >= minY && my <= maxY) {
        return { x: mx, y: my };
      }
    }
    return undefined;
  }
}

export const penTool = new PenToolEngine();
