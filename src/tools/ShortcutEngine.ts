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
import { sceneStore } from '../store/sceneStore';
import { boardStore } from '../store/boardStore';

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

      // Bring to Front: Ctrl+] or Ctrl+Shift+] / Ctrl+}
      if (e.key === ']' || e.key === '}') {
        const ids = Array.from(selectionStore.getSelectedIds());
        if (ids.length > 0) {
          e.preventDefault();
          sceneStore.bringToFront(ids);
        }
        return;
      }

      // Send to Back: Ctrl+[ or Ctrl+Shift+[ / Ctrl+{
      if (e.key === '[' || e.key === '{') {
        const ids = Array.from(selectionStore.getSelectedIds());
        if (ids.length > 0) {
          e.preventDefault();
          sceneStore.sendToBack(ids);
        }
        return;
      }

      // Allow browser shortcuts like Ctrl+Shift+I / Ctrl+P to proceed without interference
      return;
    }

    // 4. Ergonomic Alt-key shortcuts (Alt+W for Pen 1, Alt+X for Eraser)
    if (e.altKey) {
      const key = e.key.toLowerCase();
      if (key === 'w' || e.code === 'KeyW') {
        e.preventDefault();
        inkingStore.selectPen('Pen1');
        return;
      }
      if (key === 'x' || e.code === 'KeyX') {
        e.preventDefault();
        inkingStore.setSelectedTool('Eraser');
        return;
      }
      return;
    }

    // 5. Allowed Single-key shortcuts (Delete/Backspace, Escape)
    const key = e.key.toLowerCase();

    switch (key) {
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

  public getRegisteredShortcuts(): ShortcutDefinition[] {
    return [
      { key: 'Alt+W', description: 'Pen Tool (Pen 1)', badge: 'Alt+W' },
      { key: 'Alt+X', description: 'Eraser Tool', badge: 'Alt+X' },
      { key: 'Ctrl + +', description: 'Zoom In', badge: 'Ctrl++' },
      { key: 'Ctrl + -', description: 'Zoom Out', badge: 'Ctrl+-' },
      { key: 'Ctrl+Z / Ctrl+Y', description: 'Undo / Redo', badge: 'Ctrl+Z/Y' },
      { key: 'Ctrl+D', description: 'Duplicate Selected Objects', badge: 'Ctrl+D' },
      { key: 'Delete / Backspace', description: 'Delete Selected Objects', badge: 'Del' },
      { key: 'Ctrl+A', description: 'Select All Objects', badge: 'Ctrl+A' },
      { key: 'Escape', description: 'Clear Selection / Return to Select Tool', badge: 'Esc' },
    ];
  }

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
