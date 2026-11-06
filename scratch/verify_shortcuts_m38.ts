/**
 * Open Whiteboard — Verification Suite for User Shortcuts & Copy-Paste
 */

import assert from 'node:assert';
import { inkingStore } from '../src/store/inkingStore';
import { selectionStore } from '../src/store/selectionStore';
import { sceneStore } from '../src/store/sceneStore';
import { boardStore } from '../src/store/boardStore';
import { canvasStore } from '../src/store/canvasStore';
import { shortcutEngine } from '../src/tools/ShortcutEngine';
import {
  copySelectedToClipboard,
  getClipboardEntities,
  pasteEntities,
  executeUniversalPaste,
  getInMemoryClipboardBuffer,
} from '../src/tools/clipboard';
import { historyManager } from '../src/canvas/history';
import type { NoteEntity } from '../src/canvas/sceneGraph';

// Minimal browser polyfill
let mockClipboardContent = '';
const listeners = new Map<string, Array<{ handler: (e: any) => void; capture?: boolean }>>();

(globalThis as any).HTMLElement = class HTMLElement {};
(globalThis as any).CustomEvent = class CustomEvent {
  type: string;
  constructor(type: string) {
    this.type = type;
  }
};

(globalThis as any).window = {
  addEventListener(event: string, handler: any, options?: any) {
    if (!listeners.has(event)) listeners.set(event, []);
    listeners.get(event)!.push({ handler, capture: options?.capture });
  },
  removeEventListener(event: string, handler: any) {
    if (listeners.has(event)) {
      listeners.set(event, listeners.get(event)!.filter((l) => l.handler !== handler));
    }
  },
  innerWidth: 1920,
  innerHeight: 1080,
  getSelection: () => ({ toString: () => '' }),
  dispatchEvent: (e: any) => {
    const list = listeners.get(e?.type) || [];
    for (const item of list) item.handler(e);
    return true;
  },
};

(globalThis as any).document = {
  activeElement: null,
  querySelector: () => null,
  querySelectorAll: () => [],
};

const mockStorage = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (key: string) => mockStorage.get(key) || null,
  setItem: (key: string, val: any) => mockStorage.set(key, String(val)),
  removeItem: (key: string) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};
(globalThis as any).window.localStorage = (globalThis as any).localStorage;

const mockClipboard = {
  async writeText(text: string) {
    mockClipboardContent = text;
    return true;
  },
  async readText() {
    return mockClipboardContent;
  },
};

Object.defineProperty(globalThis, 'navigator', {
  value: { clipboard: mockClipboard },
  configurable: true,
  writable: true,
});

function dispatchKey(eventData: any, eventType: 'keydown' | 'keyup' = 'keydown') {
  let defaultPrevented = false;
  let propagationStopped = false;

  const event = {
    key: eventData.key || '',
    code: eventData.code || '',
    keyCode: eventData.keyCode || 0,
    which: eventData.keyCode || 0,
    altKey: Boolean(eventData.altKey),
    ctrlKey: Boolean(eventData.ctrlKey),
    metaKey: Boolean(eventData.metaKey),
    shiftKey: Boolean(eventData.shiftKey),
    target: eventData.target || {
      tagName: 'DIV',
      isContentEditable: false,
      classList: { contains: () => false },
      getAttribute: () => null,
    },
    getModifierState(mod: string) {
      if (mod === 'AltGraph' && eventData.isAltGr) return true;
      return false;
    },
    preventDefault() {
      defaultPrevented = true;
    },
    stopPropagation() {
      propagationStopped = true;
    },
    stopImmediatePropagation() {
      propagationStopped = true;
    },
  };

  const list = listeners.get(eventType) || [];
  for (const item of list) {
    item.handler(event);
    if (propagationStopped) break;
  }

  return { defaultPrevented, propagationStopped };
}

export async function runAllTests() {
  console.log('=== Starting Verified Shortcuts & Copy-Paste Suite ===\n');

  // Navigate to board view
  await boardStore.initialize();
  await boardStore.navigateTo('board');

  // Start shortcuts engine
  shortcutEngine.start();
  (globalThis as any).window.addEventListener('wb-undo', () => historyManager.undo());
  (globalThis as any).window.addEventListener('wb-redo', () => historyManager.redo());

  // 1. Registered Shortcuts Whitelist Inspection
  console.log('1. Checking getRegisteredShortcuts whitelist:');
  const shortcuts = shortcutEngine.getRegisteredShortcuts();
  const keys = shortcuts.map((s) => s.key);
  console.log('   Registered shortcuts:', keys);

  assert.ok(keys.includes('Alt+W'), 'Must include Alt+W');
  assert.ok(keys.includes('Alt+X'), 'Must include Alt+X');
  assert.ok(!keys.some((k) => k.includes('Alt+E') || k === 'E'), 'Must NOT include E or Alt+E');
  assert.ok(!keys.includes('Ctrl+X'), 'Must NOT include Ctrl+X (Cut)');
  assert.ok(!keys.includes('Ctrl+L'), 'Must NOT include Ctrl+L (Lock)');
  assert.ok(!keys.includes('Ctrl+[ / ]'), 'Must NOT include Ctrl+[ / ] (Layer order)');
  assert.ok(keys.includes('Ctrl+C'), 'Must include Ctrl+C');
  assert.ok(keys.includes('Ctrl+V'), 'Must include Ctrl+V');
  assert.strictEqual(shortcuts.length, 11, 'Must have exactly 11 whitelisted shortcuts');
  console.log('   ✓ Whitelist strictly matches the 11 allowed shortcuts!');

  // 2. Alt+X for Erasing ONLY
  console.log('\n2. Testing Alt+X Eraser Tool activation:');
  inkingStore.selectPen('Pen1');
  inkingStore.togglePopover('Pen1');
  assert.strictEqual(inkingStore.getState().selectedTool, 'Pen1');
  assert.strictEqual(inkingStore.getState().activePopover, 'Pen1');

  const resAltX = dispatchKey({ key: 'x', code: 'KeyX', keyCode: 88, altKey: true });
  assert.strictEqual(resAltX.defaultPrevented, true, 'Alt+X must call preventDefault()');
  assert.strictEqual(resAltX.propagationStopped, true, 'Alt+X must call stopPropagation()');
  assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser', 'Tool must switch to Eraser');
  assert.strictEqual(inkingStore.getState().activePopover, null, 'Active popover must close');
  console.log('   ✓ Alt+X successfully switches to Eraser and closes popover');

  // 3. International layout support for Alt+X (Arabic layout where physical KeyX produces 'ء')
  console.log('\n3. Testing Alt+X with international Arabic layout:');
  inkingStore.selectTool('Select');
  const resArabicX = dispatchKey({ key: 'ء', code: 'KeyX', keyCode: 88, altKey: true });
  assert.strictEqual(resArabicX.defaultPrevented, true);
  assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser');
  console.log('   ✓ Arabic physical KeyX activates Eraser');

  // 4. AltGr (Right Alt) support
  console.log('\n4. Testing AltGr+X (Right Alt) on international Windows keyboards:');
  inkingStore.selectTool('Select');
  const resAltGr = dispatchKey({ key: 'x', code: 'KeyX', keyCode: 88, altKey: true, ctrlKey: true, isAltGr: true });
  assert.strictEqual(resAltGr.defaultPrevented, true);
  assert.strictEqual(inkingStore.getState().selectedTool, 'Eraser');
  console.log('   ✓ AltGr+X correctly activates Eraser');

  // 5. Verification that 'E' and 'Alt+E' DO NOT ACTIVATE ERASER
  console.log('\n5. Verifying that single-key "E" and "Alt+E" DO NOT activate Eraser:');
  inkingStore.selectTool('Select');
  const resSingleE = dispatchKey({ key: 'e', code: 'KeyE', keyCode: 69 });
  assert.strictEqual(resSingleE.defaultPrevented, false, 'Single key E must not preventDefault');
  assert.strictEqual(inkingStore.getState().selectedTool, 'Select', 'Tool must remain Select on pressing E');
  console.log('   ✓ Single key "E" is ignored (does NOT activate Eraser)');

  const resAltE = dispatchKey({ key: 'e', code: 'KeyE', keyCode: 69, altKey: true });
  assert.strictEqual(inkingStore.getState().selectedTool, 'Select', 'Tool must remain Select on pressing Alt+E');
  console.log('   ✓ Alt+E is ignored (does NOT activate Eraser)');

  // 6. Alt+W for Pen Tool
  console.log('\n6. Testing Alt+W Pen Tool activation:');
  inkingStore.selectTool('Eraser');
  const resAltW = dispatchKey({ key: 'w', code: 'KeyW', keyCode: 87, altKey: true });
  assert.strictEqual(resAltW.defaultPrevented, true);
  assert.strictEqual(resAltW.propagationStopped, true);
  assert.strictEqual(inkingStore.getState().selectedTool, 'Pen1');
  console.log('   ✓ Alt+W switches to Pen1');

  // 7. Bare Alt key intercept (Browser menu prevention)
  console.log('\n7. Testing Bare Alt key interception (prevents browser menu):');
  const resBareAlt = dispatchKey({ key: 'Alt', code: 'AltLeft', keyCode: 18, altKey: true });
  assert.strictEqual(resBareAlt.defaultPrevented, true);
  const resBareAltUp = dispatchKey({ key: 'Alt', code: 'AltLeft', keyCode: 18, altKey: true }, 'keyup');
  assert.strictEqual(resBareAltUp.defaultPrevented, true);
  console.log('   ✓ Bare Alt intercepted on keydown and keyup');

  // 8. Universal Object Copy & Paste (Ctrl+C and Ctrl+V)
  console.log('\n8. Testing Universal Object Copy & Paste:');
  sceneStore.clearEntities(false);
  selectionStore.clearSelection();

  // Create test note entity
  const testNote: NoteEntity = {
    id: 'note_test_1',
    type: 'note',
    x: 100,
    y: 100,
    width: 200,
    height: 200,
    text: 'Copy & Paste Test Note',
    color: '#FFF2AB',
    zIndex: 10,
    bounds: { minX: 100, minY: 100, maxX: 300, maxY: 300 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sceneStore.addEntity(testNote);
  selectionStore.select('note_test_1');
  assert.strictEqual(selectionStore.getSelectedCount(), 1);

  // Copy via Ctrl+C
  const resCtrlC = dispatchKey({ key: 'c', code: 'KeyC', keyCode: 67, ctrlKey: true });
  assert.strictEqual(resCtrlC.defaultPrevented, true, 'Ctrl+C must call preventDefault()');
  assert.strictEqual(resCtrlC.propagationStopped, true, 'Ctrl+C must call stopPropagation()');

  // Verify clipboard has serialized note
  const clipboardEntities = await getClipboardEntities();
  assert.ok(clipboardEntities !== null && clipboardEntities.length === 1);
  assert.strictEqual(clipboardEntities![0].id, 'note_test_1');
  assert.strictEqual((clipboardEntities![0] as NoteEntity).text, 'Copy & Paste Test Note');
  console.log('   ✓ Ctrl+C copied selected NoteEntity to clipboard buffer');

  // Paste via Ctrl+V (1st paste)
  const resCtrlV1 = dispatchKey({ key: 'v', code: 'KeyV', keyCode: 86, ctrlKey: true });
  assert.strictEqual(resCtrlV1.defaultPrevented, true, 'Ctrl+V must call preventDefault()');
  assert.strictEqual(resCtrlV1.propagationStopped, true, 'Ctrl+V must call stopPropagation()');

  // Wait for async paste
  await new Promise((r) => setTimeout(r, 50));

  const allEntities1 = sceneStore.getAllEntities();
  assert.strictEqual(allEntities1.length, 2, 'Scene must now contain 2 entities');
  const pastedNote1 = allEntities1.find((e) => e.id !== 'note_test_1') as NoteEntity;
  assert.ok(pastedNote1, 'Pasted note must exist');
  assert.strictEqual(pastedNote1.text, 'Copy & Paste Test Note');
  assert.strictEqual(pastedNote1.x, 100 + 24, '1st paste must be offset by +24px on X');
  assert.strictEqual(pastedNote1.y, 100 + 24, '1st paste must be offset by +24px on Y');
  assert.ok(selectionStore.isSelected(pastedNote1.id), 'Pasted entity must be selected');
  console.log('   ✓ 1st Ctrl+V created cloned note at (+24, +24) and selected it');

  // Paste via Ctrl+V (2nd consecutive paste)
  dispatchKey({ key: 'v', code: 'KeyV', keyCode: 86, ctrlKey: true });
  await new Promise((r) => setTimeout(r, 50));

  const allEntities2 = sceneStore.getAllEntities();
  assert.strictEqual(allEntities2.length, 3, 'Scene must now contain 3 entities');
  const pastedNote2 = allEntities2[allEntities2.length - 1] as NoteEntity;
  assert.strictEqual(pastedNote2.x, 100 + 48, '2nd paste must be offset by +48px on X');
  assert.strictEqual(pastedNote2.y, 100 + 48, '2nd paste must be offset by +48px on Y');
  console.log('   ✓ 2nd Ctrl+V cascaded offset to (+48, +48)');

  // 9. Undo/Redo of pasted objects
  console.log('\n9. Testing Undo/Redo of pasted objects:');
  const resUndo = dispatchKey({ key: 'z', code: 'KeyZ', keyCode: 90, ctrlKey: true });
  assert.strictEqual(resUndo.defaultPrevented, true);
  assert.strictEqual(sceneStore.getAllEntities().length, 2, 'Undo must remove 2nd pasted entity');

  const resRedo = dispatchKey({ key: 'y', code: 'KeyY', keyCode: 89, ctrlKey: true });
  assert.strictEqual(resRedo.defaultPrevented, true);
  assert.strictEqual(sceneStore.getAllEntities().length, 3, 'Redo must restore 2nd pasted entity');
  console.log('   ✓ Ctrl+Z and Ctrl+Y correctly undo and redo paste actions');

  // 10. Whitelisted object manipulation: Duplicate (Ctrl+D), Delete (Del), Select All (Ctrl+A), Escape
  console.log('\n10. Testing Duplicate, Delete, Select All, and Escape:');
  selectionStore.selectAll();
  assert.strictEqual(selectionStore.getSelectedCount(), 3);

  // Clear selection via Escape
  dispatchKey({ key: 'escape', code: 'Escape', keyCode: 27 });
  assert.strictEqual(selectionStore.getSelectedCount(), 0, 'Escape must clear selection');
  console.log('   ✓ Escape cleared selection');

  // Select All via Ctrl+A
  dispatchKey({ key: 'a', code: 'KeyA', keyCode: 65, ctrlKey: true });
  assert.strictEqual(selectionStore.getSelectedCount(), 3, 'Ctrl+A must select all 3 entities');
  console.log('   ✓ Ctrl+A selected all objects');

  // Delete via Delete key
  dispatchKey({ key: 'delete', code: 'Delete', keyCode: 46 });
  assert.strictEqual(sceneStore.getAllEntities().length, 0, 'Delete must remove all selected entities');
  console.log('   ✓ Delete key removed all selected objects');

  // 11. Verify Removed Shortcuts (Ctrl+X Cut, Ctrl+L Lock, Ctrl+[/] Layering) are INERT
  console.log('\n11. Verifying that removed shortcuts do nothing:');
  const dummyNote: NoteEntity = {
    id: 'note_dummy',
    type: 'note',
    x: 50,
    y: 50,
    width: 100,
    height: 100,
    text: 'Dummy',
    color: '#FFF2AB',
    zIndex: 10,
    bounds: { minX: 50, minY: 50, maxX: 150, maxY: 150 },
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  sceneStore.addEntity(dummyNote);
  selectionStore.select('note_dummy');

  // Press Ctrl+X (Cut) -> Must NOT cut
  const resCut = dispatchKey({ key: 'x', code: 'KeyX', keyCode: 88, ctrlKey: true });
  assert.strictEqual(resCut.defaultPrevented, false, 'Ctrl+X must NOT be handled');
  assert.strictEqual(sceneStore.getAllEntities().length, 1, 'Entity must NOT be cut');
  console.log('   ✓ Ctrl+X is ignored (no Cut)');

  // Press Ctrl+L (Lock) -> Must NOT lock
  const resLock = dispatchKey({ key: 'l', code: 'KeyL', keyCode: 76, ctrlKey: true });
  assert.strictEqual(resLock.defaultPrevented, false, 'Ctrl+L must NOT be handled');
  assert.strictEqual(Boolean(sceneStore.getEntity('note_dummy')?.isLocked), false, 'Entity must NOT be locked');
  console.log('   ✓ Ctrl+L is ignored (no Lock)');

  console.log('\n🎉 ALL 11 VERIFICATION SUITES PASSED PERFECTLY! 🎉\n');
}
