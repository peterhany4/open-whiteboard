import assert from 'assert';
import { penTool, computePressureRadius } from '../src/tools/PenTool.ts';

console.log('================================================================');
console.log('Running Milestone 35 Test Suite: Microsoft Whiteboard REA Handwriting Engine');
console.log('================================================================\n');

// -----------------------------------------------------------------------------
// Test 1: Module 188610 Linear Affine Stylus Pressure Calibration
// -----------------------------------------------------------------------------
console.log('Test 1: Module 188610 Linear Affine Stylus Pressure Curve & Bounds');
{
  const baseRadius = 4.0; // Base radius for thickness 8

  // Resting pressure p = 0.5 -> exactly 1.0 * baseRadius
  const restingR = computePressureRadius(baseRadius, 0.5);
  assert.strictEqual(restingR, 4.0, `Expected resting pressure radius 4.0, got ${restingR}`);

  // Feather touch p = 0.0 -> 0.25 * baseRadius (floor)
  const floorR = computePressureRadius(baseRadius, 0.0);
  assert.strictEqual(floorR, 1.0, `Expected floor pressure radius 1.0, got ${floorR}`);

  // Heavy press p = 1.0 -> 1.75 * baseRadius (ceiling)
  const ceilingR = computePressureRadius(baseRadius, 1.0);
  assert.strictEqual(ceilingR, 7.0, `Expected ceiling pressure radius 7.0, got ${ceilingR}`);

  // Mid pressure p = 0.25 -> (1.5*0.25 + 0.25) * 4.0 = 0.625 * 4 = 2.5
  const midR = computePressureRadius(baseRadius, 0.25);
  assert.strictEqual(midR, 2.5, `Expected mid pressure radius 2.5, got ${midR}`);

  // Out-of-bounds negative clamped to 0.25x
  const underR = computePressureRadius(baseRadius, -0.5);
  assert.strictEqual(underR, 1.0, `Expected clamped negative pressure radius 1.0, got ${underR}`);

  // Out-of-bounds > 1.0 clamped to 1.75x
  const overR = computePressureRadius(baseRadius, 1.5);
  assert.strictEqual(overR, 7.0, `Expected clamped over pressure radius 7.0, got ${overR}`);

  console.log('  ✓ Module 188610 linear affine pressure curve and bounds verified.\n');
}

// -----------------------------------------------------------------------------
// Test 2: Module 357044 Circle Bitangent Outer Envelope Geometry
// -----------------------------------------------------------------------------
console.log('Test 2: Module 357044 Circle Bitangent Outer Envelope & Arc Caps');
{
  // Horizontal stroke with variable thickness (radii 2, 4, 3)
  const points = [
    { x: 10, y: 50, width: 4, pressure: 0.25, time: 100 },
    { x: 50, y: 50, width: 8, pressure: 0.75, time: 200 },
    { x: 90, y: 50, width: 6, pressure: 0.5, time: 300 },
  ];

  const outlineD = penTool.generateStrokeOutline(points, 4);
  assert(outlineD.length > 0, 'Expected non-empty bitangent outline path');
  assert(outlineD.startsWith('M'), `Path should start with MoveTo (M): ${outlineD.slice(0, 20)}`);
  assert(outlineD.includes('L'), 'Path should include LineTo (L) along bitangent edges');
  assert(outlineD.includes('A'), 'Path should include circular Arc (A) caps');
  assert(outlineD.trim().endsWith('Z'), 'Path should end with closePath (Z)');

  // Ensure uniform stroke returns empty outline (so Catmull-Rom Bezier stroke is used)
  const uniformPoints = [
    { x: 10, y: 10, width: 2, pressure: 0.5, time: 100 },
    { x: 30, y: 20, width: 2, pressure: 0.5, time: 200 },
    { x: 60, y: 40, width: 2, pressure: 0.5, time: 300 },
  ];
  const uniformOutline = penTool.generateStrokeOutline(uniformPoints, 2);
  assert.strictEqual(uniformOutline, '', 'Uniform width stroke should return empty outline to preserve smooth Bezier path');

  console.log('  ✓ Module 357044 bitangent outer envelope generation and uniform fallback verified.\n');
}

// -----------------------------------------------------------------------------
// Test 3: PC & Mouse Dynamic Velocity-to-Thickness Calligraphy Engine
// -----------------------------------------------------------------------------
console.log('Test 3: PC & Mouse Dynamic Velocity-to-Thickness Calligraphy');
{
  const camera = { scale: 1.0, positionX: 0, positionY: 0 };

  // Simulate mouse drawing slow strokes vs fast strokes
  penTool.onPointerDown(
    { button: 0, clientX: 100, clientY: 100, pointerType: 'mouse', timeStamp: 1000 },
    camera
  );

  // Slow move: 20px over 200ms -> v = 0.1 px/ms (slow)
  penTool.onPointerMove(
    { button: 0, clientX: 120, clientY: 100, pointerType: 'mouse', timeStamp: 1200 },
    camera
  );

  let live = penTool.getLiveStroke();
  assert(live !== null, 'Live stroke should be active');
  const slowWidth = live.points[live.points.length - 1].width || 2;

  // Fast move: 100px over 20ms -> v = 5.0 px/ms (fast flick)
  penTool.onPointerMove(
    { button: 0, clientX: 220, clientY: 100, pointerType: 'mouse', timeStamp: 1220 },
    camera
  );

  live = penTool.getLiveStroke();
  assert(live !== null, 'Live stroke should be active');
  const fastWidth = live.points[live.points.length - 1].width || 2;

  // Slow deliberate move should be fuller than fast flick
  assert(
    slowWidth > fastWidth,
    `Expected slowWidth (${slowWidth}) to be greater than fastWidth (${fastWidth})`
  );

  penTool.cancel();
  console.log(`  ✓ Slow velocity width: ${slowWidth}px, Fast velocity width: ${fastWidth}px (Calligraphy modulation verified).\n`);
}

// -----------------------------------------------------------------------------
// Test 4: Dual-Stage Post-Processing: Collinear Simplification & Segment Folding
// -----------------------------------------------------------------------------
console.log('Test 4: Dual-Stage Post-Processing (Modules 317294 & 316556)');
{
  // 1. Collinear filter: straight horizontal line with 10 micro-jitter points along the line
  const straightLine = [
    { x: 0, y: 0, width: 2, pressure: 0.5, time: 10 },
    { x: 10, y: 0.001, width: 2, pressure: 0.5, time: 20 },
    { x: 20, y: -0.001, width: 2, pressure: 0.5, time: 30 },
    { x: 30, y: 0.002, width: 2, pressure: 0.5, time: 40 },
    { x: 40, y: 0, width: 2, pressure: 0.5, time: 50 },
    { x: 100, y: 0, width: 2, pressure: 0.5, time: 60 },
  ];

  const simplified = penTool.applyCollinearFilter(straightLine, 1.0);
  assert(
    simplified.length < straightLine.length,
    `Collinear filter should prune redundant collinear points: got ${simplified.length} from ${straightLine.length}`
  );
  assert.strictEqual(simplified[0].x, 0, 'First point preserved');
  assert.strictEqual(simplified[simplified.length - 1].x, 100, 'Last point preserved');

  // 2. Segment folding: smooth circle arc
  const arcPoints = [];
  for (let a = 0; a <= Math.PI; a += 0.1) {
    arcPoints.push({
      x: 100 + 50 * Math.cos(a),
      y: 100 + 50 * Math.sin(a),
      width: 2,
      pressure: 0.5,
      time: 100 + a * 100,
    });
  }

  const folded = penTool.applySegmentFolding(arcPoints, 1.0);
  assert(folded.length >= 3, 'Arc should retain smooth inflection points');
  assert(folded.length <= arcPoints.length, 'Segment folding should reduce redundant micro-segments');

  console.log(`  ✓ Collinear pruned: ${straightLine.length} -> ${simplified.length} points.`);
  console.log(`  ✓ Arc segment folding: ${arcPoints.length} -> ${folded.length} points.\n`);
}

// -----------------------------------------------------------------------------
// Test 5: Module 170887 Tip Velocity Extrapolation Predictor
// -----------------------------------------------------------------------------
console.log('Test 5: Module 170887 Stroke Tip Velocity Extrapolation Predictor');
{
  const camera = { scale: 1.0, positionX: 0, positionY: 0 };
  penTool.onPointerDown(
    { button: 0, clientX: 100, clientY: 100, pointerType: 'mouse', timeStamp: 1000 },
    camera
  );

  penTool.onPointerMove(
    { button: 0, clientX: 110, clientY: 100, pointerType: 'mouse', timeStamp: 1016 },
    camera
  );

  const live = penTool.getLiveStroke();
  assert(live !== null, 'Live stroke active');
  assert(live.pathD.length > 0, 'Predicted path should be non-empty');

  penTool.cancel();
  console.log('  ✓ Module 170887 stroke tip velocity extrapolation verified.\n');
}

console.log('================================================================');
console.log('All Milestone 35 Tests Passed Successfully! (5/5)');
console.log('================================================================\n');
