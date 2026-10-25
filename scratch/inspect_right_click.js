const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');

const files = fs.readdirSync(chunksDir);

function searchTerms(terms) {
  for (const file of files) {
    if (!file.endsWith('.js')) continue;
    const filePath = path.join(chunksDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    for (const term of terms) {
      let idx = 0;
      while ((idx = content.indexOf(term, idx)) !== -1) {
        const snippet = content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 250)).replace(/\n/g, ' ');
        console.log(`[${file}] ${term}:`);
        console.log(snippet);
        console.log('---');
        idx += term.length;
        if (idx > 500000) break;
      }
    }
  }
}

console.log('=== SEARCHING CONTEXT MENU & RIGHT CLICK ===');
searchTerms(['onContextMenu', 'contextmenu', 'button===2', 'button === 2', 'button:2', 'ContextMenuConstants']);
