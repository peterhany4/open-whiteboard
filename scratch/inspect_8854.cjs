const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/8854.dc82cdca8d333ca4e131.js');
const content = fs.readFileSync(chunkFile, 'utf8');

console.log('8854.js length:', content.length);

// Find imports or require statements in this module
const regex = /(\d{4,7}):\s*\(([^)]+)\)\s*=>\s*\{/g;
let m;
while ((m = regex.exec(content)) !== null) {
  console.log('Module ID:', m[1]);
}

// Print snippet of the first 2000 chars
console.log('Snippet:\n', content.substring(0, 3000));
