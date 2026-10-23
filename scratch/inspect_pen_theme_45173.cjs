const fs = require('fs');
const path = require('path');

const chunk45173 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45173.257b0efe77bb99c967d8.js');
const content45173 = fs.readFileSync(chunk45173, 'utf8');

['Pen', 'Theme'].forEach(term => {
  let idx = 0;
  while ((idx = content45173.indexOf(term, idx)) !== -1) {
    console.log(`Matched ${term} in 45173 @ ${idx}:`);
    console.log(content45173.substring(Math.max(0, idx - 50), Math.min(content45173.length, idx + 100)));
    console.log('---');
    idx += term.length;
  }
});
