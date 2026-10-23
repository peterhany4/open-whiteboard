/**
 * Open Whiteboard — Global Keyboard Shortcuts Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 852bcd1f & 179019: Inking & Navigation Hotkeys (V/S, H, P/1-5, X, E, L/Q, R)
 *   - Module 517955 & 84781932: Object manipulation (N, T, Delete, Backspace, Ctrl+D, Ctrl+A, Esc)
 *   - Module 415906: Canvas navigation (Ctrl+0, Ctrl++, Ctrl+-, +, -)
 */

import { inkingStore } from '../store/inkingStore';
import { canvasStore } from '../store/canvasStore';
import { selectionStore } from '../store/selectionStore';
import { boardStore } from '../store/boardStore';
import { rulerEngine } from './RulerEngine';

export interface ShortcutDefinition {
  key: string;
  description: string;
  badge: string;
}

export class ShortcutEngine {
  private isListening = false;

  private isTextInput(el: EventTarget | null): boolean {
    if (!el || !(el instanceof HTMLElement)) return false;
    const tag = el.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      el.isContentEditable ||
      el.getAttribute('role') === 'textbox' ||
      el.classList.contains('canvas-text-input')
    );
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // 1. Text input isolation: typing in sticky notes, title, or text boxes must not trigger single-key tool switches or deletion
    if (this.isTextInput(e.target)) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur();
      }
      return;
    }

    // 2. Only handle shortcuts when on the active whiteboard canvas, not in board gallery
    if (boardStore.getState().currentView !== 'board') {
      return;
    }

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;

    // 3. Modifier-based shortcuts (Ctrl / Cmd)
    if (isCtrlOrMeta) {
      const key = e.key.toLowerCase();

      // Undo: Ctrl+Z (without Shift)
      if (key === 'z' && !e.shiftKey) {
        e.preventDefault();
        canvasStore.triggerUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (key === 'y' || (key === 'z' && e.shiftKey)) {
        e.preventDefault();
        canvasStore.triggerRedo();
        return;
      }

      // Select All: Ctrl+A
      if (key === 'a') {
        e.preventDefault();
        selectionStore.selectAll();
        return;
      }

      // Duplicate: Ctrl+D
      if (key === 'd') {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          selectionStore.duplicateSelected();
        }
        return;
      }

      // Zoom Reset: Ctrl+0
      if (key === '0') {
        e.preventDefault();
        canvasStore.resetZoom();
        return;
      }

      // Zoom In: Ctrl++ or Ctrl+=
      if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        canvasStore.zoomIn();
        return;
      }

      // Zoom Out: Ctrl+- or Ctrl+_
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        canvasStore.zoomOut();
        return;
      }

      // Ruler Toggle: Ctrl+R (or Alt+R)
      if (key === 'r') {
        e.preventDefault();
        rulerEngine.toggle();
        return;
      }

      // Allow browser shortcuts like Ctrl+Shift+I / Ctrl+P to proceed without interference
      return;
    }

    // 4. Ignore other modifier combinations like Alt
    if (e.altKey) {
      return;
    }

    // 5. Single-key shortcuts
    const key = e.key.toLowerCase();

    switch (key) {
      // Navigation Tools
      case 'v':
      case 's':
        e.preventDefault();
        inkingStore.selectTool('Select');
        break;

      case 'h':
        e.preventDefault();
        inkingStore.selectTool('Hand');
        break;

      // Inking Pens
      case 'p': {
        e.preventDefault();
        const lastPen = inkingStore.getState().lastSelectedPenSlot || 'Pen1';
        inkingStore.selectTool(lastPen);
        break;
      }

      case '1':
        e.preventDefault();
        inkingStore.selectTool('Pen1');
        break;
      case '2':
        e.preventDefault();
        inkingStore.selectTool('Pen2');
        break;
      case '3':
        e.preventDefault();
        inkingStore.selectTool('Pen3');
        break;
      case '4':
        e.preventDefault();
        inkingStore.selectTool('Pen4');
        break;
      case '5':
        e.preventDefault();
        inkingStore.selectTool('PenEffect');
        break;

      // Inking Tools: Highlighter, Eraser, Lasso, Ruler
      case 'x':
      case 'i':
        e.preventDefault();
        inkingStore.selectTool('Highlighter');
        break;

      case 'e':
        e.preventDefault();
        inkingStore.selectTool('Eraser');
        break;

      case 'l':
      case 'q':
        e.preventDefault();
        inkingStore.selectTool('FreeformLasso');
        break;

      case 'r':
        e.preventDefault();
        rulerEngine.toggle();
        break;

      // Content Insert Shortcuts
      case 'n':
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('wb-insert-object', {
            detail: { type: 'note', payload: { color: '#FFF1A8', name: 'Yellow' } },
          })
        );
        break;

      case 't':
        e.preventDefault();
        window.dispatchEvent(
          new CustomEvent('wb-insert-object', {
            detail: { type: 'text', payload: { fontSize: 20, text: '' } },
          })
        );
        break;

      // Zoom Controls (+ / -)
      case '+':
      case '=':
        e.preventDefault();
        canvasStore.zoomIn();
        break;

      case '-':
      case '_':
        e.preventDefault();
        canvasStore.zoomOut();
        break;

      // Deletion (Delete / Backspace)
      case 'delete':
      case 'backspace':
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          selectionStore.deleteSelected();
        }
        break;

      // Escape key behavior (Module 517955):
      // 1. Close popover if open
      // 2. Close create flyout / settings if open
      // 3. Clear selection if objects selected
      // 4. Return to Select Tool if in inking mode
      case 'escape':
        e.preventDefault();
        if (inkingStore.getState().activePopover !== null) {
          inkingStore.closePopover();
        } else if (canvasStore.getState().isCreatePanelOpen) {
          canvasStore.closeCreatePanel();
        } else if (canvasStore.getState().isSettingsOpen) {
          canvasStore.closeSettings();
        } else if (selectionStore.getSelectedCount() > 0) {
          selectionStore.clearSelection();
        } else if (inkingStore.getState().selectedTool !== 'Select') {
          inkingStore.selectTool('Select');
        }
        break;

      default:
        break;
    }
  };

  public start() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown);
  }

  public stop() {
    if (!this.isListening) return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown);
  }
}

export const shortcutEngine = new ShortcutEngine();
