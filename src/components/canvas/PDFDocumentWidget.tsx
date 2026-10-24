/**
 * Open Whiteboard — Interactive Multi-Page PDF Document Canvas Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Module 93425 & 560673: Canvas document embedding and interactive multi-page document inspection.
 * - Continuous vertical flow: all pages of the PDF are laid out sequentially on the canvas.
 * - Scrolling the canvas navigates down through the entire document naturally.
 * - High-DPI canvas per page matching device pixel ratio, selectable PDF.js TextLayer overlay,
 *   tool-mode isolation, and synchronized inking.
 */

import React, { memo, useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type {
  CanvasEntity,
  InkStrokeEntity,
  ReactionEntity,
  PDFDocumentEntity,
  PDFHighlightAnnotation,
  PDFHighlightRect,
} from '../../canvas/sceneGraph';
import { computeEntityBounds } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { historyManager } from '../../canvas/history';
import { useInkingStore } from '../../store/inkingStore';
import { canvasStore } from '../../store/canvasStore';
import { pdfTextRegistry, type PDFTextLine } from '../../canvas/pdfTextRegistry';
import {
  addPDFHighlight,
  removePDFHighlight,
  doesHighlightOverlapRects,
} from '../../canvas/pdfHighlightCommands';
import { useTheme } from '../../theme/ThemeProvider';
import {
  DocumentPDFIcon,
  LockIcon,
  UnlockIcon,
  DeleteIcon,
  FitToScreenIcon,
} from '../../assets/icons';

// Ensure PDF.js worker is properly configured
if (typeof window !== 'undefined' && !pdfjsLib.GlobalWorkerOptions.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker ||
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

interface PDFTextSelectionToolbarState {
  visible: boolean;
  screenX: number;
  screenY: number;
  rects: DOMRect[];
  text: string;
}

interface PDFPageItemProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  docId: string;
  pageOffsetY: number;
  pageNumber: number;
  totalPages: number;
  width: number;
  height: number;
  isSelectTool: boolean;
  highlights?: PDFHighlightAnnotation[];
}

const PDFPageItem: React.FC<PDFPageItemProps> = memo(
  ({ pdfDoc, docId, pageOffsetY, pageNumber, totalPages, width, height, isSelectTool, highlights }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const [isRendered, setIsRendered] = useState(false);

    useEffect(() => {
      let isCancelled = false;
      let renderTask: any = null;

      const renderPage = async () => {
        try {
          const page = await pdfDoc.getPage(pageNumber);
          if (isCancelled) return;

          const unscaledViewport = page.getViewport({ scale: 1.0 });
          const scale = width / unscaledViewport.width;
          const viewport = page.getViewport({ scale });

          const canvas = canvasRef.current;
          if (!canvas) return;
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          canvas.width = Math.round(viewport.width * dpr);
          canvas.height = Math.round(viewport.height * dpr);
          canvas.style.width = `${viewport.width}px`;
          canvas.style.height = `${viewport.height}px`;

          ctx.save();
          ctx.scale(dpr, dpr);
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, viewport.width, viewport.height);

          renderTask = page.render({
            canvas,
            canvasContext: ctx,
            viewport,
          });

          await renderTask.promise;
          ctx.restore();
          if (isCancelled) return;
          setIsRendered(true);

          // Render Selectable & Copyable TextLayer (Milestone 11.2)
          if (textLayerRef.current) {
            const textContainer = textLayerRef.current;
            textContainer.innerHTML = '';
            textContainer.style.width = `${viewport.width}px`;
            textContainer.style.height = `${viewport.height}px`;
            textContainer.style.setProperty('--total-scale-factor', `${scale}`);
            textContainer.style.setProperty('--min-font-size', '1');
            textContainer.style.setProperty('--text-scale-factor', `${scale}`);

            try {
              const textContent = await page.getTextContent();
              if (isCancelled) return;

              const textLayer = new pdfjsLib.TextLayer({
                textContentSource: textContent,
                container: textContainer,
                viewport,
              });
              await textLayer.render();

              // Extract and register line bounding boxes for Highlighter snap-to-text
              const spans = Array.from(textContainer.querySelectorAll('span'));
              if (spans.length > 0) {
                const lineGroups: { top: number; spans: HTMLSpanElement[] }[] = [];
                for (const span of spans) {
                  const top = span.offsetTop;
                  const group = lineGroups.find((g) => Math.abs(g.top - top) <= 4);
                  if (group) {
                    group.spans.push(span);
                  } else {
                    lineGroups.push({ top, spans: [span] });
                  }
                }

                const lines: PDFTextLine[] = lineGroups.map((group, idx) => {
                  const minX = Math.min(...group.spans.map((s) => s.offsetLeft));
                  const maxX = Math.max(...group.spans.map((s) => s.offsetLeft + s.offsetWidth));
                  const avgHeight =
                    group.spans.reduce((acc, s) => acc + s.offsetHeight, 0) / group.spans.length;
                  const centerY = pageOffsetY + group.top + avgHeight / 2;
                  return {
                    id: `${docId}_p${pageNumber}_l${idx}`,
                    docId,
                    pageNumber,
                    relMinX: minX,
                    relMaxX: maxX,
                    relCenterY: centerY,
                    relHeight: Math.max(12, avgHeight),
                  };
                });

                pdfTextRegistry.registerDocPageLines(docId, pageNumber, lines);
              }
              pdfTextRegistry.registerDocPage(docId, pageNumber, pageOffsetY, width, height);
            } catch (textErr) {
              console.warn(`[PDFDocumentWidget] TextLayer error page ${pageNumber}:`, textErr);
            }
          }
        } catch (err: any) {
          if (err?.name !== 'RenderingCancelledException') {
            console.error(`[PDFDocumentWidget] Page ${pageNumber} render error:`, err);
          }
        }
      };

      renderPage();

      return () => {
        isCancelled = true;
        if (renderTask) {
          try {
            renderTask.cancel();
          } catch {}
        }
      };
    }, [pdfDoc, pageNumber, width, docId, pageOffsetY]);

    return (
      <div
        className="wb-pdf-page-card"
        data-page-number={pageNumber}
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: '#FFFFFF',
          borderRadius: '4px',
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
          // Inking tools draw directly over the document; Select tool enables text selection
          pointerEvents: isSelectTool ? 'auto' : 'none',
          userSelect: isSelectTool ? 'text' : 'none',
        }}
      >
        {!isRendered && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--colorNeutralForeground3, #797775)',
              fontSize: '11px',
              backgroundColor: '#FAFAFA',
            }}
          >
            Loading Page {pageNumber}...
          </div>
        )}

        {/* High-DPI Page Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: `${width}px`,
            height: `${height}px`,
          }}
        />

        {/* Structured Page-Relative Highlight Annotations (Acrobat / Edge Standard) */}
        <svg
          className="wb-pdf-page-highlights"
          viewBox={`0 0 ${width} ${height}`}
          style={{
            position: 'absolute',
            inset: 0,
            width: `${width}px`,
            height: `${height}px`,
            pointerEvents: 'none',
            zIndex: 1,
            mixBlendMode: 'multiply',
          }}
        >
          {(highlights || [])
            .filter((hl) => hl.pageNumber === pageNumber)
            .map((hl) => (
              <g key={hl.id} className="wb-pdf-highlight-item" data-highlight-id={hl.id}>
                {hl.rects &&
                  hl.rects.map((r, rIdx) => (
                    <rect
                      key={`${hl.id}_r_${rIdx}`}
                      x={r.relX * width}
                      y={r.relY * height}
                      width={r.width * width}
                      height={r.height * height}
                      fill={hl.color}
                      rx={2}
                      ry={2}
                      opacity={0.42}
                    />
                  ))}
                {hl.freehandD && (
                  <path
                    d={hl.freehandD}
                    stroke={hl.color}
                    strokeWidth={hl.strokeWidth || 16}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    opacity={0.42}
                  />
                )}
              </g>
            ))}
        </svg>

        {/* Transparent PDF.js Text Layer Overlay */}
        <div
          ref={textLayerRef}
          className="textLayer"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: isSelectTool ? 'auto' : 'none',
            userSelect: isSelectTool ? 'text' : 'none',
            zIndex: 2,
          }}
        />

        {/* Subtle Page Badge */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            right: '10px',
            padding: '2px 8px',
            borderRadius: '4px',
            backgroundColor: 'rgba(36, 36, 36, 0.55)',
            backdropFilter: 'blur(4px)',
            WebkitBackdropFilter: 'blur(4px)',
            color: '#FFFFFF',
            fontSize: '10px',
            fontWeight: 600,
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 5,
          }}
        >
          {pageNumber} / {totalPages}
        </div>
      </div>
    );
  }
);
PDFPageItem.displayName = 'PDFPageItem';

interface PDFDocumentWidgetProps {
  document: PDFDocumentEntity;
}

export const PDFDocumentWidget: React.FC<PDFDocumentWidgetProps> = memo(({ document: docEntity }) => {
  const { isSelected: checkIsSelected } = useSelectionStore();
  const isSelected = checkIsSelected(docEntity.id);
  const { selectedTool } = useInkingStore();
  const isSelectTool = selectedTool === 'Select';
  const { isDark } = useTheme();

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(docEntity.totalPages || 1);
  const [pageHeights, setPageHeights] = useState<{ [pageNum: number]: number }>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const [isHeaderDragging, setIsHeaderDragging] = useState(false);
  const [textToolbar, setTextToolbar] = useState<PDFTextSelectionToolbarState | null>(null);

  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const isLocked = Boolean(docEntity.isLocked);

  // Unregister text lines when PDF document widget is removed
  useEffect(() => {
    return () => {
      pdfTextRegistry.unregisterDoc(docEntity.id);
    };
  }, [docEntity.id]);

  // Monitor text selection across document text layers in Select mode
  useEffect(() => {
    if (!isSelectTool) {
      setTextToolbar(null);
      return;
    }

    const handleSelectionChange = () => {
      const sel = window.getSelection();
      if (!sel || sel.isCollapsed || !sel.rangeCount) {
        setTextToolbar(null);
        return;
      }

      const text = sel.toString().trim();
      if (!text) {
        setTextToolbar(null);
        return;
      }

      const container = widgetContainerRef.current;
      if (!container) return;

      const anchorNode = sel.anchorNode;
      const focusNode = sel.focusNode;
      if (!anchorNode || !focusNode) return;
      if (!container.contains(anchorNode) || !container.contains(focusNode)) {
        return;
      }

      const anchorEl = anchorNode instanceof HTMLElement ? anchorNode : anchorNode.parentElement;
      if (!anchorEl?.closest('.textLayer')) {
        return;
      }

      const range = sel.getRangeAt(0);
      const bRect = range.getBoundingClientRect();
      if (bRect.width === 0 || bRect.height === 0) return;

      const rawRects = Array.from(range.getClientRects());
      const lineRects = rawRects.filter((r) => r.width > 2 && r.height > 2);
      if (lineRects.length === 0) return;

      const screenX = bRect.left + bRect.width / 2;
      const screenY = bRect.top > 60 ? bRect.top - 46 : bRect.bottom + 10;

      setTextToolbar({
        visible: true,
        screenX,
        screenY,
        rects: lineRects,
        text,
      });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTextToolbar(null);
        window.getSelection()?.removeAllRanges();
      }
    };

    document.addEventListener('selectionchange', handleSelectionChange);
    window.addEventListener('resize', handleSelectionChange);
    window.addEventListener('keydown', handleKeyDown);

    // Keep selection overlay positioned when canvas camera moves/zooms
    const unsubCanvas = canvasStore.subscribe(() => {
      if (window.getSelection()?.rangeCount) {
        handleSelectionChange();
      }
    });

    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange);
      window.removeEventListener('resize', handleSelectionChange);
      window.removeEventListener('keydown', handleKeyDown);
      unsubCanvas();
    };
  }, [isSelectTool]);

  const handleApplyHighlight = (color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!textToolbar || textToolbar.rects.length === 0) return;

    const container = widgetContainerRef.current;
    if (!container) return;

    const pageCards = Array.from(container.querySelectorAll<HTMLElement>('.wb-pdf-page-card'));
    if (pageCards.length === 0) return;

    // Group textToolbar.rects by matching page card
    const rectsByPage = new Map<number, { pageNum: number; rects: PDFHighlightRect[] }>();

    for (const rect of textToolbar.rects) {
      const midY = rect.top + rect.height / 2;
      const matchingCard =
        pageCards.find((card) => {
          const cRect = card.getBoundingClientRect();
          return midY >= cRect.top && midY <= cRect.bottom;
        }) || pageCards[0];

      const pageNum = parseInt(matchingCard.getAttribute('data-page-number') || '1', 10);
      const cRect = matchingCard.getBoundingClientRect();

      const relRect: PDFHighlightRect = {
        relX: Math.max(0, Math.min(1, (rect.left - cRect.left) / cRect.width)),
        relY: Math.max(0, Math.min(1, (rect.top - cRect.top) / cRect.height)),
        width: Math.max(0.005, Math.min(1, rect.width / cRect.width)),
        height: Math.max(0.005, Math.min(1, rect.height / cRect.height)),
      };

      let group = rectsByPage.get(pageNum);
      if (!group) {
        group = { pageNum, rects: [] };
        rectsByPage.set(pageNum, group);
      }
      group.rects.push(relRect);
    }

    const currentDoc = (sceneStore.getEntity(docEntity.id) as PDFDocumentEntity | undefined) || docEntity;
    const existingHighlights = currentDoc.highlights || [];
    const isColorEqual = (c1: string, c2: string) => c1.trim().toLowerCase() === c2.trim().toLowerCase();

    for (const { pageNum, rects } of rectsByPage.values()) {
      const pageHighlights = existingHighlights.filter((h) => h.pageNumber === pageNum);
      const overlapping = pageHighlights.filter((h) => doesHighlightOverlapRects(h, rects));
      const sameColorOverlapping = overlapping.filter((h) => isColorEqual(h.color, color));

      if (sameColorOverlapping.length > 0) {
        // TOGGLE OFF: Undo / remove highlight
        for (const h of sameColorOverlapping) {
          removePDFHighlight(docEntity.id, h.id);
        }
      } else if (overlapping.length > 0) {
        // REPLACE COLOR: remove old highlight and add new color
        for (const oldH of overlapping) {
          removePDFHighlight(docEntity.id, oldH.id);
        }
        const newHighlight: PDFHighlightAnnotation = {
          id: `hl_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          pageNumber: pageNum,
          color,
          rects,
          text: textToolbar.text,
          createdAt: Date.now(),
        };
        addPDFHighlight(docEntity.id, newHighlight);
      } else {
        // ADD NEW HIGHLIGHT
        const newHighlight: PDFHighlightAnnotation = {
          id: `hl_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          pageNumber: pageNum,
          color,
          rects,
          text: textToolbar.text,
          createdAt: Date.now(),
        };
        addPDFHighlight(docEntity.id, newHighlight);
      }
    }

    window.getSelection()?.removeAllRanges();
    setTextToolbar(null);
  };

  const handleCopyText = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (textToolbar?.text) {
      navigator.clipboard.writeText(textToolbar.text);
    }
    window.getSelection()?.removeAllRanges();
    setTextToolbar(null);
  };

  // Header dragging refs
  const dragStartRef = useRef<{
    clientX: number;
    clientY: number;
    docX: number;
    docY: number;
    anchored: CanvasEntity[];
  } | null>(null);

  // Load PDF document proxy and calculate page heights immediately up-front
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const loadTask = pdfjsLib.getDocument({
      data: dataUrlToUint8Array(docEntity.pdfData),
      cMapUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/cmaps/',
      cMapPacked: true,
    });

    loadTask.promise
      .then(async (loadedDoc) => {
        if (isCancelled) return;

        const count = loadedDoc.numPages;
        const heights: { [pageNum: number]: number } = {};
        const pageWidth = docEntity.width || 600;
        const pageGap = 16;
        const headerHeight = 46;
        let total = headerHeight;

        for (let p = 1; p <= count; p++) {
          try {
            const page = await loadedDoc.getPage(p);
            if (isCancelled) return;
            const vp = page.getViewport({ scale: 1.0 });
            const pH = Math.round((vp.height / vp.width) * pageWidth);
            heights[p] = pH;
            total += pH;
            if (p < count) total += pageGap;
          } catch {
            const fallbackH = Math.round(pageWidth * 1.414);
            heights[p] = fallbackH;
            total += fallbackH;
            if (p < count) total += pageGap;
          }
        }

        if (isCancelled) return;

        setPageHeights(heights);
        setPdfDoc(loadedDoc);
        setTotalPages(count);
        setIsLoading(false);

        // Synchronize full document bounds and height with sceneStore
        if (Math.abs(docEntity.height - total) > 4 || docEntity.totalPages !== count) {
          sceneStore.updateEntity(
            docEntity.id,
            {
              totalPages: count,
              height: total,
              bounds: computeEntityBounds({
                ...docEntity,
                height: total,
              }),
            },
            false
          );
        }
      })
      .catch((err) => {
        if (isCancelled) return;
        console.error('[PDFDocumentWidget] Failed to load PDF:', err);
        setIsLoading(false);
      });

    return () => {
      isCancelled = true;
      loadTask.destroy().catch(() => {});
    };
  }, [docEntity.pdfData, docEntity.id]);

  // Recompute page heights on width change (e.g. toggle standard vs expanded width)
  useEffect(() => {
    if (!pdfDoc) return;
    let isCancelled = false;

    const recompute = async () => {
      const count = pdfDoc.numPages;
      const heights: { [pageNum: number]: number } = {};
      const pageWidth = docEntity.width;
      const pageGap = 16;
      let total = 46;

      for (let p = 1; p <= count; p++) {
        try {
          const page = await pdfDoc.getPage(p);
          if (isCancelled) return;
          const vp = page.getViewport({ scale: 1.0 });
          const pH = Math.round((vp.height / vp.width) * pageWidth);
          heights[p] = pH;
          total += pH;
          if (p < count) total += pageGap;
        } catch {
          const fallbackH = Math.round(pageWidth * 1.414);
          heights[p] = fallbackH;
          total += fallbackH;
          if (p < count) total += pageGap;
        }
      }

      if (isCancelled) return;
      setPageHeights(heights);

      if (Math.abs(docEntity.height - total) > 4) {
        sceneStore.updateEntity(
          docEntity.id,
          {
            height: total,
            bounds: computeEntityBounds({
              ...docEntity,
              height: total,
            }),
          },
          false
        );
      }
    };

    recompute();
    return () => {
      isCancelled = true;
    };
  }, [docEntity.width, pdfDoc, docEntity.id]);

  // Toggle Standard (600px) vs Expanded (900px) Width
  const handleToggleFitWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isStandard = docEntity.width <= 650;
    const targetWidth = isStandard ? 900 : 600;
    const prevWidth = docEntity.width;
    const prevHeight = docEntity.height;

    const scaleRatio = targetWidth / Math.max(1, docEntity.width);
    const targetHeight = Math.round(docEntity.height * scaleRatio);

    historyManager.execute({
      name: isStandard ? 'Expand PDF Width' : 'Fit Standard PDF Width',
      execute: () => {
        sceneStore.updateEntity(
          docEntity.id,
          {
            width: targetWidth,
            height: targetHeight,
            bounds: computeEntityBounds({
              ...docEntity,
              width: targetWidth,
              height: targetHeight,
            }),
          },
          true
        );
      },
      undo: () => {
        sceneStore.updateEntity(
          docEntity.id,
          {
            width: prevWidth,
            height: prevHeight,
            bounds: computeEntityBounds({
              ...docEntity,
              width: prevWidth,
              height: prevHeight,
            }),
          },
          true
        );
      },
    });
  };

  // Document Dragging via Fluent Acrylic Header
  const handleHeaderPointerDown = (e: React.PointerEvent) => {
    if (isLocked || e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button')) return;

    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setIsHeaderDragging(true);

    if (!isSelected) {
      selectionStore.select(docEntity.id);
    }

    // Find overlapping anchored entities (ink strokes, sticky notes)
    const allScene = sceneStore.getAllEntities();
    const anchored: CanvasEntity[] = [];
    for (const item of allScene) {
      if (item.id === docEntity.id || item.isLocked) continue;
      const b = item.bounds;
      const cx = (b.minX + b.maxX) / 2;
      const cy = (b.minY + b.maxY) / 2;
      if (
        cx >= docEntity.x &&
        cx <= docEntity.x + docEntity.width &&
        cy >= docEntity.y &&
        cy <= docEntity.y + docEntity.height
      ) {
        anchored.push(JSON.parse(JSON.stringify(item)));
      }
    }

    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      docX: docEntity.x,
      docY: docEntity.y,
      anchored,
    };
  };

  const handleHeaderPointerMove = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    e.stopPropagation();

    const camera = canvasStore.getState().camera;
    const dx = (e.clientX - dragStartRef.current.clientX) / camera.scale;
    const dy = (e.clientY - dragStartRef.current.clientY) / camera.scale;

    const newX = Math.round(dragStartRef.current.docX + dx);
    const newY = Math.round(dragStartRef.current.docY + dy);

    sceneStore.updateEntity(
      docEntity.id,
      {
        x: newX,
        y: newY,
        bounds: computeEntityBounds({
          ...docEntity,
          x: newX,
          y: newY,
        }),
      },
      false
    );

    for (const orig of dragStartRef.current.anchored) {
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
        const box = orig as any;
        sceneStore.updateEntity(orig.id, { x: box.x + dx, y: box.y + dy }, false);
      }
    }
  };

  const handleHeaderPointerUp = (e: React.PointerEvent) => {
    if (!dragStartRef.current) return;
    setIsHeaderDragging(false);
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}

    const camera = canvasStore.getState().camera;
    const dx = (e.clientX - dragStartRef.current.clientX) / camera.scale;
    const dy = (e.clientY - dragStartRef.current.clientY) / camera.scale;
    const finalDocX = Math.round(dragStartRef.current.docX + dx);
    const finalDocY = Math.round(dragStartRef.current.docY + dy);
    const prevDocX = dragStartRef.current.docX;
    const prevDocY = dragStartRef.current.docY;
    const anchoredSnapshot = [...dragStartRef.current.anchored];
    dragStartRef.current = null;

    if (Math.hypot(dx, dy) > 2) {
      historyManager.execute({
        name: 'Move PDF Document',
        execute: () => {
          sceneStore.updateEntity(
            docEntity.id,
            {
              x: finalDocX,
              y: finalDocY,
              bounds: computeEntityBounds({
                ...docEntity,
                x: finalDocX,
                y: finalDocY,
              }),
            },
            true
          );
          for (const orig of anchoredSnapshot) {
            if (orig.type === 'stroke') {
              const stroke = orig as InkStrokeEntity;
              const updatedPoints = stroke.points.map((p) => ({
                ...p,
                x: p.x + dx,
                y: p.y + dy,
              }));
              sceneStore.updateEntity(orig.id, { points: updatedPoints }, true);
            } else if (orig.type === 'reaction') {
              const rx = orig as ReactionEntity;
              sceneStore.updateEntity(orig.id, { x: rx.x + dx, y: rx.y + dy }, true);
            } else {
              const box = orig as any;
              sceneStore.updateEntity(orig.id, { x: box.x + dx, y: box.y + dy }, true);
            }
          }
        },
        undo: () => {
          sceneStore.updateEntity(
            docEntity.id,
            {
              x: prevDocX,
              y: prevDocY,
              bounds: computeEntityBounds({
                ...docEntity,
                x: prevDocX,
                y: prevDocY,
              }),
            },
            true
          );
          for (const orig of anchoredSnapshot) {
            if (orig.type === 'stroke') {
              const stroke = orig as InkStrokeEntity;
              sceneStore.updateEntity(orig.id, { points: stroke.points }, true);
            } else if (orig.type === 'reaction') {
              const rx = orig as ReactionEntity;
              sceneStore.updateEntity(orig.id, { x: rx.x, y: rx.y }, true);
            } else {
              const box = orig as any;
              sceneStore.updateEntity(orig.id, { x: box.x, y: box.y }, true);
            }
          }
        },
      });
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;

    if (e.button === 0 && isSelectTool) {
      const isTextClick = Boolean((e.target as HTMLElement).closest('.textLayer'));
      const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;

      if (!isSelected) {
        selectionStore.select(docEntity.id, isMulti);
      }

      if (!isTextClick) {
        e.stopPropagation();
      }
    }
  };

  const handleToggleLock = (e: React.MouseEvent) => {
    e.stopPropagation();
    const targetLock = !isLocked;
    const prevLock = isLocked;

    historyManager.execute({
      name: targetLock ? 'Lock Document Position' : 'Unlock Document Position',
      execute: () => {
        sceneStore.updateEntity(docEntity.id, { isLocked: targetLock }, true);
        if (targetLock) {
          selectionStore.deselect(docEntity.id);
        } else {
          selectionStore.select(docEntity.id);
        }
      },
      undo: () => {
        sceneStore.updateEntity(docEntity.id, { isLocked: prevLock }, true);
        if (prevLock) {
          selectionStore.deselect(docEntity.id);
        } else {
          selectionStore.select(docEntity.id);
        }
      },
    });
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    sceneStore.removeEntity(docEntity.id, true);
    selectionStore.deselect(docEntity.id);
  };

  let accumulatedOffsetY = 46;
  const pageOffsets: { [pageNum: number]: number } = {};
  for (let p = 1; p <= totalPages; p++) {
    pageOffsets[p] = accumulatedOffsetY;
    accumulatedOffsetY += (pageHeights[p] || Math.round(docEntity.width * 1.414)) + 16;
  }

  return (
    <div
      ref={widgetContainerRef}
      id={`pdf-${docEntity.id}`}
      style={{
        position: 'absolute',
        left: `${docEntity.x}px`,
        top: `${docEntity.y}px`,
        width: `${docEntity.width}px`,
        height: `${docEntity.height}px`,
        zIndex: isLocked ? 50 : (docEntity.zIndex ? Math.min(docEntity.zIndex, 80) : 70),
        borderRadius: '8px',
        boxShadow: isSelected
          ? '0 0 0 2px var(--themePrimary), var(--shadow16, 0 8px 24px rgba(0,0,0,0.18))'
          : isHovered
          ? '0 6px 20px rgba(0,0,0,0.16)'
          : 'none',
        backgroundColor: 'transparent',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'visible',
        pointerEvents: 'auto',
        userSelect: 'none',
        transition: 'box-shadow 0.15s ease',
      }}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 1. Modern Fluent Acrylic Document Header (Draggable) */}
      <div
        className="wb-pdf-header"
        onPointerDown={handleHeaderPointerDown}
        onPointerMove={handleHeaderPointerMove}
        onPointerUp={handleHeaderPointerUp}
        onPointerCancel={handleHeaderPointerUp}
        title={isLocked ? docEntity.title : 'Drag header to move document'}
        style={{
          height: '36px',
          marginBottom: '10px',
          padding: '0 10px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--wb-acrylic-background, rgba(255,255,255,0.88))',
          backdropFilter: 'var(--wb-acrylic-backdrop-filter, blur(16px))',
          WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter, blur(16px))',
          borderRadius: '8px',
          border: '1px solid var(--colorNeutralStroke1, #E1DFDD)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          color: 'var(--colorNeutralForeground1, #242424)',
          fontSize: '12px',
          zIndex: 10,
          pointerEvents: 'auto',
          userSelect: 'none',
          cursor: isLocked ? 'default' : isHeaderDragging ? 'grabbing' : 'grab',
        }}
      >
        {/* Left: PDF badge & document title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden' }}>
          <DocumentPDFIcon size={18} color="#E71224" />
          <span
            title={docEntity.title}
            style={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '240px',
            }}
          >
            {docEntity.title || 'PDF Document'}
          </span>
        </div>

        {/* Center: Total Pages Indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '2px 8px',
              borderRadius: '12px',
              backgroundColor: 'var(--colorNeutralBackground3, rgba(0,0,0,0.05))',
              color: 'var(--colorNeutralForeground2, #616161)',
            }}
          >
            {totalPages} {totalPages === 1 ? 'Page' : 'Pages'}
          </span>
        </div>

        {/* Right: Actions (Fit Width, Lock, Delete) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <button
            onClick={handleToggleFitWidth}
            title={docEntity.width <= 650 ? 'Expand Width (900px)' : 'Fit Standard Width (600px)'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: docEntity.width > 650 ? 'rgba(0, 120, 212, 0.12)' : 'transparent',
              color: docEntity.width > 650 ? 'var(--themePrimary, #0078D4)' : 'var(--colorNeutralForeground2, #424242)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            <FitToScreenIcon size={14} />
          </button>

          <button
            onClick={handleToggleLock}
            title={isLocked ? 'Unlock Position' : 'Lock Position'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '26px',
              height: '26px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: isLocked ? 'rgba(0, 120, 212, 0.12)' : 'transparent',
              color: isLocked ? 'var(--themePrimary, #0078D4)' : 'var(--colorNeutralForeground2, #424242)',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            {isLocked ? <LockIcon size={13} color="var(--themePrimary, #0078D4)" /> : <UnlockIcon size={13} />}
          </button>

          {isSelected && (
            <button
              onClick={handleDelete}
              title="Delete Document"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '26px',
                height: '26px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                color: 'var(--colorNeutralForeground2, #424242)',
                cursor: 'pointer',
                padding: 0,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#E71224';
                e.currentTarget.style.backgroundColor = 'rgba(231, 18, 36, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--colorNeutralForeground2, #424242)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <DeleteIcon size={13} />
            </button>
          )}
        </div>
      </div>

      {/* 2. Full Vertical Continuous Flow of All Pages */}
      <div
        className="wb-pdf-pages-column"
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          width: '100%',
        }}
      >
        {isLoading && (
          <div
            style={{
              height: '300px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--colorNeutralForeground3, #616161)',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
            }}
          >
            <DocumentPDFIcon size={32} color="#E71224" />
            <span>Loading document pages...</span>
          </div>
        )}

        {pdfDoc &&
          Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <PDFPageItem
              key={pageNum}
              pdfDoc={pdfDoc}
              docId={docEntity.id}
              pageOffsetY={pageOffsets[pageNum] || 46}
              pageNumber={pageNum}
              totalPages={totalPages}
              width={docEntity.width}
              height={pageHeights[pageNum] || Math.round(docEntity.width * 1.414)}
              isSelectTool={isSelectTool}
              highlights={docEntity.highlights}
            />
          ))}
      </div>

      {/* 3. Custom Vector Text Selection Overlay (Acrobat / Google Docs Architecture) */}
      {textToolbar && textToolbar.visible && textToolbar.rects.length > 0 && createPortal(
        <div
          id="wb-pdf-selection-overlay"
          style={{
            position: 'fixed',
            inset: 0,
            pointerEvents: 'none',
            zIndex: 999,
          }}
        >
          {textToolbar.rects.map((rect, idx) => (
            <div
              key={`sel_box_${idx}`}
              className="wb-pdf-selection-box"
              style={{
                position: 'fixed',
                left: `${rect.left}px`,
                top: `${rect.top}px`,
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                backgroundColor: 'rgba(0, 120, 215, 0.22)',
                borderRadius: '2px',
                pointerEvents: 'none',
              }}
            />
          ))}
        </div>,
        document.body
      )}

      {/* 4. Edge/Acrobat Style Floating Text Selection Mini-Toolbar (Milestone 22) */}
      {textToolbar && textToolbar.visible && createPortal(
        <div
          id="wb-pdf-text-toolbar"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${textToolbar.screenX}px`,
            top: `${textToolbar.screenY}px`,
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            borderRadius: '8px',
            backgroundColor: isDark ? 'rgba(38, 38, 38, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: isDark ? '1px solid rgba(255, 255, 255, 0.16)' : '1px solid rgba(0, 0, 0, 0.12)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.22)',
            zIndex: 1000,
            userSelect: 'none',
          }}
        >
          {/* 5 Quick Highlight Edge/Acrobat Pastel Color Pills */}
          {(() => {
            let activeColor: string | null = null;
            if (textToolbar && textToolbar.rects.length > 0 && widgetContainerRef.current) {
              const pageCards = Array.from(widgetContainerRef.current.querySelectorAll<HTMLElement>('.wb-pdf-page-card'));
              const currentDoc = (sceneStore.getEntity(docEntity.id) as PDFDocumentEntity | undefined) || docEntity;
              const highlights = currentDoc.highlights || [];

              for (const rect of textToolbar.rects) {
                const midY = rect.top + rect.height / 2;
                const matchingCard =
                  pageCards.find((card) => {
                    const cRect = card.getBoundingClientRect();
                    return midY >= cRect.top && midY <= cRect.bottom;
                  }) || pageCards[0];

                if (matchingCard) {
                  const pageNum = parseInt(matchingCard.getAttribute('data-page-number') || '1', 10);
                  const cRect = matchingCard.getBoundingClientRect();
                  const relRect: PDFHighlightRect = {
                    relX: Math.max(0, Math.min(1, (rect.left - cRect.left) / cRect.width)),
                    relY: Math.max(0, Math.min(1, (rect.top - cRect.top) / cRect.height)),
                    width: Math.max(0.005, Math.min(1, rect.width / cRect.width)),
                    height: Math.max(0.005, Math.min(1, rect.height / cRect.height)),
                  };

                  const matchingHl = highlights.find(
                    (h) => h.pageNumber === pageNum && doesHighlightOverlapRects(h, [relRect])
                  );
                  if (matchingHl) {
                    activeColor = matchingHl.color.toLowerCase();
                    break;
                  }
                }
              }
            }

            return [
              { name: 'Yellow', color: '#FFE843' },
              { name: 'Mint Green', color: '#95F09B' },
              { name: 'Sky Cyan', color: '#7AE3FF' },
              { name: 'Pastel Pink', color: '#FF9EC6' },
              { name: 'Lavender Purple', color: '#D4B8FF' },
            ].map((preset) => {
              const isActive = activeColor === preset.color.toLowerCase();
              return (
                <button
                  key={preset.name}
                  title={isActive ? `Remove ${preset.name} highlight` : `Highlight ${preset.name}`}
                  onClick={(e) => handleApplyHighlight(preset.color, e)}
                  style={{
                    position: 'relative',
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    backgroundColor: preset.color,
                    border: isActive
                      ? '2px solid var(--themePrimary, #0078D4)'
                      : isDark
                      ? '1px solid rgba(255, 255, 255, 0.24)'
                      : '1px solid rgba(0, 0, 0, 0.12)',
                    boxShadow: isActive
                      ? '0 0 0 1px #0078D4, 0 2px 5px rgba(0,0,0,0.25)'
                      : '0 1px 3px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    padding: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'transform 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.15)')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
                >
                  {isActive && (
                    <svg width="10" height="10" viewBox="0 0 16 16" fill="#1F1F1F">
                      <path
                        d="M13.854 3.646a.5.5 0 0 1 0 .708l-7 7a.5.5 0 0 1-.708 0l-3.5-3.5a.5.5 0 1 1 .708-.708L6.5 10.293l6.646-6.647a.5.5 0 0 1 .708 0z"
                        stroke="#1F1F1F"
                        strokeWidth="1.2"
                      />
                    </svg>
                  )}
                </button>
              );
            });
          })()}

          {/* Vertical Divider */}
          <div
            style={{
              width: '1px',
              height: '18px',
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.18)' : 'rgba(0, 0, 0, 0.12)',
              margin: '0 2px',
            }}
          />

          {/* Copy Text Button */}
          <button
            onClick={handleCopyText}
            title="Copy Text (Ctrl+C)"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 8px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: isDark ? '#FFFFFF' : '#242424',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 500,
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H4zm0 1h6a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm8 2v7a2 2 0 0 1-2 2H6v-1h4a1 1 0 0 0 1-1V5h1z" />
            </svg>
            Copy
          </button>
        </div>,
        document.body
      )}
    </div>
  );
});

PDFDocumentWidget.displayName = 'PDFDocumentWidget';
