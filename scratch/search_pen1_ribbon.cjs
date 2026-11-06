const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/40049.7fda10c837609f18159b.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Search for ribbon tool list or pen tool list
const idx = content.indexOf('Pen1');
let cur = 0;
while (true) {
  const match = content.indexOf('Pen1', cur);
  if (match === -1) break;
  console.log('--- Pen1 at', match, '---');
  console.log(content.substring(Math.max(0, match - 100), Math.min(content.length, match + 200)).replace(/\s+/g, ' '));
  cur = match + 10;
  if (cur > 100000) break;
}
