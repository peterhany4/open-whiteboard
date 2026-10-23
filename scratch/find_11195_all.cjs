const fs = require('fs');
const path = require('path');

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(fullPath));
    } else if (file.endsWith('.js') || file.endsWith('.json') || file.endsWith('.html')) {
      results.push(fullPath);
    }
  });
  return results;
}

const allFiles = walk('targets/whiteboard-bundles');
console.log('Total files:', allFiles.length);

allFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('11195')) {
    console.log('Matched 11195 in:', path.basename(f));
    let idx = 0;
    while ((idx = content.indexOf('11195', idx)) !== -1) {
      console.log('  snippet:', content.substring(Math.max(0, idx - 40), Math.min(content.length, idx + 60)));
      idx += 5;
    }
  }
});
