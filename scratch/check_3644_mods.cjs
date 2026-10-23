const fs = require('fs');
const path = require('path');

const chunk3644 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/3644.110e4f725e64dcb36fa7.js');
const content = fs.readFileSync(chunk3644, 'utf8');

console.log('3644.js length:', content.length);

const testMods = [
  { name: 'Ruler', id: 626103 },
  { name: 'SlideEraser', id: 120413 },
  { name: 'Lasso', id: 344754 },
  { name: 'Undo', id: 235346 },
  { name: 'Redo', id: 920716 },
  { name: 'Note', id: 725737 },
  { name: 'NoteAdd', id: 487586 },
  { name: 'Text', id: 600509 },
  { name: 'Shapes', id: 522914 },
  { name: 'Heart', id: 367890 },
  { name: 'Image', id: 597502 },
  { name: 'Document', id: 601956 },
  { name: 'DocumentPDF', id: 639410 },
  { name: 'ZoomIn', id: 271792 },
  { name: 'ZoomOut', id: 54160 },
  { name: 'ZoomFit', id: 824907 },
  { name: 'Settings', id: 651688 },
  { name: 'ChevronDown', id: 387523 },
  { name: 'PaintBrush', id: 9023 }
];

testMods.forEach(m => {
  const has = content.includes(`${m.id}:(`) || content.includes(`${m.id}: (`);
  console.log(`Module ${m.name} (${m.id}): in 3644? ${has}`);
});
