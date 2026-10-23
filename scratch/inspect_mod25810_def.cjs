const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45173.257b0efe77bb99c967d8.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '25810:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

// Let's see how icons are built in mod 25810
// Look at first 2000 chars after the export declaration
const afterExport = mod.substring(mod.indexOf('i.d(h,'));
console.log('Snippet after export:\n', afterExport.substring(0, 2000));
