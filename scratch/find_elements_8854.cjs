const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/8854.dc82cdca8d333ca4e131.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Find all React.createElement occurrences
const matches = [];
let p = 0;
while ((p = content.indexOf('createElement(', p)) !== -1) {
  matches.push(content.substring(p, p + 150));
  p += 14;
}
console.log('Total createElement calls in 8854:', matches.length);
matches.slice(0, 10).forEach(m => console.log('  ', m));
