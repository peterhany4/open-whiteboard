const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Find module 453072
const startPattern = '453072:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod453072 = content.substring(idx, end);

// Let's see what Kl is
const klIdx = mod453072.lastIndexOf('Kl=');
const klCode = mod453072.substring(klIdx - 100, Math.min(mod453072.length, klIdx + 3000));
console.log('Kl code:\n', klCode);
