/**
 * Open Whiteboard — Milestone 38 Verification Suite
 *
 * Verifies:
 * 1. Web & Desktop Alt+X, Alt+E, and Single-Key E Eraser Activation
 * 2. International layout and AltGr (Right-Alt) support for shortcuts
 * 3. Browser menu bar focus prevention (bare Alt key interception)
 * 4. Text input isolation (typing 'e' or 'x' in input does not activate eraser)
 * 5. Universal Canvas Object Copy/Paste (Ctrl+C & Ctrl+V) with in-memory fallback
 * 6. Progressive spatial translation (+24px, +48px cascading offsets)
 * 7. Fresh unique entity IDs and Undo/Redo integration
 * 8. Cut (Ctrl+X) support
 * 9. Electron menu suppression verification
 */

import assert from 'assert';
import fs from 'fs';
import path from 'path';

// Setup minimal browser polyfill for Node / tsx
let mockClipboardContent = '';
const listeners = new Map();

globalThis.HTMLElement = class HTMLElement {};

globalThis.window = {
  addEventListener(event, handler, options) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event).push({ handler, capture: options?.capture });
  },
  removeEventListener(event, handler) {
    if (listeners.has(event)) {
      listeners.set(event, listeners.get(event).filter(l => l.handler !== handler));
    }
  },
  innerWidth: 1920,
  innerHeight: 1080,
  getSelection: () => ({ toString: () => '' }),
};

globalThis.document = {
  activeElement: null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => mockStorage.get(key) || null,
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};
globalThis.window.localStorage = globalThis.localStorage;

const mockClipboard = {
  async writeText(text) {
    mockClipboardContent = text;
    return true;
  },
  async readText() {
    return mockClipboardContent;
  },
};

try {
  if (globalThis.navigator) {
    Object.defineProperty(globalThis.navigator, 'clipboard', {
      value: mockClipboard,
      configurable: true,
      writable: true,
    });
  } else {
    Object.defineProperty(globalThis, 'navigator', {
      value: { clipboard: mockClipboard },
      configurable: true,
      writable: true,
    });
  }
} catch {
  // If property cannot be redefined
}

function dispatchKey(eventData) {
  let defaultPrevented = false;
  let propagationStopped = false;

  const event = {
    key: eventData.key || '',
    code: eventData.code || '',
    altKey: Boolean(eventData.altKey),
    ctrlKey: Boolean(eventData.ctrlKey),
    metaKey: Boolean(eventData.metaKey),
    shiftKey: Boolean(eventData.shiftKey),
    target: eventData.target || { tagName: 'DIV', isContentEditable: false, classList: { contains: () => false }, getAttribute: () => null },
    getModifierState(mod) {
      if (mod === 'AltGraph' && eventData.isAltGr) return true;
      return false;
    },
    preventDefault() {
      defaultPrevented = true;
    },
    stopPropagation() {
      propagationStopped = true;
    },
  };

  const keydownListeners = listeners.get('keydown') || [];
  for (const item of keydownListeners) {
    item.handler(event);
    if (propagationStopped) break;
  }

  return { defaultPrevented, propagationStopped };
}

async function runMilestone38Tests() {
  console.log('=== Starting Milestone 38 Verification Suite ===\n');

  // Dynamic import of modules after globalThis setup
  const { inkingStore } = await import('../src/store/inkingStore.js');
  const { selectionStore } = await import('../src/store/selectionStore.js');
  const { sceneStore } = await import('../src/store/sceneStore.js');
  const { boardStore } = await import('../src/store/boardStore.js');
  const { shortcutEngine } = await import('../src/tools/ShortcutEngine.js');
  const {
    copyEntitiesToClipboard,
    copySelectedToClipboard,
    getClipboardEntities,
    pasteEntities,
    executeUniversalPaste,
    getInMemoryClipboardBuffer,
  } = await import('../src/tools/clipboard.js');
  const { historyManager } = await import('../src/canvas/history.js');

  // Initialize boardStore and navigate to board view
  await boardStore.initialize();
  await boardStore.navigateTo('board');

  // Start shortcut listener
  shortcutEngine.start();

  // ----------------------------------------------------
  // Test 1: Bare Alt Key Interception (Prevents Browser Menu Hijack)
  // ----------------------------------------------------
  console.log('1. Testing Bare Alt Key Browser Menu Interception:');
  {
    const res = dispatchKey({ key: 'Alt', code: 'AltLeft', altKey: true });
    assert.strictEqual(res.defaultPrevented, true, 'Bare AltLeft must call preventDefault()');
    console.log('   ✓ Bare AltLeft intercepted with preventDefault()');

    const resRight = dispatchKey({ key: 'Alt', code: 'AltRight', altKey: true });
    assert.strictEqual(resRight.defaultPrevented, true, 'Bare AltRight must call preventDefault()');
    console.log('   ✓ Bare AltRight intercepted with preventDefault()');
  }

  // ----------------------------------------------------
  // Test 2: Alt+X Eraser Tool Activation
  // ----------------------------------------------------
  console.log('\n2. Testing Alt+X Eraser Tool Activation:');
  {
    // Start with Pen 1 and popover open
    inkingStore.selectPen('Pen1');
    inkingStore.togglePopover('Pen1');
    assert.strictEqual(inkingStore.getState().selectedTool, 'Pen1');
    assert.strictEqual(inkingStore.getState().activePopover, 'Pen1');

    // Press Alt+X
    const res = dispatchKey({ key: 'x', code: 'KeyX', altKey: true });
    assert.strictEqual(res.defaultPrevented, true, 'Alt+X must call preventDefault()');
    assert.strictEqual(res.propagationStopped, true, 'Alt+X must call stopPropagation()');
    assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser', 'Tool must switch to Eraser');
    assert.strictEqual(inkingStore.getState().activePopover, null, 'Active popover must close');
    console.log('   ✓ Alt+X successfully activated Eraser, closed popover, stopped propagation');
  }

  // ----------------------------------------------------
  // Test 3: International Keyboard Layout Support (Arabic 'ء' / KeyX)
  // ----------------------------------------------------
  console.log('\n3. Testing International Keyboard Layout (Arabic key code KeyX):');
  {
    inkingStore.selectTool('Select');
    const res = dispatchKey({ key: 'ء', code: 'KeyX', altKey: true });
    assert.strictEqual(res.defaultPrevented, true);
    assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser');
    console.log('   ✓ Non-English physical KeyX activates Eraser');
  }

  // ----------------------------------------------------
  // Test 4: Right Alt / AltGr Key Support
  // ----------------------------------------------------
  console.log('\n4. Testing AltGr (Right Alt) Support:');
  {
    inkingStore.selectTool('Select');
    // On Windows, AltGr sends ctrlKey=true, altKey=true, and isAltGr=true
    const res = dispatchKey({ key: 'x', code: 'KeyX', altKey: true, ctrlKey: true, isAltGr: true });
    assert.strictEqual(res.defaultPrevented, true);
    assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser');
    console.log('   ✓ AltGr+X correctly activates Eraser');
  }

  // ----------------------------------------------------
  // Test 5: Single-Key E Eraser Shortcut (Module 40049 Parity)
  // ----------------------------------------------------
  console.log('\n5. Testing Single-Key E Eraser Shortcut:');
  {
    inkingStore.selectTool('Select');
    const res = dispatchKey({ key: 'e', code: 'KeyE' });
    assert.strictEqual(res.defaultPrevented, true);
    assert.strictEqual(res.propagationStopped, true);
    assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser');
    console.log('   ✓ Single key "E" outside text inputs activates Eraser');

    // Alt+E also works
    inkingStore.selectTool('Select');
    const resAltE = dispatchKey({ key: 'e', code: 'KeyE', altKey: true });
    assert.strictEqual(resAltE.defaultPrevented, true);
    assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser');
    console.log('   ✓ Alt+E also activates Eraser');
  }

  // ----------------------------------------------------
  // Test 6: Text Input Isolation
  // ----------------------------------------------------
  console.log('\n6. Testing Text Input Isolation:');
  {
    inkingStore.selectTool('Select');
    const textInputTarget = Object.assign(Object.create(HTMLElement.prototype), {
      tagName: 'TEXTAREA',
      isContentEditable: false,
      classList: { contains: () => false },
      getAttribute: () => null,
    });
    const res = dispatchKey({ key: 'e', code: 'KeyE', target: textInputTarget });
    assert.strictEqual(res.defaultPrevented, false, 'Key inside text input must not be prevented');
    assert.strictEqual(inkingStore.getState().selectedTool, 'Select', 'Tool must remain Select while typing in note');
    console.log('   ✓ Typing "e" inside note textarea does NOT trigger Eraser');
  }

  // ----------------------------------------------------
  // Test 7: Universal Canvas Object Copy & Paste Engine (Ctrl+C / Ctrl+V)
  // ----------------------------------------------------
  console.log('\n7. Testing Canvas Object Copy & Paste Engine:');
  {
    sceneStore.loadEntities([]);
    selectionStore.clearSelection();

    // Create a note entity and a shape entity
    const note = {
      id: 'test_note_1',
      type: 'note',
      x: 100,
      y: 150,
      width: 200,
      height: 200,
      color: '#FFF2AB',
      text: 'Milestone 38 Test Note',
      zIndex: 100,
      bounds: { minX: 100, minY: 150, maxX: 300, maxY: 350 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const shape = {
      id: 'test_shape_1',
      type: 'shape',
      shapeType: 'rectangle',
      x: 400,
      y: 200,
      width: 160,
      height: 120,
      fillColor: '#E1DFDD',
      strokeColor: '#0078D4',
      strokeWidth: 2,
      zIndex: 100,
      bounds: { minX: 400, minY: 200, maxX: 560, maxY: 320 },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    sceneStore.addEntity(note, false);
    sceneStore.addEntity(shape, false);
    assert.strictEqual(sceneStore.getEntityCount(), 2);

    // Select both objects
    selectionStore.selectMultiple(['test_note_1', 'test_shape_1']);
    assert.strictEqual(selectionStore.getSelectedCount(), 2);

    // Trigger Ctrl+C
    const copyRes = dispatchKey({ key: 'c', code: 'KeyC', ctrlKey: true });
    assert.strictEqual(copyRes.defaultPrevented, true, 'Ctrl+C must preventDefault');
    assert.strictEqual(copyRes.propagationStopped, true, 'Ctrl+C must stopPropagation');

    // Verify inMemoryClipboardBuffer was populated
    const buffer = getInMemoryClipboardBuffer();
    assert(buffer !== null, 'Clipboard buffer must not be null');
    assert.strictEqual(buffer.length, 2, 'Clipboard buffer must hold 2 entities');
    console.log('   ✓ Ctrl+C copied 2 selected entities to in-memory buffer');

    // Verify system clipboard writeText received standard open-whiteboard-entities payload
    assert(mockClipboardContent.includes('open-whiteboard-entities'), 'System clipboard must contain payload header');
    console.log('   ✓ System clipboard updated with valid payload');

    // Trigger Ctrl+V (First Paste)
    const pasteRes = dispatchKey({ key: 'v', code: 'KeyV', ctrlKey: true });
    assert.strictEqual(pasteRes.defaultPrevented, true, 'Ctrl+V must preventDefault');
    assert.strictEqual(pasteRes.propagationStopped, true, 'Ctrl+V must stopPropagation');

    // Await async paste resolution
    await new Promise(r => setTimeout(r, 50));

    // Scene should now contain 4 entities (2 original + 2 pasted)
    assert.strictEqual(sceneStore.getEntityCount(), 4, 'Scene must now contain 4 entities');

    // Newly pasted entities must have unique IDs and be shifted by +24px
    const pastedIds = Array.from(selectionStore.getSelectedIds());
    assert.strictEqual(pastedIds.length, 2, 'Newly pasted entities must be selected');
    assert(!pastedIds.includes('test_note_1'), 'Pasted note must have fresh ID');
    assert(!pastedIds.includes('test_shape_1'), 'Pasted shape must have fresh ID');

    const pastedNote = sceneStore.getEntity(pastedIds[0]);
    const pastedShape = sceneStore.getEntity(pastedIds[1]);
    const pNote = pastedNote.type === 'note' ? pastedNote : pastedShape;
    const pShape = pastedNote.type === 'shape' ? pastedNote : pastedShape;

    assert.strictEqual(pNote.x, 100 + 24, 'First pasted note must be offset by +24px on X');
    assert.strictEqual(pNote.y, 150 + 24, 'First pasted note must be offset by +24px on Y');
    assert.strictEqual(pNote.text, 'Milestone 38 Test Note', 'Pasted note content must match');

    assert.strictEqual(pShape.x, 400 + 24, 'First pasted shape must be offset by +24px on X');
    assert.strictEqual(pShape.y, 200 + 24, 'First pasted shape must be offset by +24px on Y');
    console.log('   ✓ First Ctrl+V pasted 2 cloned entities with +24px spatial offset and fresh IDs');

    // Trigger Ctrl+V again (Second Consecutive Paste -> +48px offset)
    dispatchKey({ key: 'v', code: 'KeyV', ctrlKey: true });
    await new Promise(r => setTimeout(r, 50));

    assert.strictEqual(sceneStore.getEntityCount(), 6, 'Scene must now contain 6 entities');
    const secondPastedIds = Array.from(selectionStore.getSelectedIds());
    const secondNote = sceneStore.getEntity(
      secondPastedIds.find(id => sceneStore.getEntity(id).type === 'note')
    );
    assert.strictEqual(secondNote.x, 100 + 48, 'Second pasted note must be offset by +48px on X');
    assert.strictEqual(secondNote.y, 150 + 48, 'Second pasted note must be offset by +48px on Y');
    console.log('   ✓ Second consecutive Ctrl+V applied progressive +48px cascading offset');

    // ----------------------------------------------------
    // Test 8: Undo / Redo for Pasted Entities
    // ----------------------------------------------------
    console.log('\n8. Testing Undo / Redo Integration for Pasted Objects:');
    assert(historyManager.canUndo(), 'History manager must have undo commands');
    historyManager.undo();
    assert.strictEqual(sceneStore.getEntityCount(), 4, 'Undo must remove the 2 second-pasted entities');
    console.log('   ✓ Undo reverted second paste');

    historyManager.undo();
    assert.strictEqual(sceneStore.getEntityCount(), 2, 'Undo must remove the first paste');
    console.log('   ✓ Undo reverted first paste back to 2 original entities');

    historyManager.redo();
    assert.strictEqual(sceneStore.getEntityCount(), 4, 'Redo must restore first paste');
    console.log('   ✓ Redo restored pasted entities');

    // ----------------------------------------------------
    // Test 9: Cut (Ctrl+X) Functionality
    // ----------------------------------------------------
    console.log('\n9. Testing Cut (Ctrl+X):');
    selectionStore.clearSelection();
    selectionStore.select('test_note_1');
    const cutRes = dispatchKey({ key: 'x', code: 'KeyX', ctrlKey: true });
    assert.strictEqual(cutRes.defaultPrevented, true);
    assert.strictEqual(cutRes.propagationStopped, true);
    assert(!sceneStore.getEntity('test_note_1'), 'Cut must remove entity from scene');
    const cutBuffer = getInMemoryClipboardBuffer();
    assert.strictEqual(cutBuffer[0].id, 'test_note_1', 'Cut entity must be stored in clipboard');
    console.log('   ✓ Cut (Ctrl+X) copied object to buffer and deleted from canvas');
  }

  // ----------------------------------------------------
  // Test 10: Electron Menu Suppression Code Verification
  // ----------------------------------------------------
  console.log('\n10. Verifying Electron main.cts menu suppression:');
  {
    const electronMainPath = path.resolve('electron/main.cts');
    const content = fs.readFileSync(electronMainPath, 'utf-8');
    assert(content.includes('Menu.setApplicationMenu(null)'), 'Must call Menu.setApplicationMenu(null)');
    assert(content.includes('mainWindow.removeMenu()'), 'Must call mainWindow.removeMenu()');
    assert(content.includes('mainWindow.setMenuBarVisibility(false)'), 'Must call mainWindow.setMenuBarVisibility(false)');
    console.log('   ✓ Electron main.cts contains all 3 menu suppression calls');
  }

  shortcutEngine.stop();
  console.log('\n======================================================');
  console.log('✓ ALL MILESTONE 38 VERIFICATION TESTS PASSED SUCCESSFULLY!');
  console.log('======================================================\n');
}

runMilestone38Tests().catch((err) => {
  console.error('\n❌ Milestone 38 Verification Failed:', err);
  process.exit(1);
});
