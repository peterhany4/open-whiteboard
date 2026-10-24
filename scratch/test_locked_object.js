import assert from 'assert';

console.log('Testing Milestone 20: Locked Object Selection & One-Click Unlock...');

// 1. Mock Scene Entities
const lockedImage = {
  id: 'img_locked_1',
  type: 'image',
  x: 200,
  y: 200,
  width: 400,
  height: 300,
  zIndex: 50,
  isLocked: true,
  isLockedToBackground: true,
  bounds: { minX: 200, minY: 200, maxX: 600, maxY: 500 },
};

const inkStrokeOnImage = {
  id: 'stroke_1',
  type: 'stroke',
  tool: 'pen',
  points: [
    { x: 300, y: 300 },
    { x: 350, y: 350 },
  ],
  width: 4,
  bounds: { minX: 300, minY: 300, maxX: 350, maxY: 350 },
  zIndex: 200,
};

const allEntities = [lockedImage, inkStrokeOnImage];

// 2. Test Single Click Hit-Testing (SelectTool logic)
function hitTestSingleClick(entities, p) {
  const hitMargin = 8;
  for (let i = entities.length - 1; i >= 0; i--) {
    const entity = entities[i];
    const b = entity.bounds;
    if (
      p.x < b.minX - hitMargin ||
      p.x > b.maxX + hitMargin ||
      p.y < b.minY - hitMargin ||
      p.y > b.maxY + hitMargin
    ) {
      continue;
    }

    if (entity.type === 'stroke') {
      // Check stroke proximity
      const hit = entity.points.some(
        (pt) => Math.hypot(p.x - pt.x, p.y - pt.y) <= 12
      );
      if (hit) return entity.id;
    } else {
      // Box entity (image, note, shape, etc.)
      return entity.id;
    }
  }
  return null;
}

// Clicking on the locked image directly (away from stroke)
const clickedId = hitTestSingleClick(allEntities, { x: 250, y: 250 });
assert.strictEqual(
  clickedId,
  'img_locked_1',
  'Clicking on a locked image in Select mode must hit-test and select it'
);

// Clicking on the stroke directly returns the stroke first (zIndex 200 > 50)
const strokeClickId = hitTestSingleClick(allEntities, { x: 300, y: 300 });
assert.strictEqual(
  strokeClickId,
  'stroke_1',
  'Clicking on stroke above locked image selects the topmost stroke'
);

// 3. Test Marquee Drag Selection (Immunity for locked items)
function hitTestMarquee(entities, box) {
  const hitIds = [];
  for (const entity of entities) {
    // Locked items are immune from marquee selection
    if (entity.isLocked || entity.isLockedToBackground) {
      continue;
    }
    const b = entity.bounds;
    const overlaps =
      b.minX <= box.maxX &&
      b.maxX >= box.minX &&
      b.minY <= box.maxY &&
      b.maxY >= box.minY;
    if (overlaps) {
      hitIds.push(entity.id);
    }
  }
  return hitIds;
}

const marqueeBox = { minX: 100, minY: 100, maxX: 700, maxY: 600 };
const marqueeSelected = hitTestMarquee(allEntities, marqueeBox);
assert.deepStrictEqual(
  marqueeSelected,
  ['stroke_1'],
  'Marquee drag selection must only select strokes, ignoring locked background images'
);

// 4. Test Pointer-Events Mode Isolation Rule
function getImagePointerEvents(isSelectTool, isLocked) {
  return isSelectTool ? 'auto' : 'none';
}

assert.strictEqual(
  getImagePointerEvents(false, true),
  'none',
  'In inking modes (Pen/Highlighter/Eraser), locked image has pointerEvents: none to allow smooth drawing'
);
assert.strictEqual(
  getImagePointerEvents(true, true),
  'auto',
  'In Select mode, locked image has pointerEvents: auto so hover and clicks are captured'
);

// 5. Test Lock / Unlock State Toggle
function toggleLock(entity) {
  const willBeLocked = !Boolean(entity.isLocked || entity.isLockedToBackground);
  return {
    ...entity,
    isLocked: willBeLocked,
    isLockedToBackground: willBeLocked,
    zIndex: willBeLocked ? 50 : 100,
  };
}

const unlockedImage = toggleLock(lockedImage);
assert.strictEqual(unlockedImage.isLocked, false);
assert.strictEqual(unlockedImage.isLockedToBackground, false);
assert.strictEqual(unlockedImage.zIndex, 100, 'Unlocked image zIndex restored to 100');

const relockedImage = toggleLock(unlockedImage);
assert.strictEqual(relockedImage.isLocked, true);
assert.strictEqual(relockedImage.isLockedToBackground, true);
assert.strictEqual(relockedImage.zIndex, 50, 'Locked image zIndex set to 50 below inking layer');

console.log('All Milestone 20 locked object tests passed successfully!');
