const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');

const targetFiles = [
  '16494.b7be05d84f7a3d5ba72b.js',
  '91464.7aeadf3b6ddc55b8cdc3.js',
  '3644.110e4f725e64dcb36fa7.js'
];

targetFiles.forEach(tf => {
  const content = fs.readFileSync(path.join(chunksDir, tf), 'utf8');
  console.log('=== FILE:', tf, 'Length:', content.length, '===');
  
  // Look for icon names or export names
  // In webpack bundles, SVG components often have names or comments or module IDs
  const moduleRegex = /(\d{4,7}):\s*\(([^)]+)\)\s*=>/g;
  const moduleIds = [];
  let m;
  while ((m = moduleRegex.exec(content)) !== null) {
    moduleIds.push(m[1]);
  }
  console.log('Module count:', moduleIds.length);
  
  // Search for keywords in the file
  const searchKeywords = [
    'Pen', 'Highlighter', 'Laser', 'Eraser', 'Ruler', 'Lasso',
    'Undo', 'Redo', 'Sticky', 'Note', 'Text', 'Shapes', 'Reaction',
    'Image', 'Document', 'PDF', 'Zoom', 'Settings', 'Dark', 'Chevron', 'Add'
  ];
  const foundKeywords = searchKeywords.filter(k => content.includes(k));
  console.log('Keywords found:', foundKeywords.join(', '));
});
