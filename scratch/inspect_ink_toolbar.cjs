const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');

// 1. Inspect Module 804397 and 786285 in 40049.7fda10c837609f18159b.js
const c40049 = fs.readFileSync(path.join(chunksDir, '40049.7fda10c837609f18159b.js'), 'utf8');

console.log('--- 40049 module 900158 and 804397 ---');
const mod804397Pos = c40049.indexOf('804397:(');
if (mod804397Pos !== -1) {
  console.log(c40049.substring(mod804397Pos, mod804397Pos + 2500));
}

// 2. Inspect 8854 around color palette and thickness in 8854.dc82cdca8d333ca4e131.js
const c8854 = fs.readFileSync(path.join(chunksDir, '8854.dc82cdca8d333ca4e131.js'), 'utf8');
const pColors = c8854.indexOf('Colors.Yellow.Tooltip');
if (pColors !== -1) {
  console.log('\n--- 8854 Colors & Thickness Snippet ---');
  console.log(c8854.substring(pColors - 200, pColors + 3500));
}
