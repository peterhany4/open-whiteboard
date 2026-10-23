const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');

// Search for where Inking tools icons are imported or created
// Let's check 45330.2ea744c303a6d9a26bbd.js, 40049.7fda10c837609f18159b.js, and BoardEditorComponent chunks
const checkFiles = [
  '45330.2ea744c303a6d9a26bbd.js',
  '40049.7fda10c837609f18159b.js',
  'BoardEditorComponent-852bcd1f.d8ba3dff26421f7774a2.js',
  'BoardEditorComponent-84781932.a42f38c8c9aa0e756cd7.js',
  '8854.dc82cdca8d333ca4e131.js'
];

checkFiles.forEach(file => {
  const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');
  ['Highlighter', 'Laser', 'Eraser', 'Ruler'].forEach(kw => {
    let idx = 0;
    while ((idx = content.indexOf(kw, idx)) !== -1) {
      const snippet = content.substring(Math.max(0, idx - 120), Math.min(content.length, idx + 200));
      if (snippet.includes('icon') || snippet.includes('Icon') || snippet.includes('svg') || snippet.includes('createElement') || snippet.includes('render')) {
        console.log(`[${file}] ${kw} @ ${idx}:\n`, snippet, '\n---');
      }
      idx += kw.length;
    }
  });
});
