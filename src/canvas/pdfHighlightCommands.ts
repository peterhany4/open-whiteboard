/**
 * Open Whiteboard — Granular Command Engine for PDF In-Page Highlight Annotations
 *
 * Implements Acrobat / Edge standard page-relative highlight annotations with
 * isolated, granular undo/redo history (Ctrl+Z / Ctrl+Y).
 *
 * Each highlight operation records a discrete command in HistoryManager,
 * ensuring Ctrl+Z removes strictly the last highlight added without wiping
 * out prior annotations on the document.
 */

import { sceneStore } from '../store/sceneStore';
import { historyManager } from './history';
import type { PDFDocumentEntity, PDFHighlightAnnotation, PDFHighlightRect } from './sceneGraph';

/**
 * Checks whether two page-relative rects substantially overlap
 */
export function doesRectOverlap(r1: PDFHighlightRect, r2: PDFHighlightRect): boolean {
  const overlapX = Math.max(0, Math.min(r1.relX + r1.width, r2.relX + r2.width) - Math.max(r1.relX, r2.relX));
  const overlapY = Math.max(0, Math.min(r1.relY + r1.height, r2.relY + r2.height) - Math.max(r1.relY, r2.relY));
  if (overlapX <= 0 || overlapY <= 0) return false;

  const area1 = Math.max(0.00001, r1.width * r1.height);
  const area2 = Math.max(0.00001, r2.width * r2.height);
  const overlapArea = overlapX * overlapY;

  return overlapArea / area1 >= 0.25 || overlapArea / area2 >= 0.25;
}

/**
 * Checks whether a PDFHighlightAnnotation overlaps any rect in a list of candidate rects
 */
export function doesHighlightOverlapRects(
  hl: PDFHighlightAnnotation,
  rects: PDFHighlightRect[]
): boolean {
  if (!hl.rects || hl.rects.length === 0) return false;
  return hl.rects.some((r1) => rects.some((r2) => doesRectOverlap(r1, r2)));
}

/**
 * Adds an in-page highlight annotation to a PDF document with granular Ctrl+Z / Ctrl+Y history.
 */
export function addPDFHighlight(docId: string, highlight: PDFHighlightAnnotation): void {
  historyManager.execute({
    name: 'Add PDF Highlight',
    execute: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = [...current.filter((h) => h.id !== highlight.id), highlight];
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
    undo: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = current.filter((h) => h.id !== highlight.id);
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
    redo: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = [...current.filter((h) => h.id !== highlight.id), highlight];
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
  });
}

/**
 * Removes an in-page highlight annotation from a PDF document with granular Ctrl+Z / Ctrl+Y history.
 */
export function removePDFHighlight(docId: string, highlightId: string): void {
  const docBefore = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
  const targetHighlight = (docBefore?.highlights || []).find((h) => h.id === highlightId);
  if (!targetHighlight) return;

  historyManager.execute({
    name: 'Remove PDF Highlight',
    execute: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = current.filter((h) => h.id !== highlightId);
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
    undo: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = [...current.filter((h) => h.id !== highlightId), targetHighlight];
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
    redo: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = current.filter((h) => h.id !== highlightId);
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
  });
}

/**
 * Replaces an existing highlight with a new highlight color with granular Ctrl+Z / Ctrl+Y history.
 */
export function replacePDFHighlight(
  docId: string,
  oldHighlight: PDFHighlightAnnotation,
  newHighlight: PDFHighlightAnnotation
): void {
  historyManager.execute({
    name: 'Update PDF Highlight Color',
    execute: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = [...current.filter((h) => h.id !== oldHighlight.id && h.id !== newHighlight.id), newHighlight];
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
    undo: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = [...current.filter((h) => h.id !== newHighlight.id && h.id !== oldHighlight.id), oldHighlight];
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
    redo: () => {
      const doc = sceneStore.getEntity(docId) as PDFDocumentEntity | undefined;
      if (!doc || doc.type !== 'pdf_document') return;
      const current = doc.highlights || [];
      const updated = [...current.filter((h) => h.id !== oldHighlight.id && h.id !== newHighlight.id), newHighlight];
      sceneStore.updateEntity(docId, { highlights: updated }, false);
    },
  });
}
