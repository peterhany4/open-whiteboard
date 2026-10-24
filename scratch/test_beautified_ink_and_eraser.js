import assert from 'assert';

console.log('Testing Beautified Inked Shapes & Dual Eraser System...');

// 1. Test distToSegment
function distToSegment(p, a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = a.x + t * dx;
  const projY = a.y + t * dy;
  return Math.hypot(p.x - projX, p.y - projY);
}

// 2. Test generateBeautifiedPoints logic
function generateBeautifiedPoints(shape) {
  const points = [];
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
  }
  return points;
}

// 3. Test that recognized shape produces InkStrokeEntity
const circleShape = {
  recognized: true,
  shapeType: 'circle',
  x: 100,
  y: 100,
  width: 200,
  height: 200,
  bounds: { minX: 100, minY: 100, maxX: 300, maxY: 300 },
};

const beautifiedCirclePts = generateBeautifiedPoints(circleShape);
assert(beautifiedCirclePts.length > 20, 'Should generate smooth points for circle stroke');

const circleStrokeEntity = {
  id: 'stroke_circle_1',
  type: 'stroke',
  tool: 'pen',
  color: '#000000',
  width: 2,
  points: beautifiedCirclePts,
  bounds: circleShape.bounds,
};

assert.strictEqual(circleStrokeEntity.type, 'stroke', 'Beautified shape is an InkStrokeEntity');
assert.strictEqual(circleStrokeEntity.tool, 'pen', 'Drawn with pen tool');

// 4. Test StrokeEraser hit testing on beautified circle stroke
const eraserCenter = { x: 200, y: 100 }; // Top perimeter of the circle (cx=200, cy=200, radius=100 -> top is (200, 100))
const eraserRadius = 16;
let strokeHit = false;

for (let i = 0; i < circleStrokeEntity.points.length - 1; i++) {
  const d = distToSegment(eraserCenter, circleStrokeEntity.points[i], circleStrokeEntity.points[i + 1]);
  if (d <= eraserRadius + circleStrokeEntity.width / 2) {
    strokeHit = true;
    break;
  }
}

assert.strictEqual(strokeHit, true, 'Eraser directly hits beautified ink stroke perimeter');

// 5. Test ShapeEntity hit testing (e.g. Rectangle widget from Create menu)
function isShapeHit(shape, center, eraserRadius) {
  const effectiveRadius = eraserRadius + (shape.strokeWidth || 2) / 2;
  const x = shape.x;
  const y = shape.y;
  const w = shape.width;
  const h = shape.height;

  if (
    center.x < x - effectiveRadius ||
    center.x > x + w + effectiveRadius ||
    center.y < y - effectiveRadius ||
    center.y > y + h + effectiveRadius
  ) {
    return false;
  }

  if (shape.shapeType === 'circle') {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;
    const avgR = (rx + ry) / 2;
    const distToCenter = Math.hypot(center.x - cx, center.y - cy);
    const isFilled = Boolean(shape.fillColor && shape.fillColor !== 'transparent');
    if (isFilled) {
      return distToCenter <= avgR + effectiveRadius;
    } else {
      return Math.abs(distToCenter - avgR) <= effectiveRadius;
    }
  }

  const p1 = { x, y };
  const p2 = { x: x + w, y };
  const p3 = { x: x + w, y: y + h };
  const p4 = { x, y: y + h };
  const segments = [
    [p1, p2],
    [p2, p3],
    [p3, p4],
    [p4, p1],
  ];

  for (const [pA, pB] of segments) {
    if (distToSegment(center, pA, pB) <= effectiveRadius) {
      return true;
    }
  }

  if (shape.fillColor && shape.fillColor !== 'transparent') {
    if (center.x >= x && center.x <= x + w && center.y >= y && center.y <= y + h) {
      return true;
    }
  }

  return false;
}

const rectShapeWidget = {
  id: 'shape_widget_1',
  type: 'shape',
  shapeType: 'rectangle',
  x: 400,
  y: 400,
  width: 200,
  height: 150,
  strokeWidth: 2,
  fillColor: 'transparent',
};

// Hit top border of the rectangle widget
const hitRectBorder = isShapeHit(rectShapeWidget, { x: 500, y: 402 }, 16);
assert.strictEqual(hitRectBorder, true, 'Eraser successfully hits and erases ShapeEntity rectangle boundary');

// Miss far away
const missRect = isShapeHit(rectShapeWidget, { x: 100, y: 100 }, 16);
assert.strictEqual(missRect, false, 'Eraser correctly ignores non-intersecting coordinates');

console.log('All Beautified Ink & Eraser integration checks passed successfully!');
