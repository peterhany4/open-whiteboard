const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');

// Let's check 46977 (Ruler) and see what SVG paths it has
const rulerChunk = fs.readFileSync(path.join(chunksDir, '46977.a2b1a6da435aa284ef9e.js'), 'utf8');
console.log('46977 (Ruler) paths:');
let pm;
const pr = /d:\s*["']([^"']+)["']/g;
while ((pm = pr.exec(rulerChunk)) !== null) {
  console.log('  d:', pm[1].substring(0, 100));
}

// In 25810 (in 45173): let's inspect Ruler (ze) and SlideEraser (ue)
const c45173 = fs.readFileSync(path.join(chunksDir, '45173.257b0efe77bb99c967d8.js'), 'utf8');
const pZe = c45173.indexOf('ze=e=>');
if (pZe !== -1) {
  console.log('25810 Ruler (ze):\n', c45173.substring(pZe, pZe + 400));
}
const pUe = c45173.indexOf('ue=e=>');
if (pUe !== -1) {
  console.log('25810 SlideEraser (ue):\n', c45173.substring(pUe, pUe + 400));
}

// Let's search across all files for Highlighter icon paths
console.log('Searching for Highlighter / Laser icons...');
const files = fs.readdirSync(chunksDir);
files.forEach(f => {
  if (!f.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
  if (content.includes('Highlighter') && (content.includes('svg') || content.includes('createElement("path"'))) {
    // find path around Highlighter
    const idx = content.indexOf('Highlighter');
    console.log(`Highlighter in ${f} @ ${idx}:`, content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 200)));
  }
});
