import fs from 'fs';
import path from 'path';

const chunksDir = 'd:/Programming/whiteboard-REA/targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks';

const files = fs.readdirSync(chunksDir);

for (const file of files) {
  if (!file.endsWith('.js')) continue;
  const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');
  if (content.includes('button === 2') || content.includes('button===2') || content.includes('contextmenu') || content.includes('ContextMenu')) {
    // Look for occurrences of button === 2 or contextmenu
    const regex = /(?:button\s*===?\s*2|contextmenu|onContextMenu)[^;]{0,150}/gi;
    let match;
    let count = 0;
    while ((match = regex.exec(content)) !== null && count < 5) {
      console.log(`[${file}] ${match[0]}`);
      count++;
    }
  }
}
