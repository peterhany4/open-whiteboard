const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/8854.dc82cdca8d333ca4e131.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Find where pens are rendered: Pen1, Pen2, Pen3, Pen4, Pen5, Highlighter, Laser, Eraser, Ruler, Lasso
const p = content.indexOf('Pen1');
console.log('Pen1 snippet in 8854.js:\n', content.substring(Math.max(0, p - 200), Math.min(content.length, p + 800)));
