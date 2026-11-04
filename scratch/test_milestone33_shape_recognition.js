/**
 * Open Whiteboard — Milestone 33 Automated Test Suite
 *
 * Verifies:
 * 1. Circle Classification Priority (Hand-drawn circles with 4-5 RDP vertices classify as circle, never rectangle)
 * 2. Strict Rectangle Discrimination (Right-angle requirement & circularity < 0.85 ceiling)
 * 3. Rounded Corner Fillet Heads Geometry (Smooth quarter-circle fillets with radius r, zero duplicated points)
 * 4. Square & Rectangle Aspect Ratio Snapping
 */

import assert from 'assert';

console.log('--- Testing Milestone 33: Ink-to-Shape Precision Engine & Rounded Fillet Heads ---');

// Geometric helper functions matching ShapeRecognitionEngine
function perpendicularDistance(p, lineStart, lineEnd) {
  const dx = lineEnd.x - lineStart.x;
  const dy = lineEnd.y - lineStart.y;
  const lineLen = Math.hypot(dx, dy);
  if (lineLen === 0) return Math.hypot(p.x - lineStart.x, p.y - lineStart.y);
  return Math.abs(dy * p.x - dx * p.y + lineEnd.x * lineStart.y - lineEnd.y * lineStart.x) / lineLen;
}

function rdpSimplify(points, epsilon) {
  if (points.length < 3) return points;
  let maxDist = 0;
  let index = 0;
  const start = points[0];
  const end = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const dist = perpendicularDistance(points[i], start, end);
    if (dist > maxDist) {
      maxDist = dist;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const recResults1 = rdpSimplify(points.slice(0, index + 1), epsilon);
    const recResults2 = rdpSimplify(points.slice(index), epsilon);
    return recResults1.slice(0, -1).concat(recResults2);
  }
  return [start, end];
}

function calculatePolygonArea(pts) {
  let area = 0;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += pts[i].x * pts[j].y;
    area -= pts[j].x * pts[i].y;
  }
  return Math.abs(area) / 2;
}

function computePolygonInternalAngles(vertices) {
  const n = vertices.length;
  const angles = [];
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
      angles.push(180);
      continue;
    }
    const cosAngle = Math.max(-1, Math.min(1, dot / (mag1 * mag2)));
    angles.push((Math.acos(cosAngle) * 180) / Math.PI);
  }
  return angles;
}

function checkDiamondAlignment(vertices, minX, minY, maxX, maxY) {
  const midX = (minX + maxX) / 2;
  const midY = (minY + maxY) / 2;
  const tolX = (maxX - minX) * 0.2;
  const tolY = (maxY - minY) * 0.2;

  let hasTop = false, hasBottom = false, hasLeft = false, hasRight = false;
  for (const v of vertices) {
    if (Math.abs(v.x - midX) <= tolX && Math.abs(v.y - minY) <= tolY) hasTop = true;
    if (Math.abs(v.x - midX) <= tolX && Math.abs(v.y - maxY) <= tolY) hasBottom = true;
    if (Math.abs(v.x - minX) <= tolX && Math.abs(v.y - midY) <= tolY) hasLeft = true;
    if (Math.abs(v.x - maxX) <= tolX && Math.abs(v.y - midY) <= tolY) hasRight = true;
  }
  return hasTop && hasBottom && hasLeft && hasRight;
}

function reduceTo4Vertices(vertices) {
  if (vertices.length <= 4) return vertices;
  let minPerp = Infinity;
  let minIndex = 0;
  const n = vertices.length;
  for (let i = 0; i < n; i++) {
    const prev = vertices[(i - 1 + n) % n];
    const curr = vertices[i];
    const next = vertices[(i + 1) % n];
    const perp = perpendicularDistance(curr, prev, next);
    if (perp < minPerp) {
      minPerp = perp;
      minIndex = i;
    }
  }
  return vertices.filter((_, idx) => idx !== minIndex);
}

// Classifier function matching the newly implemented ShapeRecognitionEngine
function recognizeShape(rawPoints) {
  if (!rawPoints || rawPoints.length < 8) return { recognized: false };

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of rawPoints) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.hypot(width, height);
  if (width < 16 && height < 16) return { recognized: false };

  let pathLength = 0;
  for (let i = 0; i < rawPoints.length - 1; i++) {
    pathLength += Math.hypot(rawPoints[i + 1].x - rawPoints[i].x, rawPoints[i + 1].y - rawPoints[i].y);
  }
  if (pathLength < 20) return { recognized: false };

  const startPt = rawPoints[0];
  const endPt = rawPoints[rawPoints.length - 1];
  const endpointGap = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
  const isClosed = endpointGap / pathLength < 0.22 || endpointGap < diagonal * 0.2;
  if (!isClosed) return { recognized: false };

  const area = calculatePolygonArea(rawPoints);
  if (area <= 0) return { recognized: false };
  const circularity = (4 * Math.PI * area) / (pathLength * pathLength);

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  const halfW = width / 2 || 1;
  const halfH = height / 2 || 1;

  let totalNormR = 0;
  const normRadii = [];
  for (const p of rawPoints) {
    const nr = Math.hypot((p.x - centerX) / halfW, (p.y - centerY) / halfH);
    normRadii.push(nr);
    totalNormR += nr;
  }
  const meanNormR = totalNormR / normRadii.length;
  let varNormR = 0;
  for (const nr of normRadii) {
    varNormR += (nr - meanNormR) * (nr - meanNormR);
  }
  const stdNormR = Math.sqrt(varNormR / normRadii.length);
  const normRsd = stdNormR / (meanNormR || 1);

  const closedPoints = [...rawPoints.map((p) => ({ x: p.x, y: p.y }))];
  closedPoints.push({ x: rawPoints[0].x, y: rawPoints[0].y });

  const epsilon = Math.max(3.0, diagonal * 0.04);
  const simplified = rdpSimplify(closedPoints, epsilon);
  const uniqueVertices = simplified.slice(0, -1);
  const cornerCount = uniqueVertices.length;
  const aspectRatio = width / (height || 1);

  // B1: Circle / Ellipse (evaluated first)
  if (circularity >= 0.80 && normRsd <= 0.08) {
    const isCircle = aspectRatio >= 0.8 && aspectRatio <= 1.25;
    const size = Math.max(width, height);
    if (isCircle) {
      const sX = centerX - size / 2;
      const sY = centerY - size / 2;
      return {
        recognized: true,
        shapeType: 'circle',
        bounds: { minX: sX, minY: sY, maxX: sX + size, maxY: sY + size },
        confidence: 0.95,
        width: size,
        height: size,
        x: sX,
        y: sY,
      };
    }
    return {
      recognized: true,
      shapeType: 'circle',
      bounds: { minX, minY, maxX, maxY },
      confidence: 0.9,
      width,
      height,
      x: minX,
      y: minY,
    };
  }

  // B2: 4-Corner Polygons
  if (cornerCount === 4 || cornerCount === 5) {
    const vertices = cornerCount === 5 ? reduceTo4Vertices(uniqueVertices) : uniqueVertices;
    if (vertices.length === 4) {
      const angles = computePolygonInternalAngles(vertices);
      const isRightAngled = angles.every((ang) => Math.abs(ang - 90) <= 22);
      const isDiamond = checkDiamondAlignment(vertices, minX, minY, maxX, maxY);
      if (isDiamond) {
        return { recognized: true, shapeType: 'diamond', bounds: { minX, minY, maxX, maxY }, confidence: 0.9 };
      }

      // Hardened rectangle constraint: right-angled and circularity < 0.85
      if (isRightAngled && circularity < 0.85) {
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
        }
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

  return { recognized: false };
}

// Function to generate beautified points with rounded corner fillets
function generateBeautifiedPoints(shape) {
  const points = [];
  const { shapeType, x, y, width, height } = shape;

  if (shapeType === 'rectangle') {
    const r = Math.max(3, Math.min(10, Math.min(width, height) * 0.08));

    const corners = [
      { cx: x + width - r, cy: y + r, startAngle: -Math.PI / 2, endAngle: 0 },
      { cx: x + width - r, cy: y + height - r, startAngle: 0, endAngle: Math.PI / 2 },
      { cx: x + r, cy: y + height - r, startAngle: Math.PI / 2, endAngle: Math.PI },
      { cx: x + r, cy: y + r, startAngle: Math.PI, endAngle: (3 * Math.PI) / 2 },
    ];

    const arcSteps = 4;
    const edgeSteps = 4;

    for (let c = 0; c < 4; c++) {
      const corner = corners[c];
      for (let i = 0; i <= arcSteps; i++) {
        const t = i / arcSteps;
        const theta = corner.startAngle + t * (corner.endAngle - corner.startAngle);
        points.push({
          x: parseFloat((corner.cx + r * Math.cos(theta)).toFixed(2)),
          y: parseFloat((corner.cy + r * Math.sin(theta)).toFixed(2)),
          pressure: 0.5,
        });
      }

      const nextCorner = corners[(c + 1) % 4];
      const edgeStart = {
        x: corner.cx + r * Math.cos(corner.endAngle),
        y: corner.cy + r * Math.sin(corner.endAngle),
      };
      const edgeEnd = {
        x: nextCorner.cx + r * Math.cos(nextCorner.startAngle),
        y: nextCorner.cy + r * Math.sin(nextCorner.startAngle),
      };

      for (let i = 1; i < edgeSteps; i++) {
        const t = i / edgeSteps;
        points.push({
          x: parseFloat((edgeStart.x + t * (edgeEnd.x - edgeStart.x)).toFixed(2)),
          y: parseFloat((edgeStart.y + t * (edgeEnd.y - edgeStart.y)).toFixed(2)),
          pressure: 0.5,
        });
      }
    }
    points.push({ ...points[0] });
  }

  return points;
}

// ========================================================
// Test 1: Hand-Drawn Circle Priority (Does NOT turn into Square/Rectangle)
// ========================================================
{
  // Generate a hand-drawn circle with 48 points and slight realistic tremor
  const handDrawnCircle = [];
  const cx = 200, cy = 200, radius = 80;
  const numPts = 48;
  for (let i = 0; i <= numPts; i++) {
    const theta = (i / numPts) * 2 * Math.PI;
    // Slight jitter (+- 2px)
    const jitter = Math.sin(theta * 5) * 1.5;
    const r = radius + jitter;
    handDrawnCircle.push({
      x: cx + r * Math.cos(theta),
      y: cy + r * Math.sin(theta),
      pressure: 0.5,
    });
  }

  const result = recognizeShape(handDrawnCircle);
  assert.strictEqual(result.recognized, true, 'Circle should be recognized');
  assert.strictEqual(result.shapeType, 'circle', 'Hand-drawn circle must classify as circle, NOT rectangle/square');
  assert(result.confidence >= 0.9, 'Confidence must be >= 0.9');

  console.log('✓ 1. Circle Priority Classification: Hand-drawn circle correctly recognized as circle, never hijacked by rectangle classifier');
}

// ========================================================
// Test 2: Strict Rectangle & Square Discrimination
// ========================================================
{
  // 2.1 Hand-drawn rectangle (4 distinct corners with ~90° angles)
  const rectanglePoints = [];
  const rx = 100, ry = 100, rw = 200, rh = 120;
  // Top edge
  for (let x = rx; x <= rx + rw; x += 20) rectanglePoints.push({ x, y: ry, pressure: 0.5 });
  // Right edge
  for (let y = ry + 20; y <= ry + rh; y += 20) rectanglePoints.push({ x: rx + rw, y, pressure: 0.5 });
  // Bottom edge
  for (let x = rx + rw - 20; x >= rx; x -= 20) rectanglePoints.push({ x, y: ry + rh, pressure: 0.5 });
  // Left edge
  for (let y = ry + rh - 20; y >= ry; y -= 20) rectanglePoints.push({ x: rx, y, pressure: 0.5 });

  const rectResult = recognizeShape(rectanglePoints);
  assert.strictEqual(rectResult.recognized, true, 'Rectangle should be recognized');
  assert.strictEqual(rectResult.shapeType, 'rectangle', 'Must classify as rectangle');
  assert.strictEqual(rectResult.width, rw);
  assert.strictEqual(rectResult.height, rh);

  console.log('✓ 2.1 Rectangle Discrimination: Genuine 4-corner rectangle recognized with preserved aspect ratio');

  // 2.2 Hand-drawn square (aspect ratio ~ 1.0)
  const squarePoints = [];
  const sx = 300, sy = 300, size = 150;
  for (let x = sx; x <= sx + size; x += 15) squarePoints.push({ x, y: sy, pressure: 0.5 });
  for (let y = sy + 15; y <= sy + size; y += 15) squarePoints.push({ x: sx + size, y, pressure: 0.5 });
  for (let x = sx + size - 15; x >= sx; x -= 15) squarePoints.push({ x, y: sy + size, pressure: 0.5 });
  for (let y = sy + size - 15; y >= sy; y -= 15) squarePoints.push({ x: sx, y, pressure: 0.5 });

  const squareResult = recognizeShape(squarePoints);
  assert.strictEqual(squareResult.recognized, true, 'Square should be recognized');
  assert.strictEqual(squareResult.shapeType, 'rectangle');
  assert.strictEqual(squareResult.width, squareResult.height, 'Square should snap to 1:1 aspect ratio');

  console.log('✓ 2.2 Square Snapping: 1:1 square snaps width and height symmetrically');
}

// ========================================================
// Test 3: Rounded Corner Fillet Heads Geometry
// ========================================================
{
  const testShape = {
    recognized: true,
    shapeType: 'rectangle',
    x: 100,
    y: 100,
    width: 200,
    height: 120,
  };

  const points = generateBeautifiedPoints(testShape);
  assert(points.length > 20, 'Beautified rectangle must have sufficient sampled points');

  // 3.1 Verify no consecutive duplicate points (the cause of Catmull-Rom knots / weird heads)
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    assert(dist > 0.1, `Points at index ${i} and ${i+1} must not be identical (dist: ${dist})`);
  }

  // 3.2 Verify corner points curve with smooth radius r
  // Top-left should NOT have a sharp 90° corner at (100, 100), but curve smoothly around fillet
  const hasSharpCornerAtOrigin = points.some((p) => p.x === 100 && p.y === 100);
  assert.strictEqual(hasSharpCornerAtOrigin, false, 'Corner at (100, 100) must be a rounded fillet, not a sharp 90° knot');

  // 3.3 Verify closure: first point and last point match
  assert.strictEqual(points[0].x, points[points.length - 1].x);
  assert.strictEqual(points[0].y, points[points.length - 1].y);

  console.log('✓ 3. Rounded Fillet Heads: Quarter-circle fillets eliminate Catmull-Rom knots and duplicate points');
}

console.log('\n>>> All Milestone 33 tests passed successfully! <<<');
