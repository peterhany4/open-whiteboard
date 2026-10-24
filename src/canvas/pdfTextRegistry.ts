/**
 * Open Whiteboard — PDF Text Line Spatial Registry
 *
 * Maintains relative line bounding boxes for rendered PDF document pages
 * to enable zero-overhead snap-to-text alignment for Highlighter inking.
 *
 * Reverse-Engineered from REA Evidence:
 * - Module 93425 & 560673: Document canvas text layer anchoring
 * - Module 40049 & 65345: Magnetic guide snapping & baseline constraint
 */

import type { Point } from './camera';
import type { PDFDocumentEntity } from './sceneGraph';

export interface PDFTextLine {
  id: string;
  docId: string;
  pageNumber: number;
  relMinX: number; // relative to document root X
  relMaxX: number; // relative to document root X
  relCenterY: number; // relative to document root Y
  relHeight: number; // height in unscaled document units
}

export interface PDFPageInfo {
  docId: string;
  pageNumber: number;
  pageOffsetY: number;
  width: number;
  height: number;
}

export class PDFTextRegistry {
  private linesByDoc = new Map<string, PDFTextLine[]>();
  private pagesByDoc = new Map<string, Map<number, PDFPageInfo>>();

  public registerDocPageLines(docId: string, pageNumber: number, lines: PDFTextLine[]) {
    const existing = this.linesByDoc.get(docId) || [];
    const filtered = existing.filter((l) => l.pageNumber !== pageNumber);
    filtered.push(...lines);
    this.linesByDoc.set(docId, filtered);
  }

  public registerDocPage(docId: string, pageNumber: number, pageOffsetY: number, width: number, height: number) {
    let docPages = this.pagesByDoc.get(docId);
    if (!docPages) {
      docPages = new Map();
      this.pagesByDoc.set(docId, docPages);
    }
    docPages.set(pageNumber, { docId, pageNumber, pageOffsetY, width, height });
  }

  public getDocPage(docId: string, pageNumber: number): PDFPageInfo | undefined {
    return this.pagesByDoc.get(docId)?.get(pageNumber);
  }

  public getDocPages(docId: string): PDFPageInfo[] {
    const docPages = this.pagesByDoc.get(docId);
    return docPages ? Array.from(docPages.values()) : [];
  }

  public findPageAtWorldPoint(
    doc: PDFDocumentEntity,
    worldPt: Point
  ): PDFPageInfo | null {
    const docPages = this.pagesByDoc.get(doc.id);
    if (!docPages) return null;

    const relX = worldPt.x - doc.x;
    const relY = worldPt.y - doc.y;

    for (const pageInfo of docPages.values()) {
      if (
        relX >= 0 &&
        relX <= pageInfo.width &&
        relY >= pageInfo.pageOffsetY &&
        relY <= pageInfo.pageOffsetY + pageInfo.height
      ) {
        return pageInfo;
      }
    }
    return null;
  }

  public unregisterDoc(docId: string) {
    this.linesByDoc.delete(docId);
    this.pagesByDoc.delete(docId);
  }

  public getDocLines(docId: string): PDFTextLine[] {
    return this.linesByDoc.get(docId) || [];
  }

  public getAllDocIds(): string[] {
    return Array.from(this.linesByDoc.keys());
  }

  /**
   * Snaps a world coordinate point to the nearest PDF text line if within tolerance.
   *
   * @param worldPt Candidate ink point in world coordinates
   * @param allDocs All active canvas PDFDocumentEntity objects
   * @param tolerance Vertical proximity threshold in world pixels (default: 12px)
   */
  public snapPointToText(
    worldPt: Point,
    allDocs: PDFDocumentEntity[],
    tolerance: number = 12
  ): { point: Point; snappedLine: PDFTextLine | null } {
    for (const doc of allDocs) {
      if (doc.type !== 'pdf_document') continue;

      // Quick bounding box reject
      if (
        worldPt.x < doc.x - 24 ||
        worldPt.x > doc.x + doc.width + 24 ||
        worldPt.y < doc.y - 24 ||
        worldPt.y > doc.y + doc.height + 24
      ) {
        continue;
      }

      const lines = this.linesByDoc.get(doc.id);
      if (!lines || lines.length === 0) continue;

      const relX = worldPt.x - doc.x;
      const relY = worldPt.y - doc.y;

      for (const line of lines) {
        // Vertical distance check
        const dy = Math.abs(relY - line.relCenterY);
        if (dy <= tolerance) {
          // Horizontal span check with lead-in margin
          if (relX >= line.relMinX - 16 && relX <= line.relMaxX + 16) {
            return {
              point: {
                x: worldPt.x,
                y: doc.y + line.relCenterY,
              },
              snappedLine: line,
            };
          }
        }
      }
    }

    return { point: worldPt, snappedLine: null };
  }
}

export const pdfTextRegistry = new PDFTextRegistry();
