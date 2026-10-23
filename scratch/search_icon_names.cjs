const fs = require('fs');
const path = require('path');

const chunk3644 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/3644.110e4f725e64dcb36fa7.js');
const content3644 = fs.readFileSync(chunk3644, 'utf8');

const chunk45173 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45173.257b0efe77bb99c967d8.js');
const content45173 = fs.readFileSync(chunk45173, 'utf8');

['Highlight', 'Highlighter', 'Laser', 'Pen', 'Pencil', 'Eraser', 'Ruler', 'Lasso', 'Moon', 'Sun', 'Theme', 'Dark'].forEach(term => {
  const in3644 = content3644.includes(term);
  const in45173 = content45173.includes(term);
  console.log(`Term "${term}": in 3644? ${in3644}, in 45173? ${in45173}`);
});
