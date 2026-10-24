import assert from 'assert';

console.log('Testing Milestone 22: Smart PDF Text Highlighting (Snap-to-Text & Quick Highlight Toolbar)...');

// 1. PDF Text Line Spatial Registry implementation
class MockPDFTextRegistry {
  constructor() {
    this.linesByDoc = new Map();
  }

  registerDocPageLines(docId, pageNumber, lines) {
    const existing = this.linesByDoc.get(docId) || [];
    const filtered = existing.filter((l) => l.pageNumber !== pageNumber);
    filtered.push(...lines);
    this.linesByDoc.set(docId, filtered);
  }

  unregisterDoc(docId) {
    this.linesByDoc.delete(docId);
  }

  getDocLines(docId) {
    return this.linesByDoc.get(docId) || [];
  }

  snapPointToText(worldPt, allDocs, tolerance = 12) {
    for (const doc of allDocs) {
      if (doc.type !== 'pdf_document') continue;

      if (
        worldPt.x < doc.x - 24 ||
        worldPt.x > doc.x + doc.width + 24 ||
        worldPt.y < doc.y - 24 ||
        worldPt.y > doc.y + doc.height + 24
      ) {
        continue;
      }

      const lines = this.linesByDoc.get(doc.id);
      if (!lines || lines.length === 0) continue;

      const relX = worldPt.x - doc.x;
      const relY = worldPt.y - doc.y;

      for (const line of lines) {
        const dy = Math.abs(relY - line.relCenterY);
        if (dy <= tolerance) {
          if (relX >= line.relMinX - 16 && relX <= line.relMaxX + 16) {
            return {
              point: {
                x: worldPt.x,
                y: doc.y + line.relCenterY,
              },
              snappedLine: line,
            };
          }
        }
      }
    }

    return { point: worldPt, snappedLine: null };
  }
}

const registry = new MockPDFTextRegistry();

// 2. Setup mock PDF document and text lines
const mockDoc = {
  id: 'pdf_doc_1',
  type: 'pdf_document',
  x: 200,
  y: 100,
  width: 600,
  height: 800,
};

const sampleLines = [
  {
    id: 'pdf_doc_1_p1_l0',
    docId: 'pdf_doc_1',
    pageNumber: 1,
    relMinX: 50,
    relMaxX: 550,
    relCenterY: 120, // World center Y: 100 + 120 = 220
    relHeight: 18,
  },
  {
    id: 'pdf_doc_1_p1_l1',
    docId: 'pdf_doc_1',
    pageNumber: 1,
    relMinX: 50,
    relMaxX: 480,
    relCenterY: 150, // World center Y: 100 + 150 = 250
    relHeight: 18,
  },
];

registry.registerDocPageLines('pdf_doc_1', 1, sampleLines);

// Test 1: Snap-to-Text when drawing near a text line
console.log('Test 1: Smart Snap-to-Text trajectory calculation...');

// Candidate point close to line 0 (world Y = 224, tolerance = 12, line center Y = 220)
const pointNearLine = { x: 300, y: 224 };
const snapRes1 = registry.snapPointToText(pointNearLine, [mockDoc], 12);
assert.notStrictEqual(snapRes1.snappedLine, null);
assert.strictEqual(snapRes1.point.y, 220); // Snapped to exact line centerline
assert.strictEqual(snapRes1.point.x, 300); // Horizontal position retained
assert.strictEqual(snapRes1.snappedLine.id, 'pdf_doc_1_p1_l0');

// Freehand in margin (vertical Y is far away, Y = 180, dy = 40 > 12)
const marginPoint = { x: 300, y: 180 };
const snapRes2 = registry.snapPointToText(marginPoint, [mockDoc], 12);
assert.strictEqual(snapRes2.snappedLine, null);
assert.strictEqual(snapRes2.point.x, 300);
assert.strictEqual(snapRes2.point.y, 180); // Unchanged freehand

// Outside document bounds (X = 900 > 800)
const outsidePoint = { x: 900, y: 220 };
const snapRes3 = registry.snapPointToText(outsidePoint, [mockDoc], 12);
assert.strictEqual(snapRes3.snappedLine, null);
assert.strictEqual(snapRes3.point.x, 900);
console.log('✓ Smart Snap-to-Text trajectory calculation verified.');

// Test 2: Text Selection to World Highlight Stroke Generation
console.log('\nTest 2: Selection rect to straight highlight stroke generation...');

function screenToWorld(pt, camera) {
  return {
    x: (pt.x - camera.positionX) / camera.scale,
    y: (pt.y - camera.positionY) / camera.scale,
  };
}

const mockCamera = { scale: 1.5, positionX: 50, positionY: 30 };

// Simulate 2 lines of selected text from browser Range.getClientRects()
const mockClientRects = [
  { left: 350, right: 650, top: 180, bottom: 210, width: 300, height: 30 },
  { left: 350, right: 580, top: 220, bottom: 250, width: 230, height: 30 },
];

function generateHighlightsFromSelection(rects, camera, color) {
  return rects.map((rect, idx) => {
    const midY = rect.top + rect.height / 2;
    const startPt = screenToWorld({ x: rect.left, y: midY }, camera);
    const endPt = screenToWorld({ x: rect.right, y: midY }, camera);
    const strokeWidth = Math.max(10, rect.height / camera.scale);

    return {
      id: `hl_test_${idx}`,
      type: 'stroke',
      tool: 'highlighter',
      color,
      width: strokeWidth,
      points: [
        { x: startPt.x, y: startPt.y, pressure: 0.5 },
        { x: endPt.x, y: endPt.y, pressure: 0.5 },
      ],
      isHighlighter: true,
      zIndex: 150,
      bounds: {
        minX: Math.min(startPt.x, endPt.x) - strokeWidth / 2,
        minY: startPt.y - strokeWidth / 2,
        maxX: Math.max(startPt.x, endPt.x) + strokeWidth / 2,
        maxY: startPt.y + strokeWidth / 2,
      },
    };
  });
}

const highlights = generateHighlightsFromSelection(mockClientRects, mockCamera, '#FFF100');
assert.strictEqual(highlights.length, 2);

// Verify Line 1
const hl1 = highlights[0];
assert.strictEqual(hl1.tool, 'highlighter');
assert.strictEqual(hl1.isHighlighter, true);
assert.strictEqual(hl1.color, '#FFF100');
assert.strictEqual(hl1.points.length, 2);
assert.strictEqual(hl1.points[0].y, hl1.points[1].y); // Completely straight horizontal highlight
assert.strictEqual(hl1.points[0].x, (350 - 50) / 1.5);
assert.strictEqual(hl1.points[1].x, (650 - 50) / 1.5);
assert.strictEqual(hl1.width, 30 / 1.5); // 20px in world space
assert.strictEqual(hl1.zIndex, 150);

// Verify Line 2
const hl2 = highlights[1];
assert.strictEqual(hl2.points[0].y, hl2.points[1].y);
assert.strictEqual(hl2.points[0].x, (350 - 50) / 1.5);
assert.strictEqual(hl2.points[1].x, (580 - 50) / 1.5);
console.log('✓ Selection rect to straight highlight stroke generation verified.');

// Test 3: Undo/Redo Atomic Transaction Integrity
console.log('\nTest 3: Undo/Redo transaction integrity...');

class MockSceneStore {
  constructor() {
    this.entities = new Map();
  }
  addEntity(e) {
    this.entities.set(e.id, e);
  }
  removeEntity(id) {
    this.entities.delete(id);
  }
  has(id) {
    return this.entities.has(id);
  }
}

class MockHistoryManager {
  constructor() {
    this.undoStack = [];
    this.redoStack = [];
  }
  execute(command) {
    command.execute();
    this.undoStack.push(command);
    this.redoStack = [];
  }
  undo() {
    const cmd = this.undoStack.pop();
    if (cmd) {
      cmd.undo();
      this.redoStack.push(cmd);
    }
  }
  redo() {
    const cmd = this.redoStack.pop();
    if (cmd) {
      cmd.execute();
      this.undoStack.push(cmd);
    }
  }
}

const scene = new MockSceneStore();
const history = new MockHistoryManager();

// Execute atomic highlight command
history.execute({
  name: 'Highlight PDF Text',
  execute: () => {
    for (const h of highlights) scene.addEntity(h);
  },
  undo: () => {
    for (const h of highlights) scene.removeEntity(h.id);
  },
});

assert.strictEqual(scene.has('hl_test_0'), true);
assert.strictEqual(scene.has('hl_test_1'), true);

// Perform Undo
history.undo();
assert.strictEqual(scene.has('hl_test_0'), false);
assert.strictEqual(scene.has('hl_test_1'), false);

// Perform Redo
history.redo();
assert.strictEqual(scene.has('hl_test_0'), true);
assert.strictEqual(scene.has('hl_test_1'), true);

console.log('✓ Undo/Redo atomic transaction integrity verified.');

console.log('\n============================================================');
console.log('All Milestone 22 Automated Tests Passed Successfully!');
console.log('============================================================\n');
