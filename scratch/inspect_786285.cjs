const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/40049.7fda10c837609f18159b.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const p = content.indexOf('786285:(');
const nextP = content.slice(p + 10).search(/\d{4,7}:\s*\(/);
const end = (nextP !== -1) ? p + 10 + nextP : content.length;
console.log('Module 786285:\n', content.substring(p, end));
