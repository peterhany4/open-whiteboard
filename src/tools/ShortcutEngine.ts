/**
 * Open Whiteboard — Global Keyboard Shortcuts Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Milestone 16 Strict Shortcut Whitelist (Alt+W for Pen 1, Alt+X for Eraser)
 *   - Module 517955 & 84781932: Object manipulation (Delete, Backspace, Ctrl+D, Ctrl+A, Esc, Ctrl+L, Ctrl+[/])
 *   - Module 415906: Canvas navigation (Ctrl++, Ctrl+-)
 *   - Module 127580: Command History (Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z)
 */

import { inkingStore } from '../store/inkingStore';
import { canvasStore } from '../store/canvasStore';
import { selectionStore } from '../store/selectionStore';
import { sceneStore } from '../store/sceneStore';
import { boardStore } from '../store/boardStore';
import { historyManager } from '../canvas/history';
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
    // 1. Text input isolation: typing in sticky notes, title, or text boxes must not trigger shortcut actions or deletion
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

    const key = e.key.toLowerCase();
    const code = e.code;
    const isAltGr = Boolean(e.getModifierState && e.getModifierState('AltGraph'));
    const isAlt = e.altKey || isAltGr;
    // On Windows AltGr sets ctrlKey=true, so mask it out
    const isCtrlOrMeta = (e.ctrlKey || e.metaKey) && !isAltGr;

    // 3. Bare Alt key intercept (prevents Windows Chrome / Edge from hijacking focus to browser menu bar)
    if (key === 'alt' || code === 'AltLeft' || code === 'AltRight') {
      e.preventDefault();
      return;
    }

    // 4. Alt-based shortcuts (Alt+W for Pen 1, Alt+X / Alt+E for Eraser)
    if (isAlt) {
      const isX = key === 'x' || code === 'KeyX';
      const isE = key === 'e' || code === 'KeyE';
      const isW = key === 'w' || code === 'KeyW';

      if (isW) {
        e.preventDefault();
        e.stopPropagation();
        inkingStore.selectPen('Pen1');
        inkingStore.closePopover();
        selectionStore.clearSelection();
        return;
      }

      if (isX || isE) {
        e.preventDefault();
        e.stopPropagation();
        inkingStore.selectTool('Eraser');
        inkingStore.closePopover();
        selectionStore.clearSelection();
        return;
      }

      // Prevent Windows browser menu activation on unhandled Alt combos
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 5. Modifier-based shortcuts (Ctrl / Cmd) — Dual key & code checking for international layouts
    if (isCtrlOrMeta && !isAlt) {
      const isZ = key === 'z' || code === 'KeyZ';
      const isY = key === 'y' || code === 'KeyY';

      // Undo: Ctrl+Z (without Shift)
      if (isZ && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        canvasStore.triggerUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (isY || (isZ && e.shiftKey)) {
        e.preventDefault();
        e.stopPropagation();
        canvasStore.triggerRedo();
        return;
      }

      // Select All: Ctrl+A
      if (key === 'a' || code === 'KeyA') {
        e.preventDefault();
        e.stopPropagation();
        selectionStore.selectAll();
        return;
      }

      // Duplicate: Ctrl+D
      if (key === 'd' || code === 'KeyD') {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          e.stopPropagation();
          selectionStore.duplicateSelected();
        }
        return;
      }

      // Cut: Ctrl+X
      if (key === 'x' || code === 'KeyX') {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          e.stopPropagation();
          copySelectedToClipboard();
          selectionStore.deleteSelected();
        }
        return;
      }

      // Copy: Ctrl+C
      if (key === 'c' || code === 'KeyC') {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          e.stopPropagation();
          copySelectedToClipboard();
        }
        return;
      }

      // Paste: Ctrl+V
      if (key === 'v' || code === 'KeyV') {
        e.preventDefault();
        e.stopPropagation();
        executeUniversalPaste();
        return;
      }

      // Zoom In: Ctrl++ or Ctrl+=
      if (key === '=' || key === '+' || code === 'Equal' || code === 'NumpadAdd') {
        e.preventDefault();
        e.stopPropagation();
        canvasStore.zoomIn();
        return;
      }

      // Zoom Out: Ctrl+- or Ctrl+_
      if (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract') {
        e.preventDefault();
        e.stopPropagation();
        canvasStore.zoomOut();
        return;
      }

      // Bring to Front: Ctrl+] or Ctrl+Shift+] / Ctrl+}
      if (key === ']' || key === '}' || code === 'BracketRight') {
        const ids = Array.from(selectionStore.getSelectedIds());
        if (ids.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          sceneStore.bringToFront(ids);
        }
        return;
      }

      // Send to Back: Ctrl+[ or Ctrl+Shift+[ / Ctrl+{
      if (key === '[' || key === '{' || code === 'BracketLeft') {
        const ids = Array.from(selectionStore.getSelectedIds());
        if (ids.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          sceneStore.sendToBack(ids);
        }
        return;
      }

      // Toggle Lock / Unlock: Ctrl+L
      if (key === 'l' || code === 'KeyL') {
        const selected = selectionStore.getSelectedEntities();
        if (selected.length > 0) {
          e.preventDefault();
          e.stopPropagation();
          const targetLock = selected.some(
            (ent) => !ent.isLocked && !(ent.type === 'image' && (ent as any).isLockedToBackground)
          );
          historyManager.inUndoGroup(targetLock ? 'Lock to Background' : 'Unlock Objects', () => {
            for (const ent of selected) {
              if (ent.type === 'image') {
                sceneStore.updateEntity(
                  ent.id,
                  {
                    isLocked: targetLock,
                    isLockedToBackground: targetLock,
                    zIndex: targetLock ? 50 : 100,
                  },
                  true
                );
              } else if (ent.type === 'pdf_document') {
                sceneStore.updateEntity(
                  ent.id,
                  {
                    isLocked: targetLock,
                    zIndex: targetLock ? 50 : 100,
                  },
                  true
                );
              } else {
                sceneStore.updateEntity(ent.id, { isLocked: targetLock }, true);
              }
            }
          });
        }
        return;
      }

      return;
    }

    // 6. Microsoft Whiteboard Single-Key Shortcuts outside text inputs (Module 40049)
    if (!isCtrlOrMeta && !isAlt && !e.shiftKey) {
      // Eraser: E
      if (key === 'e' || code === 'KeyE') {
        e.preventDefault();
        e.stopPropagation();
        inkingStore.selectTool('Eraser');
        inkingStore.closePopover();
        selectionStore.clearSelection();
        return;
      }

      // Delete / Backspace: Delete selected
      if (key === 'delete' || key === 'backspace' || code === 'Delete' || code === 'Backspace') {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          e.stopPropagation();
          selectionStore.deleteSelected();
        }
        return;
      }

      // Escape: Dismiss active popovers, panels, selection, or return to Select Tool
      if (key === 'escape' || code === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
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

  public getRegisteredShortcuts(): ShortcutDefinition[] {
    return [
      { key: 'Alt+W', description: 'Pen Tool (Pen 1)', badge: 'Alt+W' },
      { key: 'Alt+X / E', description: 'Eraser Tool', badge: 'Alt+X' },
      { key: 'Ctrl + +', description: 'Zoom In', badge: 'Ctrl++' },
      { key: 'Ctrl + -', description: 'Zoom Out', badge: 'Ctrl+-' },
      { key: 'Ctrl+Z / Ctrl+Y', description: 'Undo / Redo', badge: 'Ctrl+Z/Y' },
      { key: 'Ctrl+C', description: 'Copy Selected Objects', badge: 'Ctrl+C' },
      { key: 'Ctrl+X', description: 'Cut Selected Objects', badge: 'Ctrl+X' },
      { key: 'Ctrl+V', description: 'Paste Objects or Images', badge: 'Ctrl+V' },
      { key: 'Ctrl+D', description: 'Duplicate Selected Objects', badge: 'Ctrl+D' },
      { key: 'Delete / Backspace', description: 'Delete Selected Objects', badge: 'Del' },
      { key: 'Ctrl+A', description: 'Select All Objects', badge: 'Ctrl+A' },
      { key: 'Ctrl+L', description: 'Lock / Unlock Selected Objects', badge: 'Ctrl+L' },
      { key: 'Ctrl+[ / ]', description: 'Send to Back / Bring to Front', badge: 'Ctrl+[/]' },
      { key: 'Escape', description: 'Clear Selection / Close Popover', badge: 'Esc' },
    ];
  }

  public start() {
    if (this.isListening) return;
    this.isListening = true;
    window.addEventListener('keydown', this.handleKeyDown, { capture: true });
  }

  public stop() {
    if (!this.isListening) return;
    this.isListening = false;
    window.removeEventListener('keydown', this.handleKeyDown, { capture: true });
  }
}

export const shortcutEngine = new ShortcutEngine();
