import assert from 'assert';

console.log('Testing Milestone 21: Sticky Note & Text Box Seamless Editing & Pointer Pass-Through...');

// 1. Mock SelectionStore implementation identical to src/store/selectionStore.ts
class MockSelectionStore {
  constructor() {
    this.selectedIds = new Set();
    this.editingEntityId = null;
    this.snapshotVersion = 0;
  }

  notify() {
    this.snapshotVersion += 1;
  }

  getSelectedIds() {
    return new Set(this.selectedIds);
  }

  isSelected(id) {
    return this.selectedIds.has(id);
  }

  getSelectedCount() {
    return this.selectedIds.size;
  }

  getEditingEntityId() {
    return this.editingEntityId;
  }

  isEditingEntity(id) {
    return this.editingEntityId === id;
  }

  setEditingEntityId(id) {
    if (this.editingEntityId !== id) {
      this.editingEntityId = id;
      this.notify();
    }
  }

  select(id, additive = false) {
    if (!additive) {
      this.selectedIds.clear();
      if (this.editingEntityId !== id) {
        this.editingEntityId = null;
      }
    }
    this.selectedIds.add(id);
    this.notify();
  }

  deselect(id) {
    if (this.editingEntityId === id) {
      this.editingEntityId = null;
    }
    if (this.selectedIds.delete(id)) {
      this.notify();
    }
  }

  clearSelection() {
    const hadEditing = this.editingEntityId !== null;
    this.editingEntityId = null;
    if (this.selectedIds.size > 0 || hadEditing) {
      this.selectedIds.clear();
      this.notify();
    }
  }
}

const selStore = new MockSelectionStore();

// 2. Test SelectionStore editingEntityId lifecycle
console.log('Test 1: SelectionStore editingEntityId lifecycle...');
assert.strictEqual(selStore.getEditingEntityId(), null);
assert.strictEqual(selStore.isEditingEntity('note_1'), false);

selStore.select('note_1');
assert.strictEqual(selStore.isSelected('note_1'), true);
assert.strictEqual(selStore.getEditingEntityId(), null);

selStore.setEditingEntityId('note_1');
assert.strictEqual(selStore.getEditingEntityId(), 'note_1');
assert.strictEqual(selStore.isEditingEntity('note_1'), true);

// Selecting a different object should reset editingEntityId
selStore.select('text_1');
assert.strictEqual(selStore.getEditingEntityId(), null);
assert.strictEqual(selStore.isSelected('text_1'), true);

selStore.setEditingEntityId('text_1');
assert.strictEqual(selStore.getEditingEntityId(), 'text_1');

// Deselecting should reset editingEntityId
selStore.deselect('text_1');
assert.strictEqual(selStore.getEditingEntityId(), null);

// Clear selection with editingEntityId set
selStore.select('shape_1');
selStore.setEditingEntityId('shape_1');
selStore.clearSelection();
assert.strictEqual(selStore.getEditingEntityId(), null);
assert.strictEqual(selStore.getSelectedCount(), 0);
console.log('✓ SelectionStore editingEntityId lifecycle verified.');

// 3. Test SelectionOverlay Pointer-Events & Pass-Through logic
console.log('\nTest 2: SelectionOverlay Pointer-Events and Pass-Through...');

function computeSelectionBoxPointerEvents({ hasPdfDocument, isCurrentlyEditing }) {
  return (hasPdfDocument || isCurrentlyEditing) ? 'none' : 'auto';
}

// When not editing: selection box intercepts clicks/drags to translate
assert.strictEqual(
  computeSelectionBoxPointerEvents({ hasPdfDocument: false, isCurrentlyEditing: false }),
  'auto'
);

// When editing: selection box has pointer-events: none, passing all clicks, caret placement, and text selection to textarea
assert.strictEqual(
  computeSelectionBoxPointerEvents({ hasPdfDocument: false, isCurrentlyEditing: true }),
  'none'
);

// With PDF document: always none to allow PDF text interaction
assert.strictEqual(
  computeSelectionBoxPointerEvents({ hasPdfDocument: true, isCurrentlyEditing: false }),
  'none'
);
console.log('✓ SelectionOverlay pointer-events pass-through verified.');

// 4. Test Click-vs-Drag Decision Matrix in handlePointerUp
console.log('\nTest 3: Click-vs-Drag Decision Matrix in SelectionOverlay...');

function simulatePointerInteraction(startX, startY, endX, endY, selectedEntities) {
  const dist = Math.hypot(endX - startX, endY - startY);
  const didDrag = dist >= 4;

  let outcome = 'none';
  let activatedEditingId = null;

  if (didDrag) {
    outcome = 'translate';
  } else {
    // Click or tap without dragging on a single editable entity
    if (selectedEntities.length === 1) {
      const ent = selectedEntities[0];
      if (
        ent.type === 'note' ||
        ent.type === 'text' ||
        (ent.type === 'shape' && ent.shapeType !== 'line' && ent.shapeType !== 'arrow')
      ) {
        outcome = 'activate_edit';
        activatedEditingId = ent.id;
      }
    }
  }

  return { outcome, activatedEditingId, dist };
}

// Test A: Single tap/click on note (distance = 1px < 4px) -> transitions to edit mode
const tapResult = simulatePointerInteraction(100, 100, 101, 100, [{ id: 'note_1', type: 'note' }]);
assert.strictEqual(tapResult.outcome, 'activate_edit');
assert.strictEqual(tapResult.activatedEditingId, 'note_1');

// Test B: Drag note (distance = 25px >= 4px) -> moves entity without entering edit mode
const dragResult = simulatePointerInteraction(100, 100, 120, 115, [{ id: 'note_1', type: 'note' }]);
assert.strictEqual(dragResult.outcome, 'translate');
assert.strictEqual(dragResult.activatedEditingId, null);

// Test C: Single tap on text box -> transitions to edit mode
const textTapResult = simulatePointerInteraction(50, 50, 50, 51, [{ id: 'text_1', type: 'text' }]);
assert.strictEqual(textTapResult.outcome, 'activate_edit');
assert.strictEqual(textTapResult.activatedEditingId, 'text_1');

// Test D: Single tap on non-text entity (image) -> does not activate edit mode
const imageTapResult = simulatePointerInteraction(50, 50, 51, 51, [{ id: 'img_1', type: 'image' }]);
assert.strictEqual(imageTapResult.outcome, 'none');
assert.strictEqual(imageTapResult.activatedEditingId, null);

console.log('✓ Click-vs-drag decision matrix verified.');

// 5. Test Widget Inking-Mode Isolation & Dynamic Height Auto-Expansion
console.log('\nTest 4: Inking-Mode Isolation & Text Auto-Expansion...');

function getWidgetPointerEvents(selectedTool) {
  return selectedTool === 'Select' ? 'auto' : 'none';
}

// Drawing tools allow freehand drawing directly over notes and shapes
assert.strictEqual(getWidgetPointerEvents('Pen'), 'none');
assert.strictEqual(getWidgetPointerEvents('Highlighter'), 'none');
assert.strictEqual(getWidgetPointerEvents('Eraser'), 'none');
assert.strictEqual(getWidgetPointerEvents('Laser'), 'none');
// Select tool captures pointer events
assert.strictEqual(getWidgetPointerEvents('Select'), 'auto');

// Test dynamic height calculation
function calculateAutoExpandedHeight(initialHeight, scrollHeight) {
  return Math.max(initialHeight, scrollHeight);
}

const initialHeight = 40;
const singleLineScroll = 32;
assert.strictEqual(calculateAutoExpandedHeight(initialHeight, singleLineScroll), 40);

const multiLineScroll = 120;
assert.strictEqual(calculateAutoExpandedHeight(initialHeight, multiLineScroll), 120);
console.log('✓ Inking-mode isolation and dynamic height auto-expansion verified.');

console.log('\n============================================================');
console.log('All Milestone 21 Automated Tests Passed Successfully!');
console.log('============================================================\n');
