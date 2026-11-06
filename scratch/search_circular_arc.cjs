const fs = require('fs');
const path = require('path');

const chunkDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunkDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const content = fs.readFileSync(path.join(chunkDir, file), 'utf8');
  if (content.includes('circularArc')) {
    console.log(`Found circularArc in ${file}`);
    let idx = 0;
    while ((idx = content.indexOf('circularArc', idx)) !== -1) {
      console.log(content.substring(Math.max(0, idx - 100), Math.min(content.length, idx + 200)).replace(/\s+/g, ' '));
      idx += 11;
    }
  }
}
