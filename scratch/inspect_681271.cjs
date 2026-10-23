const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/16494.b7be05d84f7a3d5ba72b.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const p = content.indexOf('681271:(');
const nextP = content.slice(p + 10).search(/\d{4,7}:\s*\(/);
const end = (nextP !== -1) ? p + 10 + nextP : content.length;
console.log('Module 681271:\n', content.substring(p, end));
