const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = fs.readdirSync(chunksDir);

const missingMods = [
  { name: 'Undo', id: 661214 },
  { name: 'Redo', id: 92315 },
  { name: 'Ruler', id: 644265 },
  { name: 'Eraser', id: 321111 },
  { name: 'Lasso', id: 980486 },
  { name: 'Note', id: 545624 },
  { name: 'Shapes', id: 909774 },
  { name: 'Heart', id: 466810 },
  { name: 'Image', id: 597502 },
  { name: 'Document', id: 601956 }
];

missingMods.forEach(m => {
  let found = false;
  for (const f of files) {
    if (!f.endsWith('.js')) continue;
    const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
    if (content.includes(`${m.id}:(`) || content.includes(`${m.id}: (`)) {
      console.log(`Found ${m.name} (${m.id}) in file: ${f}`);
      found = true;
      break;
    }
  }
  if (!found) {
    console.log(`Could not find ${m.name} (${m.id}) by module ID`);
  }
});
