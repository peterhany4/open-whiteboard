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

import {
  extractPageGlyphs,
  findNearestGlyph,
  computeMergedLineRects,
  getWordRangeAt,
  getLineRangeAt,
  extractCleanText,
  type PDFGlyphItem,
  type MergedLineRect,
} from './pdfTextLayout';

export interface ActivePDFSelection {
  pageNumber: number;
  rects: MergedLineRect[];
  text: string;
  screenX: number;
  screenY: number;
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
  activeSelection: ActivePDFSelection | null;
  onSelectionChange: (sel: ActivePDFSelection | null) => void;
}

const PDFPageItem: React.FC<PDFPageItemProps> = memo(
  ({
    pdfDoc,
    docId,
    pageOffsetY,
    pageNumber,
    totalPages,
    width,
    height,
    isSelectTool,
    highlights,
    activeSelection,
    onSelectionChange,
  }) => {
    const cardRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const [isRendered, setIsRendered] = useState(false);

    // PdfCraft glyph storage and selection state
    const glyphsRef = useRef<PDFGlyphItem[]>([]);
    const isDraggingRef = useRef(false);
    const anchorIdxRef = useRef<number>(0);
    const headIdxRef = useRef<number>(0);
    const dragModeRef = useRef<'char' | 'word' | 'line' | 'page'>('char');
    const lastClickTimeRef = useRef<number>(0);
    const lastClickPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
    const clickCountRef = useRef<number>(0);

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

          // Extract text content using PdfCraft layout engine
          try {
            const textContent = await page.getTextContent();
            if (isCancelled) return;

            const glyphs = extractPageGlyphs(textContent, viewport);
            glyphsRef.current = glyphs;

            // Register line bounding boxes in pdfTextRegistry for snap-to-text highlighting
            if (glyphs.length > 0) {
              const lineMap = new Map<number, { minX: number; maxX: number; minY: number; maxY: number }>();
              for (const g of glyphs) {
                const existing = lineMap.get(g.lineIndex);
                if (existing) {
                  existing.minX = Math.min(existing.minX, g.relX);
                  existing.maxX = Math.max(existing.maxX, g.relX + g.width);
                  existing.minY = Math.min(existing.minY, g.relY);
                  existing.maxY = Math.max(existing.maxY, g.relY + g.height);
                } else {
                  lineMap.set(g.lineIndex, {
                    minX: g.relX,
                    maxX: g.relX + g.width,
                    minY: g.relY,
                    maxY: g.relY + g.height,
                  });
                }
              }

              const lines: PDFTextLine[] = Array.from(lineMap.entries()).map(([lineIdx, bounds]) => ({
                id: `${docId}_p${pageNumber}_l${lineIdx}`,
                docId,
                pageNumber,
                relMinX: bounds.minX,
                relMaxX: bounds.maxX,
                relCenterY: pageOffsetY + (bounds.minY + bounds.maxY) / 2,
                relHeight: Math.max(12, bounds.maxY - bounds.minY),
              }));

              pdfTextRegistry.registerDocPageLines(docId, pageNumber, lines);
            }
            pdfTextRegistry.registerDocPage(docId, pageNumber, pageOffsetY, width, height);

            // Maintain non-interactive textLayer container for DOM inspection/accessibility
            if (textLayerRef.current) {
              const textContainer = textLayerRef.current;
              textContainer.innerHTML = '';
              textContainer.style.width = `${viewport.width}px`;
              textContainer.style.height = `${viewport.height}px`;
              textContainer.style.setProperty('--total-scale-factor', `${scale}`);
              textContainer.style.setProperty('--min-font-size', '1');
              textContainer.style.setProperty('--text-scale-factor', `${scale}`);

              try {
                const textLayer = new pdfjsLib.TextLayer({
                  textContentSource: textContent,
                  container: textContainer,
                  viewport,
                });
                await textLayer.render();
              } catch {}
            }
          } catch (textErr) {
            console.warn(`[PDFDocumentWidget] Text extraction error page ${pageNumber}:`, textErr);
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

    const updateSelectionState = (anchor: number, head: number, card: HTMLElement) => {
      const glyphs = glyphsRef.current;
      if (!glyphs || glyphs.length === 0) return;

      const sIdx = Math.min(anchor, head);
      const eIdx = Math.max(anchor, head);
      const rects = computeMergedLineRects(glyphs, sIdx, eIdx);
      const text = extractCleanText(glyphs, sIdx, eIdx);

      if (rects.length === 0 || !text.trim()) {
        onSelectionChange(null);
        return;
      }

      const cRect = card.getBoundingClientRect();
      const scaleX = cRect.width / width;
      const scaleY = cRect.height / height;

      const lastRect = rects[rects.length - 1];
      const screenLeft = cRect.left + (lastRect.x + lastRect.width / 2) * scaleX;
      const lastRectTop = cRect.top + lastRect.y * scaleY;
      const lastRectBottom = cRect.top + (lastRect.y + lastRect.height) * scaleY;

      const screenX = Math.round(screenLeft);
      const screenY = Math.round(lastRectTop > 60 ? lastRectTop - 46 : lastRectBottom + 10);

      onSelectionChange({
        pageNumber,
        rects,
        text,
        screenX,
        screenY,
      });
    };

    const handlePointerDown = (e: React.PointerEvent) => {
      if (e.button !== 0 || !isSelectTool) return;
      const glyphs = glyphsRef.current;
      if (!glyphs || glyphs.length === 0) return;

      const card = cardRef.current;
      if (!card) return;

      e.stopPropagation();
      e.preventDefault();
      try {
        card.setPointerCapture(e.pointerId);
      } catch {}

      const cRect = card.getBoundingClientRect();
      const relX = (e.clientX - cRect.left) * (width / cRect.width);
      const relY = (e.clientY - cRect.top) * (height / cRect.height);

      const now = Date.now();
      let clicks = 1;
      if (
        now - lastClickTimeRef.current < 350 &&
        Math.hypot(relX - lastClickPosRef.current.x, relY - lastClickPosRef.current.y) < 20
      ) {
        clicks = (clickCountRef.current % 4) + 1;
      }
      clickCountRef.current = clicks;
      lastClickTimeRef.current = now;
      lastClickPosRef.current = { x: relX, y: relY };

      const nearestIdx = findNearestGlyph(relX, relY, glyphs);
      if (nearestIdx === null) {
        isDraggingRef.current = false;
        onSelectionChange(null);
        return;
      }

      isDraggingRef.current = true;

      if (clicks === 1) {
        anchorIdxRef.current = nearestIdx;
        headIdxRef.current = nearestIdx;
        dragModeRef.current = 'char';
      } else if (clicks === 2) {
        const [wStart, wEnd] = getWordRangeAt(glyphs, nearestIdx);
        anchorIdxRef.current = wStart;
        headIdxRef.current = wEnd;
        dragModeRef.current = 'word';
        updateSelectionState(wStart, wEnd, card);
      } else if (clicks === 3) {
        const [lStart, lEnd] = getLineRangeAt(glyphs, nearestIdx);
        anchorIdxRef.current = lStart;
        headIdxRef.current = lEnd;
        dragModeRef.current = 'line';
        updateSelectionState(lStart, lEnd, card);
      } else {
        anchorIdxRef.current = 0;
        headIdxRef.current = glyphs.length - 1;
        dragModeRef.current = 'page';
        updateSelectionState(0, glyphs.length - 1, card);
      }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
      if (!isDraggingRef.current || !isSelectTool) return;
      const glyphs = glyphsRef.current;
      if (!glyphs || glyphs.length === 0) return;

      const card = cardRef.current;
      if (!card) return;

      e.stopPropagation();
      e.preventDefault();

      const cRect = card.getBoundingClientRect();
      const relX = (e.clientX - cRect.left) * (width / cRect.width);
      const relY = (e.clientY - cRect.top) * (height / cRect.height);

      const curIdx = findNearestGlyph(relX, relY, glyphs);
      if (curIdx === null) return;

      const mode = dragModeRef.current;
      const anchor = anchorIdxRef.current;

      if (mode === 'char') {
        headIdxRef.current = curIdx;
      } else if (mode === 'word') {
        const [wStart, wEnd] = getWordRangeAt(glyphs, curIdx);
        headIdxRef.current = curIdx >= anchor ? wEnd : wStart;
      } else if (mode === 'line') {
        const [lStart, lEnd] = getLineRangeAt(glyphs, curIdx);
        headIdxRef.current = curIdx >= anchor ? lEnd : lStart;
      }

      updateSelectionState(anchorIdxRef.current, headIdxRef.current, card);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      try {
        cardRef.current?.releasePointerCapture(e.pointerId);
      } catch {}

      if (clickCountRef.current === 1 && anchorIdxRef.current === headIdxRef.current) {
        onSelectionChange(null);
      }
    };

    return (
      <div
        ref={cardRef}
        className="wb-pdf-page-card"
        data-page-number={pageNumber}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${height}px`,
          backgroundColor: '#FFFFFF',
          borderRadius: '4px',
          boxShadow: '0 3px 12px rgba(0, 0, 0, 0.12)',
          overflow: 'hidden',
          pointerEvents: isSelectTool ? 'auto' : 'none',
          userSelect: 'none',
          cursor: isSelectTool ? 'text' : 'default',
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

        {/* Transparent Non-Interactive PDF.js Text Layer Overlay */}
        <div
          ref={textLayerRef}
          className="textLayer"
          style={{
            position: 'absolute',
            inset: 0,
            overflow: 'hidden',
            pointerEvents: 'none',
            userSelect: 'none',
            zIndex: 2,
          }}
        />

        {/* In-Page Vector Selection Overlay (PdfCraft / Google Docs Architecture) */}
        {activeSelection &&
          activeSelection.pageNumber === pageNumber &&
          activeSelection.rects.length > 0 && (
            <svg
              className="wb-pdf-page-selection-overlay"
              viewBox={`0 0 ${width} ${height}`}
              style={{
                position: 'absolute',
                inset: 0,
                width: `${width}px`,
                height: `${height}px`,
                pointerEvents: 'none',
                zIndex: 3,
              }}
            >
              {activeSelection.rects.map((r, rIdx) => (
                <rect
                  key={`sel_rect_${rIdx}`}
                  x={r.x}
                  y={r.y}
                  width={r.width}
                  height={r.height}
                  fill="rgba(0, 120, 215, 0.28)"
                  rx={2}
                  ry={2}
                />
              ))}
            </svg>
          )}

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
  const [activeSelection, setActiveSelection] = useState<ActivePDFSelection | null>(null);

  const widgetContainerRef = useRef<HTMLDivElement>(null);
  const isLocked = Boolean(docEntity.isLocked);

  // Unregister text lines when PDF document widget is removed
  useEffect(() => {
    return () => {
      pdfTextRegistry.unregisterDoc(docEntity.id);
    };
  }, [docEntity.id]);

  // Synchronize Quick Bar screen position on camera transform / window resize
  useEffect(() => {
    if (!activeSelection) return;

    const updateQuickBarScreen = () => {
      const container = widgetContainerRef.current;
      if (!container) return;
      const card = container.querySelector<HTMLElement>(
        `.wb-pdf-page-card[data-page-number="${activeSelection.pageNumber}"]`
      );
      if (!card) return;
      const cRect = card.getBoundingClientRect();
      const lastRect = activeSelection.rects[activeSelection.rects.length - 1];
      if (!lastRect) return;

      const pageWidth = docEntity.width;
      const pageHeight = pageHeights[activeSelection.pageNumber] || Math.round(pageWidth * 1.414);
      const scaleX = cRect.width / pageWidth;
      const scaleY = cRect.height / pageHeight;

      const screenLeft = cRect.left + (lastRect.x + lastRect.width / 2) * scaleX;
      const lastRectTop = cRect.top + lastRect.y * scaleY;
      const lastRectBottom = cRect.top + (lastRect.y + lastRect.height) * scaleY;

      const screenX = Math.round(screenLeft);
      const screenY = Math.round(lastRectTop > 60 ? lastRectTop - 46 : lastRectBottom + 10);

      setActiveSelection((prev) => (prev ? { ...prev, screenX, screenY } : null));
    };

    window.addEventListener('resize', updateQuickBarScreen);
    const unsubCanvas = canvasStore.subscribe(updateQuickBarScreen);

    return () => {
      window.removeEventListener('resize', updateQuickBarScreen);
      unsubCanvas();
    };
  }, [activeSelection?.pageNumber, docEntity.width, pageHeights]);

  // Global Keyboard shortcuts: Escape (dismiss selection) and Ctrl+C (copy)
  useEffect(() => {
    if (!activeSelection) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSelection(null);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
        if (activeSelection?.text) {
          navigator.clipboard.writeText(activeSelection.text);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSelection]);

  // Clear selection if switching away from Select tool
  useEffect(() => {
    if (!isSelectTool) {
      setActiveSelection(null);
    }
  }, [isSelectTool]);

  const handleApplyHighlight = (color: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!activeSelection || activeSelection.rects.length === 0) return;

    const pageNum = activeSelection.pageNumber;
    const pageWidth = docEntity.width;
    const pageHeight = pageHeights[pageNum] || Math.round(pageWidth * 1.414);

    const relRects: PDFHighlightRect[] = activeSelection.rects.map((r) => ({
      relX: Math.max(0, Math.min(1, r.x / pageWidth)),
      relY: Math.max(0, Math.min(1, r.y / pageHeight)),
      width: Math.max(0.005, Math.min(1, r.width / pageWidth)),
      height: Math.max(0.005, Math.min(1, r.height / pageHeight)),
    }));

    const currentDoc = (sceneStore.getEntity(docEntity.id) as PDFDocumentEntity | undefined) || docEntity;
    const existingHighlights = currentDoc.highlights || [];
    const isColorEqual = (c1: string, c2: string) => c1.trim().toLowerCase() === c2.trim().toLowerCase();

    const pageHighlights = existingHighlights.filter((h) => h.pageNumber === pageNum);
    const overlapping = pageHighlights.filter((h) => doesHighlightOverlapRects(h, relRects));
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
        rects: relRects,
        text: activeSelection.text,
        createdAt: Date.now(),
      };
      addPDFHighlight(docEntity.id, newHighlight);
    } else {
      // ADD NEW HIGHLIGHT
      const newHighlight: PDFHighlightAnnotation = {
        id: `hl_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        pageNumber: pageNum,
        color,
        rects: relRects,
        text: activeSelection.text,
        createdAt: Date.now(),
      };
      addPDFHighlight(docEntity.id, newHighlight);
    }

    setActiveSelection(null);
  };

  const handleCopyText = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    if (activeSelection?.text) {
      navigator.clipboard.writeText(activeSelection.text);
    }
    setActiveSelection(null);
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
              activeSelection={activeSelection}
              onSelectionChange={setActiveSelection}
            />
          ))}
      </div>

      {/* Floating Text Selection Quick Bar (PdfCraft Architecture) */}
      {activeSelection && activeSelection.rects.length > 0 && createPortal(
        <div
          id="wb-pdf-text-toolbar"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          style={{
            position: 'fixed',
            left: `${activeSelection.screenX}px`,
            top: `${activeSelection.screenY}px`,
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
            if (activeSelection && activeSelection.rects.length > 0) {
              const pageNum = activeSelection.pageNumber;
              const pageWidth = docEntity.width;
              const pageHeight = pageHeights[pageNum] || Math.round(pageWidth * 1.414);
              const relRects: PDFHighlightRect[] = activeSelection.rects.map((r) => ({
                relX: Math.max(0, Math.min(1, r.x / pageWidth)),
                relY: Math.max(0, Math.min(1, r.y / pageHeight)),
                width: Math.max(0.005, Math.min(1, r.width / pageWidth)),
                height: Math.max(0.005, Math.min(1, r.height / pageHeight)),
              }));
              const currentDoc = (sceneStore.getEntity(docEntity.id) as PDFDocumentEntity | undefined) || docEntity;
              const highlights = currentDoc.highlights || [];
              const matchingHl = highlights.find(
                (h) => h.pageNumber === pageNum && doesHighlightOverlapRects(h, relRects)
              );
              if (matchingHl) {
                activeColor = matchingHl.color.toLowerCase();
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
