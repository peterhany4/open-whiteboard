const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/53113.ecba8c6dca7dd201d1dd.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Find occurrences of Pen1, selectedPen, or default pen setups
const idx = content.indexOf('selectedPen');
console.log('Snippet around selectedPen:');
console.log(content.substring(Math.max(0, idx - 200), Math.min(content.length, idx + 800)));
