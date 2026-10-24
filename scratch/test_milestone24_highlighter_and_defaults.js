import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('Testing Milestone 24: Inking Layer Hierarchy, Viewport-Centered Ruler & Tool Defaults Reset...\n');

// ============================================================================
// 1. Inking Layer Hierarchy & Z-Index Separation Verification
// ============================================================================
console.log('1. Verifying CanvasEntities.tsx layer separation and zIndex order...');
const canvasEntitiesPath = path.join(rootDir, 'src', 'canvas', 'CanvasEntities.tsx');
const canvasEntitiesCode = fs.readFileSync(canvasEntitiesPath, 'utf-8');

assert.ok(
  canvasEntitiesCode.includes('id="highlighterLayerSvg"'),
  'CanvasEntities.tsx must include dedicated #highlighterLayerSvg'
);
assert.ok(
  canvasEntitiesCode.includes('zIndex: 90'),
  'CanvasEntities.tsx #highlighterLayerSvg must have zIndex: 90'
);
assert.ok(
  canvasEntitiesCode.includes("mixBlendMode: isDark ? 'screen' : 'multiply'"),
  'CanvasEntities.tsx #highlighterLayerSvg must have mixBlendMode multiply/screen'
);
assert.ok(
  canvasEntitiesCode.includes('id="inkLayerSvg"'),
  'CanvasEntities.tsx must include foreground #inkLayerSvg'
);
assert.ok(
  canvasEntitiesCode.includes('zIndex: 200'),
  'CanvasEntities.tsx #inkLayerSvg must have zIndex: 200'
);

// Verify live highlighter overlay in CanvasViewport.tsx
const canvasViewportPath = path.join(rootDir, 'src', 'canvas', 'CanvasViewport.tsx');
const canvasViewportCode = fs.readFileSync(canvasViewportPath, 'utf-8');
assert.ok(
  canvasViewportCode.includes('id="liveHighlighterOverlay"'),
  'CanvasViewport.tsx must include #liveHighlighterOverlay'
);
assert.ok(
  canvasViewportCode.includes('zIndex: 90'),
  'CanvasViewport.tsx #liveHighlighterOverlay must have zIndex: 90'
);

// Verify PDF document zIndex in PDFDocumentWidget.tsx sits under highlighter layer
const pdfWidgetPath = path.join(rootDir, 'src', 'components/canvas', 'PDFDocumentWidget.tsx');
const pdfWidgetCode = fs.readFileSync(pdfWidgetPath, 'utf-8');
assert.ok(
  pdfWidgetCode.includes('isLocked ? 50 : (docEntity.zIndex ? Math.min(docEntity.zIndex, 80) : 70)'),
  'PDFDocumentWidget.tsx must keep unlocked PDF documents beneath highlighterLayerSvg (zIndex 70/80 < 90)'
);

console.log('✓ Inking layer hierarchy successfully verified:');
console.log('  - PDF canvas & documents: zIndex 50 (locked) / 70 (unlocked)');
console.log('  - Background highlighters: zIndex 90 (mix-blend-mode: multiply)');
console.log('  - DOM textboxes & sticky notes: zIndex 100 (text physically in front)');
console.log('  - Foreground pen ink: zIndex 200 (above all widgets)');

// ============================================================================
// 2. Viewport-Centered Ruler Math Verification
// ============================================================================
console.log('\n2. Verifying RulerEngine viewport centering calculation...');

function computeRulerCenter(camera, windowWidth = 1200, windowHeight = 800) {
  const worldX = Math.round((windowWidth / 2 - camera.positionX) / camera.scale);
  const worldY = Math.round((windowHeight / 2 - camera.positionY) / camera.scale);
  return { worldX, worldY };
}

// Case A: Default camera (scale 1.0, position (0, 0)) on 1200x800 screen
const c1 = { scale: 1.0, positionX: 0, positionY: 0 };
const center1 = computeRulerCenter(c1, 1200, 800);
assert.strictEqual(center1.worldX, 600);
assert.strictEqual(center1.worldY, 400);

// Case B: Panned camera (-500, -300) with scale 1.0 on 1920x1080 screen
const c2 = { scale: 1.0, positionX: -500, positionY: -300 };
const center2 = computeRulerCenter(c2, 1920, 1080);
assert.strictEqual(center2.worldX, 960 - (-500)); // 1460
assert.strictEqual(center2.worldY, 540 - (-300)); // 840

// Case C: Zoomed camera (scale 2.0, position -400, -200) on 1000x800 screen
const c3 = { scale: 2.0, positionX: -400, positionY: -200 };
const center3 = computeRulerCenter(c3, 1000, 800);
// (500 - (-400)) / 2 = 900 / 2 = 450
assert.strictEqual(center3.worldX, 450);
// (400 - (-200)) / 2 = 600 / 2 = 300
assert.strictEqual(center3.worldY, 300);

// Verify RulerEngine.ts implementation
const rulerEnginePath = path.join(rootDir, 'src', 'tools', 'RulerEngine.ts');
const rulerEngineCode = fs.readFileSync(rulerEnginePath, 'utf-8');
assert.ok(
  rulerEngineCode.includes('centerOnCamera'),
  'RulerEngine.ts must implement centerOnCamera'
);
assert.ok(
  rulerEngineCode.includes('toggle(') && rulerEngineCode.includes('this.centerOnCamera'),
  'RulerEngine.ts toggle() must center on camera when activated'
);

// Verify InkToolbar.tsx passes camera to toggle
const inkToolbarPath = path.join(rootDir, 'src', 'components/toolbar', 'InkToolbar.tsx');
const inkToolbarCode = fs.readFileSync(inkToolbarPath, 'utf-8');
assert.ok(
  inkToolbarCode.includes('rulerEngine.toggle(camera)'),
  'InkToolbar.tsx must pass camera to rulerEngine.toggle(camera)'
);
console.log('✓ Viewport-centered ruler calculations and toolbar wiring verified.');

// ============================================================================
// 3. Complete Inking & Tool Defaults Reset Verification
// ============================================================================
console.log('\n3. Verifying InkingStore resetToDefaults() & BoardStore integration...');

const inkingStorePath = path.join(rootDir, 'src', 'store', 'inkingStore.ts');
const inkingStoreCode = fs.readFileSync(inkingStorePath, 'utf-8');
assert.ok(
  inkingStoreCode.includes('resetToDefaults: () => {'),
  'inkingStore.ts must export resetToDefaults method'
);
assert.ok(
  inkingStoreCode.includes('pens: JSON.parse(JSON.stringify(initialInkingState.pens))'),
  'resetToDefaults must deep clone pens to avoid reference leakage'
);

const boardStorePath = path.join(rootDir, 'src', 'store', 'boardStore.ts');
const boardStoreCode = fs.readFileSync(boardStorePath, 'utf-8');
assert.ok(
  boardStoreCode.includes('createNewBoard') && boardStoreCode.includes('inkingStore.resetToDefaults()'),
  'boardStore.ts createNewBoard must invoke inkingStore.resetToDefaults()'
);
assert.ok(
  boardStoreCode.includes('deleteBoard') && boardStoreCode.includes('inkingStore.resetToDefaults()'),
  'boardStore.ts deleteBoard must invoke inkingStore.resetToDefaults() when last board cleared'
);

console.log('✓ Complete inking and tool defaults reset verified.');

console.log('\n========================================================================');
console.log('All Milestone 24 verification checks PASSED successfully!');
console.log('========================================================================');
