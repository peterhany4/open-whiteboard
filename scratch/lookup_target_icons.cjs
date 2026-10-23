const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45173.257b0efe77bb99c967d8.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '25810:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

// Map of export name to variable
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

const targetIcons = [
  'ArrowHookUpLeft', // Undo
  'ArrowHookUpRight', // Redo
  'PaintBrush', // Pen / Inking
  'InkStroke', // Pen
  'SlideEraser', // Eraser
  'Ruler', // Ruler
  'Lasso', // Lasso
  'Note', // Sticky note
  'NoteAdd',
  'Text',
  'TextT',
  'Shapes',
  'Heart', // Reaction
  'ThumbLike', // Reaction
  'Image',
  'Document',
  'DocumentPDF',
  'ZoomIn',
  'ZoomOut',
  'ZoomFit',
  'ScaleFit',
  'Settings',
  'ChevronDown',
  'ChevronLeft',
  'ChevronRight',
  'MoreHorizontal',
  'MoreVertical',
  'Delete',
  'Dismiss',
  'Cursor',
  'HandLeft'
];

targetIcons.forEach(iconName => {
  const varName = exportMap[iconName];
  if (!varName) {
    console.log(`Icon ${iconName}: NOT IN EXPORT MAP`);
    return;
  }
  // Find definition of varName, e.g. const varName = ... or varName = ...
  const defRegex = new RegExp(`(?:const|var|let)\\s+${varName}\\s*=\\s*([^;]+);`);
  const match = mod.match(defRegex);
  if (match) {
    console.log(`Icon ${iconName} (${varName}):`);
    console.log(`   ${match[1].substring(0, 300)}`);
  } else {
    // maybe defined as function or another pattern
    console.log(`Icon ${iconName} (${varName}): DEF NOT FOUND WITH REGEX`);
    // search for occurrences of varName =
    let p = 0;
    while ((p = mod.indexOf(`${varName}=`, p)) !== -1) {
      console.log(`   @${p}: ${mod.substring(p, p + 150)}`);
      p += varName.length + 1;
    }
  }
});
