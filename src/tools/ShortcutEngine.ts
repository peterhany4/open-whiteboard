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
import { copySelectedToClipboard } from './clipboard';

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

    const isCtrlOrMeta = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();
    const code = e.code;

    // 3. Modifier-based shortcuts (Ctrl / Cmd) — Dual key & code checking for international layouts
    if (isCtrlOrMeta && !e.altKey) {
      const isZ = key === 'z' || code === 'KeyZ';
      const isY = key === 'y' || code === 'KeyY';

      // Undo: Ctrl+Z (without Shift)
      if (isZ && !e.shiftKey) {
        e.preventDefault();
        canvasStore.triggerUndo();
        return;
      }

      // Redo: Ctrl+Y or Ctrl+Shift+Z
      if (isY || (isZ && e.shiftKey)) {
        e.preventDefault();
        canvasStore.triggerRedo();
        return;
      }

      // Select All: Ctrl+A
      if (key === 'a' || code === 'KeyA') {
        e.preventDefault();
        selectionStore.selectAll();
        return;
      }

      // Duplicate: Ctrl+D
      if (key === 'd' || code === 'KeyD') {
        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          selectionStore.duplicateSelected();
        }
        return;
      }

      // Copy: Ctrl+C
      if (key === 'c' || code === 'KeyC') {
        const domSelection = window.getSelection();
        if (domSelection && domSelection.toString().length > 0) {
          // Native text selection on page takes precedence
          return;
        }

        if (selectionStore.getSelectedCount() > 0) {
          e.preventDefault();
          copySelectedToClipboard();
        }
        return;
      }

      // Zoom In: Ctrl++ or Ctrl+=
      if (key === '=' || key === '+' || code === 'Equal' || code === 'NumpadAdd') {
        e.preventDefault();
        canvasStore.zoomIn();
        return;
      }

      // Zoom Out: Ctrl+- or Ctrl+_
      if (key === '-' || key === '_' || code === 'Minus' || code === 'NumpadSubtract') {
        e.preventDefault();
        canvasStore.zoomOut();
        return;
      }

      // Bring to Front: Ctrl+] or Ctrl+Shift+] / Ctrl+}
      if (key === ']' || key === '}' || code === 'BracketRight') {
        const ids = Array.from(selectionStore.getSelectedIds());
        if (ids.length > 0) {
          e.preventDefault();
          sceneStore.bringToFront(ids);
        }
        return;
      }

      // Send to Back: Ctrl+[ or Ctrl+Shift+[ / Ctrl+{
      if (key === '[' || key === '{' || code === 'BracketLeft') {
        const ids = Array.from(selectionStore.getSelectedIds());
        if (ids.length > 0) {
          e.preventDefault();
          sceneStore.sendToBack(ids);
        }
        return;
      }

      // Toggle Lock / Unlock: Ctrl+L
      if (key === 'l' || code === 'KeyL') {
        const selected = selectionStore.getSelectedEntities();
        if (selected.length > 0) {
          e.preventDefault();
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

      // Allow browser shortcuts like Ctrl+Shift+I / Ctrl+P to proceed without interference
      return;
    }

    // 4. Milestone 16 Ergonomic Alt-key shortcuts (Alt+W for Pen 1, Alt+X for Eraser)
    if (e.altKey && !isCtrlOrMeta) {
      if (key === 'w' || code === 'KeyW') {
        e.preventDefault();
        inkingStore.selectPen('Pen1');
        return;
      }
      if (key === 'x' || code === 'KeyX') {
        e.preventDefault();
        inkingStore.setSelectedTool('Eraser');
        return;
      }
      return;
    }

    // 5. Milestone 16 Whitelisted Non-Modifier Keys (Delete/Backspace, Escape only)
    if (key === 'delete' || key === 'backspace' || code === 'Delete' || code === 'Backspace') {
      if (selectionStore.getSelectedCount() > 0) {
        e.preventDefault();
        selectionStore.deleteSelected();
      }
      return;
    }

    if (key === 'escape' || code === 'Escape') {
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
      return;
    }
  };

  public getRegisteredShortcuts(): ShortcutDefinition[] {
    return [
      { key: 'Alt+W', description: 'Pen Tool (Pen 1)', badge: 'Alt+W' },
      { key: 'Alt+X', description: 'Eraser Tool', badge: 'Alt+X' },
      { key: 'Ctrl + +', description: 'Zoom In', badge: 'Ctrl++' },
      { key: 'Ctrl + -', description: 'Zoom Out', badge: 'Ctrl+-' },
      { key: 'Ctrl+Z / Ctrl+Y', description: 'Undo / Redo', badge: 'Ctrl+Z/Y' },
      { key: 'Ctrl+C', description: 'Copy Selected Objects', badge: 'Ctrl+C' },
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
