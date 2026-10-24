import assert from 'assert';

console.log('Testing Milestone 23 Extension: Undo / Toggle Off PDF Text Highlight on Reselect...\n');

// 1. Simulation of sceneStore and highlight logic
class MockSceneStore {
  constructor() {
    this.entities = new Map();
  }

  addEntity(ent) {
    this.entities.set(ent.id, { ...ent });
  }

  removeEntity(id) {
    this.entities.delete(id);
  }

  getAllEntities() {
    return Array.from(this.entities.values());
  }
}

const sceneStore = new MockSceneStore();

function isColorEqual(c1, c2) {
  return c1.trim().toLowerCase() === c2.trim().toLowerCase();
}

function doesStrokeOverlapLine(stroke, line) {
  const sBounds = stroke.bounds;
  const sMidY = (sBounds.minY + sBounds.maxY) / 2;
  const sHeight = Math.max(8, sBounds.maxY - sBounds.minY);

  const yDist = Math.abs(sMidY - line.midY);
  const maxAllowedYDist = Math.max(sHeight, line.height) * 0.85;
  if (yDist > maxAllowedYDist) return false;

  const overlapX = Math.max(0, Math.min(sBounds.maxX, line.maxX) - Math.max(sBounds.minX, line.minX));
  const lineWidth = line.maxX - line.minX;
  const strokeWidth = sBounds.maxX - sBounds.minX;
  if (lineWidth <= 0 || strokeWidth <= 0) return false;

  return overlapX >= 8 && (overlapX / lineWidth >= 0.35 || overlapX / strokeWidth >= 0.35);
}

function applyHighlight(color, worldLines) {
  const allEntities = sceneStore.getAllEntities();
  const highlighters = allEntities.filter(
    (ent) => ent.type === 'stroke' && Boolean(ent.isHighlighter || ent.tool === 'highlighter')
  );

  const overlappingStrokes = highlighters.filter((stroke) =>
    worldLines.some((line) => doesStrokeOverlapLine(stroke, line))
  );

  const sameColorStrokes = overlappingStrokes.filter((stroke) => isColorEqual(stroke.color, color));

  if (sameColorStrokes.length > 0) {
    // 1. UNDO / TOGGLE OFF
    for (const stroke of sameColorStrokes) {
      sceneStore.removeEntity(stroke.id);
    }
    return { action: 'undo', removedCount: sameColorStrokes.length };
  }

  // 2. APPLY / REPLACE
  const diffColorStrokes = overlappingStrokes.filter((stroke) => !isColorEqual(stroke.color, color));
  for (const old of diffColorStrokes) {
    sceneStore.removeEntity(old.id);
  }

  const addedStrokes = [];
  worldLines.forEach((line, idx) => {
    const stroke = {
      id: `hl_test_${Date.now()}_${idx}`,
      type: 'stroke',
      tool: 'highlighter',
      color,
      width: line.height,
      points: [
        { x: line.minX, y: line.midY, pressure: 0.5 },
        { x: line.maxX, y: line.midY, pressure: 0.5 },
      ],
      bounds: {
        minX: line.minX,
        maxX: line.maxX,
        minY: line.midY - line.height / 2,
        maxY: line.midY + line.height / 2,
      },
      isHighlighter: true,
    };
    sceneStore.addEntity(stroke);
    addedStrokes.push(stroke);
  });

  return { action: 'highlight', addedCount: addedStrokes.length, replacedCount: diffColorStrokes.length };
}

// ----------------------------------------------------------------------------
// Test 1: Initial Highlight
// ----------------------------------------------------------------------------
console.log('1. User selects word "Whiteboard" at [100, 200] y=150 and clicks Soft Yellow (#FFE843)...');
const wordLine = [{ minX: 100, maxX: 200, midY: 150, height: 18 }];
const res1 = applyHighlight('#FFE843', wordLine);

assert.strictEqual(res1.action, 'highlight');
assert.strictEqual(res1.addedCount, 1);
assert.strictEqual(sceneStore.getAllEntities().length, 1);
const createdStroke = sceneStore.getAllEntities()[0];
assert.strictEqual(createdStroke.color, '#FFE843');
console.log('✓ Highlight successfully applied.');

// ----------------------------------------------------------------------------
// Test 2: Select the same word and click the SAME highlight color -> UNDO
// ----------------------------------------------------------------------------
console.log('\n2. User re-selects the same word "Whiteboard" at [100, 200] and clicks Soft Yellow (#FFE843)...');
const res2 = applyHighlight('#FFE843', wordLine);

assert.strictEqual(res2.action, 'undo');
assert.strictEqual(res2.removedCount, 1);
assert.strictEqual(sceneStore.getAllEntities().length, 0);
console.log('✓ Same color click successfully UNDOES / removes the highlight.');

// ----------------------------------------------------------------------------
// Test 3: Highlight again, then select and click DIFFERENT color -> REPLACE
// ----------------------------------------------------------------------------
console.log('\n3. User highlights "Whiteboard" with Soft Yellow, then selects it and clicks Soft Pastel Pink (#FF9EC6)...');
applyHighlight('#FFE843', wordLine);
assert.strictEqual(sceneStore.getAllEntities().length, 1);
assert.strictEqual(sceneStore.getAllEntities()[0].color, '#FFE843');

const res3 = applyHighlight('#FF9EC6', wordLine);
assert.strictEqual(res3.action, 'highlight');
assert.strictEqual(res3.replacedCount, 1);
assert.strictEqual(sceneStore.getAllEntities().length, 1);
assert.strictEqual(sceneStore.getAllEntities()[0].color, '#FF9EC6');
console.log('✓ Different color click cleanly replaces the previous highlight without double stacking.');

// ----------------------------------------------------------------------------
// Test 4: Re-selecting Pink and clicking Pink -> UNDO
// ----------------------------------------------------------------------------
console.log('\n4. User re-selects and clicks Soft Pastel Pink (#FF9EC6)...');
const res4 = applyHighlight('#FF9EC6', wordLine);
assert.strictEqual(res4.action, 'undo');
assert.strictEqual(sceneStore.getAllEntities().length, 0);
console.log('✓ Pink highlight undone cleanly.');

console.log('\n========================================================================');
console.log('All tests passed! Selection same-color toggle/undo verified successfully.');
console.log('========================================================================');
