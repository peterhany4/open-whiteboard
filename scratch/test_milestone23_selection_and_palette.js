import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Testing Milestone 23: PDF Text Selection Visuals & High-Legibility Highlighter Palette...\n');

// ============================================================================
// 1. CSS Rule Integrity for Selection & Double-Letter Prevention
// ============================================================================
console.log('1. Verifying src/index.css textLayer rules...');
const indexCssPath = path.join(rootDir, 'src', 'index.css');
const indexCss = fs.readFileSync(indexCssPath, 'utf-8');

assert.ok(
  indexCss.includes('-webkit-text-fill-color: transparent !important;'),
  'index.css must include -webkit-text-fill-color: transparent !important;'
);
assert.ok(
  indexCss.includes('caret-color: transparent !important;'),
  'index.css must include caret-color: transparent !important;'
);
assert.ok(
  indexCss.includes('rgba(0, 120, 215, 0.22)'),
  'index.css must set selection background to rgba(0, 120, 215, 0.22) !important;'
);
assert.ok(
  indexCss.includes('.textLayer ::selection') && indexCss.includes('.textLayer span::selection'),
  'index.css must target both .textLayer ::selection and .textLayer span::selection'
);
console.log('✓ index.css selection and textLayer rules verified.');

// ============================================================================
// 2. High-Legibility Edge / Acrobat Pastel Highlighter Palette Verification
// ============================================================================
console.log('\n2. Verifying Edge / Acrobat Pastel Highlighter Palette & Contrast Ratios...');

const PASTEL_PALETTE = [
  { name: 'Soft Yellow', hex: '#FFE843' },
  { name: 'Soft Mint Green', hex: '#95F09B' },
  { name: 'Soft Sky Cyan', hex: '#7AE3FF' },
  { name: 'Soft Pastel Pink', hex: '#FF9EC6' },
  { name: 'Soft Lavender Purple', hex: '#D4B8FF' },
];

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.substring(0, 2), 16),
    g: parseInt(clean.substring(2, 4), 16),
    b: parseInt(clean.substring(4, 6), 16),
  };
}

function sRgbToLinear(c) {
  const norm = c / 255;
  return norm <= 0.04045 ? norm / 12.92 : Math.pow((norm + 0.055) / 1.055, 2.4);
}

function getRelativeLuminance(hex) {
  const { r, g, b } = hexToRgb(hex);
  const rLin = sRgbToLinear(r);
  const gLin = sRgbToLinear(g);
  const bLin = sRgbToLinear(b);
  return 0.2126 * rLin + 0.7152 * gLin + 0.0722 * bLin;
}

function getContrastRatio(l1, l2) {
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

const blackTextLuminance = getRelativeLuminance('#000000');
const darkTextLuminance = getRelativeLuminance('#242424');

PASTEL_PALETTE.forEach((preset) => {
  const lum = getRelativeLuminance(preset.hex);
  const crBlack = getContrastRatio(lum, blackTextLuminance);
  const crDark = getContrastRatio(lum, darkTextLuminance);

  console.log(
    `  - ${preset.name} (${preset.hex}): Luminance = ${lum.toFixed(3)}, Contrast vs #000000 = ${crBlack.toFixed(2)}:1, vs #242424 = ${crDark.toFixed(2)}:1`
  );

  // Must exceed WCAG AA minimum 4.5:1
  assert.ok(
    crBlack >= 4.5,
    `${preset.name} contrast ratio (${crBlack.toFixed(2)}) must be >= 4.5:1 against black document text`
  );
  assert.ok(
    crDark >= 4.5,
    `${preset.name} contrast ratio (${crDark.toFixed(2)}) must be >= 4.5:1 against dark document text`
  );

  // High luminance check for pastel tones (soft, bright, non-muddy)
  assert.ok(
    lum >= 0.45,
    `${preset.name} luminance (${lum.toFixed(3)}) must be >= 0.45 to ensure pastel transparency`
  );
});

// Check effective composite contrast on white document paper at calibrated light mode opacity (0.38)
console.log('\n  Checking composite blend over white page at opacity 0.38:');
PASTEL_PALETTE.forEach((preset) => {
  const { r, g, b } = hexToRgb(preset.hex);
  // Blend over #FFFFFF: C_comp = C_swatch * 0.38 + 255 * (1 - 0.38)
  const blendedR = Math.round(r * 0.38 + 255 * 0.62);
  const blendedG = Math.round(g * 0.38 + 255 * 0.62);
  const blendedB = Math.round(b * 0.38 + 255 * 0.62);
  const blendedHex = `#${blendedR.toString(16).padStart(2, '0')}${blendedG.toString(16).padStart(2, '0')}${blendedB.toString(16).padStart(2, '0')}`;
  const blendedLum = getRelativeLuminance(blendedHex);
  const blendedCR = getContrastRatio(blendedLum, blackTextLuminance);

  console.log(
    `    * ${preset.name} blended: ${blendedHex}, Luminance = ${blendedLum.toFixed(3)}, Contrast vs #000000 = ${blendedCR.toFixed(2)}:1`
  );
  assert.ok(blendedCR >= 15.0, `Blended contrast ratio ${blendedCR} should be >= 15:1 for crisp readability`);
});
console.log('✓ All 5 pastel highlighter tones provide superior legibility and contrast ratios.');

// ============================================================================
// 3. Verifying Component Swatches & Clean Borders in PDFDocumentWidget.tsx
// ============================================================================
console.log('\n3. Verifying PDFDocumentWidget.tsx palette wiring...');
const pdfWidgetPath = path.join(rootDir, 'src', 'components', 'canvas', 'PDFDocumentWidget.tsx');
const pdfWidgetCode = fs.readFileSync(pdfWidgetPath, 'utf-8');

for (const preset of PASTEL_PALETTE) {
  assert.ok(
    pdfWidgetCode.includes(preset.hex),
    `PDFDocumentWidget.tsx must include pastel color ${preset.hex} (${preset.name})`
  );
}
assert.ok(
  pdfWidgetCode.includes("'1px solid rgba(0, 0, 0, 0.12)'"),
  'PDFDocumentWidget.tsx color pills must use 1px solid rgba(0, 0, 0, 0.12) border'
);
console.log('✓ PDFDocumentWidget.tsx pastel swatches and pill borders verified.');

// ============================================================================
// 4. Verifying Highlighter Opacity Calibration Across Engine Files
// ============================================================================
console.log('\n4. Verifying highlighter opacity calibration (0.38 light / 0.55 dark)...');

// A. CanvasEntities.tsx
const canvasEntitiesPath = path.join(rootDir, 'src', 'canvas', 'CanvasEntities.tsx');
const canvasEntitiesCode = fs.readFileSync(canvasEntitiesPath, 'utf-8');
assert.ok(
  canvasEntitiesCode.includes('opacity={isHighlighter ? (isDark ? 0.55 : 0.38) : 1.0}'),
  'CanvasEntities.tsx must use 0.55 (dark) : 0.38 (light) for highlighter opacity'
);
console.log('✓ CanvasEntities.tsx opacity calibrated to 0.38 light / 0.55 dark.');

// B. CanvasViewport.tsx
const canvasViewportPath = path.join(rootDir, 'src', 'canvas', 'CanvasViewport.tsx');
const canvasViewportCode = fs.readFileSync(canvasViewportPath, 'utf-8');
assert.ok(
  canvasViewportCode.includes('opacity={isDark ? 0.55 : 0.38}'),
  'CanvasViewport.tsx live highlighter overlay must use 0.55 (dark) : 0.38 (light)'
);
console.log('✓ CanvasViewport.tsx live highlighter overlay calibrated to 0.38 light / 0.55 dark.');

// C. ExportEngine.ts
const exportEnginePath = path.join(rootDir, 'src', 'tools', 'ExportEngine.ts');
const exportEngineCode = fs.readFileSync(exportEnginePath, 'utf-8');
assert.ok(
  exportEngineCode.includes("ctx.globalAlpha = bgMode === 'dark' ? 0.55 : 0.38;"),
  'ExportEngine.ts canvas export must use 0.55 (dark) : 0.38 (light)'
);
assert.ok(
  exportEngineCode.includes("const opacity = isHighlighter ? (bgMode === 'dark' ? '0.55' : '0.38') : '1.0';"),
  'ExportEngine.ts SVG export must use 0.55 (dark) : 0.38 (light)'
);
console.log('✓ ExportEngine.ts export pipeline calibrated to 0.38 light / 0.55 dark.');

console.log('\n======================================================');
console.log('All Milestone 23 verification checks PASSED successfully!');
console.log('======================================================');
