/**
 * Open Whiteboard — Interactive Ruler Engine & Magnetic Snapping
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 46977 (chunks/46977.*.js, line 34)
 *     -> Ruler model: centerLine, halfWidth (60px), snapWidth (30px),
 *        getSnapEdge, snapToEdge, isUnderRuler, rotate, translate
 *   - Module 45330 (chunks/45330.*.js, lines 44-45)
 *     -> PrimaryRulerSink, snapRulerEdge (1: Top, 2: Bottom), snapToEdge projection
 *   - Module 91464 (chunks/91464.*.js, line 21)
 *     -> RulerManager activation, scale calibration, angle snapping
 */

import type { Point } from '../canvas/camera';
import { inkingStore } from '../store/inkingStore';

export interface RulerState {
  isActive: boolean;
  x: number;
  y: number;
  angle: number; // in degrees: 0° to 359°
  length: number; // 960px
  width: number; // 120px
  halfWidth: number; // 60px
  snapWidth: number; // 30px magnetic threshold
}

class RulerEngine {
  private state: RulerState = {
    isActive: false,
    x: 0,
    y: 0,
    angle: 45, // default 45° angle in Whiteboard
    length: 960,
    width: 120,
    halfWidth: 60,
    snapWidth: 32,
  };

  private listeners = new Set<(state: RulerState) => void>();

  public subscribe(listener: (state: RulerState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public getState(): RulerState {
    return { ...this.state };
  }

  private notify() {
    const copy = this.getState();
    for (const listener of this.listeners) {
      listener(copy);
    }
  }

  public toggle() {
    this.state.isActive = !this.state.isActive;
    inkingStore.setRulerActive(this.state.isActive);
    this.notify();
  }

  public setActive(active: boolean) {
    if (this.state.isActive !== active) {
      this.state.isActive = active;
      inkingStore.setRulerActive(active);
      this.notify();
    }
  }

  public setPosition(x: number, y: number) {
    this.state.x = x;
    this.state.y = y;
    this.notify();
  }

  public translate(dx: number, dy: number) {
    this.state.x += dx;
    this.state.y += dy;
    this.notify();
  }

  public setAngle(degrees: number) {
    let norm = degrees % 360;
    if (norm < 0) norm += 360;
    this.state.angle = Math.round(norm);
    this.notify();
  }

  /**
   * Rotates ruler with magnetic 5° snapping when close to 5° increments
   */
  public rotate(deltaDegrees: number, withSnapping = true) {
    let target = (this.state.angle + deltaDegrees) % 360;
    if (target < 0) target += 360;

    if (withSnapping) {
      const nearest5 = Math.round(target / 5) * 5;
      if (Math.abs(target - nearest5) < 1.4) {
        target = nearest5 % 360;
      }
    }

    this.state.angle = Math.round(target);
    this.notify();
  }

  /**
   * Tests if a world point falls inside the body of the ruler
   */
  public isUnderRuler(p: Point): boolean {
    if (!this.state.isActive) return false;

    const rad = (this.state.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = p.x - this.state.x;
    const dy = p.y - this.state.y;

    const u = dx * cos + dy * sin;
    const v = -dx * sin + dy * cos;

    return Math.abs(u) <= this.state.length / 2 && Math.abs(v) <= this.state.halfWidth;
  }

  /**
   * Projects point magnetically to the active ruler edge if within snap threshold.
   * Returns snapped point if near edge, or original point if outside snap threshold.
   * (Reverse-Engineered from Module 46977: snapToEdge & getSnapEdge)
   */
  public snapPoint(p: Point): { point: Point; edge: 0 | 1 | 2 } {
    if (!this.state.isActive) {
      return { point: p, edge: 0 };
    }

    const rad = (this.state.angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const dx = p.x - this.state.x;
    const dy = p.y - this.state.y;

    // Longitudinal distance along ruler length
    const u = dx * cos + dy * sin;
    // Transverse distance perpendicular to ruler length
    const v = -dx * sin + dy * cos;

    // Check if within ruler length bounds (plus small 24px end margin)
    if (Math.abs(u) > this.state.length / 2 + 24) {
      return { point: p, edge: 0 };
    }

    // Top edge distance check (v > 0)
    const topDist = Math.abs(v - this.state.halfWidth);
    if (topDist <= this.state.snapWidth) {
      // Snapped to Top Edge (edge 1)
      const clampedU = Math.max(-this.state.length / 2, Math.min(this.state.length / 2, u));
      const snappedX = this.state.x + clampedU * cos - this.state.halfWidth * sin;
      const snappedY = this.state.y + clampedU * sin + this.state.halfWidth * cos;
      return { point: { x: snappedX, y: snappedY }, edge: 1 };
    }

    // Bottom edge distance check (v < 0)
    const bottomDist = Math.abs(v - (-this.state.halfWidth));
    if (bottomDist <= this.state.snapWidth) {
      // Snapped to Bottom Edge (edge 2)
      const clampedU = Math.max(-this.state.length / 2, Math.min(this.state.length / 2, u));
      const snappedX = this.state.x + clampedU * cos - (-this.state.halfWidth) * sin;
      const snappedY = this.state.y + clampedU * sin + (-this.state.halfWidth) * cos;
      return { point: { x: snappedX, y: snappedY }, edge: 2 };
    }

    return { point: p, edge: 0 };
  }
}

export const rulerEngine = new RulerEngine();
