const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/40049.7fda10c837609f18159b.js');
const content = fs.readFileSync(chunkFile, 'utf8');

function showModule(modId) {
  const m = new RegExp(`${modId}:\\s*\\((.*?)\\}\\),`, 's').exec(content);
  if (m) {
    console.log(`=== Module ${modId} ===`);
    console.log(m[0].substring(0, 1500));
  } else {
    console.log(`Module ${modId} not found in 40049`);
  }
}

showModule(4101);
showModule(12248);
showModule(900158);
