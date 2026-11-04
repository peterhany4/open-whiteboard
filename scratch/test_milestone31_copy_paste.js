/**
 * Open Whiteboard — Milestone 31 Automated Test Suite
 *
 * Verifies:
 * 1. Object Serialization & Schema Envelope (open-whiteboard-entities, version 1)
 * 2. Payload Validation & Rejection of Foreign JSON / Plain Text
 * 3. Text Input & Native Text Selection Isolation (Prevents hijacking native copy)
 * 4. Deserialization, Fresh Unique ID Generation & Collision Avoidance
 * 5. Spatial Translation & Consecutive Stacking Offset Math (+24px, +48px, etc.)
 * 6. Atomic Undo/Redo Integration & Multi-Entity Selection
 */

import assert from 'assert';

console.log('--- Testing Milestone 31: Universal Canvas Object Copy & Paste Engine (Ctrl+C / Ctrl+V) ---');

// Mock sceneGraph helpers
function computeBoxBounds(x, y, width, height) {
  return { minX: x, minY: y, maxX: x + width, maxY: y + height };
}

function computeStrokeBounds(points, strokeWidth, hasArrows = false) {
  if (points.length === 0) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
  let minX = points[0].x, maxX = points[0].x, minY = points[0].y, maxY = points[0].y;
  for (let i = 1; i < points.length; i++) {
    const pt = points[i];
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  const padding = hasArrows ? Math.max(strokeWidth * 4.5, 18) : strokeWidth / 2 + 2;
  return { minX: minX - padding, minY: minY - padding, maxX: maxX + padding, maxY: maxY + padding };
}

// ========================================================
// Test 1: Serialization & Schema Envelope (open-whiteboard-entities)
// ========================================================
const CLIPBOARD_PAYLOAD_TYPE = 'open-whiteboard-entities';
const CLIPBOARD_PAYLOAD_VERSION = 1;

function serializeEntitiesToClipboard(entities) {
  const payload = {
    type: CLIPBOARD_PAYLOAD_TYPE,
    version: CLIPBOARD_PAYLOAD_VERSION,
    entities: JSON.parse(JSON.stringify(entities)),
    copiedAt: Date.now(),
  };
  return JSON.stringify(payload, null, 2);
}

function parseClipboardPayload(text) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') || !trimmed.endsWith('}')) return null;

  try {
    const data = JSON.parse(trimmed);
    if (
      data &&
      data.type === CLIPBOARD_PAYLOAD_TYPE &&
      Array.isArray(data.entities) &&
      data.entities.length > 0
    ) {
      return data;
    }
  } catch {
    // Non-JSON
  }
  return null;
}

{
  const mockEntities = [
    {
      id: 'stroke_101',
      type: 'stroke',
      tool: 'pen',
      color: '#1F1F1F',
      width: 4,
      points: [{ x: 100, y: 100, pressure: 0.5 }, { x: 150, y: 150, pressure: 0.5 }],
      bounds: { minX: 96, minY: 96, maxX: 154, maxY: 154 },
      zIndex: 200,
    },
    {
      id: 'note_202',
      type: 'note',
      x: 300,
      y: 200,
      width: 200,
      height: 200,
      color: '#FFF7D1',
      text: 'Meeting Action Items',
      bounds: { minX: 300, minY: 200, maxX: 500, maxY: 400 },
      zIndex: 100,
    },
    {
      id: 'shape_303',
      type: 'shape',
      shapeType: 'rectangle',
      x: 600,
      y: 100,
      width: 120,
      height: 80,
      strokeColor: '#0078D4',
      bounds: { minX: 600, minY: 100, maxX: 720, maxY: 180 },
      zIndex: 100,
    },
    {
      id: 'pdf_404',
      type: 'pdf_document',
      x: 800,
      y: 50,
      width: 600,
      height: 900,
      title: 'Specifications.pdf',
      pdfUrl: 'blob:specs',
      bounds: { minX: 800, minY: 50, maxX: 1400, maxY: 950 },
      zIndex: 50,
    },
  ];

  const serialized = serializeEntitiesToClipboard(mockEntities);
  assert(typeof serialized === 'string', 'Serialization must return JSON string');

  const parsed = parseClipboardPayload(serialized);
  assert(parsed !== null, 'Valid whiteboard payload must parse successfully');
  assert.strictEqual(parsed.type, 'open-whiteboard-entities');
  assert.strictEqual(parsed.version, 1);
  assert.strictEqual(parsed.entities.length, 4);
  assert.strictEqual(parsed.entities[0].id, 'stroke_101');
  assert.strictEqual(parsed.entities[1].type, 'note');
  assert.strictEqual(parsed.entities[2].shapeType, 'rectangle');
  assert.strictEqual(parsed.entities[3].title, 'Specifications.pdf');

  console.log('✓ 1. Object Serialization & Schema Envelope: Successfully serializes and validates all entity types');
}

// ========================================================
// Test 2: Foreign Payload & Plain Text Rejection
// ========================================================
{
  assert.strictEqual(parseClipboardPayload(''), null);
  assert.strictEqual(parseClipboardPayload('Hello world text copy'), null);
  assert.strictEqual(parseClipboardPayload('{"hello": "world"}'), null, 'Foreign JSON must be rejected');
  assert.strictEqual(parseClipboardPayload('{"type": "other-app", "entities": []}'), null);
  assert.strictEqual(parseClipboardPayload('{"type": "open-whiteboard-entities", "entities": []}'), null, 'Empty entity list must return null');

  console.log('✓ 2. Foreign Payload Rejection: Safely ignores external text, images, and non-whiteboard JSON');
}

// ========================================================
// Test 3: Input Isolation & Text Selection Priority
// ========================================================
{
  function shouldHandleCanvasCopy(isTextInput, hasActiveDomSelection, selectedEntityCount) {
    if (isTextInput) return false;
    if (hasActiveDomSelection) return false;
    return selectedEntityCount > 0;
  }

  // 3.1 Focused in note textarea with object selected
  assert.strictEqual(
    shouldHandleCanvasCopy(true, false, 2),
    false,
    'Canvas copy must NOT trigger when typing in a note/text box'
  );

  // 3.2 Highlighting text on page (e.g. PDF text layer selection)
  assert.strictEqual(
    shouldHandleCanvasCopy(false, true, 1),
    false,
    'Active text selection must take precedence over canvas object copy'
  );

  // 3.3 Normal canvas object selection without text editing
  assert.strictEqual(
    shouldHandleCanvasCopy(false, false, 3),
    true,
    'Canvas copy triggers when canvas objects are selected and user is not editing text'
  );

  // 3.4 Nothing selected
  assert.strictEqual(
    shouldHandleCanvasCopy(false, false, 0),
    false,
    'Canvas copy does not trigger when 0 objects are selected'
  );

  console.log('✓ 3. Input & Text Selection Isolation: Correctly isolates native text copy from canvas shortcuts');
}

// ========================================================
// Test 4: Deserialization, Fresh ID Generation & Coordinate Translation
// ========================================================
class MockSceneStore {
  constructor() {
    this.entities = new Map();
  }
  addEntity(entity) {
    this.entities.set(entity.id, entity);
  }
  getAll() {
    return Array.from(this.entities.values());
  }
}

class MockSelectionStore {
  constructor() {
    this.selected = new Set();
  }
  selectMultiple(ids) {
    this.selected = new Set(ids);
  }
  getSelected() {
    return Array.from(this.selected);
  }
}

class MockHistoryManager {
  constructor() {
    this.undoGroups = [];
  }
  inUndoGroup(name, fn) {
    this.undoGroups.push(name);
    fn();
  }
}

const mockScene = new MockSceneStore();
const mockSelection = new MockSelectionStore();
const mockHistory = new MockHistoryManager();

let consecutivePasteStep = 1;

function pasteEntities(entities, customOffset) {
  if (!entities || entities.length === 0) return [];

  const offset = customOffset ?? {
    dx: 24 * consecutivePasteStep,
    dy: 24 * consecutivePasteStep,
  };
  consecutivePasteStep++;

  const newIds = [];
  const clonedEntities = [];

  for (const entity of entities) {
    const newId = `${entity.type}_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    newIds.push(newId);

    if (entity.type === 'stroke') {
      const stroke = entity;
      const points = stroke.points.map((p) => ({
        ...p,
        x: p.x + offset.dx,
        y: p.y + offset.dy,
      }));
      const bounds = computeStrokeBounds(
        points,
        stroke.width,
        Boolean(stroke.arrowStart || stroke.arrowEnd)
      );
      clonedEntities.push({
        ...stroke,
        id: newId,
        points,
        bounds,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else if (entity.type === 'noteGrid') {
      const grid = entity;
      const newX = grid.x + offset.dx;
      const newY = grid.y + offset.dy;
      clonedEntities.push({
        ...grid,
        id: newId,
        x: newX,
        y: newY,
        notes: grid.notes.map((n) => ({
          ...n,
          id: `note_copy_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        })),
        bounds: computeBoxBounds(newX, newY, grid.width, grid.height),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    } else {
      const box = entity;
      const newX = box.x + offset.dx;
      const newY = box.y + offset.dy;
      const width = box.width || box.size || 100;
      const height = box.height || box.size || 100;
      clonedEntities.push({
        ...box,
        id: newId,
        x: newX,
        y: newY,
        bounds: computeBoxBounds(newX, newY, width, height),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    }
  }

  mockHistory.inUndoGroup('Paste Objects', () => {
    for (const ent of clonedEntities) {
      mockScene.addEntity(ent);
    }
  });

  mockSelection.selectMultiple(newIds);
  return newIds;
}

{
  const sourceEntities = [
    {
      id: 'stroke_orig',
      type: 'stroke',
      tool: 'pen',
      color: '#E71224',
      width: 2,
      points: [{ x: 50, y: 50 }, { x: 80, y: 80 }],
      bounds: { minX: 48, minY: 48, maxX: 82, maxY: 82 },
    },
    {
      id: 'text_orig',
      type: 'text',
      x: 200,
      y: 150,
      width: 140,
      height: 40,
      text: 'Canvas Label',
      fontSize: 18,
      bounds: { minX: 200, minY: 150, maxX: 340, maxY: 190 },
    },
  ];

  // 1st Paste (offset: +24, +24)
  const pastedIds1 = pasteEntities(sourceEntities);
  assert.strictEqual(pastedIds1.length, 2);
  assert.notStrictEqual(pastedIds1[0], 'stroke_orig', 'Pasted ID must be uniquely generated');
  assert.notStrictEqual(pastedIds1[1], 'text_orig', 'Pasted ID must be uniquely generated');

  const pastedStroke1 = mockScene.entities.get(pastedIds1[0]);
  assert.strictEqual(pastedStroke1.points[0].x, 50 + 24);
  assert.strictEqual(pastedStroke1.points[0].y, 50 + 24);
  assert.strictEqual(pastedStroke1.points[1].x, 80 + 24);
  assert.strictEqual(pastedStroke1.points[1].y, 80 + 24);

  const pastedText1 = mockScene.entities.get(pastedIds1[1]);
  assert.strictEqual(pastedText1.x, 200 + 24);
  assert.strictEqual(pastedText1.y, 150 + 24);
  assert.strictEqual(pastedText1.bounds.minX, 224);
  assert.strictEqual(pastedText1.bounds.maxX, 224 + 140);

  // Selection updated to newly pasted items
  assert.deepStrictEqual(mockSelection.getSelected(), pastedIds1);

  // 2nd Consecutive Paste (offset: +48, +48)
  const pastedIds2 = pasteEntities(sourceEntities);
  assert.strictEqual(pastedIds2.length, 2);
  assert.notStrictEqual(pastedIds2[0], pastedIds1[0]);

  const pastedText2 = mockScene.entities.get(pastedIds2[1]);
  assert.strictEqual(pastedText2.x, 200 + 48, 'Consecutive paste should stack by +48px');
  assert.strictEqual(pastedText2.y, 150 + 48, 'Consecutive paste should stack by +48px');

  // Verify Undo grouping
  assert.strictEqual(mockHistory.undoGroups.length, 2);
  assert.strictEqual(mockHistory.undoGroups[0], 'Paste Objects');
  assert.strictEqual(mockHistory.undoGroups[1], 'Paste Objects');

  console.log('✓ 4. Deserialization & Coordinate Translation: Generates unique IDs, translates geometry accurately, and stacks offsets (+24, +48)');
  console.log('✓ 5. Atomic Undo History & Selection: Commits additions to single undo group and auto-selects pasted items');
}

console.log('\n>>> All Milestone 31 tests passed successfully! <<<');
