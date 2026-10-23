/**
 * Microsoft Whiteboard — Chisel-Tip Highlighter Tool Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 65345 (chunks/65345.*.js, line 59-60)
 *     -> Tip geometry: "rectangle" === tip -> chisel-tip rectangular stroke
 *   - Module 40049 & 786285 (chunks/40049.*.js)
 *     -> InkingTool.Highlighter, thickness presets [8, 12, 16, 24, 28, 32]
 *   - Module 434554 (chunks/8854.*.js)
 *     -> 15 Highlighter palette swatches
 *   - Module 272120 & 605051 (chunks/BoardEditorComponent-3257753e.*.js)
 *     -> mixBlendMode: Light Mode uses "multiply" / "darken", Dark Mode uses calibrated overlay
 *   - Module 807952 & 747567 (chunks/BoardEditorComponent-31743c5a.*.js)
 *     -> Ink anchoring & z-index layer separation (highlighters rendered below ink strokes)
 */

import type { CameraMatrix, Point } from '../canvas/camera';
import { screenToWorld } from '../canvas/camera';
import type { InkStrokeEntity, InkStrokePoint, AABB } from '../canvas/sceneGraph';
import { computeStrokeBounds } from '../canvas/sceneGraph';
import { sceneStore } from '../store/sceneStore';
import { inkingStore } from '../store/inkingStore';
import { penTool } from './PenTool';
import { rulerEngine } from './RulerEngine';

export interface LiveHighlighterState {
  id: string;
  color: string;
  width: number;
  points: InkStrokePoint[];
  pathD: string;
}

export class HighlighterToolEngine {
  private isDrawing = false;
  private strokeId = '';
  private activeRulerEdge: 0 | 1 | 2 = 0;
  private rawPoints: InkStrokePoint[] = [];
  private filteredPoints: InkStrokePoint[] = [];

  // Tremor jitter filter state (Module 726577)
  private jitterOut1: Point = { x: 0, y: 0 };
  private jitterOut2: Point = { x: 0, y: 0 };

  private liveListeners = new Set<(stroke: LiveHighlighterState | null) => void>();
  private currentLiveStroke: LiveHighlighterState | null = null;

  public subscribeLiveStroke(listener: (stroke: LiveHighlighterState | null) => void): () => void {
    this.liveListeners.add(listener);
    return () => this.liveListeners.delete(listener);
  }

  public getLiveStroke(): LiveHighlighterState | null {
    return this.currentLiveStroke;
  }

  public isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  private emitLiveStroke(stroke: LiveHighlighterState | null) {
    this.currentLiveStroke = stroke;
    for (const listener of this.liveListeners) {
      listener(stroke);
    }
  }

  public onPointerDown(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (e.button !== 0) return;

    this.isDrawing = true;
    this.strokeId = `highlighter_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

    const activeInking = inkingStore.getState();
    const config = activeInking.highlighter;

    let worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);

    // Magnetic Ruler edge snapping (Module 46977 & 45330)
    const snapResult = rulerEngine.snapPoint(worldPt);
    worldPt = snapResult.point;
    this.activeRulerEdge = snapResult.edge;

    const startPoint: InkStrokePoint = {
      x: worldPt.x,
      y: worldPt.y,
      pressure: 0.5,
      time: e.timeStamp || Date.now(),
    };

    this.rawPoints = [startPoint];
    this.filteredPoints = [startPoint];

    this.jitterOut1 = { x: worldPt.x, y: worldPt.y };
    this.jitterOut2 = { x: worldPt.x, y: worldPt.y };

    this.updateLiveStroke(config.thickness, config.color);
  }

  public onPointerMove(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (!this.isDrawing) return;

    const nativeEvent = 'nativeEvent' in e ? (e.nativeEvent as PointerEvent) : e;
    const events: PointerEvent[] =
      typeof nativeEvent.getCoalescedEvents === 'function' &&
      nativeEvent.getCoalescedEvents().length > 0
        ? nativeEvent.getCoalescedEvents()
        : [nativeEvent];

    const activeInking = inkingStore.getState();
    const config = activeInking.highlighter;

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

      // 1. Deduplication filter (Module 518266: ignore micro-moves < 0.25px)
      if (Math.abs(worldPt.x - prevPt.x) < 0.25 && Math.abs(worldPt.y - prevPt.y) < 0.25) {
        continue;
      }

      const rawPt: InkStrokePoint = {
        x: worldPt.x,
        y: worldPt.y,
        pressure: 0.5,
        time: ev.timeStamp || Date.now(),
      };
      this.rawPoints.push(rawPt);

      // 2. Tremor jitter filter (Module 726577: 0.17 * pt + 1.33 * out1 - 0.5 * out2)
      const smoothedPt = this.applyJitterFilter(rawPt);
      this.filteredPoints.push(smoothedPt);
    }

    this.updateLiveStroke(config.thickness, config.color);
  }

  public onPointerUp(
    _e?: React.PointerEvent<HTMLDivElement> | PointerEvent
  ): InkStrokeEntity | null {
    if (!this.isDrawing) return null;
    this.isDrawing = false;
    this.activeRulerEdge = 0;

    if (this.filteredPoints.length === 0) {
      this.emitLiveStroke(null);
      return null;
    }

    const activeInking = inkingStore.getState();
    const config = activeInking.highlighter;
    const finalPoints = [...this.filteredPoints];
    const bounds: AABB = computeStrokeBounds(finalPoints, config.thickness, false);

    const strokeEntity: InkStrokeEntity = {
      id: this.strokeId,
      type: 'stroke',
      tool: 'highlighter',
      color: config.color,
      width: config.thickness,
      points: finalPoints,
      isHighlighter: true,
      zIndex: 150, // Highlighters anchor below normal pen ink (zIndex 200)
      bounds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    sceneStore.addEntity(strokeEntity, true);

    this.emitLiveStroke(null);
    this.rawPoints = [];
    this.filteredPoints = [];

    return strokeEntity;
  }

  public cancel() {
    this.isDrawing = false;
    this.activeRulerEdge = 0;
    this.emitLiveStroke(null);
    this.rawPoints = [];
    this.filteredPoints = [];
  }

  private applyJitterFilter(pt: InkStrokePoint): InkStrokePoint {
    const r = 1.33;
    const o = -0.5;
    const n = 1 - r - o;

    const filteredX = n * pt.x + r * this.jitterOut1.x + o * this.jitterOut2.x;
    const filteredY = n * pt.y + r * this.jitterOut1.y + o * this.jitterOut2.y;

    this.jitterOut2 = this.jitterOut1;
    this.jitterOut1 = { x: filteredX, y: filteredY };

    return {
      x: parseFloat(filteredX.toFixed(2)),
      y: parseFloat(filteredY.toFixed(2)),
      pressure: 0.5,
      time: pt.time,
    };
  }

  private updateLiveStroke(thickness: number, color: string) {
    const points = this.filteredPoints;
    if (points.length === 0) return;

    const pathD = penTool.generateSmoothPath(points);
    this.emitLiveStroke({
      id: this.strokeId,
      color,
      width: thickness,
      points,
      pathD,
    });
  }
}

export const highlighterTool = new HighlighterToolEngine();
