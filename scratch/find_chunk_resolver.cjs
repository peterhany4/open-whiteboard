const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunksDir);

files.forEach(f => {
  if (!f.endsWith('.js')) return;
  const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
  // Webpack chunk filename resolver is typically e.u=e=>... or i.u=e=>...
  const match = content.match(/\.u\s*=\s*(function\([^)]+\)|[a-zA-Z]\s*=>)[^;]+/);
  if (match) {
    console.log('Chunk resolver in:', f);
    console.log(match[0].substring(0, 500));
  }
});
