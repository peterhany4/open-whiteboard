const fs = require('fs');
const path = require('path');

const chunkDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunkDir).filter(f => f.endsWith('.js'));

for (const file of files) {
  const content = fs.readFileSync(path.join(chunkDir, file), 'utf8');
  if (content.includes('786285:')) {
    console.log(`Found 786285 in ${file}`);
    const m = /786285:\s*\((.*?)\}\),/s.exec(content);
    if (m) {
      console.log('Module 786285 content:');
      console.log(m[0].substring(0, 2000));
    }
  }
}
