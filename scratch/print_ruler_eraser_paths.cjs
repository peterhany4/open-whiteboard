const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/3644.110e4f725e64dcb36fa7.js');
const content = fs.readFileSync(chunkFile, 'utf8');

[181117, 790030, 736830, 575639].forEach(id => {
  const p = content.indexOf(`${id}:(`);
  const nextP = content.slice(p + 10).search(/\d{4,7}:\s*\(/);
  const end = (nextP !== -1) ? p + 10 + nextP : content.length;
  const modCode = content.substring(p, end);
  
  const paths = [];
  const pr = /d:\s*["']([^"']+)["']/g;
  let pm;
  while ((pm = pr.exec(modCode)) !== null) {
    paths.push(pm[1]);
  }
  console.log(`=== Module ${id} ===`);
  paths.forEach(pathStr => console.log('d:', pathStr));
});
