const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45330.2ea744c303a6d9a26bbd.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const idx = content.indexOf('circularArc(t,e,s,i,r,o,n,a,h)');
console.log('Snippet of builder:');
console.log(content.substring(Math.max(0, idx - 500), Math.min(content.length, idx + 800)));
