const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunksDir);

// Search for 11195: in files
files.forEach(f => {
  if (!f.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
  if (content.includes('11195:')) {
    console.log('Found 11195: in', f);
    let idx = content.indexOf('11195:');
    console.log(content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 200)));
  }
});
