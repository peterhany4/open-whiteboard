/**
 * Open Whiteboard — Glowing Laser Pointer Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 228858 (chunks/45330.*.js, line 21)
 *     -> Class T (tail-shrinking animation: points.splice(0, s) at animationPointsPerMs = 0.3)
 *     -> Class b (fadeout animation: 1000ms fadeout with smoothstep Qx(0, 1, t))
 *   - Module 84781932 (chunks/BoardEditorComponent-84781932.*.js, line 39)
 *     -> LaserSink, renderLoop with requestAnimationFrame, ephemeral ink (never persisted to sceneStore)
 *   - Module 434554 (chunks/8854.*.js)
 *     -> 6 Neon laser colors: Red, Pink, Orange, Yellow, Light Green, Light Blue
 *     -> Thicknesses: [2, 4, 6, 8]
 */

import type { CameraMatrix, Point } from '../canvas/camera';
import { screenToWorld } from '../canvas/camera';
import type { InkStrokePoint } from '../canvas/sceneGraph';
import { inkingStore } from '../store/inkingStore';
import { penTool } from './PenTool';

export interface LaserStrokeState {
  id: string;
  color: string;
  width: number;
  points: InkStrokePoint[];
  pathD: string;
  headPoint: Point | null;
  opacity: number;
}

export class LaserToolEngine {
  private isDrawing = false;
  private strokeId = '';
  private points: InkStrokePoint[] = [];

  // Animation decay state (Module 228858)
  private animFrameId: number | null = null;
  private timeAnimationStart = 0;
  private timePrevFrame = 0;
  private opacity = 1.0;
  private readonly fadeoutMs = 1000;
  private readonly pointsPerMs = 0.045; // Tail-shrinking rate

  private listeners = new Set<(stroke: LaserStrokeState | null) => void>();
  private currentStroke: LaserStrokeState | null = null;

  public subscribe(listener: (stroke: LaserStrokeState | null) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getActiveStroke(): LaserStrokeState | null {
    return this.currentStroke;
  }

  public isCurrentlyDrawing(): boolean {
    return this.isDrawing;
  }

  private emit(stroke: LaserStrokeState | null) {
    this.currentStroke = stroke;
    for (const listener of this.listeners) {
      listener(stroke);
    }
  }

  public onPointerDown(
    e: React.PointerEvent<HTMLDivElement> | PointerEvent,
    camera: CameraMatrix,
    viewportRect?: DOMRect | null
  ) {
    if (e.button !== 0) return;

    this.stopAnimation();
    this.isDrawing = true;
    this.opacity = 1.0;
    this.strokeId = `laser_${Date.now()}`;

    const worldPt = screenToWorld({ x: e.clientX, y: e.clientY }, camera, viewportRect);
    const startPoint: InkStrokePoint = {
      x: worldPt.x,
      y: worldPt.y,
      pressure: 0.5,
      time: e.timeStamp || Date.now(),
    };

    this.points = [startPoint];
    this.updateRender();
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

    for (const ev of events) {
      const worldPt = screenToWorld({ x: ev.clientX, y: ev.clientY }, camera, viewportRect);
      const prevPt = this.points[this.points.length - 1];

      if (prevPt && Math.abs(worldPt.x - prevPt.x) < 0.3 && Math.abs(worldPt.y - prevPt.y) < 0.3) {
        continue;
      }

      this.points.push({
        x: worldPt.x,
        y: worldPt.y,
        pressure: 0.5,
        time: ev.timeStamp || Date.now(),
      });

      // Keep active drawing tail within 40 points during continuous motion
      if (this.points.length > 40) {
        this.points.shift();
      }
    }

    this.updateRender();
  }

  public onPointerUp(_e?: React.PointerEvent<HTMLDivElement> | PointerEvent) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    // Start decay animation loop (Module 228858)
    this.startDecayAnimation();
  }

  public cancel() {
    this.isDrawing = false;
    this.stopAnimation();
    this.points = [];
    this.emit(null);
  }

  private startDecayAnimation() {
    this.stopAnimation();
    this.timeAnimationStart = Date.now();
    this.timePrevFrame = Date.now();

    const loop = () => {
      const now = Date.now();
      const dt = now - this.timePrevFrame;
      this.timePrevFrame = now;

      // 1. Tail-shrinking (Module 228858: class T)
      const pointsToRemove = Math.max(1, Math.floor(dt * this.pointsPerMs));
      if (this.points.length > pointsToRemove) {
        this.points.splice(0, pointsToRemove);
      } else {
        this.points = [];
      }

      // 2. Opacity fadeout (Module 228858: class b with smoothstep easing)
      const elapsed = now - this.timeAnimationStart;
      const progress = Math.min(1, elapsed / this.fadeoutMs);
      // Smoothstep: s * s * (3 - 2 * s)
      const easedFade = progress * progress * (3 - 2 * progress);
      this.opacity = Math.max(0, 1 - easedFade);

      if (this.points.length > 0 && this.opacity > 0.01) {
        this.updateRender();
        this.animFrameId = requestAnimationFrame(loop);
      } else {
        this.stopAnimation();
        this.points = [];
        this.emit(null);
      }
    };

    this.animFrameId = requestAnimationFrame(loop);
  }

  private stopAnimation() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  private updateRender() {
    if (this.points.length === 0) {
      this.emit(null);
      return;
    }

    const laserConfig = inkingStore.getState().laser;
    const pathD = penTool.generateSmoothPath(this.points);
    const headPoint = this.points[this.points.length - 1];

    this.emit({
      id: this.strokeId,
      color: laserConfig.color,
      width: laserConfig.thickness,
      points: this.points,
      pathD,
      headPoint: headPoint ? { x: headPoint.x, y: headPoint.y } : null,
      opacity: this.opacity,
    });
  }
}

export const laserTool = new LaserToolEngine();
