/**
 * Open Whiteboard — Selection Store
 *
 * Manages selected entity IDs, selection bounding box, and multi-selection state.
 */

import { useSyncExternalStore } from 'react';
import { sceneStore } from './sceneStore';
import { historyManager } from '../canvas/history';
import type {
  CanvasEntity,
  InkStrokeEntity,
  NoteEntity,
  TextEntity,
  ShapeEntity,
  ImageEntity,
  AABB,
} from '../canvas/sceneGraph';
import { getUnionBounds } from '../canvas/sceneGraph';

class SelectionStore {
  private selectedIds = new Set<string>();
  private listeners = new Set<() => void>();
  private snapshotVersion = 0;

  public subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  public getSnapshot = () => {
    return this.snapshotVersion;
  };

  private notify() {
    this.snapshotVersion += 1;
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getSelectedIds(): Set<string> {
    return new Set(this.selectedIds);
  }

  public isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  public getSelectedCount(): number {
    return this.selectedIds.size;
  }

  public select(id: string, additive: boolean = false) {
    if (!additive) {
      this.selectedIds.clear();
    }
    this.selectedIds.add(id);
    this.notify();
  }

  public selectMultiple(ids: string[], additive: boolean = false) {
    if (!additive) {
      this.selectedIds.clear();
    }
    for (const id of ids) {
      this.selectedIds.add(id);
    }
    this.notify();
  }

  public deselect(id: string) {
    if (this.selectedIds.delete(id)) {
      this.notify();
    }
  }

  public clearSelection() {
    if (this.selectedIds.size > 0) {
      this.selectedIds.clear();
      this.notify();
    }
  }

  public selectAll() {
    const all = sceneStore.getAllEntities();
    this.selectedIds.clear();
    for (const e of all) {
      if (e.isLocked || (e.type === 'image' && (e as any).isLockedToBackground)) {
        continue;
      }
      this.selectedIds.add(e.id);
    }
    this.notify();
  }

  public getSelectedEntities(): CanvasEntity[] {
    const result: CanvasEntity[] = [];
    for (const id of this.selectedIds) {
      const entity = sceneStore.getEntity(id);
      if (entity) {
        result.push(entity);
      }
    }
    return result;
  }

  /**
   * Deletes all currently selected entities and records an undo action.
   */
  public deleteSelected() {
    const ids = Array.from(this.selectedIds);
    if (ids.length === 0) return;
    this.clearSelection();
    sceneStore.deleteEntities(ids, true);
  }

  /**
   * Duplicates all currently selected entities, offsets them by (+24, +24),
   * adds them into the scene, and selects the duplicates.
   */
  public duplicateSelected() {
    const current = this.getSelectedEntities();
    if (current.length === 0) return;

    const clonedIds: string[] = [];
    historyManager.inUndoGroup('Duplicate Objects', () => {
      for (const entity of current) {
        const newId = `${entity.type}_copy_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 6)}`;
        clonedIds.push(newId);

        if (entity.type === 'stroke') {
          const stroke = entity as InkStrokeEntity;
          const clonedStroke: InkStrokeEntity = {
            ...stroke,
            id: newId,
            points: stroke.points.map((p) => ({ ...p, x: p.x + 24, y: p.y + 24 })),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          sceneStore.addEntity(clonedStroke, true);
        } else {
          const box = entity as NoteEntity | TextEntity | ShapeEntity | ImageEntity;
          const clonedBox = {
            ...box,
            id: newId,
            x: box.x + 24,
            y: box.y + 24,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          sceneStore.addEntity(clonedBox, true);
        }
      }
    });

    this.selectMultiple(clonedIds);
  }

  /**
   * Calculates the union bounding box of all selected entities.
   */
  public getSelectionBounds(): AABB | null {
    const entities = this.getSelectedEntities();
    if (entities.length === 0) return null;

    const boundsList = entities.map((e) => e.bounds);
    return getUnionBounds(boundsList);
  }
}

export const selectionStore = new SelectionStore();

export function useSelectionStore() {
  useSyncExternalStore(selectionStore.subscribe, selectionStore.getSnapshot);
  return {
    selectedIds: selectionStore.getSelectedIds(),
    selectedCount: selectionStore.getSelectedCount(),
    selectedEntities: selectionStore.getSelectedEntities(),
    selectionBounds: selectionStore.getSelectionBounds(),
    isSelected: (id: string) => selectionStore.isSelected(id),
    select: (id: string, additive?: boolean) => selectionStore.select(id, additive),
    selectMultiple: (ids: string[], additive?: boolean) =>
      selectionStore.selectMultiple(ids, additive),
    deselect: (id: string) => selectionStore.deselect(id),
    clearSelection: () => selectionStore.clearSelection(),
    selectAll: () => selectionStore.selectAll(),
    deleteSelected: () => selectionStore.deleteSelected(),
    duplicateSelected: () => selectionStore.duplicateSelected(),
  };
}
