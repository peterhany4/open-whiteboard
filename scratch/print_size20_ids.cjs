const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45173.257b0efe77bb99c967d8.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '25810:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

const exportMatch = mod.match(/i\.d\(h,\{([^}]+)\}\)/);
const exportMap = {};
if (exportMatch) {
  exportMatch[1].split(',').forEach(pair => {
    const parts = pair.trim().split(':()=>');
    if (parts.length === 2) {
      exportMap[parts[0].trim()] = parts[1].trim();
    }
  });
}

const icons = ['ArrowHookUpLeft', 'ArrowHookUpRight', 'Ruler', 'Lasso', 'SlideEraser', 'Note', 'Text', 'Shapes', 'Heart', 'ThumbLike', 'Image', 'Document', 'DocumentPDF', 'ZoomIn', 'ZoomOut', 'ZoomFit', 'ScaleFit', 'Settings', 'ChevronDown', 'ChevronLeft', 'ChevronRight', 'MoreHorizontal', 'MoreVertical', 'Delete', 'Dismiss', 'PaintBrush', 'InkStroke'];

icons.forEach(name => {
  const v = exportMap[name];
  const p = mod.indexOf(`${v}=e=>`);
  if (p !== -1) {
    console.log(`=== ${name} (${v}) ===`);
    console.log(mod.substring(p, p + 500));
  } else {
    const p2 = mod.indexOf(`${v}=`);
    console.log(`=== ${name} (${v}) (alt) ===`);
    console.log(mod.substring(p2, p2 + 300));
  }
});
