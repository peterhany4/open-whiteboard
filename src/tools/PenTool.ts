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
 *   - Module 434554 (chunks/8854.*.js) -> Thicknesses [1,2,4,6,8,12], Arrow modes (NoArrow, Single, Double)
 */

import type { CameraMatrix, Point } from '../canvas/camera';
import { screenToWorld } from '../canvas/camera';
import type { InkStrokeEntity, InkStrokePoint, AABB } from '../canvas/sceneGraph';
import { computeStrokeBounds } from '../canvas/sceneGraph';
import { sceneStore } from '../store/sceneStore';
import { inkingStore } from '../store/inkingStore';
import type { PenArrowMode } from '../store/inkingStore';
import { rulerEngine } from './RulerEngine';

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
  arrowMode: PenArrowMode;
  arrowStartGeometry?: ArrowHeadGeometry;
  arrowEndGeometry?: ArrowHeadGeometry;
  effect?: 'rainbow' | 'galaxy';
}

export class PenToolEngine {
  private isDrawing = false;
  private strokeId = '';
  private currentSlot: string = 'Pen1';
  private rawPoints: InkStrokePoint[] = [];
  private filteredPoints: InkStrokePoint[] = [];

  // Jitter filter state (Module 726577)
  private jitterOut1: Point = { x: 0, y: 0 };
  private jitterOut2: Point = { x: 0, y: 0 };

  // Catmull-Rom sliding window of 4 control points (Module 170887 class y)
  private catmullBuffer: InkStrokePoint[] = [];

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
    this.strokeId = `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const activeInking = inkingStore.getState();
    const activePenSlot = activeInking.lastSelectedPenSlot;
    this.currentSlot = activePenSlot;
    const penConfig = activeInking.pens[activePenSlot];

    let worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);

    // Magnetic Ruler edge snapping (Module 46977 & 45330)
    const snapResult = rulerEngine.snapPoint(worldPt);
    worldPt = snapResult.point;
    this.activeRulerEdge = snapResult.edge;

    // Initial pressure calibration (default 0.5 if 0 or unsupported)
    const initialPressure = e.pressure > 0 ? e.pressure : 0.5;

    const startPoint: InkStrokePoint = {
      x: worldPt.x,
      y: worldPt.y,
      pressure: initialPressure,
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

      // 2. Velocity-Adaptive Pressure calculation (when drawing with mouse or constant pressure)
      const dt = Math.max(1, (ev.timeStamp || Date.now()) - (prevPt.time || Date.now()));
      const dist = Math.hypot(worldPt.x - prevPt.x, worldPt.y - prevPt.y);
      const velocity = dist / dt; // pixels per millisecond

      let pressure = ev.pressure;
      if (pressure <= 0 || ev.pointerType === 'mouse') {
        // Fast movement = thinner line; Slow movement = thicker line
        const velocityFactor = Math.max(0.3, Math.min(1.4, 1.25 - velocity * 0.2));
        pressure = 0.5 * velocityFactor;
      }

      const rawPt: InkStrokePoint = {
        x: worldPt.x,
        y: worldPt.y,
        pressure,
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
   * Pointer Up: Completes the stroke, adds arrow caps if enabled, and commits to sceneStore
   */
  public onPointerUp(
    _e?: React.PointerEvent<HTMLDivElement> | PointerEvent
  ): InkStrokeEntity | null {
    if (!this.isDrawing) return null;
    this.isDrawing = false;

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

    // Build finalized points
    const finalPoints = [...this.filteredPoints];

    // Compute dynamic velocity / pressure width modulation
    let totalPressure = 0;
    for (const pt of finalPoints) {
      totalPressure += pt.pressure ?? 0.5;
    }
    const avgPressure = finalPoints.length > 0 ? totalPressure / finalPoints.length : 0.5;
    const modulatedWidth = parseFloat((baseThickness * (0.4 + 1.2 * avgPressure)).toFixed(2));
    const finalWidth = Math.max(1, Math.min(baseThickness * 1.8, modulatedWidth));

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
      time: pt.time,
    };
  }

  /**
   * Generates continuous SVG path data and arrow head geometries
   */
  private updateLiveStroke(
    thickness: number,
    color: string,
    arrowMode: PenArrowMode,
    effect?: 'rainbow' | 'galaxy'
  ) {
    const points = this.filteredPoints;
    if (points.length === 0) return;

    const pathD = this.generateSmoothPath(points);

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

  /**
   * Gets arrow geometry for stroke end with backward directionThreshold search (Module 472657)
   */
  public getArrowHeadForEnd(points: InkStrokePoint[], thickness: number): ArrowHeadGeometry | null {
    if (points.length < 2) return null;
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    // strokeLengthThreshold = 25px
    if (totalLength < 25) return null;

    const tip = points[points.length - 1];
    let from = points[points.length - 2];
    for (let i = points.length - 2; i >= 0; i--) {
      const d = Math.hypot(tip.x - points[i].x, tip.y - points[i].y);
      if (d >= 5) { // directionThreshold = 5px
        from = points[i];
        break;
      }
    }
    return this.calculateArrowHead(from, tip, thickness);
  }

  /**
   * Gets arrow geometry for stroke start with forward directionThreshold search (Module 472657)
   */
  public getArrowHeadForStart(points: InkStrokePoint[], thickness: number): ArrowHeadGeometry | null {
    if (points.length < 2) return null;
    let totalLength = 0;
    for (let i = 1; i < points.length; i++) {
      totalLength += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    }
    // strokeLengthThreshold = 25px
    if (totalLength < 25) return null;

    const tip = points[0];
    let from = points[1];
    for (let i = 1; i < points.length; i++) {
      const d = Math.hypot(tip.x - points[i].x, tip.y - points[i].y);
      if (d >= 5) { // directionThreshold = 5px
        from = points[i];
        break;
      }
    }
    return this.calculateArrowHead(from, tip, thickness);
  }
}

export const penTool = new PenToolEngine();
