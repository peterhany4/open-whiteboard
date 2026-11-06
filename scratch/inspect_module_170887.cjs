const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45330.2ea744c303a6d9a26bbd.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const m = /170887:\s*\((.*?)\}\),/s.exec(content);
if (m) {
  console.log('Module 170887 content:');
  console.log(m[0].substring(0, 3000));
} else {
  console.log('Module 170887 not found in 45330');
}
