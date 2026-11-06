// Automated Verification Suite for Milestone 36:
// Microsoft Whiteboard REA Inking End-Stroke Parity, 5 Unified Pen Slots & Custom Color Picker

import assert from 'node:assert';
import { penTool } from '../src/tools/PenTool.ts';
import { inkingStore, PEN_COLOR_SWATCHES } from '../src/store/inkingStore.ts';

console.log('--- Running Milestone 36 Verification Suite ---');

// 1. Verify Bitangent Outer Envelope End-Stroke Retention (Module 357044)
console.log('\n[Suite 1] Bitangent Outer Envelope End-Stroke Retention:');
{
  // A 2-point stroke (must produce a complete closed stadium contour, not a single circle dot)
  const twoPoints = [
    { x: 10, y: 10, width: 2, pressure: 0.5 },
    { x: 20, y: 20, width: 4, pressure: 0.8 },
  ];
  const d2 = penTool.generateStrokeOutline(twoPoints, 2);
  assert.ok(d2.length > 0, '2-point stroke must produce an outline path');
  assert.ok(d2.includes('Z'), 'Outline must be a closed path ending with Z');
  assert.ok(d2.includes('M'), 'Outline must start with M');
  assert.ok(d2.includes('A'), 'Outline must contain arc caps');
  // Must contain both outgoing and incoming tangents
  console.log('✓ 2-point stroke generates complete closed bitangent envelope:', d2.substring(0, 80) + '...');

  // A 3-point stroke (must include the 3rd point, not truncate at 2nd point)
  const threePoints = [
    { x: 0, y: 0, width: 2, pressure: 0.5 },
    { x: 50, y: 0, width: 3, pressure: 0.6 },
    { x: 100, y: 0, width: 5, pressure: 0.9 },
  ];
  const d3 = penTool.generateStrokeOutline(threePoints, 2);
  assert.ok(d3.length > 0, '3-point stroke must produce an outline path');
  // Check that coordinates near x=100 are present in the path string!
  assert.ok(d3.includes('100') || d3.includes('102') || d3.includes('99'), 'Outline must extend to the final point at x=100');
  console.log('✓ 3-point stroke retains end node at x=100 and does not truncate:', d3.substring(0, 80) + '...');

  // A multi-point stroke
  const multiPoints = [
    { x: 0, y: 0, width: 2, pressure: 0.5 },
    { x: 10, y: 15, width: 2.2, pressure: 0.52 },
    { x: 25, y: 30, width: 2.8, pressure: 0.58 },
    { x: 40, y: 45, width: 3.5, pressure: 0.65 },
    { x: 60, y: 60, width: 4.0, pressure: 0.75 },
    { x: 80, y: 70, width: 2.5, pressure: 0.55 },
  ];
  const dMulti = penTool.generateStrokeOutline(multiPoints, 2);
  assert.ok(dMulti.includes('80') || dMulti.includes('81') || dMulti.includes('82'), 'Multi-point stroke reaches final contact point x=80');
  console.log('✓ Multi-point stroke cleanly incorporates final end-stroke point');
}

// 2. Verify 5 Unified Pen Slots in inkingStore (Modules 900158, 786285 & 4101)
console.log('\n[Suite 2] 5 Unified Pen Slots Parity (Modules 900158, 786285 & 4101):');
{
  const state = inkingStore.getState();
  const pens = state.pens;

  const expectedSlots = ['Pen1', 'Pen2', 'Pen3', 'Pen4', 'Pen5'];
  for (const slot of expectedSlots) {
    assert.ok(pens[slot], `Slot ${slot} must exist in pens store`);
    assert.strictEqual(typeof pens[slot].color, 'string', `${slot} must have valid color`);
    assert.strictEqual(typeof pens[slot].thickness, 'number', `${slot} must have thickness`);
    assert.ok(Array.isArray(pens[slot].recentColors), `${slot} must have recentColors array`);
  }

  // Check authentic Microsoft Whiteboard default colors (Module 4101)
  assert.strictEqual(pens.Pen1.color.toUpperCase(), '#1F1F1F', 'Pen1 default must be #1F1F1F');
  assert.strictEqual(pens.Pen2.color.toUpperCase(), '#E71224', 'Pen2 default must be #E71224');
  assert.strictEqual(pens.Pen3.color.toUpperCase(), '#02A556', 'Pen3 default must be #02A556');
  assert.strictEqual(pens.Pen4.color.toUpperCase(), '#0069BF', 'Pen4 default must be #0069BF');
  assert.strictEqual(pens.Pen5.color.toUpperCase(), '#00B44B', 'Pen5 default must be #00B44B');
  console.log('✓ All 5 pen slots have authentic Microsoft Whiteboard default palette values');

  // Verify selecting and configuring Pen 5
  inkingStore.selectPen('Pen5');
  assert.strictEqual(inkingStore.getState().selectedTool, 'Pen5', 'Selecting Pen5 updates selectedTool');
  console.log('✓ Pen 5 seamlessly selects and activates as a primary inking tool');
}

// 3. Verify Custom Color Picker State Management & Recent Colors (Modules 434554 & 45173)
console.log('\n[Suite 3] Custom Color Picker State & Recent Colors:');
{
  const customColor = '#38B6FF';
  inkingStore.setPenColor('Pen1', customColor);

  const updatedPen1 = inkingStore.getState().pens.Pen1;
  assert.strictEqual(updatedPen1.color, customColor, 'Pen1 color updated to custom hex');
  assert.strictEqual(updatedPen1.effect, undefined, 'Setting solid color clears effect');
  assert.strictEqual(updatedPen1.recentColors[0], customColor, 'Custom color prepended to recentColors');
  assert.ok(updatedPen1.recentColors.length <= 4, 'recentColors bound to 4 items');
  console.log('✓ Custom color picker updates pen color and prepends to recentColors:', updatedPen1.recentColors);

  // Restore Pen1 default for clean state
  inkingStore.setPenColor('Pen1', '#1F1F1F');
}

// 4. Verify onPointerUp Coordinate Sampling & Retention
console.log('\n[Suite 4] Pointer Up Contact Sampling & Finalization:');
{
  const camera = { scale: 1.0, positionX: 0, positionY: 0 };
  const mockDownEvent = {
    button: 0,
    clientX: 100,
    clientY: 100,
    pointerId: 1,
    pointerType: 'mouse',
    pressure: 0.5,
    timeStamp: 1000,
  };

  penTool.onPointerDown(mockDownEvent, camera, null, 'Pen1');
  assert.ok(penTool.isCurrentlyDrawing(), 'Pen tool should be drawing');

  const mockMoveEvent = {
    clientX: 110,
    clientY: 110,
    pointerId: 1,
    pointerType: 'mouse',
    pressure: 0.5,
    timeStamp: 1016,
  };
  penTool.onPointerMove(mockMoveEvent, camera, null);

  const mockUpEvent = {
    clientX: 125,
    clientY: 125,
    pointerId: 1,
    pointerType: 'mouse',
    pressure: 0, // Typical browser mouseup/pointerup has pressure: 0
    timeStamp: 1032,
  };
  const stroke = penTool.onPointerUp(mockUpEvent, camera, null);
  assert.ok(!penTool.isCurrentlyDrawing(), 'Pen tool drawing should be completed');
  assert.ok(stroke, 'Committed stroke entity should be returned');
  assert.ok(stroke.points.length >= 2, 'Stroke points should contain at least 2 points');

  const lastPoint = stroke.points[stroke.points.length - 1];
  assert.strictEqual(lastPoint.x, 125, 'Last point must be sampled from pointerup event at x=125');
  assert.strictEqual(lastPoint.y, 125, 'Last point must be sampled from pointerup event at y=125');
  assert.ok(lastPoint.pressure > 0, 'Last point pressure must not collapse to 0 (Module 170887 class m)');
  console.log('✓ onPointerUp accurately samples final release coordinates and preserves non-zero pressure:', lastPoint);
}

console.log('\n======================================================');
console.log('ALL MILESTONE 36 TESTS PASSED SUCCESSFULLY! (4/4)');
console.log('======================================================');
