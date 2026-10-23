const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunksDir);

const filesWithSvg = {};
let totalPaths = 0;

for (const file of files) {
  if (!file.endsWith('.js')) continue;
  const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');
  
  // match SVG path definitions
  const matches = content.match(/d:\s*["']([MmLlHhVvCcSsQqTtAaZz0-9\s.,-]+)["']/g);
  if (matches && matches.length > 0) {
    filesWithSvg[file] = matches.length;
    totalPaths += matches.length;
  }
}

console.log('Total SVG path strings found:', totalPaths);
console.log('Files with SVG paths:');
for (const [file, count] of Object.entries(filesWithSvg)) {
  console.log(`  ${file}: ${count}`);
}
