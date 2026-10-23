const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunksDir);

// Search for any icon with highlighter or laser or marker in name or attributes
files.forEach(f => {
  if (!f.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
  ['highlighter', 'marker', 'laser'].forEach(kw => {
    let p = 0;
    while ((p = content.toLowerCase().indexOf(kw, p)) !== -1) {
      const snippet = content.substring(Math.max(0, p - 60), Math.min(content.length, p + 140));
      if (snippet.includes('svg') || snippet.includes('path') || snippet.includes('createElement') || snippet.includes('viewBox')) {
        console.log(`[${f}] ${kw} @ ${p}:`, snippet);
      }
      p += kw.length;
    }
  });
});
