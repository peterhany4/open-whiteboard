const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/53113.ecba8c6dca7dd201d1dd.js');
const content = fs.readFileSync(chunkFile, 'utf8');

console.log('53113 length:', content.length);
['PointEraser', 'StrokeEraser', 'Highlighter', 'Ruler', 'Laser', 'Pen1', 'FreeformLasso'].forEach(kw => {
  let idx = 0;
  while ((idx = content.indexOf(kw, idx)) !== -1) {
    console.log(`[53113] ${kw} @ ${idx}:`);
    console.log(content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 200)));
    console.log('---');
    idx += kw.length;
  }
});
