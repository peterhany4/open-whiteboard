/**
 * Open Whiteboard — Milestone 28 Automated Test Suite
 * Validating PdfCraft-Engineered Reading-Order PDF Selection Engine
 */

import assert from 'assert';

// 1. Mock Glyphs for 2 lines of text
// Line 0: "Hello World" (at y = 100, height = 20)
// Line 1: "PdfCraft Engine" (at y = 140, height = 20)
const glyphs = [];
let idx = 0;

function addWord(text, startX, y, lineIndex, wordIndex, startNewWord = true) {
  const charWidth = 10;
  const height = 20;
  for (let i = 0; i < text.length; i++) {
    const relX = startX + i * charWidth;
    glyphs.push({
      index: idx++,
      char: text[i],
      relX,
      relY: y,
      width: charWidth,
      height,
      lineIndex,
      wordIndex,
      hasSpaceBefore: i === 0 && startNewWord,
      quad: [
        [relX, y],
        [relX + charWidth, y],
        [relX + charWidth, y + height],
        [relX, y + height],
      ],
    });
  }
}

// Line 0: "Hello" (x: 50..100) and "World" (x: 110..160)
addWord('Hello', 50, 100, 0, 0, false);
addWord('World', 110, 100, 0, 1, true);

// Line 1: "PdfCraft" (x: 50..130) and "Engine" (x: 140..200)
addWord('PdfCraft', 50, 140, 1, 2, false);
addWord('Engine', 140, 140, 1, 3, true);

console.log(`Generated ${glyphs.length} glyphs across 2 lines.`);

// Inline test copies of algorithms to verify
function quadContains(quad, x, y) {
  const minX = Math.min(quad[0][0], quad[1][0], quad[2][0], quad[3][0]);
  const maxX = Math.max(quad[0][0], quad[1][0], quad[2][0], quad[3][0]);
  const minY = Math.min(quad[0][1], quad[1][1], quad[2][1], quad[3][1]);
  const maxY = Math.max(quad[0][1], quad[1][1], quad[2][1], quad[3][1]);
  return x >= minX && x <= maxX && y >= minY && y <= maxY;
}

function findNearestGlyph(x, y, glyphList) {
  if (!glyphList || glyphList.length === 0) return null;
  const centerDist = (g) => {
    const cx = g.relX + g.width / 2;
    const cy = g.relY + g.height / 2;
    return (cx - x) * (cx - x) + (cy - y) * (cy - y);
  };
  let bestInsideIdx = null;
  let bestInsideDist = Infinity;
  for (let i = 0; i < glyphList.length; i++) {
    const g = glyphList[i];
    if (quadContains(g.quad, x, y)) {
      const d = centerDist(g);
      if (d < bestInsideDist) {
        bestInsideDist = d;
        bestInsideIdx = i;
      }
    }
  }
  if (bestInsideIdx !== null) return bestInsideIdx;

  let bestIdx = null;
  let bestWeightedDist = Infinity;
  let bestCenterDist = Infinity;

  for (let i = 0; i < glyphList.length; i++) {
    const g = glyphList[i];
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

function computeMergedLineRects(glyphList, startIndex, endIndex) {
  if (!glyphList || glyphList.length === 0) return [];
  const start = Math.max(0, Math.min(startIndex, endIndex));
  const end = Math.min(glyphList.length - 1, Math.max(startIndex, endIndex));
  if (start > end) return [];

  const out = [];
  for (let i = start; i <= end; i++) {
    const g = glyphList[i];
    if (!g) continue;
    const last = out[out.length - 1];
    if (last && last.line === g.lineIndex && last.lastIndex + 1 === i) {
      last.lastIndex = i;
      last.minX = Math.min(last.minX, g.relX);
      last.minY = Math.min(last.minY, g.relY);
      last.maxX = Math.max(last.maxX, g.relX + g.width);
      last.maxY = Math.max(last.maxY, g.relY + g.height);
    } else {
      out.push({
        line: g.lineIndex,
        lastIndex: i,
        minX: g.relX,
        minY: g.relY,
        maxX: g.relX + g.width,
        maxY: g.relY + g.height,
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

function getWordRangeAt(glyphList, index) {
  const line = glyphList[index].lineIndex;
  let first = index;
  while (first > 0) {
    const prev = glyphList[first - 1];
    const curr = glyphList[first];
    if (prev.lineIndex !== line || curr.hasSpaceBefore) break;
    first--;
  }
  let last = index;
  while (last < glyphList.length - 1) {
    const next = glyphList[last + 1];
    if (next.lineIndex !== line || next.hasSpaceBefore) break;
    last++;
  }
  return [first, last];
}

function getLineRangeAt(glyphList, index) {
  const line = glyphList[index].lineIndex;
  let first = index;
  while (first > 0 && glyphList[first - 1].lineIndex === line) first--;
  let last = index;
  while (last < glyphList.length - 1 && glyphList[last + 1].lineIndex === line) last++;
  return [first, last];
}

function extractCleanText(glyphList, startIndex, endIndex) {
  const start = Math.max(0, Math.min(startIndex, endIndex));
  const end = Math.min(glyphList.length - 1, Math.max(startIndex, endIndex));
  let s = '';
  let prevLine = null;
  for (let i = start; i <= end; i++) {
    const g = glyphList[i];
    if (i !== start) {
      if (prevLine !== null && prevLine !== g.lineIndex) s += '\n';
      else if (g.hasSpaceBefore) s += ' ';
    }
    s += g.char;
    prevLine = g.lineIndex;
  }
  return s;
}

// ================= TEST 1: Direct Quad Hit =================
const directHit = findNearestGlyph(55, 110, glyphs);
assert.strictEqual(glyphs[directHit].char, 'H', 'Direct hit at (55, 110) must be "H"');
console.log('✓ Test 1 Passed: Direct quad hit');

// ================= TEST 2: Magnetic Line Lock with 3.0x Vertical Penalty =================
// Cursor is at x = 75 (between 'e' and 'l' on Line 0).
// Line 0 y is 100..120. Line 1 y is 140..160.
// Let's test a cursor slightly below Line 0 at y = 125 (5px below bottom of Line 0, but 15px above Line 1).
// Without penalty:
// To Line 0: dy = 5px.
// To Line 1: dy = 15px.
// Now suppose the cursor drifts further down to y = 128 (8px below Line 0, 12px above Line 1).
// With raw Euclidean distance:
// dy0 = 8px, dy1 = 12px.
// What if x is 105 (gap between 'o' and 'W' on Line 0, but directly above 'a' on Line 1 at x = 80)?
// At x = 75, y = 126:
// Line 0 glyphs: dx = 0, dy = 6. Weighted dist = 6 * 3 = 18.
// Line 1 glyphs: dx = 0, dy = 14. Weighted dist = 14 * 3 = 42.
// Even with slight vertical movement, it stays on Line 0!
const lockedHit = findNearestGlyph(75, 126, glyphs);
assert.strictEqual(glyphs[lockedHit].lineIndex, 0, 'Cursor with 6px downward jitter must stay magnetically locked to Line 0');
console.log('✓ Test 2 Passed: Magnetic Line Lock');

// ================= TEST 3: Merged Line Rects =================
// Select all 10 glyphs of Line 0 ("Hello World")
const line0Rects = computeMergedLineRects(glyphs, 0, 9);
// Line 0 has "Hello" (50..100) and "World" (110..160).
// Because they are consecutive glyphs on Line 0, they MUST merge into exactly ONE continuous rect!
assert.strictEqual(line0Rects.length, 1, 'Consecutive glyphs on Line 0 must produce exactly 1 merged line rect');
assert.strictEqual(line0Rects[0].x, 50, 'Merged rect starts at 50');
assert.strictEqual(line0Rects[0].width, 110, 'Merged rect width is 110 (from 50 to 160)');
console.log('✓ Test 3 Passed: Continuous Merged Line Rectangles');

// Multi-line selection: 0 ("Hello") to 17 ("PdfCraft")
const multiLineRects = computeMergedLineRects(glyphs, 0, 17);
assert.strictEqual(multiLineRects.length, 2, 'Two lines selected must produce exactly 2 rectangles (one per line)');
assert.strictEqual(multiLineRects[0].lineIndex, 0);
assert.strictEqual(multiLineRects[1].lineIndex, 1);
console.log('✓ Test 4 Passed: Multi-line Merged Rectangles (1 per line)');

// ================= TEST 4: Word & Line Range Expansion =================
// Word range at 'e' (index 1) in "Hello"
const wordRange = getWordRangeAt(glyphs, 1);
assert.deepStrictEqual(wordRange, [0, 4], '"Hello" must span indices 0 to 4');
assert.strictEqual(extractCleanText(glyphs, wordRange[0], wordRange[1]), 'Hello');

// Word range at 'W' (index 5) in "World"
const worldRange = getWordRangeAt(glyphs, 5);
assert.deepStrictEqual(worldRange, [5, 9], '"World" must span indices 5 to 9');
assert.strictEqual(extractCleanText(glyphs, worldRange[0], worldRange[1]), 'World');

// Line range at index 3
const lineRange = getLineRangeAt(glyphs, 3);
assert.deepStrictEqual(lineRange, [0, 9], 'Line 0 must span indices 0 to 9');
console.log('✓ Test 5 Passed: Semantic Word & Line Range Expansion');

// ================= TEST 5: Clean Text Reconstruction =================
const fullText = extractCleanText(glyphs, 0, glyphs.length - 1);
assert.strictEqual(
  fullText,
  'Hello World\nPdfCraft Engine',
  'Text reconstruction must preserve inter-word spaces and newlines cleanly'
);
console.log('✓ Test 6 Passed: Clean Text Extraction & Normalization');

console.log('\nAll Milestone 28 Unit Tests Passed Successfully! [6/6]');
