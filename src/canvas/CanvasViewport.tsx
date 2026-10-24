import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useCanvasStore, canvasStore } from '../store/canvasStore';
import { useVisibleEntities, sceneStore } from '../store/sceneStore';
import { selectionStore } from '../store/selectionStore';
import { inkingStore, useInkingStore } from '../store/inkingStore';
import { useTheme } from '../theme/ThemeProvider';
import { penTool } from '../tools/PenTool';
import type { LiveStrokeState } from '../tools/PenTool';
import { highlighterTool } from '../tools/HighlighterTool';
import type { LiveHighlighterState } from '../tools/HighlighterTool';
import { laserTool } from '../tools/LaserTool';
import type { LaserStrokeState } from '../tools/LaserTool';
import { eraserTool } from '../tools/EraserTool';
import type { EraserCursorState } from '../tools/EraserTool';
import { lassoTool } from '../tools/LassoTool';
import { selectTool } from '../tools/SelectTool';
import type { LiveMarqueeState } from '../tools/SelectTool';
import { RulerWidget } from '../components/canvas/RulerWidget';
import { SelectionOverlay } from '../components/canvas/SelectionOverlay';
import { toTransformStyle, screenToWorld } from './camera';
import type { Point } from './camera';
import type { CanvasEntity, PDFDocumentEntity } from './sceneGraph';
import { GridBackground } from './GridBackground';
import { CanvasEntities } from './CanvasEntities';
import { PdfPagePickerModal } from '../components/pdf/PdfPagePickerModal';
import { historyManager } from './history';
import * as pdfjsLib from 'pdfjs-dist';
import { dataUrlToUint8Array } from '../components/canvas/PDFDocumentWidget';
import { toastStore } from '../store/toastStore';

interface CanvasViewportProps {
  children?: React.ReactNode;
}

export const CanvasViewport: React.FC<CanvasViewportProps> = ({ children }) => {
  const { camera, isPanning, isSpacePressed } = useCanvasStore();
  const inking = useInkingStore();
  const { isDark } = useTheme();
  const viewportRef = useRef<HTMLDivElement>(null);

  const [liveStroke, setLiveStroke] = useState<LiveStrokeState | null>(null);
  const [liveHighlighter, setLiveHighlighter] = useState<LiveHighlighterState | null>(null);
  const [laserStroke, setLaserStroke] = useState<LaserStrokeState | null>(null);
  const [eraserCursor, setEraserCursor] = useState<EraserCursorState | null>(null);
  const [liveMarquee, setLiveMarquee] = useState<LiveMarqueeState | null>(null);
  const [pdfPickerFile, setPdfPickerFile] = useState<File | null>(null);

  useEffect(() => {
    const unsubPen = penTool.subscribeLiveStroke(setLiveStroke);
    const unsubHighlighter = highlighterTool.subscribeLiveStroke(setLiveHighlighter);
    const unsubLaser = laserTool.subscribe(setLaserStroke);
    const unsubEraser = eraserTool.subscribeCursor(setEraserCursor);
    const unsubSelect = selectTool.subscribe(setLiveMarquee);

    return () => {
      unsubPen();
      unsubHighlighter();
      unsubLaser();
      unsubEraser();
      unsubSelect();
    };
  }, []);

  const [viewportSize, setViewportSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1920,
    height: typeof window !== 'undefined' ? window.innerHeight : 1080,
  });

  useEffect(() => {
    function handleResize() {
      if (viewportRef.current) {
        const rect = viewportRef.current.getBoundingClientRect();
        setViewportSize({ width: rect.width, height: rect.height });
      }
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const visibleEntities = useVisibleEntities(camera, viewportSize);

  // References for active panning and gestures
  const isDraggingRef = useRef(false);
  const lastPointerRef = useRef<Point>({ x: 0, y: 0 });
  const touchStateRef = useRef<{
    initialDistance: number;
    initialScale: number;
    lastMidpoint: Point;
  } | null>(null);

  // 1. Wheel & Pinch-to-Zoom Listener (passive: false to prevent browser zoom)
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    function handleWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el?.getBoundingClientRect();

      if (e.ctrlKey) {
        // Pinch-to-zoom on trackpad or Ctrl+MouseWheel
        const zoomDelta = -e.deltaY;
        const zoomFactor = Math.pow(1.002, zoomDelta);
        const targetScale = camera.scale * zoomFactor;

        canvasStore.zoomAtPoint(targetScale, { x: e.clientX, y: e.clientY }, rect);
      } else {
        // Two-finger scroll on trackpad or regular MouseWheel to Pan
        const dx = -e.deltaX;
        const dy = -e.deltaY;
        canvasStore.panBy(dx, dy);
      }
    }

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [camera.scale]);

  // 2. Spacebar Key Listener for Pan Navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        canvasStore.setIsSpacePressed(true);
      }
    }

    function handleKeyUp(e: KeyboardEvent) {
      if (e.code === 'Space') {
        canvasStore.setIsSpacePressed(false);
        if (isDraggingRef.current) {
          isDraggingRef.current = false;
          canvasStore.setIsPanning(false);
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Reusable PDF document canvas widget creator (Milestone 11.1)
  const insertPdfDocument = useCallback((file: File, worldPoint?: Point) => {
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) return;

      try {
        const bytes = dataUrlToUint8Array(dataUrl);
        const loadingTask = pdfjsLib.getDocument({
          data: bytes,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/cmaps/',
          cMapPacked: true,
        });
        const pdfDoc = await loadingTask.promise;
        const targetWidth = 600;
        const pageGap = 16;
        const headerHeight = 46;
        let totalPagesHeight = 0;
        for (let p = 1; p <= pdfDoc.numPages; p++) {
          const page = await pdfDoc.getPage(p);
          const vp = page.getViewport({ scale: 1.0 });
          totalPagesHeight += Math.round((vp.height / vp.width) * targetWidth);
          if (p < pdfDoc.numPages) {
            totalPagesHeight += pageGap;
          }
        }
        const targetHeight = totalPagesHeight + headerHeight;

        const rect = viewportRef.current?.getBoundingClientRect();
        const screenCenter = {
          x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
          y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
        };
        const insertPt = worldPoint || screenToWorld(screenCenter, camera, rect);

        const timestamp = Date.now();
        const posX = Math.round(insertPt.x - targetWidth / 2);
        const posY = Math.round(insertPt.y - Math.min(100, targetHeight / 2));

        const docEntity: PDFDocumentEntity = {
          id: `pdf_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
          type: 'pdf_document',
          x: posX,
          y: posY,
          width: targetWidth,
          height: targetHeight,
          title: file.name || 'PDF Document',
          pdfData: dataUrl,
          currentPage: 1,
          totalPages: pdfDoc.numPages,
          isLocked: false,
          zIndex: 100,
          bounds: {
            minX: posX,
            minY: posY,
            maxX: posX + targetWidth,
            maxY: posY + targetHeight,
          },
          createdAt: timestamp,
          updatedAt: timestamp,
        };

        historyManager.inUndoGroup(`Insert PDF Document: ${file.name}`, () => {
          sceneStore.addEntity(docEntity, true);
        });
        selectionStore.select(docEntity.id);
        toastStore.show({
          message: `Inserted "${file.name}" (${pdfDoc.numPages} ${pdfDoc.numPages === 1 ? 'page' : 'pages'})`,
          durationMs: 3000,
        });
      } catch (pdfErr) {
        console.error('[CanvasViewport] Failed to parse PDF:', pdfErr);
        toastStore.show({
          message: 'Failed to parse PDF document.',
          durationMs: 4000,
        });
      }
    };
    reader.readAsDataURL(file);
  }, [camera]);

  // 3. Object Insertion Listener from Create Flyout (Module 93425)
  useEffect(() => {
    function handleInsertObject(e: Event) {
      const customEvent = e as CustomEvent<{ type: string; payload?: any }>;
      const { type, payload } = customEvent.detail;
      const rect = viewportRef.current?.getBoundingClientRect();

      const screenCenter = {
        x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
        y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
      };

      const worldCenter = screenToWorld(screenCenter, camera, rect);
      const timestamp = Date.now();
      let entity: CanvasEntity | null = null;

      switch (type) {
        case 'note': {
          entity = {
            id: `note_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'note',
            x: Math.round(worldCenter.x - 100),
            y: Math.round(worldCenter.y - 100),
            width: 200,
            height: 200,
            text: '',
            color: payload?.color || '#FFF1A8',
            reactions: [],
            zIndex: 200,
            bounds: {
              minX: worldCenter.x - 100,
              minY: worldCenter.y - 100,
              maxX: worldCenter.x + 100,
              maxY: worldCenter.y + 100,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          break;
        }

        case 'noteGrid': {
          const defaultNotes = [
            { id: `g1_${timestamp}`, text: '', color: '#FFF1A8', reactions: [] },
            { id: `g2_${timestamp}`, text: '', color: '#D4F5B0', reactions: [] },
            { id: `g3_${timestamp}`, text: '', color: '#C8EBFA', reactions: [] },
          ];
          entity = {
            id: `notegrid_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'noteGrid',
            x: Math.round(worldCenter.x - 270),
            y: Math.round(worldCenter.y - 140),
            width: 540,
            height: 280,
            title: 'Note Grid',
            notes: defaultNotes,
            zIndex: 200,
            bounds: {
              minX: worldCenter.x - 270,
              minY: worldCenter.y - 140,
              maxX: worldCenter.x + 270,
              maxY: worldCenter.y + 140,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          break;
        }

        case 'text': {
          const fontSize = payload?.fontSize || 18;
          entity = {
            id: `text_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'text',
            x: Math.round(worldCenter.x - 120),
            y: Math.round(worldCenter.y - 30),
            width: 240,
            height: fontSize >= 24 ? 60 : 40,
            text: payload?.text || (fontSize >= 24 ? 'Heading' : 'Click to type...'),
            fontSize,
            color: '#1F1F1F',
            zIndex: 200,
            bounds: {
              minX: worldCenter.x - 120,
              minY: worldCenter.y - 30,
              maxX: worldCenter.x + 120,
              maxY: worldCenter.y + 30,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          break;
        }

        case 'shape': {
          const shapeType = payload?.shapeType || 'rectangle';
          const isLineOrArrow = shapeType === 'arrow' || shapeType === 'line';
          const w = isLineOrArrow ? 200 : 160;
          const h = isLineOrArrow ? 40 : 140;
          entity = {
            id: `shape_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'shape',
            x: Math.round(worldCenter.x - w / 2),
            y: Math.round(worldCenter.y - h / 2),
            width: w,
            height: h,
            shapeType,
            strokeColor: '#0078D4',
            fillColor: 'transparent',
            strokeWidth: 2,
            zIndex: 200,
            bounds: {
              minX: worldCenter.x - w / 2,
              minY: worldCenter.y - h / 2,
              maxX: worldCenter.x + w / 2,
              maxY: worldCenter.y + h / 2,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          break;
        }

        case 'reaction': {
          const size = 48;
          entity = {
            id: `reaction_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'reaction',
            x: Math.round(worldCenter.x - size / 2),
            y: Math.round(worldCenter.y - size / 2),
            size,
            reactionType: payload?.reactionType || 'like',
            zIndex: 250,
            bounds: {
              minX: worldCenter.x - size / 2,
              minY: worldCenter.y - size / 2,
              maxX: worldCenter.x + size / 2,
              maxY: worldCenter.y + size / 2,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          break;
        }

        case 'image': {
          const imgW = payload?.width || 360;
          const imgH = payload?.height || 270;
          const posX = Math.round(payload?.x !== undefined ? payload.x : worldCenter.x - imgW / 2);
          const posY = Math.round(payload?.y !== undefined ? payload.y : worldCenter.y - imgH / 2);
          const isLocked = Boolean(payload?.isLockedToBackground);

          entity = {
            id: `image_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
            type: 'image',
            x: posX,
            y: posY,
            width: imgW,
            height: imgH,
            src: payload?.url || '',
            isLockedToBackground: isLocked,
            isLocked: isLocked,
            fileName: payload?.name,
            zIndex: isLocked ? 50 : 100,
            bounds: {
              minX: posX,
              minY: posY,
              maxX: posX + imgW,
              maxY: posY + imgH,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };
          break;
        }
      }

      if (entity) {
        sceneStore.addEntity(entity, true);
        if (!entity.isLocked && !(entity.type === 'image' && (entity as any).isLockedToBackground)) {
          selectionStore.select(entity.id);
        }
      }
    }

    // Listen to PDF Picker trigger event: inserts interactive PDF document widget (Milestone 11.1)
    function handleOpenPdf(e: Event) {
      const customEvent = e as CustomEvent<{ file: File; useModal?: boolean }>;
      if (customEvent.detail?.file) {
        if (customEvent.detail.useModal) {
          setPdfPickerFile(customEvent.detail.file);
        } else {
          insertPdfDocument(customEvent.detail.file);
        }
      }
    }

    // Clipboard Paste Listener (Ctrl+V / Paste)
    function handlePaste(e: ClipboardEvent) {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            const rect = viewportRef.current?.getBoundingClientRect();
            const screenCenter = {
              x: rect ? rect.left + rect.width / 2 : window.innerWidth / 2,
              y: rect ? rect.top + rect.height / 2 : window.innerHeight / 2,
            };
            const worldPt = screenToWorld(screenCenter, camera, rect);

            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              const img = new Image();
              img.onload = () => {
                let w = img.naturalWidth || 360;
                let h = img.naturalHeight || 270;
                const maxDim = 480;
                if (w > maxDim || h > maxDim) {
                  if (w > h) {
                    h = Math.round((h * maxDim) / w);
                    w = maxDim;
                  } else {
                    w = Math.round((w * maxDim) / h);
                    h = maxDim;
                  }
                }

                const timestamp = Date.now();
                const imageEntity: CanvasEntity = {
                  id: `image_paste_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
                  type: 'image',
                  x: Math.round(worldPt.x - w / 2),
                  y: Math.round(worldPt.y - h / 2),
                  width: w,
                  height: h,
                  src: dataUrl,
                  isLockedToBackground: false,
                  isLocked: false,
                  fileName: file.name || 'Pasted Image',
                  zIndex: 100,
                  bounds: {
                    minX: Math.round(worldPt.x - w / 2),
                    minY: Math.round(worldPt.y - h / 2),
                    maxX: Math.round(worldPt.x + w / 2),
                    maxY: Math.round(worldPt.y + h / 2),
                  },
                  createdAt: timestamp,
                  updatedAt: timestamp,
                };

                historyManager.inUndoGroup('Paste Image', () => {
                  sceneStore.addEntity(imageEntity, true);
                });
                selectionStore.select(imageEntity.id);
              };
              img.src = dataUrl;
            };
            reader.readAsDataURL(file);
            break;
          }
        }
      }
    }

    window.addEventListener('wb-insert-object', handleInsertObject);
    window.addEventListener('wb-open-pdf-picker', handleOpenPdf);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('wb-insert-object', handleInsertObject);
      window.removeEventListener('wb-open-pdf-picker', handleOpenPdf);
      window.removeEventListener('paste', handlePaste);
    };
  }, [camera, insertPdfDocument]);

  // 4. Pointer Handlers (Panning & Inking Tools: Select, Hand, Pen, Highlighter, Laser, Eraser)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const activeTool = inkingStore.getState().selectedTool;
    const isMiddleButton = e.button === 1;
    const isSpacePan = isSpacePressed && e.button === 0;
    const isHandPan = activeTool === 'Hand' && e.button === 0;

    if (isMiddleButton || isSpacePan || isHandPan) {
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      canvasStore.setIsPanning(true);
      return;
    }

    if (e.button === 0) {
      const target = e.target as HTMLElement;
      const rect = viewportRef.current?.getBoundingClientRect();

      // In Select mode: hit-test or initiate rectangular marquee drag
      if (activeTool === 'Select') {
        const isInteractive = Boolean(
          target.closest &&
            target.closest(
              '#wb-selection-container, #wb-selection-context-menu, [id^="wb-context-"], .wb-selection-action-btn, [id^="wb-note-"], [id^="wb-notegrid-"], [id^="wb-text-"], [id^="wb-shape-"], [id^="wb-reaction-"], [id^="wb-image-"], [id^="pdf-"], [id^="wb-pdf-"], .wb-pdf-header, .textLayer, [id^="wb-grid-"], #whiteboard-ink-toolbar, #create-panel-menu, #wb-create-flyout'
            )
        );
        if (!isInteractive) {
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          selectTool.onPointerDown(e, camera, rect);
        }
        return;
      }

      if (activeTool.startsWith('Pen')) {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        penTool.onPointerDown(e, camera, rect);
      } else if (activeTool === 'Highlighter') {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        highlighterTool.onPointerDown(e, camera, rect);
      } else if (activeTool === 'Laser') {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        laserTool.onPointerDown(e, camera, rect);
      } else if (activeTool === 'Eraser') {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        eraserTool.onPointerDown(e, camera, rect);
      } else if (activeTool === 'FreeformLasso') {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        lassoTool.onPointerDown(e, camera, rect);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      e.preventDefault();
      const dx = e.clientX - lastPointerRef.current.x;
      const dy = e.clientY - lastPointerRef.current.y;
      lastPointerRef.current = { x: e.clientX, y: e.clientY };
      canvasStore.panBy(dx, dy);
      return;
    }

    const rect = viewportRef.current?.getBoundingClientRect();
    const activeTool = inkingStore.getState().selectedTool;

    if (activeTool === 'Select') {
      selectTool.onPointerMove(e, camera, rect);
    } else if (penTool.isCurrentlyDrawing()) {
      e.preventDefault();
      penTool.onPointerMove(e, camera, rect);
    } else if (highlighterTool.isCurrentlyDrawing()) {
      e.preventDefault();
      highlighterTool.onPointerMove(e, camera, rect);
    } else if (laserTool.isCurrentlyDrawing()) {
      e.preventDefault();
      laserTool.onPointerMove(e, camera, rect);
    } else if (lassoTool.isCurrentlyLassoing()) {
      e.preventDefault();
      lassoTool.onPointerMove(e, camera, rect);
    }

    if (activeTool === 'Eraser' || eraserTool.isCurrentlyErasing()) {
      eraserTool.onPointerMove(e, camera, rect);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      canvasStore.setIsPanning(false);
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        // Ignore if already released
      }
      return;
    }

    const activeTool = inkingStore.getState().selectedTool;
    const rect = viewportRef.current?.getBoundingClientRect();

    if (activeTool === 'Select') {
      selectTool.onPointerUp(e, camera, rect);
    }
    if (penTool.isCurrentlyDrawing()) {
      penTool.onPointerUp(e);
    }
    if (highlighterTool.isCurrentlyDrawing()) {
      highlighterTool.onPointerUp(e);
    }
    if (laserTool.isCurrentlyDrawing()) {
      laserTool.onPointerUp(e);
    }
    if (eraserTool.isCurrentlyErasing()) {
      eraserTool.onPointerUp(e);
    }
    if (lassoTool.isCurrentlyLassoing()) {
      lassoTool.onPointerUp(e, camera, rect);
    }

    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if already released
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      canvasStore.setIsPanning(false);
    }
    const activeTool = inkingStore.getState().selectedTool;
    if (activeTool === 'Select') {
      selectTool.cancel();
    }
    if (penTool.isCurrentlyDrawing()) {
      penTool.cancel();
    }
    if (highlighterTool.isCurrentlyDrawing()) {
      highlighterTool.cancel();
    }
    if (laserTool.isCurrentlyDrawing()) {
      laserTool.cancel();
    }
    if (eraserTool.isCurrentlyErasing()) {
      eraserTool.cancel();
    }
    if (lassoTool.isCurrentlyLassoing()) {
      lassoTool.cancel();
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      // Ignore if already released
    }
  };

  const handlePointerLeave = () => {
    eraserTool.onPointerLeave();
  };

  // 4. Touch Handlers for Two-Finger Pan and Pinch-Zoom
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      touchStateRef.current = {
        initialDistance: distance,
        initialScale: camera.scale,
        lastMidpoint: midpoint,
      };
      canvasStore.setIsPanning(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchStateRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const midpoint = {
        x: (t1.clientX + t2.clientX) / 2,
        y: (t1.clientY + t2.clientY) / 2,
      };

      // 1. Pan delta
      const dx = midpoint.x - touchStateRef.current.lastMidpoint.x;
      const dy = midpoint.y - touchStateRef.current.lastMidpoint.y;
      touchStateRef.current.lastMidpoint = midpoint;
      canvasStore.panBy(dx, dy);

      // 2. Pinch zoom
      const rect = viewportRef.current?.getBoundingClientRect();
      const distanceRatio = distance / touchStateRef.current.initialDistance;
      const targetScale = touchStateRef.current.initialScale * distanceRatio;
      canvasStore.zoomAtPoint(targetScale, midpoint, rect);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length < 2) {
      touchStateRef.current = null;
      canvasStore.setIsPanning(false);
    }
  };

  // Determine dynamic cursor
  const activeTool = inking.selectedTool;
  const isPenActive = activeTool.startsWith('Pen');
  const cursorStyle = isPanning
    ? 'grabbing'
    : isSpacePressed || activeTool === 'Hand'
    ? 'grab'
    : activeTool === 'Select'
    ? 'default'
    : isPenActive || activeTool === 'Highlighter' || activeTool === 'FreeformLasso'
    ? 'crosshair'
    : activeTool === 'Laser' || activeTool === 'Eraser'
    ? 'none'
    : 'default';

  // Drag and drop handlers for local images & PDF documents
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const rect = viewportRef.current?.getBoundingClientRect();
    const dropWorld = screenToWorld({ x: e.clientX, y: e.clientY }, camera, rect);

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        insertPdfDocument(file, dropWorld);
        break;
      } else if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
        const reader = new FileReader();
        const offsetX = i * 24;
        const offsetY = i * 24;
        reader.onload = (event) => {
          const dataUrl = event.target?.result as string;
          const img = new Image();
          img.onload = () => {
            let w = img.naturalWidth || 360;
            let h = img.naturalHeight || 270;
            const maxDim = 480;
            if (w > maxDim || h > maxDim) {
              if (w > h) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              } else {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }

            const timestamp = Date.now();
            const imageEntity: CanvasEntity = {
              id: `image_drop_${timestamp}_${Math.random().toString(36).slice(2, 6)}`,
              type: 'image',
              x: Math.round(dropWorld.x + offsetX - w / 2),
              y: Math.round(dropWorld.y + offsetY - h / 2),
              width: w,
              height: h,
              src: dataUrl,
              isLockedToBackground: false,
              isLocked: false,
              fileName: file.name,
              zIndex: 100,
              bounds: {
                minX: Math.round(dropWorld.x + offsetX - w / 2),
                minY: Math.round(dropWorld.y + offsetY - h / 2),
                maxX: Math.round(dropWorld.x + offsetX + w / 2),
                maxY: Math.round(dropWorld.y + offsetY + h / 2),
              },
              createdAt: timestamp,
              updatedAt: timestamp,
            };

            historyManager.inUndoGroup(`Drop Image: ${file.name}`, () => {
              sceneStore.addEntity(imageEntity, true);
            });
            selectionStore.select(imageEntity.id);
          };
          img.src = dataUrl;
        };
        reader.readAsDataURL(file);
      }
    }
  };

  return (
    <div
      id="canvasViewPort"
      ref={viewportRef}
      role="region"
      aria-label="Interactive Canvas Viewport"
      tabIndex={0}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      onPointerLeave={handlePointerLeave}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        cursor: cursorStyle,
        outline: 'none',
        backgroundColor: 'var(--wb-canvas-background)',
        transition: 'background-color 0.25s ease',
      }}
    >
      {/* Transform Wrapper for Canvas Objects & Inking Layers (Module 415906: transformWrapper) */}
      <div
        id="transformWrapper"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'auto',
          ...toTransformStyle(camera),
        }}
      >
        {/* Open Whiteboard Adaptive Vector Grid Background */}
        <GridBackground />

        <div id="canvasContent" style={{ position: 'relative', width: '100%', height: '100%' }}>
          {/* Spatial Viewport-Culled Canvas Entities */}
          <CanvasEntities entities={visibleEntities} />

          {/* Open Whiteboard Interactive Ruler Overlay */}
          <RulerWidget />

          {/* Fluent Selection Bounding Box & Handles */}
          <SelectionOverlay />

          {/* Fluent Rectangular Marquee Selection Box */}
          {liveMarquee && liveMarquee.isMarqueeActive && (
            <div
              id="wb-marquee-box"
              style={{
                position: 'absolute',
                left: `${liveMarquee.worldBox.minX}px`,
                top: `${liveMarquee.worldBox.minY}px`,
                width: `${liveMarquee.worldBox.maxX - liveMarquee.worldBox.minX}px`,
                height: `${liveMarquee.worldBox.maxY - liveMarquee.worldBox.minY}px`,
                border: '1.5px dashed #0078D4',
                backgroundColor: 'rgba(0, 120, 215, 0.15)',
                pointerEvents: 'none',
                zIndex: 650,
              }}
            />
          )}

          {/* 1. Real-Time Live Highlighter Inking Preview */}
          {liveHighlighter && (
            <svg
              id="liveHighlighterOverlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 250,
              }}
            >
              <path
                d={liveHighlighter.pathD}
                fill="none"
                stroke={liveHighlighter.color}
                strokeWidth={liveHighlighter.width}
                strokeLinecap="square"
                strokeLinejoin="bevel"
                opacity={isDark ? 0.65 : 0.48}
                style={{
                  mixBlendMode: isDark ? 'screen' : 'multiply',
                }}
              />
            </svg>
          )}

          {/* 2. Real-Time Live Pen Stroke Overlay */}
          {liveStroke && (
            <svg
              id="liveStrokeOverlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 400,
              }}
            >
              <defs>
                <linearGradient id="liveRainbowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#E71224" />
                  <stop offset="20%" stopColor="#F36323" />
                  <stop offset="40%" stopColor="#FED430" />
                  <stop offset="60%" stopColor="#02A556" />
                  <stop offset="80%" stopColor="#0069BF" />
                  <stop offset="100%" stopColor="#914BB8" />
                </linearGradient>
                <linearGradient id="liveGalaxyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#3C1053" />
                  <stop offset="35%" stopColor="#AD217B" />
                  <stop offset="70%" stopColor="#46CDCF" />
                  <stop offset="100%" stopColor="#E1B12C" />
                </linearGradient>
              </defs>
              <path
                d={liveStroke.pathD}
                fill="none"
                stroke={
                  liveStroke.effect === 'rainbow'
                    ? 'url(#liveRainbowGradient)'
                    : liveStroke.effect === 'galaxy'
                    ? 'url(#liveGalaxyGradient)'
                    : liveStroke.color
                }
                strokeWidth={liveStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {liveStroke.arrowStartGeometry && (
                <polyline
                  points={`${liveStroke.arrowStartGeometry.wing1.x},${liveStroke.arrowStartGeometry.wing1.y} ${liveStroke.arrowStartGeometry.tip.x},${liveStroke.arrowStartGeometry.tip.y} ${liveStroke.arrowStartGeometry.wing2.x},${liveStroke.arrowStartGeometry.wing2.y}`}
                  fill="none"
                  stroke={liveStroke.color}
                  strokeWidth={liveStroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
              {liveStroke.arrowEndGeometry && (
                <polyline
                  points={`${liveStroke.arrowEndGeometry.wing1.x},${liveStroke.arrowEndGeometry.wing1.y} ${liveStroke.arrowEndGeometry.tip.x},${liveStroke.arrowEndGeometry.tip.y} ${liveStroke.arrowEndGeometry.wing2.x},${liveStroke.arrowEndGeometry.wing2.y}`}
                  fill="none"
                  stroke={liveStroke.color}
                  strokeWidth={liveStroke.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              )}
            </svg>
          )}

          {/* 3. Real-Time Glowing Neon Laser Trail Overlay */}
          {laserStroke && (
            <svg
              id="laserStrokeOverlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 500,
                opacity: laserStroke.opacity,
              }}
            >
              <defs>
                <filter id="laserGlowFilter" x="-50%" y="-50%" width="200%" height="200%">
                  <feGaussianBlur in="SourceGraphic" stdDeviation={laserStroke.width * 1.5} result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              {/* Outer blurred halo glow */}
              <path
                d={laserStroke.pathD}
                fill="none"
                stroke={laserStroke.color}
                strokeWidth={laserStroke.width * 3.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.65}
                filter="url(#laserGlowFilter)"
              />
              {/* Inner bright core */}
              <path
                d={laserStroke.pathD}
                fill="none"
                stroke={laserStroke.color}
                strokeWidth={laserStroke.width}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {/* White center highlight */}
              <path
                d={laserStroke.pathD}
                fill="none"
                stroke="#FFFFFF"
                strokeWidth={Math.max(1, laserStroke.width * 0.4)}
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity={0.85}
              />
              {/* Glowing head point */}
              {laserStroke.headPoint && (
                <>
                  <circle
                    cx={laserStroke.headPoint.x}
                    cy={laserStroke.headPoint.y}
                    r={laserStroke.width * 2.5}
                    fill={laserStroke.color}
                    opacity={0.5}
                    filter="url(#laserGlowFilter)"
                  />
                  <circle
                    cx={laserStroke.headPoint.x}
                    cy={laserStroke.headPoint.y}
                    r={laserStroke.width * 1.2}
                    fill="#FFFFFF"
                  />
                </>
              )}
            </svg>
          )}

          {/* 4. Real-Time Dynamic Velocity Eraser Cursor Ring Overlay */}
          {eraserCursor && (
            <svg
              id="eraserCursorOverlay"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                overflow: 'visible',
                pointerEvents: 'none',
                zIndex: 600,
              }}
            >
              <circle
                cx={eraserCursor.x}
                cy={eraserCursor.y}
                r={eraserCursor.radius}
                fill={eraserCursor.isDown ? 'rgba(0, 120, 212, 0.16)' : 'rgba(128, 128, 128, 0.08)'}
                stroke={eraserCursor.isDown ? '#0078D4' : 'var(--colorNeutralStroke1, #8A8886)'}
                strokeWidth={eraserCursor.isDown ? 2 : 1.5}
                strokeDasharray={eraserCursor.isDown ? 'none' : '3 3'}
              />
            </svg>
          )}

          {children}
        </div>
      </div>

      {/* Open Whiteboard PDF Page Picker Modal */}
      {pdfPickerFile && (
        <PdfPagePickerModal
          file={pdfPickerFile}
          onClose={() => setPdfPickerFile(null)}
        />
      )}
    </div>
  );
};
