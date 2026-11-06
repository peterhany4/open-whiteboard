const fs = require('fs');
const path = require('path');

const chunkDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');

const files = fs.readdirSync(chunkDir).filter(f => f.endsWith('.js'));

console.log(`Scanning ${files.length} chunk files...`);

for (const file of files) {
  const content = fs.readFileSync(path.join(chunkDir, file), 'utf8');

  const patterns = [
    /PenType/i,
    /Ballpoint/i,
    /Fineliner/i,
    /Pencil/i,
    /Fountain/i,
    /penColors/i,
    /defaultPens/i,
    /penSettings/i,
    /colorPicker/i
  ];

  for (const pat of patterns) {
    let m = pat.exec(content);
    if (m) {
      const start = Math.max(0, m.index - 80);
      const end = Math.min(content.length, m.index + 120);
      console.log(`[${file}] Matched ${pat}:`);
      console.log(content.substring(start, end).replace(/\s+/g, ' '));
      break;
    }
  }
}
