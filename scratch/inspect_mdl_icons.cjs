const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/FluentMDLIcons.53c51c829007f452de71.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const regex = /(\d{4,7}):\s*\(([^)]+)\)\s*=>\s*\{/g;
const modules = [];
let m;
while ((m = regex.exec(content)) !== null) {
  modules.push({ id: m[1], start: m.index });
}

console.log('Total modules in FluentMDLIcons:', modules.length);

// Let's see what each module has: path d and any string
for (let i = 0; i < modules.length; i++) {
  const mod = modules[i];
  const end = (i + 1 < modules.length) ? modules[i + 1].start : content.length;
  const modCode = content.substring(mod.start, end);
  
  const paths = [];
  const pr = /d:\s*["']([^"']+)["']/g;
  let pm;
  while ((pm = pr.exec(modCode)) !== null) {
    paths.push(pm[1]);
  }
  
  if (paths.length > 0) {
    console.log(`Mod ${mod.id}: paths=${paths.length}, d=${paths[0].substring(0, 70)}...`);
  }
}
