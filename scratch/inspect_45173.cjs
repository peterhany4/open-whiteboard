const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45173.257b0efe77bb99c967d8.js');
const content = fs.readFileSync(chunkFile, 'utf8');

console.log('45173 length:', content.length);

const regex = /(\d{4,7}):\s*\(([^)]+)\)\s*=>\s*\{/g;
const modules = [];
let m;
while ((m = regex.exec(content)) !== null) {
  modules.push({ id: m[1], start: m.index });
}

console.log('Found modules in 45173:', modules.length);
modules.forEach((mod, i) => {
  const end = (i + 1 < modules.length) ? modules[i + 1].start : content.length;
  const modCode = content.substring(mod.start, end);
  const keywords = ['Pen', 'Highlighter', 'Laser', 'Eraser', 'Ruler', 'Lasso', 'Undo', 'Redo', 'ZoomIn', 'ZoomOut', 'FitToScreen', 'Settings'];
  const matched = keywords.filter(k => modCode.includes(k));
  if (matched.length >= 2) {
    console.log(`Module ${mod.id} (${modCode.length} chars) matches: ${matched.join(', ')}`);
    console.log(modCode.substring(0, 300));
    console.log('---');
  }
});
