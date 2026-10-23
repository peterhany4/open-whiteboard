const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45330.2ea744c303a6d9a26bbd.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Find all occurrences of Pen or Highlighter or Eraser or Ruler in 45330
const regex = /(Highlighter|Eraser|Ruler|Laser)/g;
let match;
while ((match = regex.exec(content)) !== null) {
  const start = Math.max(0, match.index - 100);
  const end = Math.min(content.length, match.index + 200);
  console.log(`Matched ${match[1]} @ ${match.index}:`);
  console.log(content.substring(start, end));
  console.log('---');
}
