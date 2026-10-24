/**
 * Open Whiteboard — Fluent Selection Bounding Box & Context Overlay
 *
 * Reverse-Engineered from REA Evidence:
 * - Evidence ID: ev_831acd44c31a321e3a17ab3924bd5869f9570d8df2628d65420e4a83373549de
 * - Source Modules:
 *   - Module 84781932 (chunks/BoardEditorComponent-84781932.*.js, lines 31-34)
 *     -> Fluent Selection overlay with handles, transforms, and context menu
 *   - Module 770023 & 8854: Bounding box math and multi-object transforms
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSelectionStore, selectionStore } from '../../store/selectionStore';
import { sceneStore } from '../../store/sceneStore';
import { historyManager } from '../../canvas/history';
import type { CanvasEntity, InkStrokeEntity, NoteEntity, NoteGridEntity, TextEntity, ShapeEntity, ReactionEntity, ImageEntity, PDFDocumentEntity, AABB } from '../../canvas/sceneGraph';
import { useCanvasStore } from '../../store/canvasStore';
import { useTheme } from '../../theme/ThemeProvider';
import { lassoTool } from '../../tools/LassoTool';
import type { LiveLassoState } from '../../tools/LassoTool';
import { DeleteIcon } from '../../assets/icons';

// 15 Standard Fluent Inking / Object Swatches (Module 434554)
const FLUENT_PALETTE = [
  '#1F1F1F',
  '#5A5A5A',
  '#8A8886',
  '#FFFFFF',
  '#E71224',
  '#EA3A8A',
  '#8F349E',
  '#0069BF',
  '#0099BC',
  '#00B44B',
  '#FED430',
  '#FF8C00',
  '#B146C2',
  '#0078D4',
  '#28A745',
];

type ResizeHandle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w';

interface DragInitialState {
  startX: number;
  startY: number;
  entities: CanvasEntity[];
  initialBounds: AABB;
}

export const SelectionOverlay: React.FC = () => {
  const { selectedCount, selectionBounds } = useSelectionStore();
  const { camera } = useCanvasStore();
  const { isDark } = useTheme();

  const [liveLasso, setLiveLasso] = useState<LiveLassoState | null>(() => lassoTool.getState());
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Subscribe to live lasso polygon
  useEffect(() => {
    return lassoTool.subscribe((state) => {
      setLiveLasso(state);
    });
  }, []);

  // Close color picker on Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && showColorPicker) {
        setShowColorPicker(false);
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showColorPicker]);

  // Transformation Drag Refs
  const isDraggingBodyRef = useRef(false);
  const activeResizeHandleRef = useRef<ResizeHandle | null>(null);
  const isRotatingRef = useRef(false);
  const dragInitialRef = useRef<DragInitialState | null>(null);

  // 1. Translation: Move Selected Entities
  const handleBodyPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !selectionBounds) return;
      e.stopPropagation();
      e.preventDefault();

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isDraggingBodyRef.current = true;

      const currentEntities = selectionStore.getSelectedEntities();
      const allScene = sceneStore.getAllEntities();
      const selectedIds = new Set(currentEntities.map((e) => e.id));
      const entitiesToMove: CanvasEntity[] = [...currentEntities];

      // Spatial Document Anchoring: Moving an unlocked PDF document or image automatically translates
      // all overlapping ink strokes, highlighters, and sticky notes positioned on top of it.
      const docsInSelection = currentEntities.filter(
        (e) => e.type === 'image' || e.type === 'pdf_document'
      ) as (ImageEntity | PDFDocumentEntity)[];
      if (docsInSelection.length > 0) {
        for (const sceneItem of allScene) {
          if (selectedIds.has(sceneItem.id) || sceneItem.isLocked) continue;
          const b = sceneItem.bounds;
          const centerX = (b.minX + b.maxX) / 2;
          const centerY = (b.minY + b.maxY) / 2;

          const isAnchored = docsInSelection.some(
            (doc) =>
              centerX >= doc.x &&
              centerX <= doc.x + doc.width &&
              centerY >= doc.y &&
              centerY <= doc.y + doc.height
          );

          if (isAnchored) {
            entitiesToMove.push(sceneItem);
            selectedIds.add(sceneItem.id);
          }
        }
      }

      dragInitialRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        entities: JSON.parse(JSON.stringify(entitiesToMove)),
        initialBounds: { ...selectionBounds },
      };
    },
    [selectionBounds]
  );

  // 2. Resize Handle Pointer Down
  const handleResizePointerDown = useCallback(
    (e: React.PointerEvent, handle: ResizeHandle) => {
      if (e.button !== 0 || !selectionBounds) return;
      e.stopPropagation();
      e.preventDefault();

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      activeResizeHandleRef.current = handle;

      const currentEntities = selectionStore.getSelectedEntities();
      dragInitialRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        entities: JSON.parse(JSON.stringify(currentEntities)),
        initialBounds: { ...selectionBounds },
      };
    },
    [selectionBounds]
  );

  // 3. Rotation Handle Pointer Down
  const handleRotationPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0 || !selectionBounds) return;
      e.stopPropagation();
      e.preventDefault();

      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      isRotatingRef.current = true;

      const currentEntities = selectionStore.getSelectedEntities();
      dragInitialRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        entities: JSON.parse(JSON.stringify(currentEntities)),
        initialBounds: { ...selectionBounds },
      };
    },
    [selectionBounds]
  );

  // Pointer Move for Transforms
  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragInitialRef.current) return;
      const initial = dragInitialRef.current;

      // 1. Handle Body Translation
      if (isDraggingBodyRef.current) {
        e.stopPropagation();
        e.preventDefault();

        const dx = (e.clientX - initial.startX) / camera.scale;
        const dy = (e.clientY - initial.startY) / camera.scale;

        for (const orig of initial.entities) {
          if (orig.isLocked) continue;

          if (orig.type === 'stroke') {
            const stroke = orig as InkStrokeEntity;
            const updatedPoints = stroke.points.map((p) => ({
              ...p,
              x: p.x + dx,
              y: p.y + dy,
            }));
            sceneStore.updateEntity(orig.id, { points: updatedPoints }, false);
          } else if (orig.type === 'reaction') {
            const rx = orig as ReactionEntity;
            sceneStore.updateEntity(orig.id, { x: rx.x + dx, y: rx.y + dy }, false);
          } else {
            const box = orig as NoteEntity | NoteGridEntity | TextEntity | ShapeEntity | ImageEntity;
            sceneStore.updateEntity(orig.id, { x: box.x + dx, y: box.y + dy }, false);
          }
        }
      }

      // 2. Handle 8 Resize Handles Scaling
      else if (activeResizeHandleRef.current) {
        e.stopPropagation();
        e.preventDefault();

        const handle = activeResizeHandleRef.current;
        const b = initial.initialBounds;
        const origW = Math.max(1, b.maxX - b.minX);
        const origH = Math.max(1, b.maxY - b.minY);

        const dx = (e.clientX - initial.startX) / camera.scale;
        const dy = (e.clientY - initial.startY) / camera.scale;

        let scaleX = 1;
        let scaleY = 1;
        let anchorX = b.minX;
        let anchorY = b.minY;

        switch (handle) {
          case 'se':
            anchorX = b.minX;
            anchorY = b.minY;
            scaleX = Math.max(0.1, (origW + dx) / origW);
            scaleY = Math.max(0.1, (origH + dy) / origH);
            break;
          case 'e':
            anchorX = b.minX;
            anchorY = b.minY + origH / 2;
            scaleX = Math.max(0.1, (origW + dx) / origW);
            break;
          case 's':
            anchorX = b.minX + origW / 2;
            anchorY = b.minY;
            scaleY = Math.max(0.1, (origH + dy) / origH);
            break;
          case 'ne':
            anchorX = b.minX;
            anchorY = b.maxY;
            scaleX = Math.max(0.1, (origW + dx) / origW);
            scaleY = Math.max(0.1, (origH - dy) / origH);
            break;
          case 'nw':
            anchorX = b.maxX;
            anchorY = b.maxY;
            scaleX = Math.max(0.1, (origW - dx) / origW);
            scaleY = Math.max(0.1, (origH - dy) / origH);
            break;
          case 'w':
            anchorX = b.maxX;
            anchorY = b.minY + origH / 2;
            scaleX = Math.max(0.1, (origW - dx) / origW);
            break;
          case 'sw':
            anchorX = b.maxX;
            anchorY = b.minY;
            scaleX = Math.max(0.1, (origW - dx) / origW);
            scaleY = Math.max(0.1, (origH + dy) / origH);
            break;
          case 'n':
            anchorX = b.minX + origW / 2;
            anchorY = b.maxY;
            scaleY = Math.max(0.1, (origH - dy) / origH);
            break;
        }

        for (const orig of initial.entities) {
          if (orig.isLocked) continue;

          if (orig.type === 'stroke') {
            const stroke = orig as InkStrokeEntity;
            const scaledPoints = stroke.points.map((p) => ({
              ...p,
              x: anchorX + (p.x - anchorX) * scaleX,
              y: anchorY + (p.y - anchorY) * scaleY,
            }));
            sceneStore.updateEntity(orig.id, { points: scaledPoints }, false);
          } else if (orig.type === 'reaction') {
            const rx = orig as ReactionEntity;
            const newX = anchorX + (rx.x - anchorX) * scaleX;
            const newY = anchorY + (rx.y - anchorY) * scaleY;
            const newSize = Math.max(16, rx.size * Math.max(scaleX, scaleY));
            sceneStore.updateEntity(orig.id, { x: newX, y: newY, size: newSize }, false);
          } else {
            const box = orig as NoteEntity | NoteGridEntity | TextEntity | ShapeEntity;
            const newX = anchorX + (box.x - anchorX) * scaleX;
            const newY = anchorY + (box.y - anchorY) * scaleY;
            const newW = Math.max(16, box.width * scaleX);
            const newH = Math.max(16, box.height * scaleY);
            sceneStore.updateEntity(
              orig.id,
              { x: newX, y: newY, width: newW, height: newH },
              false
            );
          }
        }
      }

      // 3. Handle Top Rotation Stem
      else if (isRotatingRef.current) {
        e.stopPropagation();
        e.preventDefault();

        const b = initial.initialBounds;
        const centerX = (b.minX + b.maxX) / 2;
        const centerY = (b.minY + b.maxY) / 2;

        const centerScreenX = camera.positionX + centerX * camera.scale;
        const centerScreenY = camera.positionY + centerY * camera.scale;

        const currentRad = Math.atan2(e.clientY - centerScreenY, e.clientX - centerScreenX);
        const startRad = Math.atan2(
          initial.startY - centerScreenY,
          initial.startX - centerScreenX
        );
        const deltaRad = currentRad - startRad;

        const cos = Math.cos(deltaRad);
        const sin = Math.sin(deltaRad);

        for (const orig of initial.entities) {
          if (orig.isLocked) continue;

          if (orig.type === 'stroke') {
            const stroke = orig as InkStrokeEntity;
            const rotatedPoints = stroke.points.map((p) => {
              const relX = p.x - centerX;
              const relY = p.y - centerY;
              return {
                ...p,
                x: centerX + (relX * cos - relY * sin),
                y: centerY + (relX * sin + relY * cos),
              };
            });
            sceneStore.updateEntity(orig.id, { points: rotatedPoints }, false);
          } else if (orig.type === 'reaction') {
            const rx = orig as ReactionEntity;
            const relX = rx.x + rx.size / 2 - centerX;
            const relY = rx.y + rx.size / 2 - centerY;
            const newCenterX = centerX + (relX * cos - relY * sin);
            const newCenterY = centerY + (relX * sin + relY * cos);

            sceneStore.updateEntity(
              orig.id,
              {
                x: newCenterX - rx.size / 2,
                y: newCenterY - rx.size / 2,
              },
              false
            );
          } else {
            const box = orig as NoteEntity | NoteGridEntity | TextEntity | ShapeEntity;
            const relX = box.x + box.width / 2 - centerX;
            const relY = box.y + box.height / 2 - centerY;
            const newCenterX = centerX + (relX * cos - relY * sin);
            const newCenterY = centerY + (relX * sin + relY * cos);

            sceneStore.updateEntity(
              orig.id,
              {
                x: newCenterX - box.width / 2,
                y: newCenterY - box.height / 2,
              },
              false
            );
          }
        }
      }
    },
    [camera]
  );

  // Pointer Up: Commit transform to historyManager
  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (
        isDraggingBodyRef.current ||
        activeResizeHandleRef.current ||
        isRotatingRef.current
      ) {
        e.stopPropagation();
        isDraggingBodyRef.current = false;
        activeResizeHandleRef.current = null;
        isRotatingRef.current = false;

        const initial = dragInitialRef.current;
        if (initial) {
          const beforeSnapshot = initial.entities;
          const afterSnapshot = initial.entities
            .map((item) => sceneStore.getEntity(item.id))
            .filter((item): item is CanvasEntity => Boolean(item));

          // Push atomic Undo/Redo command to historyManager
          historyManager.execute({
            name: 'Transform Objects',
            execute: () => {
              for (const item of afterSnapshot) {
                sceneStore.updateEntity(item.id, item, false);
              }
            },
            undo: () => {
              for (const item of beforeSnapshot) {
                sceneStore.updateEntity(item.id, item, false);
              }
            },
          });
        }

        dragInitialRef.current = null;
        try {
          (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
        } catch {
          // Safe ignore
        }
      }
    },
    []
  );

  // Floating Context Menu Actions
  const handleDelete = useCallback(() => {
    selectionStore.deleteSelected();
  }, []);

  const handleDuplicate = useCallback(() => {
    selectionStore.duplicateSelected();
  }, []);

  const handleBringToFront = useCallback(() => {
    const all = sceneStore.getAllEntities();
    const maxZ = all.reduce((max, e) => Math.max(max, e.zIndex), 100);
    const selected = selectionStore.getSelectedEntities();

    historyManager.inUndoGroup('Bring to Front', () => {
      selected.forEach((e, idx) => {
        sceneStore.updateEntity(e.id, { zIndex: maxZ + 1 + idx }, true);
      });
    });
  }, []);

  const handleSendToBack = useCallback(() => {
    const all = sceneStore.getAllEntities();
    const minZ = all.reduce((min, e) => Math.min(min, e.zIndex), 100);
    const selected = selectionStore.getSelectedEntities();

    historyManager.inUndoGroup('Send to Back', () => {
      selected.forEach((e, idx) => {
        sceneStore.updateEntity(e.id, { zIndex: Math.max(1, minZ - selected.length + idx) }, true);
      });
    });
  }, []);

  const handleToggleLock = useCallback(() => {
    const selected = selectionStore.getSelectedEntities();
    const isAnyUnlocked = selected.some(
      (e) => !e.isLocked && !(e.type === 'image' && (e as any).isLockedToBackground)
    );
    const targetLock = isAnyUnlocked;

    historyManager.inUndoGroup(targetLock ? 'Lock to Background' : 'Unlock Objects', () => {
      for (const e of selected) {
        if (e.type === 'image') {
          sceneStore.updateEntity(
            e.id,
            {
              isLocked: targetLock,
              isLockedToBackground: targetLock,
              zIndex: targetLock ? 50 : 100,
            },
            true
          );
        } else if (e.type === 'pdf_document') {
          sceneStore.updateEntity(
            e.id,
            {
              isLocked: targetLock,
              zIndex: targetLock ? 50 : 100,
            },
            true
          );
        } else {
          sceneStore.updateEntity(e.id, { isLocked: targetLock }, true);
        }
      }
    });

    if (targetLock) {
      selectionStore.clearSelection();
    }
  }, []);

  const handleApplyColor = useCallback((color: string) => {
    const selected = selectionStore.getSelectedEntities();
    historyManager.inUndoGroup('Change Color', () => {
      for (const e of selected) {
        if (e.type === 'stroke') {
          sceneStore.updateEntity(e.id, { color }, true);
        } else if (e.type === 'note') {
          sceneStore.updateEntity(e.id, { color }, true);
        } else if (e.type === 'noteGrid') {
          const grid = e as NoteGridEntity;
          const updatedNotes = grid.notes.map((n) => ({ ...n, color }));
          sceneStore.updateEntity(e.id, { notes: updatedNotes }, true);
        } else if (e.type === 'text') {
          sceneStore.updateEntity(e.id, { color }, true);
        } else if (e.type === 'shape') {
          sceneStore.updateEntity(e.id, { strokeColor: color }, true);
        }
      }
    });
    setShowColorPicker(false);
  }, []);

  // Compute bounding box dimensions
  const b = selectionBounds;
  const padding = 6;
  const boxX = b ? b.minX - padding : 0;
  const boxY = b ? b.minY - padding : 0;
  const boxW = b ? Math.max(8, b.maxX - b.minX + padding * 2) : 0;
  const boxH = b ? Math.max(8, b.maxY - b.minY + padding * 2) : 0;

  const isAnyLocked = selectionStore.getSelectedEntities().some((e) => e.isLocked);

  return (
    <>
      {/* 1. Live Freeform Polygonal Lasso SVG Preview */}
      {liveLasso && liveLasso.points.length > 1 && (
        <svg
          id="wb-live-lasso-svg"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            overflow: 'visible',
            pointerEvents: 'none',
            zIndex: 650,
          }}
        >
          <path
            d={liveLasso.pathD}
            fill="rgba(0, 120, 215, 0.2)"
            stroke="rgb(0, 120, 215)"
            strokeWidth={1.5}
            strokeDasharray="4 3"
          />
        </svg>
      )}

      {/* 2. Fluent Selection Bounding Box & Handles */}
      {b && selectedCount > 0 && (
        <div
          id="wb-selection-container"
          style={{
            position: 'absolute',
            left: 0,
            top: 0,
            width: 0,
            height: 0,
            overflow: 'visible',
            zIndex: 700,
            pointerEvents: 'auto',
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Selection Box Body (drag to translate) */}
          <div
            id="wb-selection-box"
            onPointerDown={handleBodyPointerDown}
            style={{
              position: 'absolute',
              left: `${boxX}px`,
              top: `${boxY}px`,
              width: `${boxW}px`,
              height: `${boxH}px`,
              border: '1.5px solid #0078D4',
              backgroundColor: isAnyLocked
                ? 'rgba(128, 128, 128, 0.08)'
                : 'rgba(0, 120, 212, 0.05)',
              cursor: isAnyLocked ? 'default' : 'move',
              boxSizing: 'border-box',
              touchAction: 'none',
            }}
          />

          {/* Top Rotation Stem & Handle (hidden when locked) */}
          {!isAnyLocked && (
            <div
              id="wb-rotation-stem-group"
              style={{
                position: 'absolute',
                left: `${boxX + boxW / 2}px`,
                top: `${boxY}px`,
                overflow: 'visible',
                pointerEvents: 'auto',
              }}
            >
              {/* Vertical connecting line */}
              <div
                style={{
                  position: 'absolute',
                  left: '-0.5px',
                  top: '-24px',
                  width: '1px',
                  height: '24px',
                  backgroundColor: '#0078D4',
                }}
              />
              {/* Rotation knob */}
              <div
                id="wb-rotation-handle"
                onPointerDown={handleRotationPointerDown}
                title="Rotate selection"
                style={{
                  position: 'absolute',
                  left: '-6px',
                  top: '-30px',
                  width: '12px',
                  height: '12px',
                  borderRadius: '50%',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.25)',
                  cursor: 'grab',
                }}
              />
            </div>
          )}

          {/* 8 Resize Handles (hidden when locked) */}
          {!isAnyLocked && (
            <>
              {/* NW */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'nw')}
                style={{
                  position: 'absolute',
                  left: `${boxX - 5}px`,
                  top: `${boxY - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'nwse-resize',
                }}
              />
              {/* N */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'n')}
                style={{
                  position: 'absolute',
                  left: `${boxX + boxW / 2 - 5}px`,
                  top: `${boxY - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'ns-resize',
                }}
              />
              {/* NE */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'ne')}
                style={{
                  position: 'absolute',
                  left: `${boxX + boxW - 5}px`,
                  top: `${boxY - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'nesw-resize',
                }}
              />
              {/* E */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'e')}
                style={{
                  position: 'absolute',
                  left: `${boxX + boxW - 5}px`,
                  top: `${boxY + boxH / 2 - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'ew-resize',
                }}
              />
              {/* SE */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'se')}
                style={{
                  position: 'absolute',
                  left: `${boxX + boxW - 5}px`,
                  top: `${boxY + boxH - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'nwse-resize',
                }}
              />
              {/* S */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 's')}
                style={{
                  position: 'absolute',
                  left: `${boxX + boxW / 2 - 5}px`,
                  top: `${boxY + boxH - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'ns-resize',
                }}
              />
              {/* SW */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'sw')}
                style={{
                  position: 'absolute',
                  left: `${boxX - 5}px`,
                  top: `${boxY + boxH - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'nesw-resize',
                }}
              />
              {/* W */}
              <div
                onPointerDown={(e) => handleResizePointerDown(e, 'w')}
                style={{
                  position: 'absolute',
                  left: `${boxX - 5}px`,
                  top: `${boxY + boxH / 2 - 5}px`,
                  width: '10px',
                  height: '10px',
                  backgroundColor: '#FFFFFF',
                  border: '1.5px solid #0078D4',
                  borderRadius: '2px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                  cursor: 'ew-resize',
                }}
              />
            </>
          )}

          {/* 3. Floating Context Menu Pill */}
          <div
            id="wb-selection-context-menu"
            className="wb-selection-action-bar"
            onPointerDown={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              left: `${boxX + boxW / 2}px`,
              top: `${boxY - 48}px`,
              transform: 'translateX(-50%)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 6px',
              borderRadius: '8px',
              backgroundColor: isDark
                ? 'rgba(38, 38, 38, 0.95)'
                : 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(20px)',
              border: isDark
                ? '1px solid rgba(255, 255, 255, 0.16)'
                : '1px solid rgba(0, 0, 0, 0.12)',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.22)',
              zIndex: 800,
              userSelect: 'none',
              pointerEvents: 'auto',
            }}
          >
            {/* 1. Color Picker Button */}
            <div style={{ position: 'relative' }}>
              <button
                id="wb-context-color"
                className="wb-selection-action-btn"
                onPointerDown={(e) => e.stopPropagation()}
                onClick={() => setShowColorPicker(!showColorPicker)}
                title="Change Color"
                style={{
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: showColorPicker
                    ? 'rgba(0, 120, 212, 0.15)'
                    : 'transparent',
                  color: isDark ? '#FFFFFF' : '#1F1F1F',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                {/* Palette Color Wheel Icon */}
                <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <circle cx="8" cy="8" r="2" fill="#E71224" />
                  <circle cx="12" cy="8" r="2" fill="#0078D4" />
                  <circle cx="10" cy="13" r="2" fill="#00B44B" />
                </svg>
              </button>

              {/* Color Swatch Dropdown Popover */}
              {showColorPicker && (
                <div
                  id="wb-context-palette"
                  onPointerDown={(e) => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: '40px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '180px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(5, 1fr)',
                    gap: '6px',
                    padding: '8px',
                    borderRadius: '8px',
                    backgroundColor: isDark
                      ? 'rgba(32, 32, 32, 0.98)'
                      : 'rgba(255, 255, 255, 0.98)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
                    border: isDark
                      ? '1px solid rgba(255, 255, 255, 0.16)'
                      : '1px solid rgba(0, 0, 0, 0.12)',
                    zIndex: 900,
                  }}
                >
                  {FLUENT_PALETTE.map((color) => (
                    <button
                      key={color}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => handleApplyColor(color)}
                      style={{
                        width: '26px',
                        height: '26px',
                        borderRadius: '50%',
                        backgroundColor: color,
                        border:
                          color === '#FFFFFF'
                            ? '1px solid #CCC'
                            : '1.5px solid rgba(0,0,0,0.1)',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'transform 0.1s ease',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                      onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div
              style={{
                width: '1px',
                height: '18px',
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.1)',
              }}
            />

            {/* 2. Bring to Front */}
            <button
              id="wb-context-front"
              className="wb-selection-action-btn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleBringToFront}
              title="Bring to Front"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#FFFFFF' : '#1F1F1F',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="3" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <rect x="8" y="8" width="9" height="9" rx="1.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>

            {/* 3. Send to Back */}
            <button
              id="wb-context-back"
              className="wb-selection-action-btn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleSendToBack}
              title="Send to Back"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#FFFFFF' : '#1F1F1F',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="8" y="8" width="9" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                <rect x="3" y="3" width="9" height="9" rx="1.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>

            {/* Divider */}
            <div
              style={{
                width: '1px',
                height: '18px',
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.1)',
              }}
            />

            {/* 4. Duplicate (Ctrl+D) */}
            <button
              id="wb-context-duplicate"
              className="wb-selection-action-btn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleDuplicate}
              title="Duplicate (Ctrl+D)"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: isDark ? '#FFFFFF' : '#1F1F1F',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="3" y="6" width="10" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M7 3H15.5C16.3284 3 17 3.67157 17 4.5V13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>

            {/* 5. Lock / Unlock */}
            <button
              id="wb-context-lock"
              className="wb-selection-action-btn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleToggleLock}
              title={isAnyLocked ? 'Unlock Objects' : 'Lock to Background'}
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isAnyLocked
                  ? 'rgba(0, 120, 212, 0.15)'
                  : 'transparent',
                color: isAnyLocked ? '#0078D4' : isDark ? '#FFFFFF' : '#1F1F1F',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <rect x="4" y="9" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                <path
                  d={isAnyLocked ? "M7 9V6a3 3 0 016 0v3" : "M7 9V6a3 3 0 016 0"}
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            {/* Divider */}
            <div
              style={{
                width: '1px',
                height: '18px',
                backgroundColor: isDark
                  ? 'rgba(255, 255, 255, 0.15)'
                  : 'rgba(0, 0, 0, 0.1)',
              }}
            />

            {/* 6. Delete */}
            <button
              id="wb-context-delete"
              className="wb-selection-action-btn"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleDelete}
              title="Delete (Del)"
              style={{
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: 'transparent',
                color: '#E71224',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <DeleteIcon size={18} />
            </button>
          </div>
        </div>
      )}
    </>
  );
};
