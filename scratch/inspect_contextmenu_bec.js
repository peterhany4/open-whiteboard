import fs from 'fs';
import path from 'path';

const chunksDir = 'd:/Programming/whiteboard-REA/targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks';
const file = 'BoardEditorComponent-84781932.a42f38c8c9aa0e756cd7.js';
const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');

// Find occurrences of onContextMenu
const idxs = [];
let idx = content.indexOf('onContextMenu');
while (idx !== -1) {
  idxs.push(idx);
  idx = content.indexOf('onContextMenu', idx + 1);
}

for (const i of idxs) {
  console.log('--- MATCH AT', i, '---');
  console.log(content.slice(Math.max(0, i - 200), Math.min(content.length, i + 300)));
}
