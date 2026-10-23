const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/8854.dc82cdca8d333ca4e131.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Look for pen component or SVG in 8854
const p = content.indexOf('Pen1');
let idx = 0;
while ((idx = content.indexOf('pen', idx)) !== -1) {
  const s = content.substring(Math.max(0, idx - 50), Math.min(content.length, idx + 150));
  if (s.includes('svg') || s.includes('path') || s.includes('style') || s.includes('fill') || s.includes('color')) {
    console.log(`[8854 pen @ ${idx}]:`, s);
  }
  idx += 3;
  if (idx > 30000) break;
}
