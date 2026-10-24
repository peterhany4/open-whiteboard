/**
 * Open Whiteboard — Deterministic Command History & Undo/Redo Engine
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 127580 (blueboard/chunks/9114.*.js, lines 2-11)
 *     -> UndoRedoStack class U: undoUIStack, redoUIStack, beginUndoGroup, endUndoGroup, inUndoGroup, performUndo, performRedo
 *   - Module 796400 (blueboard/chunks/46453.*.js) -> Redux undo/redo UI actions
 *   - Module 416210 -> UndoRedo accessibility notifications
 */

import { canvasStore } from '../store/canvasStore';

export interface Command {
  id?: string;
  name: string;
  execute: () => void;
  undo: () => void;
  redo?: () => void;
}

export class ClearCanvasCommand<T = any> implements Command {
  public id?: string;
  public name = 'Clear Canvas';
  private snapshot: T[];
  private onApply: (entities: T[]) => void;

  constructor(snapshot: T[], onApply: (entities: T[]) => void) {
    this.id = 'clear-canvas-' + Date.now();
    this.snapshot = [...snapshot];
    this.onApply = onApply;
  }

  public execute() {
    this.onApply([]);
  }

  public undo() {
    this.onApply(this.snapshot);
  }

  public redo() {
    this.execute();
  }
}

export interface UndoGroup {
  name: string;
  commands: Command[];
  allowNested: boolean;
  currentDepth: number;
}

const MAX_STACK_SIZE = 100;

class HistoryManager {
  private undoStack: (Command | UndoGroup)[] = [];
  private redoStack: (Command | UndoGroup)[] = [];
  private currentUndoGroup: UndoGroup | null = null;
  private isExecutingHistory = false;

  constructor() {
    this.setupListeners();
  }

  private setupListeners() {
    if (typeof window === 'undefined') return;

    // Listen to custom window events from TopBar buttons, Eraser popover, and ShortcutEngine
    window.addEventListener('wb-undo', () => this.undo());
    window.addEventListener('wb-redo', () => this.redo());
  }

  /**
   * Executes a command and tracks it in the active undo group or pushes directly to undoStack.
   */
  public execute(command: Command) {
    if (this.isExecutingHistory) {
      command.execute();
      return;
    }

    try {
      command.execute();
    } catch (err) {
      console.error(`[HistoryManager] Failed to execute command: ${command.name}`, err);
      return;
    }

    if (this.currentUndoGroup) {
      this.currentUndoGroup.commands.push(command);
    } else {
      this.undoStack.push(command);
      if (this.undoStack.length > MAX_STACK_SIZE) {
        this.undoStack.shift();
      }
      // Any new modification clears the redo stack (Module 127580 line 4)
      this.redoStack.length = 0;
      this.syncUIState();
    }
  }

  /**
   * Begins a logical group of operations that should undo/redo together
   * (e.g. multi-stroke erasure, moving multiple selected objects).
   * Module 127580: beginUndoGroup(callerContext, allowNested)
   */
  public beginUndoGroup(name: string, allowNested: boolean = false) {
    if (this.currentUndoGroup) {
      if (this.currentUndoGroup.allowNested || allowNested) {
        this.currentUndoGroup.currentDepth += 1;
        return;
      }
      // If already in a non-nested group, end it first
      this.endUndoGroup(this.currentUndoGroup.name);
    }

    this.currentUndoGroup = {
      name,
      commands: [],
      allowNested,
      currentDepth: 0,
    };
  }

  /**
   * Ends an active undo group and commits its commands to the undo stack.
   * Module 127580: endUndoGroup(callerContext, option)
   */
  public endUndoGroup(_name?: string, option?: 'ignoreUndoGroup') {
    if (!this.currentUndoGroup) return;

    if (this.currentUndoGroup.allowNested && this.currentUndoGroup.currentDepth > 0) {
      this.currentUndoGroup.currentDepth -= 1;
      return;
    }

    const group = this.currentUndoGroup;
    this.currentUndoGroup = null;

    if (option === 'ignoreUndoGroup' || group.commands.length === 0) {
      return;
    }

    this.undoStack.push(group);
    if (this.undoStack.length > MAX_STACK_SIZE) {
      this.undoStack.shift();
    }
    this.redoStack.length = 0;
    this.syncUIState();
  }

  /**
   * Helper to execute a callback within a managed undo group.
   * Module 127580: inUndoGroup(context, fn, ...args)
   */
  public inUndoGroup<T>(name: string, fn: () => T, allowNested: boolean = false): T {
    this.beginUndoGroup(name, allowNested);
    try {
      return fn();
    } catch (err) {
      this.endUndoGroup(name, 'ignoreUndoGroup');
      throw err;
    } finally {
      if (this.currentUndoGroup) {
        this.endUndoGroup(name);
      }
    }
  }

  /**
   * Undoes the last command or composite undo group.
   * Module 127580: performUndo
   */
  public undo(): boolean {
    if (this.undoStack.length === 0) return false;

    // Finish any dangling group before undoing
    if (this.currentUndoGroup) {
      this.endUndoGroup(this.currentUndoGroup.name);
    }

    const item = this.undoStack.pop();
    if (!item) return false;

    this.isExecutingHistory = true;
    try {
      if ('commands' in item) {
        // Revert group in reverse order of execution
        for (let i = item.commands.length - 1; i >= 0; i--) {
          item.commands[i].undo();
        }
      } else {
        item.undo();
      }
      this.redoStack.push(item);
    } catch (err) {
      console.error('[HistoryManager] Error during undo', err);
    } finally {
      this.isExecutingHistory = false;
      this.syncUIState();
    }

    return true;
  }

  /**
   * Redoes the last undone command or composite undo group.
   * Module 127580: performRedo
   */
  public redo(): boolean {
    if (this.redoStack.length === 0) return false;

    const item = this.redoStack.pop();
    if (!item) return false;

    this.isExecutingHistory = true;
    try {
      if ('commands' in item) {
        // Replay group in original order
        for (const cmd of item.commands) {
          if (cmd.redo) {
            cmd.redo();
          } else {
            cmd.execute();
          }
        }
      } else {
        if (item.redo) {
          item.redo();
        } else {
          item.execute();
        }
      }
      this.undoStack.push(item);
    } catch (err) {
      console.error('[HistoryManager] Error during redo', err);
    } finally {
      this.isExecutingHistory = false;
      this.syncUIState();
    }

    return true;
  }

  /**
   * Clears the entire history stack (e.g. when opening a new whiteboard).
   */
  public clear() {
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.currentUndoGroup = null;
    this.syncUIState();
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public getUndoCount(): number {
    return this.undoStack.length;
  }

  public getRedoCount(): number {
    return this.redoStack.length;
  }

  /**
   * Synchronizes status flags to canvasStore for TopBar button lighting and keyboard accessibility.
   */
  private syncUIState() {
    canvasStore.setHistoryStatus(this.canUndo(), this.canRedo());
  }
}

export const historyManager = new HistoryManager();
