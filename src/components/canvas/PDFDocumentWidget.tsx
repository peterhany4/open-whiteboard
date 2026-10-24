/**
 * Open Whiteboard — Interactive PDF Document Canvas Widget
 *
 * Reverse-Engineered from REA Evidence:
 * - Module 93425 & 560673: Canvas document embedding and interactive document inspection
 * - Multi-page rendering with high-DPI scaling, selectable PDF.js TextLayer,
 *   continuous wheel-based page switching, and inking passthrough.
 */

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentEntity } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { historyManager } from '../../canvas/history';
import { useInkingStore } from '../../store/inkingStore';
import {
  DocumentPDFIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
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

interface PDFDocumentWidgetProps {
  document: PDFDocumentEntity;
}

export const PDFDocumentWidget: React.FC<PDFDocumentWidgetProps> = memo(({ document: docEntity }) => {
  const { isSelected: checkIsSelected } = useSelectionStore();
  const isSelected = checkIsSelected(docEntity.id);
  const { selectedTool } = useInkingStore();
  const isSelectTool = selectedTool === 'Select';

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState(docEntity.currentPage || 1);
  const [totalPages, setTotalPages] = useState(docEntity.totalPages || 1);
  const [pageJumpInput, setPageJumpInput] = useState(String(docEntity.currentPage || 1));
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const activeRenderTaskRef = useRef<any>(null);
  const lastWheelTimeRef = useRef<number>(0);
  const touchStartYRef = useRef<number | null>(null);

  const isLocked = Boolean(docEntity.isLocked);

  // Sync currentPage from entity props if changed externally (e.g. undo/redo)
  useEffect(() => {
    if (docEntity.currentPage && docEntity.currentPage !== currentPage) {
      setCurrentPage(docEntity.currentPage);
      setPageJumpInput(String(docEntity.currentPage));
    }
  }, [docEntity.currentPage]);

  // Load PDF document proxy once on mount or when pdfData changes
  useEffect(() => {
    let isCancelled = false;
    setIsLoading(true);

    const loadTask = pdfjsLib.getDocument({
      data: dataUrlToUint8Array(docEntity.pdfData),
      cMapUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/cmaps/',
      cMapPacked: true,
    });

    loadTask.promise
      .then((loadedDoc) => {
        if (isCancelled) return;
        setPdfDoc(loadedDoc);
        setTotalPages(loadedDoc.numPages);
        if (loadedDoc.numPages !== docEntity.totalPages) {
          sceneStore.updateEntity(docEntity.id, { totalPages: loadedDoc.numPages }, false);
        }
        setIsLoading(false);
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

  // Render active PDF page onto canvas and text layer overlay
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;

    // Cancel any in-flight rendering task
    if (activeRenderTaskRef.current) {
      try {
        activeRenderTaskRef.current.cancel();
      } catch {
        // Ignore cancellation error
      }
      activeRenderTaskRef.current = null;
    }

    const renderActivePage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const scale = docEntity.width / unscaledViewport.width;
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

        const renderContext = {
          canvas,
          canvasContext: ctx,
          viewport,
        };

        const renderTask = page.render(renderContext);
        activeRenderTaskRef.current = renderTask;
        await renderTask.promise;
        ctx.restore();

        if (isCancelled) return;

        // Render TextLayer overlay for text selection & copying (Milestone 11.2)
        if (textLayerRef.current) {
          const textContainer = textLayerRef.current;
          textContainer.innerHTML = '';
          textContainer.style.width = `${viewport.width}px`;
          textContainer.style.height = `${viewport.height}px`;

          try {
            const textContent = await page.getTextContent();
            if (isCancelled) return;

            const textLayer = new pdfjsLib.TextLayer({
              textContentSource: textContent,
              container: textContainer,
              viewport,
            });
            await textLayer.render();
          } catch (textErr) {
            console.warn('[PDFDocumentWidget] Text layer render error:', textErr);
          }
        }
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException') {
          return;
        }
        console.error('[PDFDocumentWidget] Page render error:', err);
      }
    };

    renderActivePage();

    return () => {
      isCancelled = true;
      if (activeRenderTaskRef.current) {
        try {
          activeRenderTaskRef.current.cancel();
        } catch {
          // Ignore cancellation
        }
      }
    };
  }, [pdfDoc, currentPage, docEntity.width]);

  // Page Navigation Handlers with Undo/Redo integration
  const handlePageChange = useCallback(
    (newPage: number) => {
      if (newPage < 1 || newPage > totalPages || newPage === currentPage) return;
      const prevPage = currentPage;

      historyManager.execute({
        name: `Go to PDF Page ${newPage}`,
        execute: () => {
          setCurrentPage(newPage);
          setPageJumpInput(String(newPage));
          sceneStore.updateEntity(docEntity.id, { currentPage: newPage }, true);
        },
        undo: () => {
          setCurrentPage(prevPage);
          setPageJumpInput(String(prevPage));
          sceneStore.updateEntity(docEntity.id, { currentPage: prevPage }, true);
        },
      });
    },
    [currentPage, totalPages, docEntity.id]
  );

  const handlePageJumpSubmit = (valStr: string) => {
    const val = parseInt(valStr.trim(), 10);
    if (!isNaN(val) && val >= 1 && val <= totalPages) {
      handlePageChange(val);
    } else {
      setPageJumpInput(String(currentPage));
    }
  };

  // Toggle standard (600px) vs expanded (900px) width
  const handleToggleFitWidth = (e: React.MouseEvent) => {
    e.stopPropagation();
    const isStandard = docEntity.width <= 650;
    const targetWidth = isStandard ? 900 : 600;
    const prevWidth = docEntity.width;
    const prevHeight = docEntity.height;

    const ratio = (docEntity.height - 36) / Math.max(1, docEntity.width);
    const targetHeight = Math.round(targetWidth * ratio) + 36;

    historyManager.execute({
      name: isStandard ? 'Expand PDF Width' : 'Fit Standard PDF Width',
      execute: () => {
        sceneStore.updateEntity(docEntity.id, { width: targetWidth, height: targetHeight }, true);
      },
      undo: () => {
        sceneStore.updateEntity(docEntity.id, { width: prevWidth, height: prevHeight }, true);
      },
    });
  };

  // Wheel-based page scrolling when cursor is over the document and not zooming
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.altKey) return;
    const now = Date.now();
    if (now - lastWheelTimeRef.current < 250) return; // Debounce 250ms

    if (e.deltaY > 30) {
      if (currentPage < totalPages) {
        e.stopPropagation();
        lastWheelTimeRef.current = now;
        handlePageChange(currentPage + 1);
      }
    } else if (e.deltaY < -30) {
      if (currentPage > 1) {
        e.stopPropagation();
        lastWheelTimeRef.current = now;
        handlePageChange(currentPage - 1);
      }
    }
  };

  // Touch swipe page scrolling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartYRef.current = e.touches[0].clientY;
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null && e.changedTouches.length === 1) {
      const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
      touchStartYRef.current = null;
      if (deltaY < -50 && currentPage < totalPages) {
        handlePageChange(currentPage + 1);
      } else if (deltaY > 50 && currentPage > 1) {
        handlePageChange(currentPage - 1);
      }
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isLocked) return;

    if (e.button === 0 && isSelectTool) {
      e.stopPropagation();
      const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
      selectionStore.select(docEntity.id, isMulti);
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

  return (
    <div
      id={`pdf-${docEntity.id}`}
      style={{
        position: 'absolute',
        left: `${docEntity.x}px`,
        top: `${docEntity.y}px`,
        width: `${docEntity.width}px`,
        height: `${docEntity.height}px`,
        zIndex: isLocked ? 50 : (docEntity.zIndex || 100),
        borderRadius: '8px',
        boxShadow: isSelected
          ? '0 0 0 2px var(--themePrimary), var(--shadow16, 0 8px 24px rgba(0,0,0,0.18))'
          : isHovered
          ? '0 6px 20px rgba(0,0,0,0.16)'
          : '0 4px 16px rgba(0,0,0,0.12)',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        pointerEvents: 'auto',
        userSelect: 'none',
        transition: 'box-shadow 0.15s ease',
      }}
      onPointerDown={handlePointerDown}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 1. Modern Fluent Acrylic Document Header */}
      <div
        className="wb-pdf-header"
        style={{
          height: '36px',
          padding: '0 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: 'var(--wb-acrylic-background, rgba(255,255,255,0.85))',
          backdropFilter: 'var(--wb-acrylic-backdrop-filter, blur(16px))',
          WebkitBackdropFilter: 'var(--wb-acrylic-backdrop-filter, blur(16px))',
          borderBottom: '1px solid var(--colorNeutralStroke1, #E1DFDD)',
          color: 'var(--colorNeutralForeground1, #242424)',
          fontSize: '12px',
          zIndex: 10,
          pointerEvents: 'auto',
          userSelect: 'none',
        }}
      >
        {/* Left: PDF badge & document title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
          <DocumentPDFIcon size={16} color="#E71224" />
          <span
            title={docEntity.title}
            style={{
              fontWeight: 600,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '160px',
            }}
          >
            {docEntity.title || 'PDF Document'}
          </span>
        </div>

        {/* Center: Page Navigation Controls with Quick Page Jump */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePageChange(currentPage - 1);
            }}
            disabled={currentPage <= 1}
            title="Previous Page (Wheel Up)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: currentPage <= 1 ? 'var(--colorNeutralForegroundDisabled, #A19F9D)' : 'var(--colorNeutralForeground1, #242424)',
              cursor: currentPage <= 1 ? 'default' : 'pointer',
              padding: 0,
            }}
          >
            <ChevronLeftIcon size={14} />
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <input
              type="text"
              value={pageJumpInput}
              onChange={(e) => setPageJumpInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handlePageJumpSubmit(pageJumpInput);
                  (e.target as HTMLInputElement).blur();
                }
              }}
              onBlur={() => handlePageJumpSubmit(pageJumpInput)}
              onClick={(e) => e.stopPropagation()}
              title="Jump to page number (press Enter)"
              style={{
                width: '28px',
                height: '20px',
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: 600,
                border: '1px solid var(--colorNeutralStroke2, #D1D1D1)',
                borderRadius: '3px',
                backgroundColor: 'var(--colorNeutralBackground1, #FFFFFF)',
                color: 'var(--colorNeutralForeground1, #242424)',
                padding: '0 2px',
                outline: 'none',
              }}
            />
            <span style={{ fontSize: '11px', fontWeight: 600, opacity: 0.75, whiteSpace: 'nowrap' }}>
              / {totalPages}
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePageChange(currentPage + 1);
            }}
            disabled={currentPage >= totalPages}
            title="Next Page (Wheel Down)"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              borderRadius: '4px',
              border: 'none',
              backgroundColor: 'transparent',
              color: currentPage >= totalPages ? 'var(--colorNeutralForegroundDisabled, #A19F9D)' : 'var(--colorNeutralForeground1, #242424)',
              cursor: currentPage >= totalPages ? 'default' : 'pointer',
              padding: 0,
            }}
          >
            <ChevronRightIcon size={14} />
          </button>
        </div>

        {/* Right: Actions (Fit Width, Lock, Delete) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
          <button
            onClick={handleToggleFitWidth}
            title={docEntity.width <= 650 ? 'Expand Width (900px)' : 'Fit Standard Width (600px)'}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
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
              width: '24px',
              height: '24px',
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
                width: '24px',
                height: '24px',
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

      {/* 2. Document Page Surface & Transparent Text Layer */}
      <div
        className="wb-pdf-content"
        style={{
          position: 'relative',
          flex: 1,
          width: '100%',
          overflow: 'hidden',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          // Crucial: Inking tools draw directly over the document when inking is active!
          pointerEvents: isSelectTool ? 'auto' : 'none',
        }}
      >
        {isLoading && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              color: 'var(--colorNeutralForeground3, #616161)',
              fontSize: '12px',
              backgroundColor: '#FFFFFF',
              zIndex: 5,
            }}
          >
            <DocumentPDFIcon size={32} color="#E71224" />
            <span>Loading page {currentPage}...</span>
          </div>
        )}

        {/* High-DPI Rendered PDF Canvas */}
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            maxWidth: '100%',
            height: 'auto',
          }}
        />

        {/* Selectable & Copyable PDF.js Text Layer Overlay (Milestone 11.2) */}
        <div
          ref={textLayerRef}
          className="textLayer"
          style={{
            pointerEvents: isSelectTool ? 'auto' : 'none',
          }}
        />
      </div>
    </div>
  );
});

PDFDocumentWidget.displayName = 'PDFDocumentWidget';
