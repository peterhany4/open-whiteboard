/**
 * Open Whiteboard — Spatial Scene Store
 *
 * Provides reactive entity storage, viewport culling, and deterministic Undo/Redo integration.
 */

import { useSyncExternalStore } from 'react';
import type { CameraMatrix } from '../canvas/camera';
import {
  type CanvasEntity,
  type AABB,
  computeEntityBounds,
  getViewportWorldBounds,
  intersectsAABB,
  getUnionBounds,
} from '../canvas/sceneGraph';
import { historyManager } from '../canvas/history';

class SceneStore {
  private entities = new Map<string, CanvasEntity>();
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

  public getEntity(id: string): CanvasEntity | undefined {
    return this.entities.get(id);
  }

  public getAllEntities(): CanvasEntity[] {
    return Array.from(this.entities.values()).sort((a, b) => a.zIndex - b.zIndex);
  }

  public getEntityCount(): number {
    return this.entities.size;
  }

  /**
   * Adds an entity with automatic AABB calculation and optional Undo/Redo tracking.
   */
  public addEntity(entity: CanvasEntity, undoable: boolean = true) {
    const computedEntity: CanvasEntity = {
      ...entity,
      bounds: computeEntityBounds(entity),
      updatedAt: Date.now(),
    };

    if (undoable) {
      historyManager.execute({
        name: `Add ${computedEntity.type}`,
        execute: () => {
          this.entities.set(computedEntity.id, computedEntity);
          this.notify();
        },
        undo: () => {
          this.entities.delete(computedEntity.id);
          this.notify();
        },
      });
    } else {
      this.entities.set(computedEntity.id, computedEntity);
      this.notify();
    }
  }

  /**
   * Updates an entity with partial properties and recalculated AABB.
   */
  public updateEntity(id: string, updates: Partial<CanvasEntity>, undoable: boolean = true) {
    const previous = this.entities.get(id);
    if (!previous) return;

    const merged = { ...previous, ...updates } as CanvasEntity;
    const updatedEntity: CanvasEntity = {
      ...merged,
      bounds: computeEntityBounds(merged),
      updatedAt: Date.now(),
    };

    if (undoable) {
      historyManager.execute({
        name: `Update ${previous.type}`,
        execute: () => {
          this.entities.set(id, updatedEntity);
          this.notify();
        },
        undo: () => {
          this.entities.set(id, previous);
          this.notify();
        },
      });
    } else {
      this.entities.set(id, updatedEntity);
      this.notify();
    }
  }

  /**
   * Deletes a single entity with undo/redo capability.
   */
  public deleteEntity(id: string, undoable: boolean = true) {
    const previous = this.entities.get(id);
    if (!previous) return;

    if (undoable) {
      historyManager.execute({
        name: `Delete ${previous.type}`,
        execute: () => {
          this.entities.delete(id);
          this.notify();
        },
        undo: () => {
          this.entities.set(id, previous);
          this.notify();
        },
      });
    } else {
      this.entities.delete(id);
      this.notify();
    }
  }

  public removeEntity(id: string, undoable: boolean = true) {
    this.deleteEntity(id, undoable);
  }

  public beginUndoGroup(name: string = 'Batch Operation') {
    historyManager.beginUndoGroup(name);
  }

  public endUndoGroup() {
    historyManager.endUndoGroup();
  }

  /**
   * Deletes multiple entities in a single atomic undo group.
   */
  public deleteEntities(ids: string[], undoable: boolean = true) {
    const targets = ids
      .map((id) => this.entities.get(id))
      .filter((e): e is CanvasEntity => Boolean(e));

    if (targets.length === 0) return;

    if (undoable) {
      historyManager.inUndoGroup('Delete selection', () => {
        for (const item of targets) {
          historyManager.execute({
            name: `Delete ${item.type}`,
            execute: () => {
              this.entities.delete(item.id);
              this.notify();
            },
            undo: () => {
              this.entities.set(item.id, item);
              this.notify();
            },
          });
        }
      });
    } else {
      for (const item of targets) {
        this.entities.delete(item.id);
      }
      this.notify();
    }
  }

  /**
   * Clears all entities from canvas.
   */
  public clearEntities(undoable: boolean = true) {
    const snapshot = Array.from(this.entities.values());
    if (snapshot.length === 0) return;

    if (undoable) {
      historyManager.execute({
        name: 'Clear Whiteboard',
        execute: () => {
          this.entities.clear();
          this.notify();
        },
        undo: () => {
          for (const item of snapshot) {
            this.entities.set(item.id, item);
          }
          this.notify();
        },
      });
    } else {
      this.entities.clear();
      this.notify();
    }
  }

  /**
   * Replaces all current entities with the provided list (used when loading/switching boards).
   * Resets the undo/redo stack.
   */
  public loadEntities(entities: CanvasEntity[]) {
    this.entities.clear();
    for (const entity of entities) {
      this.entities.set(entity.id, {
        ...entity,
        bounds: entity.bounds || computeEntityBounds(entity),
      });
    }
    historyManager.clear();
    this.notify();
  }

  /**
   * Serializes all current canvas entities into a clone array.
   */
  public serializeEntities(): CanvasEntity[] {
    return Array.from(this.entities.values());
  }

  /**
   * Returns union bounding box of all canvas objects, or null if board is empty.
   * (Module 770023: Su)
   */
  public getCanvasBounds(): AABB | null {
    if (this.entities.size === 0) return null;
    const allBounds = Array.from(this.entities.values()).map((e) => e.bounds);
    return getUnionBounds(allBounds);
  }

  /**
   * Performs spatial viewport frustum culling: only returns entities whose AABB
   * intersects the currently visible world screen viewport (+ padding margin).
   */
  public getVisibleEntities(
    camera: CameraMatrix,
    viewportSize: { width: number; height: number },
    paddingMargin: number = 80
  ): CanvasEntity[] {
    if (this.entities.size === 0) return [];

    const viewBounds = getViewportWorldBounds(camera, viewportSize, paddingMargin);
    const visible: CanvasEntity[] = [];

    for (const entity of this.entities.values()) {
      if (intersectsAABB(entity.bounds, viewBounds)) {
        visible.push(entity);
      }
    }

    // Sort visible entities by zIndex for correct draw order
    return visible.sort((a, b) => a.zIndex - b.zIndex);
  }
}

export const sceneStore = new SceneStore();

export function useSceneEntities(): CanvasEntity[] {
  useSyncExternalStore(sceneStore.subscribe, sceneStore.getSnapshot);
  return sceneStore.getAllEntities();
}

export function useVisibleEntities(
  camera: CameraMatrix,
  viewportSize: { width: number; height: number }
): CanvasEntity[] {
  useSyncExternalStore(sceneStore.subscribe, sceneStore.getSnapshot);
  return sceneStore.getVisibleEntities(camera, viewportSize);
}
