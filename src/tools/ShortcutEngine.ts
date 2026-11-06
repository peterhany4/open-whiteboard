/**
 * Open Whiteboard — Global Keyboard Shortcuts Engine
 *
 * Whitelisted Shortcuts:
 * | Shortcut              | Action                                   |
 * | :-------------------- | :--------------------------------------- |
 * | `Alt+W`               | Pen Tool                                 |
 * | `Alt+X`               | Eraser Tool                              |
 * | `Ctrl + +`            | Zoom In                                  |
 * | `Ctrl + -`            | Zoom Out                                 |
 * | `Ctrl+Z` / `Ctrl+Y`   | Undo / Redo                              |
 * | `Ctrl+D`              | Duplicate Selected Objects               |
 * | `Delete` / `Backspace`| Delete Selected Objects                  |
 * | `Ctrl+A`              | Select All Objects                       |
 * | `Escape`              | Clear Selection / Return to Select Tool  |
 * | `Ctrl+C`              | Copy Selected Objects                    |
 * | `Ctrl+V`              | Paste Objects                            |
 */

import { inkingStore } from '../store/inkingStore';
import { canvasStore } from '../store/canvasStore';
import { selectionStore } from '../store/selectionStore';
import { boardStore } from '../store/boardStore';
import { copySelectedToClipboard, executeUniversalPaste } from './clipboard';

export interface ShortcutDefinition {
  key: string;
  description: string;
  badge: string;
}

export class ShortcutEngine {
  private isListening = false;

  private isTextInput(el: EventTarget | null): boolean {
    if (!el) return false;
    if (typeof HTMLElement !== 'undefined' && !(el instanceof HTMLElement)) return false;
    const anyEl = el as any;
    const tag = anyEl.tagName;
    return (
      tag === 'INPUT' ||
      tag === 'TEXTAREA' ||
      Boolean(anyEl.isContentEditable) ||
      anyEl.getAttribute?.('role') === 'textbox' ||
      Boolean(anyEl.classList?.contains?.('canvas-text-input'))
    );
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    // 1. Text input isolation: typing in sticky notes, title, or text boxes must not trigger canvas shortcuts
    if (this.isTextInput(e.target)) {
      if (e.key === 'Escape' || e.code === 'Escape') {
        (e.target as HTMLElement).blur();
      }
      return;
    }

    // 2. Only handle shortcuts when on the active whiteboard canvas, not in board gallery
    if (boardStore.getState().currentView !== 'board') {
      return;
    }

    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';
    const keyCode = e.keyCode || e.which || 0;

    // Check modifier states robustly across OSes and keyboard layouts
    // Supports both Left Alt and Right Alt / AltGr:
    const isAltGr = Boolean(e.getModifierState && e.getModifierState('AltGraph'));
    const isAlt = e.altKey || isAltGr;
    // On Windows AltGr sets ctrlKey=true, so mask it out when Alt/AltGr is active
    const isCtrlOrMeta = (e.ctrlKey || e.metaKey) && !isAlt;

    // 3. Intercept bare Alt keydown (prevents Windows Chrome / Edge / Firefox from arming the browser/system menu)
    if (key === 'alt' || code === 'AltLeft' || code === 'AltRight' || keyCode === 18) {
      e.preventDefault();
      return;
    }

    // 4. Alt-based shortcuts: Alt+W (Pen Tool), Alt+X (Eraser Tool) — supports both Left Alt & Right Alt (AltGr)
    if (isAlt && !isCtrlOrMeta) {
      const isW = key === 'w' || code === 'KeyW' || keyCode === 87;
      const isX = key === 'x' || code === 'KeyX' || keyCode === 88;

      if (isW) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        inkingStore.selectPen('Pen1');
        inkingStore.closePopover();
        selectionStore.clearSelection();
        return;
      }

      if (isX) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        inkingStore.selectTool('Eraser');
        inkingStore.closePopover();
        selectionStore.clearSelection();
        return;
      }

      // Suppress unhandled Alt combinations in browser to prevent menu bar activation
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 5. Ctrl / Cmd based shortcuts
    if (isCtrlOrMeta && !isAlt) {
      const isZ = key === 'z' || code === 'KeyZ' || keyCode === 90;
      const isY = key === 'y' || code === 'KeyY' || keyCode === 89;

      // Undo: Ctrl+Z (without Shift)
      if (isZ && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        canvasStore.triggerUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (isY || (isZ && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        canvasStore.triggerRedo();
        return;
      }

      // Select All: Ctrl+A
      if (key === 'a' || code === 'KeyA' || keyCode === 65) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        selectionStore.selectAll();
        return;
      }

      // Duplicate Selected Objects: Ctrl+D
      if (key === 'd' || code === 'KeyD' || keyCode === 68) {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          selectionStore.duplicateSelected();
        }
        return;
      }

      // Copy Selected Objects: Ctrl+C
      if (key === 'c' || code === 'KeyC' || keyCode === 67) {
        const domSelection = typeof window !== 'undefined' ? window.getSelection() : null;
        if (domSelection && domSelection.toString().length > 0) {
          // Native text selection on page takes precedence
          return;
        }
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          copySelectedToClipboard();
        }
        return;
      }

      // Paste Objects: Ctrl+V
      if (key === 'v' || code === 'KeyV' || keyCode === 86) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        executeUniversalPaste();
        return;
      }

      // Zoom In: Ctrl++ or Ctrl+=
      if (key === '=' || key === '+' || code === 'Equal' || code === 'NumpadAdd' || keyCode === 187 || keyCode === 107) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        canvasStore.zoomIn();
        return;
      }

      // Zoom Out: Ctrl+- or Ctrl+_
      if (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract' || keyCode === 189 || keyCode === 109) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
        canvasStore.zoomOut();
        return;
      }

      return;
    }

    // 6. Non-modifier shortcuts: Delete / Backspace, Escape
    if (!isCtrlOrMeta && !isAlt && !e.shiftKey) {
      // Delete / Backspace: Delete Selected Objects
      if (key === 'delete' || key === 'backspace' || code === 'Delete' || code === 'Backspace' || keyCode === 46 || keyCode === 8) {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          e.stopPropagation();
          if (e.stopImmediatePropagation) e.stopImmediatePropagation();
          selectionStore.deleteSelected();
        }
        return;
      }

      // Escape: Clear Selection / Return to Select Tool
      if (key === 'escape' || code === 'Escape' || keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();
        if (e.stopImmediatePropagation) e.stopImmediatePropagation();
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
        return;
      }
    }
  };

  /**
   * Browser resilience: KeyUp listener ensures Windows browser menu bar
   * is never armed upon Alt release, and acts as fallback if keydown was swallowed.
   * Supports both Left Alt and Right Alt / AltGr.
   */
  private handleKeyUp = (e: KeyboardEvent) => {
    const key = e.key ? e.key.toLowerCase() : '';
    const code = e.code || '';
    const keyCode = e.keyCode || e.which || 0;

    // Suppress menu bar activation on Alt release (both Left Alt and Right Alt)
    if (key === 'alt' || code === 'AltLeft' || code === 'AltRight' || keyCode === 18) {
      e.preventDefault();
      return;
    }

    if (this.isTextInput(e.target)) return;
    if (boardStore.getState().currentView !== 'board') return;

    const isAltGr = Boolean(e.getModifierState && e.getModifierState('AltGraph'));
    const isAlt = e.altKey || isAltGr;
    const isCtrlOrMeta = (e.ctrlKey || e.metaKey) && !isAlt;

    if (isAlt && !isCtrlOrMeta) {
      const isX = key === 'x' || code === 'KeyX' || keyCode === 88;
      const isW = key === 'w' || code === 'KeyW' || keyCode === 87;

      if (isX && inkingStore.getState().selectedTool !== 'Eraser') {
        e.preventDefault();
        e.stopPropagation();
        inkingStore.selectTool('Eraser');
        inkingStore.closePopover();
        selectionStore.clearSelection();
      } else if (isW && inkingStore.getState().selectedTool !== 'Pen1') {
        e.preventDefault();
        e.stopPropagation();
        inkingStore.selectPen('Pen1');
        inkingStore.closePopover();
        selectionStore.clearSelection();
      }
    }
  };

  public getRegisteredShortcuts(): ShortcutDefinition[] {
    return [
      { key: 'Alt+W', description: 'Pen Tool', badge: 'Alt+W' },
      { key: 'Alt+X', description: 'Eraser Tool', badge: 'Alt+X' },
      { key: 'Ctrl + +', description: 'Zoom In', badge: 'Ctrl++' },
      { key: 'Ctrl + -', description: 'Zoom Out', badge: 'Ctrl+-' },
      { key: 'Ctrl+Z / Ctrl+Y', description: 'Undo / Redo', badge: 'Ctrl+Z/Y' },
      { key: 'Ctrl+D', description: 'Duplicate Selected Objects', badge: 'Ctrl+D' },
      { key: 'Delete / Backspace', description: 'Delete Selected Objects', badge: 'Del' },
      { key: 'Ctrl+A', description: 'Select All Objects', badge: 'Ctrl+A' },
      { key: 'Escape', description: 'Clear Selection / Return to Select Tool', badge: 'Esc' },
      { key: 'Ctrl+C', description: 'Copy Selected Objects', badge: 'Ctrl+C' },
      { key: 'Ctrl+V', description: 'Paste Objects', badge: 'Ctrl+V' },
    ];
  }

  public start() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
    window.addEventListener('keyup', this.handleKeyUp, { capture: true });
  }

  public stop() {
    if (!this.isListening) return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
    window.removeEventListener('keyup', this.handleKeyUp, { capture: true });
  }
}

export const shortcutEngine = new ShortcutEngine();
