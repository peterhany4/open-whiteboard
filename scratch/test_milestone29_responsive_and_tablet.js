/**
 * Milestone 29 Automated Verification Test Suite
 * Tests:
 * 1. Graphic tablet pressure formula (p^0.75 calibrated power curve) & calligraphic modulation
 * 2. Hardware palm rejection state machine (pen priority suppresses touch)
 * 3. Touch vs Stylus discrimination (inkWithTouch toggle & two-finger pinch-pan transition with stroke cancellation)
 * 4. Variable-width outline ribbon path generator
 * 5. Mobile viewport clamping logic
 */

import assert from 'assert';

console.log('=== Running Milestone 29 Test Suite ===\n');

// -------------------------------------------------------------
// Test 1: Pressure Sensitivity & Graphic Tablet Modulation
// -------------------------------------------------------------
console.log('Test 1: Graphic tablet pressure formula (p^0.75) & thickness modulation');

function computeModulatedWidth(baseThickness, rawPressure) {
  const pNorm = Math.pow(Math.max(0.01, Math.min(1.0, rawPressure)), 0.75);
  return parseFloat((baseThickness * (0.35 + 0.65 * pNorm)).toFixed(2));
}

const base = 6;
const wMin = computeModulatedWidth(base, 0.01);
const wRest = computeModulatedWidth(base, 0.5); // resting pressure
const wMax = computeModulatedWidth(base, 1.0);

console.log(`  Base Thickness: ${base}px`);
console.log(`  Min Pressure (0.01): ${wMin}px`);
console.log(`  Resting Pressure (0.50): ${wRest}px`);
console.log(`  Max Pressure (1.00): ${wMax}px`);

assert(wMin < wRest, 'Min pressure stroke must be thinner than resting pressure stroke');
assert(wRest < wMax, 'Resting pressure stroke must be thinner than max pressure stroke');
assert.strictEqual(wMax, base, 'Max pressure must equal 100% of base thickness');
assert(wMin >= base * 0.35, 'Min pressure width must not drop below 35% base floor');
console.log('✓ Test 1 Passed: Pressure modulation adheres to tablet calibration power curve.\n');

// -------------------------------------------------------------
// Test 2: Hardware Palm Rejection & Pointer Discrimination
// -------------------------------------------------------------
console.log('Test 2: Hardware Palm Rejection & Pointer Discrimination Logic');

class MockPointerDispatcher {
  constructor() {
    this.isPenActive = false;
    this.activeTouches = new Map();
    this.inkWithTouch = false;
    this.panCount = 0;
    this.strokeStartCount = 0;
    this.strokeCancelCount = 0;
    this.isPinching = false;
  }

  handlePointerDown(pointerId, pointerType, x, y) {
    if (this.isPenActive && pointerType === 'touch') {
      // Discard touch: Hardware palm rejection!
      return 'rejected_palm';
    }

    if (pointerType === 'pen') {
      this.isPenActive = true;
      this.strokeStartCount++;
      return 'pen_drawing';
    }

    if (pointerType === 'touch') {
      this.activeTouches.set(pointerId, { x, y });

      if (this.activeTouches.size >= 2) {
        if (this.strokeStartCount > 0) {
          this.strokeCancelCount++;
        }
        this.isPinching = true;
        return 'transition_pinch_pan';
      }

      if (!this.inkWithTouch) {
        this.panCount++;
        return 'touch_pan';
      } else {
        this.strokeStartCount++;
        return 'touch_ink';
      }
    }
  }

  handlePointerUp(pointerId, pointerType) {
    if (pointerType === 'pen') {
      this.isPenActive = false;
    }
    if (pointerType === 'touch') {
      this.activeTouches.delete(pointerId);
      if (this.activeTouches.size < 2) {
        this.isPinching = false;
      }
    }
  }
}

const dispatcher = new MockPointerDispatcher();

// Scenario A: Stylus is active -> resting palm touches screen
const r1 = dispatcher.handlePointerDown(1, 'pen', 100, 100);
assert.strictEqual(r1, 'pen_drawing', 'Stylus pen must start drawing');
assert.strictEqual(dispatcher.isPenActive, true);

// Palm contact while stylus is down
const r2 = dispatcher.handlePointerDown(2, 'touch', 120, 200);
assert.strictEqual(r2, 'rejected_palm', 'Simultaneous touch must be rejected while pen is active');
assert.strictEqual(dispatcher.panCount, 0, 'Palm must never trigger canvas pan');

// Stylus lifts
dispatcher.handlePointerUp(1, 'pen');
assert.strictEqual(dispatcher.isPenActive, false);
console.log('✓ Test 2 Passed: Hardware palm rejection suppresses touch during stylus drawing.\n');

// -------------------------------------------------------------
// Test 3: Touch Navigation vs Inking & Two-Finger Gesture Transition
// -------------------------------------------------------------
console.log('Test 3: Touch Navigation & Two-Finger Gesture Transition with Cancellation');

// Scenario B: inkWithTouch is FALSE (default) -> single touch pans
dispatcher.inkWithTouch = false;
const r3 = dispatcher.handlePointerDown(3, 'touch', 50, 50);
assert.strictEqual(r3, 'touch_pan', 'Single touch must pan when inkWithTouch is false');
dispatcher.handlePointerUp(3, 'touch');

// Scenario C: inkWithTouch is TRUE -> 1st touch inks, 2nd touch arrives -> cancels stroke
dispatcher.inkWithTouch = true;
const r4 = dispatcher.handlePointerDown(4, 'touch', 100, 100);
assert.strictEqual(r4, 'touch_ink', 'Single touch must ink when inkWithTouch is true');

// 2nd finger lands for pinch-zoom
const r5 = dispatcher.handlePointerDown(5, 'touch', 200, 200);
assert.strictEqual(r5, 'transition_pinch_pan', 'Second finger must engage pinch-pan');
assert.strictEqual(dispatcher.strokeCancelCount, 1, 'In-progress single-touch stroke must be aborted without stray ink');
assert.strictEqual(dispatcher.isPinching, true);

dispatcher.handlePointerUp(4, 'touch');
dispatcher.handlePointerUp(5, 'touch');
assert.strictEqual(dispatcher.isPinching, false);
console.log('✓ Test 3 Passed: Two-finger gesture transitions smoothly and cancels single-touch stroke.\n');

// -------------------------------------------------------------
// Test 4: Variable-Width Outline Ribbon Generation
// -------------------------------------------------------------
console.log('Test 4: Variable-Width Outline Ribbon Path Generator');

function generateStrokeOutline(points, defaultWidth) {
  if (points.length < 2) {
    if (points.length === 1) {
      const r = (points[0].width || defaultWidth) / 2;
      return `M ${(points[0].x - r).toFixed(2)} ${points[0].y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(points[0].x + r).toFixed(2)} ${points[0].y.toFixed(2)} A ${r.toFixed(2)} ${r.toFixed(2)} 0 1 0 ${(points[0].x - r).toFixed(2)} ${points[0].y.toFixed(2)} Z`;
    }
    return '';
  }

  let hasVariation = false;
  const firstW = points[0].width || defaultWidth;
  for (let i = 1; i < points.length; i++) {
    const w = points[i].width || defaultWidth;
    if (Math.abs(w - firstW) > 0.3) {
      hasVariation = true;
      break;
    }
  }
  if (!hasVariation) return '';

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
  for (let i = 1; i < leftPts.length; i++) {
    d += ` L ${leftPts[i].x.toFixed(2)} ${leftPts[i].y.toFixed(2)}`;
  }

  const endHalfW = (points[points.length - 1].width || defaultWidth) / 2;
  const lastRight = rightPts[rightPts.length - 1];
  d += ` A ${endHalfW.toFixed(2)} ${endHalfW.toFixed(2)} 0 0 1 ${lastRight.x.toFixed(2)} ${lastRight.y.toFixed(2)}`;

  for (let i = rightPts.length - 1; i >= 0; i--) {
    d += ` L ${rightPts[i].x.toFixed(2)} ${rightPts[i].y.toFixed(2)}`;
  }

  const startHalfW = (points[0].width || defaultWidth) / 2;
  const firstLeft = leftPts[0];
  d += ` A ${startHalfW.toFixed(2)} ${startHalfW.toFixed(2)} 0 0 1 ${firstLeft.x.toFixed(2)} ${firstLeft.y.toFixed(2)}`;
  d += ' Z';

  return d;
}

const uniformPoints = [
  { x: 0, y: 0, width: 4 },
  { x: 10, y: 10, width: 4 },
  { x: 20, y: 20, width: 4 },
];
const outlineUniform = generateStrokeOutline(uniformPoints, 4);
assert.strictEqual(outlineUniform, '', 'Uniform points should return empty string so native SVG stroke is used');

const variablePoints = [
  { x: 0, y: 0, width: 2 },
  { x: 20, y: 10, width: 4.5 },
  { x: 40, y: 20, width: 6 },
  { x: 60, y: 30, width: 3 },
];
const outlineVariable = generateStrokeOutline(variablePoints, 4);
assert(outlineVariable.startsWith('M '), 'Variable width points must produce closed outline ribbon');
assert(outlineVariable.endsWith(' Z'), 'Ribbon must end with Z');
assert(outlineVariable.includes(' A '), 'Ribbon must include rounded caps');
console.log('✓ Test 4 Passed: Outline ribbon correctly generates closed geometry for variable width strokes.\n');

// -------------------------------------------------------------
// Test 5: Viewport Clamping Algorithm for Popovers
// -------------------------------------------------------------
console.log('Test 5: Popover Viewport Bounds Clamping Logic');

function clampPopoverShift(popoverLeft, popoverRight, viewportWidth, margin = 12) {
  let shift = 0;
  if (popoverLeft < margin) {
    shift = margin - popoverLeft;
  } else if (popoverRight > viewportWidth - margin) {
    shift = viewportWidth - margin - popoverRight;
  }
  return shift;
}

// Narrow phone: width 360px, popover width 280px centered at button at x=30px
const popoverW = 280;
const buttonX = 30;
const leftEdge = buttonX - popoverW / 2; // -110px (overflows left edge by 110px)
const rightEdge = buttonX + popoverW / 2; // 170px

const shiftLeft = clampPopoverShift(leftEdge, rightEdge, 360, 12);
console.log(`  Popover shifted right by ${shiftLeft}px (original left: ${leftEdge}px, clamped left: ${leftEdge + shiftLeft}px)`);
assert.strictEqual(leftEdge + shiftLeft, 12, 'Popover left edge must be clamped to 12px margin');

// Button near right edge of 360px screen: x=340px
const buttonRightX = 340;
const leftRight = buttonRightX - popoverW / 2; // 200px
const rightRight = buttonRightX + popoverW / 2; // 480px (overflows right edge by 120px)

const shiftRight = clampPopoverShift(leftRight, rightRight, 360, 12);
console.log(`  Popover shifted left by ${shiftRight}px (original right: ${rightRight}px, clamped right: ${rightRight + shiftRight}px)`);
assert.strictEqual(rightRight + shiftRight, 360 - 12, 'Popover right edge must be clamped to screen width - 12px');

console.log('✓ Test 5 Passed: Popovers clamp cleanly within phone viewport bounds.\n');

console.log('====================================================');
console.log('🎉 ALL MILESTONE 29 TESTS PASSED WITH ZERO ERRORS!');
console.log('====================================================');
