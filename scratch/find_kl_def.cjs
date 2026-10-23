const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '453072:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

const defIdx = mod.indexOf('const Kl=') !== -1 ? mod.indexOf('const Kl=') : mod.indexOf('Kl=');
console.log('Kl definition index:', defIdx);
if (defIdx !== -1) {
  console.log('Kl def snippet:\n', mod.substring(defIdx, defIdx + 2000));
}
