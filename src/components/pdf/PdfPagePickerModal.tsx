/**
 * Microsoft Whiteboard — Local PDF Importer & Page Picker Modal
 *
 * Reverse-Engineered from REA Evidence:
 * - Module 560673 (blueboard/chunks/40049.*.js) -> Documents / PDF insertion workflow
 * - Authentic Whiteboard Page Picker:
 *   - High-DPI thumbnail preview cards with page numbers
 *   - Checkbox selection ("Select All", "Deselect All", individual page click)
 *   - "Insert Selected Pages" rasterizing selected pages at 2x crisp DPI in world canvas coordinates
 *   - Optional "Lock to Background" anchor below ink layer
 */

import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { sceneStore } from '../../store/sceneStore';
import { selectionStore } from '../../store/selectionStore';
import { historyManager } from '../../canvas/history';
import { useCanvasStore } from '../../store/canvasStore';
import { screenToWorld } from '../../canvas/camera';
import type { ImageEntity } from '../../canvas/sceneGraph';
import {
  DocumentPDFIcon,
  DismissIcon,
  CheckmarkIcon,
  LockIcon,
} from '../../assets/icons';

// Initialize PDF.js worker using local Vite asset URL with CDN fallback
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    pdfjsWorker ||
    `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface PdfPickerModalProps {
  file: File | null;
  onClose: () => void;
}

interface PagePreview {
  pageNumber: number;
  thumbnailUrl: string;
  width: number;
  height: number;
}

export const PdfPagePickerModal: React.FC<PdfPickerModalProps> = ({ file, onClose }) => {
  const { camera } = useCanvasStore();
  const [loading, setLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState('');
  const [pages, setPages] = useState<PagePreview[]>([]);
  const [selectedPages, setSelectedPages] = useState<Set<number>>(new Set());
  const [lockToBackground, setLockToBackground] = useState(false);
  const [layoutMode, setLayoutMode] = useState<'horizontal' | 'grid' | 'vertical'>('horizontal');
  const [isInserting, setIsInserting] = useState(false);

  const pdfDocRef = useRef<pdfjsLib.PDFDocumentProxy | null>(null);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && !isInserting) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInserting, onClose]);

  // Load PDF document and render thumbnails
  useEffect(() => {
    if (!file) return;

    let isMounted = true;
    setLoading(true);
    setLoadingProgress('Reading PDF document...');

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) throw new Error('Empty file buffer');

        setLoadingProgress('Loading document structure...');
        const loadingTask = pdfjsLib.getDocument({
          data: arrayBuffer,
          cMapUrl: 'https://unpkg.com/pdfjs-dist@6.4.299/cmaps/',
          cMapPacked: true,
        });

        const pdfDoc = await loadingTask.promise;
        if (!isMounted) return;

        pdfDocRef.current = pdfDoc;
        const total = pdfDoc.numPages;
        const previews: PagePreview[] = [];
        const initialSelected = new Set<number>();

        for (let i = 1; i <= total; i++) {
          if (!isMounted) return;
          setLoadingProgress(`Rendering thumbnail ${i} of ${total}...`);

          const page = await pdfDoc.getPage(i);
          const unscaledVp = page.getViewport({ scale: 1.0 });

          // Render thumbnail at width ~180px
          const thumbScale = 180 / unscaledVp.width;
          const thumbVp = page.getViewport({ scale: thumbScale });

          const canvas = document.createElement('canvas');
          canvas.width = Math.round(thumbVp.width);
          canvas.height = Math.round(thumbVp.height);
          const ctx = canvas.getContext('2d');

          if (ctx) {
            // Fill crisp white background before rendering PDF vectors
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            await page.render({
              canvas,
              canvasContext: ctx,
              viewport: thumbVp,
            }).promise;

            previews.push({
              pageNumber: i,
              thumbnailUrl: canvas.toDataURL('image/jpeg', 0.85),
              width: unscaledVp.width,
              height: unscaledVp.height,
            });
          }

          initialSelected.add(i);
        }

        if (isMounted) {
          setPages(previews);
          setSelectedPages(initialSelected);
          setLoading(false);
        }
      } catch (err) {
        console.error('[PdfPagePickerModal] Failed to load PDF:', err);
        if (isMounted) {
          setLoadingProgress('Failed to load PDF document.');
          setLoading(false);
        }
      }
    };

    reader.onerror = () => {
      if (isMounted) {
        setLoadingProgress('Error reading file.');
        setLoading(false);
      }
    };

    reader.readAsArrayBuffer(file);

    return () => {
      isMounted = false;
      if (pdfDocRef.current) {
        pdfDocRef.current.cleanup();
      }
    };
  }, [file]);

  const togglePageSelection = (pNum: number) => {
    setSelectedPages((prev) => {
      const next = new Set(prev);
      if (next.has(pNum)) {
        next.delete(pNum);
      } else {
        next.add(pNum);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedPages(new Set(pages.map((p) => p.pageNumber)));
  };

  const handleDeselectAll = () => {
    setSelectedPages(new Set());
  };

  // High-DPI rasterization and board insertion
  const handleInsertSelected = async () => {
    if (!pdfDocRef.current || selectedPages.size === 0) return;
    setIsInserting(true);

    try {
      const pdfDoc = pdfDocRef.current;
      const sortedSelected = Array.from(selectedPages).sort((a, b) => a - b);

      // World coordinates center
      const screenCenter = {
        x: typeof window !== 'undefined' ? window.innerWidth / 2 : 960,
        y: typeof window !== 'undefined' ? window.innerHeight / 2 : 540,
      };
      const worldCenter = screenToWorld(screenCenter, camera);

      const insertedEntities: ImageEntity[] = [];
      const newIds: string[] = [];
      const gap = 48; // Gap between pages in world units

      let currentX = worldCenter.x;
      let currentY = worldCenter.y;

      // Calculate total bounding width for centering
      let totalWidth = 0;
      let maxHeight = 0;
      for (const pNum of sortedSelected) {
        const pInfo = pages.find((p) => p.pageNumber === pNum);
        if (pInfo) {
          totalWidth += pInfo.width + gap;
          if (pInfo.height > maxHeight) maxHeight = pInfo.height;
        }
      }
      totalWidth -= gap;

      if (layoutMode === 'horizontal') {
        currentX = Math.round(worldCenter.x - totalWidth / 2);
        currentY = Math.round(worldCenter.y - maxHeight / 2);
      } else if (layoutMode === 'vertical') {
        currentX = Math.round(worldCenter.x - (pages[0]?.width || 600) / 2);
        currentY = Math.round(worldCenter.y - (pages.length * 400) / 2);
      } else {
        // Grid (2 columns)
        const colWidth = (pages[0]?.width || 600) * 2 + gap;
        currentX = Math.round(worldCenter.x - colWidth / 2);
        currentY = Math.round(worldCenter.y - 400);
      }

      let colIndex = 0;
      let rowMaxHeight = 0;

      for (let idx = 0; idx < sortedSelected.length; idx++) {
        const pNum = sortedSelected[idx];
        const page = await pdfDoc.getPage(pNum);

        // High-DPI 2.0x scale rasterization
        const hiDpiScale = 2.0;
        const hiDpiVp = page.getViewport({ scale: hiDpiScale });
        const unscaledVp = page.getViewport({ scale: 1.0 });

        const canvas = document.createElement('canvas');
        canvas.width = Math.round(hiDpiVp.width);
        canvas.height = Math.round(hiDpiVp.height);
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          await page.render({
            canvas,
            canvasContext: ctx,
            viewport: hiDpiVp,
          }).promise;

          const dataUrl = canvas.toDataURL('image/png');
          const timestamp = Date.now();
          const entityId = `pdf_${timestamp}_p${pNum}_${Math.random().toString(36).slice(2, 6)}`;

          const displayW = Math.round(unscaledVp.width);
          const displayH = Math.round(unscaledVp.height);

          let posX = currentX;
          let posY = currentY;

          if (layoutMode === 'horizontal') {
            posX = currentX;
            posY = currentY;
            currentX += displayW + gap;
          } else if (layoutMode === 'vertical') {
            posX = currentX;
            posY = currentY;
            currentY += displayH + gap;
          } else {
            // Grid 2-column layout
            if (colIndex === 0) {
              posX = currentX;
              posY = currentY;
              rowMaxHeight = displayH;
              colIndex = 1;
            } else {
              posX = currentX + (pages[0]?.width || displayW) + gap;
              posY = currentY;
              currentY += Math.max(rowMaxHeight, displayH) + gap;
              colIndex = 0;
            }
          }

          const entity: ImageEntity = {
            id: entityId,
            type: 'image',
            x: posX,
            y: posY,
            width: displayW,
            height: displayH,
            src: dataUrl,
            isLockedToBackground: lockToBackground,
            isLocked: lockToBackground,
            fileName: `${file?.name || 'Document'} (Page ${pNum})`,
            zIndex: lockToBackground ? 50 : 100,
            bounds: {
              minX: posX,
              minY: posY,
              maxX: posX + displayW,
              maxY: posY + displayH,
            },
            createdAt: timestamp,
            updatedAt: timestamp,
          };

          insertedEntities.push(entity);
          newIds.push(entityId);
        }
      }

      // Commit to scene store with atomic Undo/Redo
      historyManager.inUndoGroup(`Insert ${insertedEntities.length} PDF Pages`, () => {
        for (const item of insertedEntities) {
          sceneStore.addEntity(item, true);
        }
      });

      if (!lockToBackground && newIds.length > 0) {
        selectionStore.selectMultiple(newIds);
      }

      setIsInserting(false);
      onClose();
    } catch (err) {
      console.error('[PdfPagePickerModal] Error inserting pages:', err);
      setIsInserting(false);
    }
  };

  if (!file) return null;

  return (
    <div
      id="wb-pdf-picker-backdrop"
      onPointerDown={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.45)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        animation: 'wbFadeIn 0.15s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isInserting) {
          onClose();
        }
      }}
    >
      <div
        id="wb-pdf-picker-modal"
        style={{
          width: '100%',
          maxWidth: '820px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'var(--colorNeutralBackground1, #FFFFFF)',
          color: 'var(--colorNeutralForeground1, #1F1F1F)',
          borderRadius: '12px',
          boxShadow: '0 20px 48px rgba(0, 0, 0, 0.28)',
          border: '1px solid var(--colorNeutralStroke1, rgba(0, 0, 0, 0.12))',
          overflow: 'hidden',
          animation: 'wbPopoverFadeIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: '1px solid var(--colorNeutralStroke1, rgba(0, 0, 0, 0.08))',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <DocumentPDFIcon size={24} color="#E71224" />
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600 }}>{file.name}</div>
              <div style={{ fontSize: '12px', color: 'var(--colorNeutralForeground3, #616161)' }}>
                {pages.length > 0
                  ? `${pages.length} pages available • Choose pages to insert onto whiteboard`
                  : 'Analyzing document...'}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            title="Close"
            disabled={isInserting}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: 'transparent',
              color: 'var(--colorNeutralForeground1, #1F1F1F)',
              cursor: isInserting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <DismissIcon size={18} />
          </button>
        </div>

        {/* Toolbar */}
        {!loading && pages.length > 0 && (
          <div
            style={{
              padding: '10px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'var(--colorNeutralBackground2, #F5F5F5)',
              borderBottom: '1px solid var(--colorNeutralStroke1, rgba(0, 0, 0, 0.08))',
              fontSize: '12px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={handleSelectAll}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--colorNeutralStroke1, #D1D1D1)',
                  backgroundColor: 'var(--colorNeutralBackground1, #FFFFFF)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Select All
              </button>
              <button
                onClick={handleDeselectAll}
                style={{
                  padding: '4px 10px',
                  borderRadius: '4px',
                  border: '1px solid var(--colorNeutralStroke1, #D1D1D1)',
                  backgroundColor: 'var(--colorNeutralBackground1, #FFFFFF)',
                  color: 'inherit',
                  cursor: 'pointer',
                  fontWeight: 500,
                }}
              >
                Deselect All
              </button>
              <span style={{ marginLeft: '6px', color: 'var(--colorNeutralForeground3, #616161)' }}>
                {selectedPages.size} of {pages.length} selected
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {/* Layout options */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: 'var(--colorNeutralForeground3, #616161)' }}>Arrangement:</span>
                {(['horizontal', 'grid', 'vertical'] as const).map((mode) => (
                  <button
                    key={mode}
                    onClick={() => setLayoutMode(mode)}
                    style={{
                      padding: '3px 8px',
                      borderRadius: '4px',
                      border: layoutMode === mode ? '1px solid #0078D4' : '1px solid transparent',
                      backgroundColor: layoutMode === mode ? 'rgba(0, 120, 212, 0.12)' : 'transparent',
                      color: layoutMode === mode ? '#0078D4' : 'inherit',
                      cursor: 'pointer',
                      fontWeight: layoutMode === mode ? 600 : 400,
                      textTransform: 'capitalize',
                      fontSize: '11px',
                    }}
                  >
                    {mode}
                  </button>
                ))}
              </div>

              {/* Lock to background toggle */}
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  userSelect: 'none',
                }}
              >
                <input
                  type="checkbox"
                  checked={lockToBackground}
                  onChange={(e) => setLockToBackground(e.target.checked)}
                  style={{ cursor: 'pointer' }}
                />
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontWeight: 500 }}>
                  <LockIcon size={13} color={lockToBackground ? '#0078D4' : 'currentColor'} />
                  Lock to Background
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Thumbnail Grid / Loading state */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            minHeight: '260px',
            maxHeight: '480px',
          }}
        >
          {loading ? (
            <div
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '12px',
                padding: '40px 0',
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '3px solid rgba(0, 120, 212, 0.2)',
                  borderTopColor: '#0078D4',
                  borderRadius: '50%',
                  animation: 'wbRotate 0.8s linear infinite',
                }}
              />
              <div style={{ fontSize: '13px', fontWeight: 500 }}>{loadingProgress}</div>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
                gap: '16px',
              }}
            >
              {pages.map((p) => {
                const isSelected = selectedPages.has(p.pageNumber);
                return (
                  <div
                    key={p.pageNumber}
                    onClick={() => togglePageSelection(p.pageNumber)}
                    style={{
                      position: 'relative',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '8px',
                      border: isSelected
                        ? '2px solid #0078D4'
                        : '1px solid var(--colorNeutralStroke1, #E0E0E0)',
                      backgroundColor: 'var(--colorNeutralBackground1, #FFFFFF)',
                      padding: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      boxShadow: isSelected
                        ? '0 0 0 1px #0078D4, 0 4px 12px rgba(0, 120, 212, 0.15)'
                        : '0 2px 4px rgba(0, 0, 0, 0.04)',
                    }}
                  >
                    {/* Checkbox badge */}
                    <div
                      style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        width: '20px',
                        height: '20px',
                        borderRadius: '4px',
                        border: isSelected ? 'none' : '2px solid rgba(0,0,0,0.3)',
                        backgroundColor: isSelected ? '#0078D4' : 'rgba(255, 255, 255, 0.9)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                        zIndex: 2,
                      }}
                    >
                      {isSelected && <CheckmarkIcon size={14} color="#FFFFFF" />}
                    </div>

                    {/* Page Thumbnail Image */}
                    <div
                      style={{
                        width: '100%',
                        height: '190px',
                        backgroundColor: '#FFFFFF',
                        borderRadius: '4px',
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                      }}
                    >
                      <img
                        src={p.thumbnailUrl}
                        alt={`Page ${p.pageNumber}`}
                        style={{
                          maxWidth: '100%',
                          maxHeight: '100%',
                          objectFit: 'contain',
                        }}
                      />
                    </div>

                    {/* Page label */}
                    <div
                      style={{
                        marginTop: '8px',
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? '#0078D4' : 'inherit',
                      }}
                    >
                      Page {p.pageNumber}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '14px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '1px solid var(--colorNeutralStroke1, rgba(0, 0, 0, 0.08))',
            backgroundColor: 'var(--colorNeutralBackground2, #FBFBFB)',
          }}
        >
          <div style={{ fontSize: '11px', color: 'var(--colorNeutralForeground3, #616161)' }}>
            Selected pages will be rasterized at 2x crisp DPI for fluid zoom and inking.
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <button
              onClick={onClose}
              disabled={isInserting}
              style={{
                padding: '6px 16px',
                borderRadius: '6px',
                border: '1px solid var(--colorNeutralStroke1, #D1D1D1)',
                backgroundColor: 'var(--colorNeutralBackground1, #FFFFFF)',
                color: 'inherit',
                fontSize: '13px',
                fontWeight: 500,
                cursor: isInserting ? 'not-allowed' : 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleInsertSelected}
              disabled={loading || selectedPages.size === 0 || isInserting}
              style={{
                padding: '6px 18px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor:
                  loading || selectedPages.size === 0 || isInserting
                    ? 'var(--colorNeutralStroke1, #E0E0E0)'
                    : '#0078D4',
                color: '#FFFFFF',
                fontSize: '13px',
                fontWeight: 600,
                cursor:
                  loading || selectedPages.size === 0 || isInserting
                    ? 'not-allowed'
                    : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'background-color 0.12s ease',
              }}
            >
              {isInserting ? (
                <>
                  <div
                    style={{
                      width: '14px',
                      height: '14px',
                      border: '2px solid rgba(255,255,255,0.4)',
                      borderTopColor: '#FFFFFF',
                      borderRadius: '50%',
                      animation: 'wbRotate 0.8s linear infinite',
                    }}
                  />
                  <span>Inserting {selectedPages.size} Pages...</span>
                </>
              ) : (
                <span>Insert {selectedPages.size} Selected Pages</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
