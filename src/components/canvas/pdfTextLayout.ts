/**
 * Open Whiteboard — PdfCraft-Engineered Reading-Order PDF Text Layout & Selection
 *
 * Reverse-Engineered from PdfCraft (C:\Program Files\PdfCraft & storytold/pdfcraft):
 * - crates/render/src/text.rs:
 *   - nearest(x, y) with 3.0x vertical penalty: dist = dx + 3.0 * dy (magnetic line lock)
 *   - merged_rects / line_rects: merges consecutive glyphs on same line into single continuous rects
 *   - word_at & line_at: semantic word and line boundary resolution
 *   - text_of: clean reading-order text reconstruction with spaces & newlines
 * - crates/ui-egui/src/canvas.rs:
 *   - multi-click unit progression: 1=char, 2=word, 3=line, 4=page
 */

export interface PDFGlyphItem {
  index: number;
  char: string;
  relX: number; // page-relative X in pixels
  relY: number; // page-relative Y in pixels
  width: number;
  height: number;
  lineIndex: number;
  wordIndex: number;
  hasSpaceBefore: boolean;
  quad: [[number, number], [number, number], [number, number], [number, number]];
}

export interface MergedLineRect {
  x: number;
  y: number;
  width: number;
  height: number;
  lineIndex: number;
}

/**
 * Checks whether point (x, y) lies inside the glyph bounding quad.
 */
function quadContains(
  quad: [[number, number], [number, number], [number, number], [number, number]],
  x: number,
  y: number
): boolean {
  const minX = Math.min(quad[0][0], quad[1][0], quad[2][0], quad[3][0]);
  const maxX = Math.max(quad[0][0], quad[1][0], quad[2][0], quad[3][0]);
  const minY = Math.min(quad[0][1], quad[1][1], quad[2][1], quad[3][1]);
  const maxY = Math.max(quad[0][1], quad[1][1], quad[2][1], quad[3][1]);
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

/**
 * Finds the glyph nearest to (x, y) using PdfCraft's magnetic line-lock algorithm:
 * - A glyph whose drawn em quad contains the point wins (distance = 0).
 * - Outside the quad, vertical distance has a 3.0x penalty: `distance = dx + 3.0 * dy`.
 * - Ties are broken by distance to glyph center.
 */
export function findNearestGlyph(
  x: number,
  y: number,
  glyphs: PDFGlyphItem[]
): number | null {
  if (!glyphs || glyphs.length === 0) return null;

  const centerDist = (g: PDFGlyphItem) => {
    const cx = g.relX + g.width / 2;
    const cy = g.relY + g.height / 2;
    return (cx - x) * (cx - x) + (cy - y) * (cy - y);
  };

  // 1. Direct hit inside quad
  let bestInsideIdx: number | null = null;
  let bestInsideDist = Infinity;
  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    if (quadContains(g.quad, x, y)) {
      const d = centerDist(g);
      if (d < bestInsideDist) {
        bestInsideDist = d;
        bestInsideIdx = i;
      }
    }
  }
  if (bestInsideIdx !== null) return bestInsideIdx;

  // 2. Nearest with 3.0x vertical penalty
  let bestIdx: number | null = null;
  let bestWeightedDist = Infinity;
  let bestCenterDist = Infinity;

  for (let i = 0; i < glyphs.length; i++) {
    const g = glyphs[i];
    const rectX0 = g.relX;
    const rectX1 = g.relX + g.width;
    const rectY0 = g.relY;
    const rectY1 = g.relY + g.height;

    let dx = 0;
    if (x < rectX0) dx = rectX0 - x;
    else if (x > rectX1) dx = x - rectX1;

    let dy = 0;
    if (y < rectY0) dy = rectY0 - y;
    else if (y > rectY1) dy = y - rectY1;

    const weightedDist = dx + dy * 3.0;
    const cd = centerDist(g);

    if (
      weightedDist < bestWeightedDist ||
      (Math.abs(weightedDist - bestWeightedDist) < 1e-4 && cd < bestCenterDist)
    ) {
      bestWeightedDist = weightedDist;
      bestCenterDist = cd;
      bestIdx = i;
    }
  }

  return bestIdx;
}

/**
 * Merges the bounding boxes of a range of glyphs into ONE rectangle per line (PdfCraft merged_rects).
 * Produces crisp, continuous vector highlights without ragged stepped edges or kerning gaps.
 */
export function computeMergedLineRects(
  glyphs: PDFGlyphItem[],
  startIndex: number,
  endIndex: number
): MergedLineRect[] {
  if (!glyphs || glyphs.length === 0) return [];
  const start = Math.max(0, Math.min(startIndex, endIndex));
  const end = Math.min(glyphs.length - 1, Math.max(startIndex, endIndex));
  if (start > end) return [];

  const out: {
    line: number;
    lastIndex: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
  }[] = [];

  for (let i = start; i <= end; i++) {
    const g = glyphs[i];
    if (!g) continue;
    const gMinX = g.relX;
    const gMinY = g.relY;
    const gMaxX = g.relX + g.width;
    const gMaxY = g.relY + g.height;

    const last = out[out.length - 1];
    if (last && last.line === g.lineIndex && last.lastIndex + 1 === i) {
      last.lastIndex = i;
      last.minX = Math.min(last.minX, gMinX);
      last.minY = Math.min(last.minY, gMinY);
      last.maxX = Math.max(last.maxX, gMaxX);
      last.maxY = Math.max(last.maxY, gMaxY);
    } else {
      out.push({
        line: g.lineIndex,
        lastIndex: i,
        minX: gMinX,
        minY: gMinY,
        maxX: gMaxX,
        maxY: gMaxY,
      });
    }
  }

  return out.map((r) => ({
    x: r.minX,
    y: r.minY,
    width: r.maxX - r.minX,
    height: r.maxY - r.minY,
    lineIndex: r.line,
  }));
}

/**
 * Resolves the start and end glyph index of the semantic word around index (double-click).
 */
export function getWordRangeAt(glyphs: PDFGlyphItem[], index: number): [number, number] {
  if (!glyphs || glyphs.length === 0 || index < 0 || index >= glyphs.length) {
    return [index, index];
  }
  const target = glyphs[index];
  const line = target.lineIndex;

  let first = index;
  while (first > 0) {
    const prev = glyphs[first - 1];
    const curr = glyphs[first];
    if (prev.lineIndex !== line || curr.hasSpaceBefore || /^\s+$/.test(prev.char)) {
      break;
    }
    first--;
  }

  let last = index;
  while (last < glyphs.length - 1) {
    const next = glyphs[last + 1];
    if (next.lineIndex !== line || next.hasSpaceBefore || /^\s+$/.test(next.char)) {
      break;
    }
    last++;
  }

  return [first, last];
}

/**
 * Resolves the start and end glyph index of the full line around index (triple-click).
 */
export function getLineRangeAt(glyphs: PDFGlyphItem[], index: number): [number, number] {
  if (!glyphs || glyphs.length === 0 || index < 0 || index >= glyphs.length) {
    return [index, index];
  }
  const line = glyphs[index].lineIndex;

  let first = index;
  while (first > 0 && glyphs[first - 1].lineIndex === line) {
    first--;
  }

  let last = index;
  while (last < glyphs.length - 1 && glyphs[last + 1].lineIndex === line) {
    last++;
  }

  return [first, last];
}

/**
 * Reconstructs clean reading-order text from selected glyph range (PdfCraft text_of).
 * Preserves spaces and newline breaks accurately without browser DOM selection artifacts.
 */
export function extractCleanText(
  glyphs: PDFGlyphItem[],
  startIndex: number,
  endIndex: number
): string {
  if (!glyphs || glyphs.length === 0) return '';
  const start = Math.max(0, Math.min(startIndex, endIndex));
  const end = Math.min(glyphs.length - 1, Math.max(startIndex, endIndex));
  if (start > end) return '';

  let s = '';
  let prevLine: number | null = null;

  for (let i = start; i <= end; i++) {
    const g = glyphs[i];
    if (!g) continue;
    if (i !== start) {
      if (prevLine !== null && prevLine !== g.lineIndex) {
        s += '\n';
      } else if (g.hasSpaceBefore) {
        s += ' ';
      }
    }
    s += g.char;
    prevLine = g.lineIndex;
  }

  return s;
}

/**
 * Extracts and normalizes glyphs from PDF.js textContent and viewport.
 */
export function extractPageGlyphs(textContent: any, viewport: any): PDFGlyphItem[] {
  if (!textContent || !textContent.items) return [];

  const glyphs: PDFGlyphItem[] = [];
  let currentLineIndex = 0;
  let currentWordIndex = 0;
  let lastItemY: number | null = null;
  let lastItemMaxX: number | null = null;

  const items: any[] = textContent.items;

  for (const item of items) {
    if (!item.str || typeof item.str !== 'string') continue;
    const str: string = item.str;

    // Viewport transform
    const tx = item.transform[4];
    const ty = item.transform[5];
    const itemHeight = item.height || Math.hypot(item.transform[2], item.transform[3]) || 12;
    const itemWidth = item.width || 0;

    let left = 0;
    let top = 0;
    let width = 0;
    let height = 0;

    if (viewport && typeof viewport.convertToViewportPoint === 'function') {
      const [vx0, vy0] = viewport.convertToViewportPoint(tx, ty);
      const [vx1, vy1] = viewport.convertToViewportPoint(tx + itemWidth, ty + itemHeight);
      left = Math.min(vx0, vx1);
      top = Math.min(vy0, vy1);
      width = Math.max(1, Math.abs(vx1 - vx0));
      height = Math.max(8, Math.abs(vy1 - vy0));
    } else if (viewport && viewport.transform) {
      const m = viewport.transform;
      const x0 = m[0] * tx + m[2] * ty + m[4];
      const y0 = m[1] * tx + m[3] * ty + m[5];
      const x1 = m[0] * (tx + itemWidth) + m[2] * (ty + itemHeight) + m[4];
      const y1 = m[1] * (tx + itemWidth) + m[3] * (ty + itemHeight) + m[5];
      left = Math.min(x0, x1);
      top = Math.min(y0, y1);
      width = Math.max(1, Math.abs(x1 - x0));
      height = Math.max(8, Math.abs(y1 - y0));
    } else {
      const scale = viewport?.scale || 1.0;
      left = tx * scale;
      top = ty * scale;
      width = itemWidth * scale;
      height = itemHeight * scale;
    }

    // Check if line changed
    if (lastItemY !== null) {
      if (Math.abs(top - lastItemY) > Math.max(4, height * 0.45)) {
        currentLineIndex++;
        currentWordIndex++;
        lastItemMaxX = null;
      }
    }
    lastItemY = top;

    // Detect gap between items on same line
    let itemHasLeadGap = false;
    if (lastItemMaxX !== null) {
      const gap = left - lastItemMaxX;
      if (gap > Math.max(2, height * 0.15)) {
        itemHasLeadGap = true;
        currentWordIndex++;
      }
    }
    lastItemMaxX = left + width;

    // Distribute characters
    const charCount = str.length;
    if (charCount === 0) continue;
    const avgCharWidth = width / charCount;

    let pendingSpace = itemHasLeadGap;

    for (let cIdx = 0; cIdx < charCount; cIdx++) {
      const char = str[cIdx];
      if (char === ' ' || char === '\t') {
        pendingSpace = true;
        currentWordIndex++;
        continue;
      }

      const charX = left + cIdx * avgCharWidth;
      const charW = Math.max(1, avgCharWidth);
      const quad: [[number, number], [number, number], [number, number], [number, number]] = [
        [charX, top],
        [charX + charW, top],
        [charX + charW, top + height],
        [charX, top + height],
      ];

      glyphs.push({
        index: glyphs.length,
        char,
        relX: charX,
        relY: top,
        width: charW,
        height,
        lineIndex: currentLineIndex,
        wordIndex: currentWordIndex,
        hasSpaceBefore: pendingSpace,
        quad,
      });

      pendingSpace = false;
    }

    if (item.hasEOL) {
      currentLineIndex++;
      currentWordIndex++;
      lastItemMaxX = null;
    }
  }

  return glyphs;
}
