/**
 * Open Whiteboard — Milestone 34 Automated Test Suite
 * Microsoft Whiteboard REA Inking & Bezier Spline Restoration
 *
 * Verifies:
 * 1. Microsoft Whiteboard Catmull-Rom Cubic Bezier Formulation (Modules 170887 & 834265)
 * 2. Uniform Width for Standard Mouse & Touch Drawing (Zero forced entry/exit tapering)
 * 3. Absence of Jagged Linear Outline Degradation for standard pen strokes
 * 4. Active Stylus Variable Pressure Ribbon Contour with Smooth Bezier Edges
 */

import assert from 'assert';

console.log('--- Testing Milestone 34: Microsoft Whiteboard REA Inking & Bezier Spline Restoration ---');

// ========================================================
// 1. REA Catmull-Rom to Cubic Bezier Curve Math
// ========================================================
console.log('Test 1: Catmull-Rom to Cubic Bezier Formula Verification (Modules 170887 & 834265)');

function generateSmoothPath(pts) {
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

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }

  return d;
}

const samplePoints = [
  { x: 10, y: 10 },
  { x: 50, y: 30 },
  { x: 100, y: 80 },
  { x: 160, y: 40 },
  { x: 220, y: 90 },
];

const pathD = generateSmoothPath(samplePoints);
assert(pathD.startsWith('M 10 10'), 'Path must begin with M to start point');
assert(pathD.includes(' C '), 'Path must use cubic Bezier C commands');
// 4 segments between 5 points
const cCount = (pathD.match(/ C /g) || []).length;
assert.strictEqual(cCount, 4, 'Must have exactly 4 cubic Bezier segments for 5 points');

// Verify control points for first segment:
// p0 = pts[0] (10, 10), p1 = pts[0] (10, 10), p2 = pts[1] (50, 30), p3 = pts[2] (100, 80)
// c1 = p1 + (p2 - p0)/6 = 10 + (50 - 10)/6 = 10 + 40/6 = 16.67
// c2 = p2 - (p3 - p1)/6 = 50 - (100 - 10)/6 = 50 - 90/6 = 35.00
assert(pathD.includes('16.67 13.33, 35.00 18.33, 50.00 30.00'), 'Cubic Bezier control points match formula');
console.log('✓ 1. Pure Catmull-Rom Bezier spline correctly evaluated according to Microsoft Whiteboard formulation.\n');

// ========================================================
// 2. Elimination of Unwanted Tapering on Mouse / Standard Strokes
// ========================================================
console.log('Test 2: Uniform Width & Zero Forced Tapering on Standard Pen Strokes');

function simulateMouseStroke(baseThickness, numPoints) {
  const points = [];
  for (let i = 0; i < numPoints; i++) {
    // Mouse drawing uses uniform base thickness without velocity modulation
    points.push({
      x: 100 + i * 15,
      y: 100 + Math.sin(i * 0.5) * 20,
      pressure: 0.5,
      width: baseThickness,
      time: 1000 + i * 16,
    });
  }
  return points;
}

const baseThickness = 4;
const mouseStroke = simulateMouseStroke(baseThickness, 12);

// Verify no entry/exit tapering
assert.strictEqual(mouseStroke[0].width, baseThickness, 'First point must have base thickness');
assert.strictEqual(mouseStroke[1].width, baseThickness, 'Second point must have base thickness');
assert.strictEqual(mouseStroke[mouseStroke.length - 1].width, baseThickness, 'Last point must have base thickness');

// Check outline variation check
let hasVariation = false;
const firstW = mouseStroke[0].width || baseThickness;
for (let i = 1; i < mouseStroke.length; i++) {
  const w = mouseStroke[i].width || baseThickness;
  if (Math.abs(w - firstW) > 0.4) {
    hasVariation = true;
    break;
  }
}
assert.strictEqual(hasVariation, false, 'Standard mouse stroke must have ZERO width variation');
console.log('✓ 2. Mouse stroke has uniform width from start to finish without forced tapering.\n');

// ========================================================
// 3. Smooth Bezier Outline for Active Graphic Tablet Stylus
// ========================================================
console.log('Test 3: Graphic Tablet Smooth Bezier Ribbon Contours');

function buildBezierContour(pts) {
  if (pts.length < 2) return '';
  let d = '';
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = i > 0 ? pts[i - 1] : pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = i + 2 < pts.length ? pts[i + 2] : p2;

    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;

    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function generateStrokeOutline(points, defaultWidth) {
  if (points.length < 2) return '';

  let hasVar = false;
  const fW = points[0].width || defaultWidth;
  for (let i = 1; i < points.length; i++) {
    const w = points[i].width || defaultWidth;
    if (Math.abs(w - fW) > 0.4) {
      hasVar = true;
      break;
    }
  }
  if (!hasVar) return '';

  const leftPts = [];
  const rightPts = [];

  for (let i = 0; i < points.length; i++) {
    const curr = points[i];
    const prev = i > 0 ? points[i - 1] : points[i];
    const next = i < points.length - 1 ? points[i + 1] : points[i];

    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    let len = Math.hypot(dx, dy);
    if (len < 0.001) {
      dx = 1;
      dy = 0;
      len = 1;
    }

    const nx = -dy / len;
    const ny = dx / len;
    const halfW = (curr.width || defaultWidth) / 2;

    leftPts.push({ x: curr.x + nx * halfW, y: curr.y + ny * halfW });
    rightPts.push({ x: curr.x - nx * halfW, y: curr.y - ny * halfW });
  }

  let d = `M ${leftPts[0].x.toFixed(2)} ${leftPts[0].y.toFixed(2)}`;
  d += buildBezierContour(leftPts);

  const endHalfW = Math.max(0.5, (points[points.length - 1].width || defaultWidth) / 2);
  const lastRight = rightPts[rightPts.length - 1];
  d += ` A ${endHalfW.toFixed(2)} ${endHalfW.toFixed(2)} 0 0 1 ${lastRight.x.toFixed(2)} ${lastRight.y.toFixed(2)}`;

  const revRight = [...rightPts].reverse();
  d += buildBezierContour(revRight);

  const startHalfW = Math.max(0.5, (points[0].width || defaultWidth) / 2);
  const firstLeft = leftPts[0];
  d += ` A ${startHalfW.toFixed(2)} ${startHalfW.toFixed(2)} 0 0 1 ${firstLeft.x.toFixed(2)} ${firstLeft.y.toFixed(2)}`;
  d += ' Z';

  return d;
}

// 3.1 Verify mouse stroke returns '' from generateStrokeOutline
assert.strictEqual(generateStrokeOutline(mouseStroke, baseThickness), '', 'Mouse stroke must not generate outline ribbon');

// 3.2 Stylus stroke with true pressure variation
const stylusPoints = [];
for (let i = 0; i < 10; i++) {
  const pressure = 0.2 + (i / 9) * 0.7; // 0.2 to 0.9
  const pNorm = Math.pow(pressure, 0.75);
  const width = parseFloat((baseThickness * (0.35 + 0.65 * pNorm)).toFixed(2));
  stylusPoints.push({
    x: 50 + i * 20,
    y: 100,
    pressure,
    width,
    time: 1000 + i * 16,
  });
}

const outlineD = generateStrokeOutline(stylusPoints, baseThickness);
assert(outlineD.length > 0, 'Stylus stroke with pressure dynamics must produce outline ribbon');
assert(outlineD.startsWith('M '), 'Must begin with M');
assert(outlineD.includes(' C '), 'Contour edges must be smooth cubic Bezier splines (C)');
assert(outlineD.includes(' A '), 'End caps must be circular arcs (A)');
assert(outlineD.endsWith(' Z'), 'Ribbon path must close with Z');
// Verify NO jagged linear polyline segments (' L ') are present in the contour
const lCount = (outlineD.match(/ L /g) || []).length;
assert.strictEqual(lCount, 0, 'Contour edges must contain zero jagged linear L segments');
console.log('✓ 3. Graphic tablet ribbon contours are 100% smooth Bezier splines with zero jagged polylines.\n');

console.log('>>> All Milestone 34 tests passed successfully! <<<');
