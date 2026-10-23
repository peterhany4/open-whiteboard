const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/8854.dc82cdca8d333ca4e131.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const regex = /(\d{4,7}):\s*\(([^)]+)\)\s*=>\s*\{/g;
const modules = [];
let m;
while ((m = regex.exec(content)) !== null) {
  modules.push({ id: m[1], start: m.index });
}

for (let i = 0; i < modules.length; i++) {
  const mod = modules[i];
  const end = (i + 1 < modules.length) ? modules[i + 1].start : content.length;
  const modCode = content.substring(mod.start, end);
  
  // check for Pen, Eraser, Highlighter, Laser, Undo, Redo
  const matches = [];
  ['Pen', 'Highlighter', 'Eraser', 'Laser', 'Ruler', 'Lasso', 'Undo', 'Redo'].forEach(k => {
    if (modCode.includes(k)) matches.push(k);
  });
  if (matches.length > 0) {
    console.log(`Module ${mod.id} (${modCode.length} chars) matches: ${matches.join(', ')}`);
    console.log(modCode.substring(0, 400));
    console.log('---');
  }
}
