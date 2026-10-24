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

import React, { memo, useState, useEffect, useRef, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { PDFDocumentEntity } from '../../canvas/sceneGraph';
import { computeEntityBounds } from '../../canvas/sceneGraph';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore, useSelectionStore } from '../../store/selectionStore';
import { historyManager } from '../../canvas/history';
import { useInkingStore } from '../../store/inkingStore';
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

interface PDFPageItemProps {
  pdfDoc: pdfjsLib.PDFDocumentProxy;
  pageNumber: number;
  totalPages: number;
  width: number;
  isSelectTool: boolean;
  onHeightMeasured: (pageNumber: number, height: number) => void;
}

const PDFPageItem: React.FC<PDFPageItemProps> = memo(
  ({ pdfDoc, pageNumber, totalPages, width, isSelectTool, onHeightMeasured }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const textLayerRef = useRef<HTMLDivElement>(null);
    const [pageHeight, setPageHeight] = useState<number>(Math.round(width * 1.414));
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
          const computedHeight = Math.round(viewport.height);

          setPageHeight(computedHeight);
          onHeightMeasured(pageNumber, computedHeight);

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
    }, [pdfDoc, pageNumber, width, onHeightMeasured]);

    return (
      <div
        className="wb-pdf-page-card"
        style={{
          position: 'relative',
          width: `${width}px`,
          height: `${pageHeight}px`,
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
            height: `${pageHeight}px`,
          }}
        />

        {/* Transparent PDF.js Text Layer Overlay */}
        <div
          ref={textLayerRef}
          className="textLayer"
          style={{
            pointerEvents: isSelectTool ? 'auto' : 'none',
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

  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [totalPages, setTotalPages] = useState(docEntity.totalPages || 1);
  const [isLoading, setIsLoading] = useState(true);
  const [isHovered, setIsHovered] = useState(false);
  const pageHeightsRef = useRef<{ [pageNum: number]: number }>({});

  const isLocked = Boolean(docEntity.isLocked);

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

  // Synchronize total height to sceneStore when all page heights are measured
  const handleHeightMeasured = useCallback(
    (pageNumber: number, height: number) => {
      pageHeightsRef.current[pageNumber] = height;

      if (!pdfDoc) return;
      const count = pdfDoc.numPages;
      const measuredKeys = Object.keys(pageHeightsRef.current);

      if (measuredKeys.length >= count) {
        let total = 46; // header (36px) + margin (10px)
        for (let p = 1; p <= count; p++) {
          total += pageHeightsRef.current[p] || height;
          if (p < count) total += 16; // 16px vertical gap between pages
        }

        if (Math.abs(docEntity.height - total) > 8) {
          const updatedEntity: PDFDocumentEntity = {
            ...docEntity,
            height: total,
            bounds: computeEntityBounds({
              ...docEntity,
              height: total,
            }),
          };
          sceneStore.updateEntity(docEntity.id, { height: total, bounds: updatedEntity.bounds }, false);
        }
      }
    },
    [docEntity, pdfDoc]
  );

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
      {/* 1. Modern Fluent Acrylic Document Header */}
      <div
        className="wb-pdf-header"
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
              pageNumber={pageNum}
              totalPages={totalPages}
              width={docEntity.width}
              isSelectTool={isSelectTool}
              onHeightMeasured={handleHeightMeasured}
            />
          ))}
      </div>
    </div>
  );
});

PDFDocumentWidget.displayName = 'PDFDocumentWidget';
