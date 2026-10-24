/**
 * Open Whiteboard — Real-Time Geometric Shape Recognition Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 40049 (blueboard/chunks/40049.*.js, lines 4, 7, 10)
 *     -> WetShapeRecognitionHappened, DrawAndHoldRecognitionHappened, AddBeautifiedInk, InkToShape
 *   - Module 84781932 (blueboard/chunks/BoardEditorComponent-84781932.*.js, line 121)
 *     -> Stroke point validation, bounding boxes, shape replacement
 *
 * 100% Client-Side, Instant Offline Geometric Shape Recognition:
 * - Ramer-Douglas-Peucker contour simplification
 * - Circularity & radial variance analysis (Circle / Ellipse)
 * - Corner angle analysis & axis alignment (Rectangle / Square / Diamond / Triangle)
 * - Chord-to-arc straightness ratio (Straight Line)
 */

import type { InkStrokePoint, ShapeKind, AABB } from '../canvas/sceneGraph';

export interface RecognizedShape {
  recognized: boolean;
  shapeType?: ShapeKind;
  bounds: AABB;
  confidence: number;
  width: number;
  height: number;
  x: number;
  y: number;
  startPt?: Point2D;
  endPt?: Point2D;
}

interface Point2D {
  x: number;
  y: number;
}

export class ShapeRecognitionEngine {
  /**
   * Evaluates an ink stroke to determine if it matches a geometric primitive
   */
  public recognize(rawPoints: InkStrokePoint[]): RecognizedShape {
    const fallback: RecognizedShape = {
      recognized: false,
      confidence: 0,
      bounds: { minX: 0, minY: 0, maxX: 0, maxY: 0 },
      width: 0,
      height: 0,
      x: 0,
      y: 0,
    };

    if (!rawPoints || rawPoints.length < 8) {
      return fallback;
    }

    // 1. Compute basic bounds & dimensions
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const p of rawPoints) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const width = maxX - minX;
    const height = maxY - minY;
    const diagonal = Math.hypot(width, height);

    // Reject tiny strokes / taps / dots
    if (width < 16 && height < 16) {
      return fallback;
    }

    // Compute stroke path length L and endpoint gap D
    let pathLength = 0;
    for (let i = 0; i < rawPoints.length - 1; i++) {
      pathLength += Math.hypot(
        rawPoints[i + 1].x - rawPoints[i].x,
        rawPoints[i + 1].y - rawPoints[i].y
      );
    }

    if (pathLength < 20) {
      return fallback;
    }

    const startPt = rawPoints[0];
    const endPt = rawPoints[rawPoints.length - 1];
    const endpointGap = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);

    // 2. Classify: Open vs Closed
    const closureRatio = endpointGap / pathLength;
    const isClosed = closureRatio < 0.22 || endpointGap < diagonal * 0.2;

    // ----------------------------------------------------
    // Branch A: Open Stroke -> Straight Line
    // ----------------------------------------------------
    if (!isClosed) {
      const straightness = endpointGap / pathLength;

      // Calculate maximum perpendicular deviation from the line connecting start and end
      let maxPerpDist = 0;
      for (const p of rawPoints) {
        const perp = this.perpendicularDistance(p, startPt, endPt);
        if (perp > maxPerpDist) maxPerpDist = perp;
      }

      const perpThreshold = Math.max(8, endpointGap * 0.08);

      if (straightness >= 0.92 && maxPerpDist <= perpThreshold) {
        // Snapping: Check if within 7° of horizontal or vertical
        let angleDeg = (Math.atan2(endPt.y - startPt.y, endPt.x - startPt.x) * 180) / Math.PI;
        if (angleDeg < 0) angleDeg += 360;

        let snappedStart = { ...startPt };
        let snappedEnd = { ...endPt };

        // Horizontal snap (0° or 180°)
        if (Math.abs(angleDeg) <= 7 || Math.abs(angleDeg - 360) <= 7 || Math.abs(angleDeg - 180) <= 7) {
          const midY = (startPt.y + endPt.y) / 2;
          snappedStart.y = midY;
          snappedEnd.y = midY;
        }
        // Vertical snap (90° or 270°)
        else if (Math.abs(angleDeg - 90) <= 7 || Math.abs(angleDeg - 270) <= 7) {
          const midX = (startPt.x + endPt.x) / 2;
          snappedStart.x = midX;
          snappedEnd.x = midX;
        }

        const lMinX = Math.min(snappedStart.x, snappedEnd.x);
        const lMaxX = Math.max(snappedStart.x, snappedEnd.x);
        const lMinY = Math.min(snappedStart.y, snappedEnd.y);
        const lMaxY = Math.max(snappedStart.y, snappedEnd.y);

        const lWidth = Math.max(4, lMaxX - lMinX);
        const lHeight = Math.max(4, lMaxY - lMinY);

        return {
          recognized: true,
          shapeType: 'line',
          bounds: { minX: lMinX, minY: lMinY, maxX: lMaxX, maxY: lMaxY },
          confidence: Math.min(1.0, 0.85 + (straightness - 0.92) * 1.5),
          width: lWidth,
          height: lHeight,
          x: lMinX,
          y: lMinY,
          startPt: snappedStart,
          endPt: snappedEnd,
        };
      }

      return fallback;
    }

    // ----------------------------------------------------
    // Branch B: Closed Stroke -> Circle, Ellipse, Rectangle, Square, Triangle, Diamond
    // ----------------------------------------------------

    // Polygon area via Shoelace formula
    const area = this.calculatePolygonArea(rawPoints);
    if (area <= 0) return fallback;

    // Circularity metric: 4 * pi * Area / (Perimeter^2)
    // Circle = 1.0, Square = ~0.785, Triangle = ~0.604
    const circularity = (4 * Math.PI * area) / (pathLength * pathLength);

    // Compute radial variance from bounding box center
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    let totalR = 0;
    const radii: number[] = [];
    for (const p of rawPoints) {
      const r = Math.hypot(p.x - centerX, p.y - centerY);
      radii.push(r);
      totalR += r;
    }
    const meanR = totalR / radii.length;
    let varR = 0;
    for (const r of radii) {
      varR += (r - meanR) * (r - meanR);
    }
    const stdR = Math.sqrt(varR / radii.length);
    const rsd = stdR / (meanR || 1); // Relative standard deviation

    // Simplify contour using Ramer-Douglas-Peucker
    const closedPoints: Point2D[] = [...rawPoints.map((p) => ({ x: p.x, y: p.y }))];
    closedPoints.push({ x: rawPoints[0].x, y: rawPoints[0].y });

    const epsilon = Math.max(3.0, diagonal * 0.04);
    const simplified = this.rdpSimplify(closedPoints, epsilon);
    // Remove duplicate closing point for vertex counting
    const uniqueVertices = simplified.slice(0, -1);
    const cornerCount = uniqueVertices.length;

    const aspectRatio = width / (height || 1);

    // B1: Triangle (3 corners)
    if (cornerCount === 3 || (cornerCount === 4 && this.hasCollinearVertices(uniqueVertices))) {
      // Internal angle sum of triangle ≈ 180°
      const angles = this.computePolygonInternalAngles(uniqueVertices);
      const angleSum = angles.reduce((a, b) => a + b, 0);

      if (Math.abs(angleSum - 180) <= 35) {
        return {
          recognized: true,
          shapeType: 'triangle',
          bounds: { minX, minY, maxX, maxY },
          confidence: 0.9,
          width,
          height,
          x: minX,
          y: minY,
        };
      }
    }

    // B2: 4-Corner Polygons (Diamond, Rectangle, Square)
    if (cornerCount === 4 || cornerCount === 5) {
      const vertices = cornerCount === 5 ? this.reduceTo4Vertices(uniqueVertices) : uniqueVertices;

      if (vertices.length === 4) {
        const angles = this.computePolygonInternalAngles(vertices);
        const isRightAngled = angles.every((ang) => Math.abs(ang - 90) <= 25);

        // Check if vertices align near midpoints (Diamond) vs corners (Rectangle)
        const isDiamond = this.checkDiamondAlignment(vertices, minX, minY, maxX, maxY);

        if (isDiamond) {
          return {
            recognized: true,
            shapeType: 'diamond',
            bounds: { minX, minY, maxX, maxY },
            confidence: 0.9,
            width,
            height,
            x: minX,
            y: minY,
          };
        }

        if (isRightAngled || circularity >= 0.6) {
          const isSquare = aspectRatio >= 0.85 && aspectRatio <= 1.15;
          if (isSquare) {
            const size = Math.max(width, height);
            const sX = centerX - size / 2;
            const sY = centerY - size / 2;
            return {
              recognized: true,
              shapeType: 'rectangle',
              bounds: { minX: sX, minY: sY, maxX: sX + size, maxY: sY + size },
              confidence: 0.93,
              width: size,
              height: size,
              x: sX,
              y: sY,
            };
          } else {
            return {
              recognized: true,
              shapeType: 'rectangle',
              bounds: { minX, minY, maxX, maxY },
              confidence: 0.9,
              width,
              height,
              x: minX,
              y: minY,
            };
          }
        }
      }
    }

    // B3: Circle / Ellipse (tested after corner-based polygons)
    if (circularity >= 0.70 && rsd <= 0.16) {
      const isCircle = aspectRatio >= 0.8 && aspectRatio <= 1.25;
      const size = Math.max(width, height);

      if (isCircle) {
        const sX = centerX - size / 2;
        const sY = centerY - size / 2;
        return {
          recognized: true,
          shapeType: 'circle',
          bounds: { minX: sX, minY: sY, maxX: sX + size, maxY: sY + size },
          confidence: Math.min(0.98, 0.88 + (circularity - 0.7) * 0.4),
          width: size,
          height: size,
          x: sX,
          y: sY,
        };
      } else {
        // Ellipse (ShapeWidget renders circle with width/height as ellipse)
        return {
          recognized: true,
          shapeType: 'circle',
          bounds: { minX, minY, maxX, maxY },
          confidence: Math.min(0.95, 0.85 + (circularity - 0.7) * 0.35),
          width,
          height,
          x: minX,
          y: minY,
        };
      }
    }

    return fallback;
  }

  // ----------------------------------------------------
  // Geometric Helper Algorithms
  // ----------------------------------------------------

  private perpendicularDistance(p: Point2D, lineStart: Point2D, lineEnd: Point2D): number {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    const lineLen = Math.hypot(dx, dy);
    if (lineLen === 0) return Math.hypot(p.x - lineStart.x, p.y - lineStart.y);

    return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / lineLen;
  }

  private calculatePolygonArea(pts: InkStrokePoint[]): number {
    let area = 0;
    const n = pts.length;
    for (let i = 0; i < n; i++) {
      const j = (i + 1) % n;
      area += pts[i].x * pts[j].y;
      area -= pts[j].x * pts[i].y;
    }
    return Math.abs(area) / 2;
  }

  private rdpSimplify(points: Point2D[], epsilon: number): Point2D[] {
    if (points.length < 3) return points;

    let maxDist = 0;
    let index = 0;
    const start = points[0];
    const end = points[points.length - 1];

    for (let i = 1; i < points.length - 1; i++) {
      const dist = this.perpendicularDistance(points[i], start, end);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }

    if (maxDist > epsilon) {
      const left = this.rdpSimplify(points.slice(0, index + 1), epsilon);
      const right = this.rdpSimplify(points.slice(index), epsilon);
      return [...left.slice(0, -1), ...right];
    } else {
      return [start, end];
    }
  }

  private computePolygonInternalAngles(vertices: Point2D[]): number[] {
    const n = vertices.length;
    const angles: number[] = [];

    for (let i = 0; i < n; i++) {
      const prev = vertices[(i - 1 + n) % n];
      const curr = vertices[i];
      const next = vertices[(i + 1) % n];

      const v1 = { x: prev.x - curr.x, y: prev.y - curr.y };
      const v2 = { x: next.x - curr.x, y: next.y - curr.y };

      const dot = v1.x * v2.x + v1.y * v2.y;
      const mag1 = Math.hypot(v1.x, v1.y);
      const mag2 = Math.hypot(v2.x, v2.y);

      if (mag1 === 0 || mag2 === 0) {
        angles.push(90);
        continue;
      }

      const cosTheta = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
      angles.push((Math.acos(cosTheta) * 180) / Math.PI);
    }

    return angles;
  }

  private hasCollinearVertices(vertices: Point2D[]): boolean {
    const angles = this.computePolygonInternalAngles(vertices);
    return angles.some((ang) => ang >= 160);
  }

  private reduceTo4Vertices(vertices: Point2D[]): Point2D[] {
    if (vertices.length !== 5) return vertices;
    const angles = this.computePolygonInternalAngles(vertices);
    // Find vertex with angle closest to 180° (most collinear)
    let bestIndex = -1;
    let maxAngle = 0;
    for (let i = 0; i < angles.length; i++) {
      if (angles[i] > maxAngle) {
        maxAngle = angles[i];
        bestIndex = i;
      }
    }
    if (maxAngle >= 150 && bestIndex !== -1) {
      return vertices.filter((_, idx) => idx !== bestIndex);
    }
    return vertices.slice(0, 4);
  }

  private checkDiamondAlignment(
    vertices: Point2D[],
    minX: number,
    minY: number,
    maxX: number,
    maxY: number
  ): boolean {
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = maxX - minX;
    const h = maxY - minY;

    let topCount = 0;
    let bottomCount = 0;
    let leftCount = 0;
    let rightCount = 0;

    for (const v of vertices) {
      if (Math.abs(v.x - cx) < w * 0.28 && Math.abs(v.y - minY) < h * 0.25) topCount++;
      if (Math.abs(v.x - cx) < w * 0.28 && Math.abs(v.y - maxY) < h * 0.25) bottomCount++;
      if (Math.abs(v.x - minX) < w * 0.25 && Math.abs(v.y - cy) < h * 0.28) leftCount++;
      if (Math.abs(v.x - maxX) < w * 0.25 && Math.abs(v.y - cy) < h * 0.28) rightCount++;
    }

    return topCount === 1 && bottomCount === 1 && leftCount === 1 && rightCount === 1;
  }

  /**
   * Generates mathematically smoothed, beautified pen stroke points
   * for an identified geometric shape (Module 40049: AddBeautifiedInk / LineModeStrokeCreated)
   */
  public generateBeautifiedPoints(shape: RecognizedShape): InkStrokePoint[] {
    const points: InkStrokePoint[] = [];
    const { shapeType, x, y, width, height, startPt, endPt } = shape;

    if (shapeType === 'circle') {
      const cx = x + width / 2;
      const cy = y + height / 2;
      const rx = width / 2;
      const ry = height / 2;
      const n = 48;
      for (let i = 0; i <= n; i++) {
        const theta = (i / n) * 2 * Math.PI - Math.PI / 2;
        points.push({
          x: parseFloat((cx + rx * Math.cos(theta)).toFixed(2)),
          y: parseFloat((cy + ry * Math.sin(theta)).toFixed(2)),
          pressure: 0.5,
        });
      }
    } else if (shapeType === 'rectangle') {
      const corners = [
        { x, y },
        { x: x + width, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
        { x, y },
      ];
      for (let s = 0; s < 4; s++) {
        const c1 = corners[s];
        const c2 = corners[s + 1];
        // Duplicate corner point for sharp Catmull-Rom tangent clamping
        points.push({ x: c1.x, y: c1.y, pressure: 0.5 });
        points.push({ x: c1.x, y: c1.y, pressure: 0.5 });
        for (let i = 1; i < 4; i++) {
          const t = i / 4;
          points.push({
            x: parseFloat((c1.x + t * (c2.x - c1.x)).toFixed(2)),
            y: parseFloat((c1.y + t * (c2.y - c1.y)).toFixed(2)),
            pressure: 0.5,
          });
        }
      }
      points.push({ x: corners[4].x, y: corners[4].y, pressure: 0.5 });
      points.push({ x: corners[4].x, y: corners[4].y, pressure: 0.5 });
    } else if (shapeType === 'triangle') {
      const corners = [
        { x: x + width / 2, y },
        { x: x + width, y: y + height },
        { x, y: y + height },
        { x: x + width / 2, y },
      ];
      for (let s = 0; s < 3; s++) {
        const c1 = corners[s];
        const c2 = corners[s + 1];
        points.push({ x: c1.x, y: c1.y, pressure: 0.5 });
        points.push({ x: c1.x, y: c1.y, pressure: 0.5 });
        for (let i = 1; i < 4; i++) {
          const t = i / 4;
          points.push({
            x: parseFloat((c1.x + t * (c2.x - c1.x)).toFixed(2)),
            y: parseFloat((c1.y + t * (c2.y - c1.y)).toFixed(2)),
            pressure: 0.5,
          });
        }
      }
      points.push({ x: corners[3].x, y: corners[3].y, pressure: 0.5 });
      points.push({ x: corners[3].x, y: corners[3].y, pressure: 0.5 });
    } else if (shapeType === 'diamond') {
      const corners = [
        { x: x + width / 2, y },
        { x: x + width, y: y + height / 2 },
        { x: x + width / 2, y: y + height },
        { x, y: y + height / 2 },
        { x: x + width / 2, y },
      ];
      for (let s = 0; s < 4; s++) {
        const c1 = corners[s];
        const c2 = corners[s + 1];
        points.push({ x: c1.x, y: c1.y, pressure: 0.5 });
        points.push({ x: c1.x, y: c1.y, pressure: 0.5 });
        for (let i = 1; i < 4; i++) {
          const t = i / 4;
          points.push({
            x: parseFloat((c1.x + t * (c2.x - c1.x)).toFixed(2)),
            y: parseFloat((c1.y + t * (c2.y - c1.y)).toFixed(2)),
            pressure: 0.5,
          });
        }
      }
      points.push({ x: corners[4].x, y: corners[4].y, pressure: 0.5 });
      points.push({ x: corners[4].x, y: corners[4].y, pressure: 0.5 });
    } else if (shapeType === 'line') {
      const s = startPt || { x, y: y + height / 2 };
      const e = endPt || { x: x + width, y: y + height / 2 };
      const n = 12;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        points.push({
          x: parseFloat((s.x + t * (e.x - s.x)).toFixed(2)),
          y: parseFloat((s.y + t * (e.y - s.y)).toFixed(2)),
          pressure: 0.5,
        });
      }
    }

    return points;
  }
}

export const shapeRecognitionEngine = new ShapeRecognitionEngine();
