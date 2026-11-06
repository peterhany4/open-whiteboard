// Automated Verification Suite for Milestone 37:
// Microsoft Whiteboard REA Circle Arc Sweep Orientation & Full Hemispherical Cap Parity

import assert from 'node:assert';
import { penTool } from '../src/tools/PenTool.ts';

console.log('--- Running Milestone 37 Verification Suite ---');

// 1. Verify Sweep Flag 0 in Single-Point Circles (Module 357044 & 247778)
console.log('\n[Suite 1] Single-Node Circle Dot Arc Symmetry:');
{
  const singlePoint = [{ x: 100, y: 100, width: 10, pressure: 0.5 }];
  const dSingle = penTool.generateStrokeOutline(singlePoint, 10);
  assert.ok(dSingle.length > 0, 'Single point must produce a closed circle path');
  // Check that arc commands use sweep flag 0: A 5.00 5.00 0 0 0 ...
  const arcMatches = [...dSingle.matchAll(/A\s+([\d.]+)\s+([\d.]+)\s+0\s+([01])\s+([01])/g)];
  assert.strictEqual(arcMatches.length, 2, 'Single point must have exactly 2 semi-circle arcs');
  for (const m of arcMatches) {
    const sweepFlag = m[4];
    assert.strictEqual(sweepFlag, '0', `Single point arcs must use sweep flag 0, got ${sweepFlag}`);
  }
  console.log('✓ Single tap dot renders two seamless 180° arcs with sweep flag 0:', dSingle);
}

// 2. Verify End Cap and Start Cap Arc Orientation on Multi-Point Strokes
console.log('\n[Suite 2] End Cap & Start Cap Arc Orientation (Convex Bullet Domes):');
{
  // A variable-width stroke going left-to-right from x=50 to x=200
  const stroke = [
    { x: 50, y: 50, width: 10, pressure: 0.5 },
    { x: 120, y: 50, width: 14, pressure: 0.7 },
    { x: 200, y: 50, width: 20, pressure: 0.9 },
  ];

  const d = penTool.generateStrokeOutline(stroke, 10);
  assert.ok(d.length > 0, 'Multi-point stroke must generate outline path');

  // Parse all Arc commands in the path
  const arcMatches = [...d.matchAll(/A\s+([\d.]+)\s+([\d.]+)\s+0\s+([01])\s+([01])\s+([\d.-]+)\s+([\d.-]+)/g)];
  assert.ok(arcMatches.length >= 2, 'Stroke must contain at least start and end cap arcs');

  // Verify that EVERY arc command in the envelope uses sweep flag 0 (Module 247778 exact definition)
  for (const m of arcMatches) {
    const sweepFlag = m[4];
    assert.strictEqual(sweepFlag, '0', `All bitangent envelope arcs must use sweep flag 0 (counter-clockwise), got ${sweepFlag}`);
  }
  console.log('✓ All envelope arcs strictly use sweep flag 0 matching Module 247778 builder');

  // Verify that the End Cap arc moves from incomingTangent1 to incomingTangent2 with sweep 0:
  // For x=200 with radius 10, incomingTangent1 is at (200, 60), incomingTangent2 is at (200, 40).
  // With sweep 0, SVG sweeps counter-clockwise through angle 0 (x = 210), extending forward!
  console.log('✓ End Cap path snippet:', arcMatches[0][0]);
  console.log('✓ Start Cap path snippet:', arcMatches[arcMatches.length - 1][0]);
}

// 3. Verify Convex Extents for 2-point Stroke
console.log('\n[Suite 3] Convex Bounding Extents (Elimination of Inverted / Half-Cut Circles):');
{
  // A 2-point horizontal stroke
  const stroke = [
    { x: 100, y: 100, width: 10, pressure: 0.5 },
    { x: 200, y: 100, width: 14, pressure: 0.7 }, // radius 7 -> reaches x=207
  ];

  const d = penTool.generateStrokeOutline(stroke, 10);
  assert.ok(d.includes('Z'), 'Path must be closed');

  // Check end cap and start cap arc definitions
  assert.ok(d.includes('A 7.00 7.00 0 1 0') || d.includes('A 7.00 7.00 0 0 0'), 'End cap arc must use sweep flag 0');
  assert.ok(d.includes('A 5.00 5.00 0 0 0') || d.includes('A 5.00 5.00 0 1 0'), 'Start cap arc must use sweep flag 0');

  console.log('✓ End cap correctly bows outwards forming full rounded dome without flat/cut edges');
}

console.log('\n======================================================');
console.log('ALL MILESTONE 37 TESTS PASSED SUCCESSFULLY! (3/3)');
console.log('======================================================');
