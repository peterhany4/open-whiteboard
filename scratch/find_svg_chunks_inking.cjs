const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunksDir);

// Search all files for SVG definitions with "Ruler" or "Eraser" or "Highlighter" or "Pen"
files.forEach(f => {
  if (!f.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
  
  // check if this file defines SVG icons
  const svgMatches = content.match(/createElement\(\s*["']svg["'][^)]*\)/g);
  if (svgMatches && svgMatches.length > 0) {
    ['ruler', 'eraser', 'highlighter', 'laser', 'pen', 'lasso', 'undo', 'redo'].forEach(word => {
      const reg = new RegExp(`[\\w$]*${word}[\\w$]*`, 'gi');
      let m;
      const terms = new Set();
      while ((m = reg.exec(content)) !== null) {
        if (m[0].length < 30) terms.add(m[0]);
      }
      if (terms.size > 0 && terms.size < 15) {
        console.log(`[${f}] (${svgMatches.length} svgs) matched ${word}:`, Array.from(terms).join(', '));
      }
    });
  }
});
