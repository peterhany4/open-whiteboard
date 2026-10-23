const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/16494.b7be05d84f7a3d5ba72b.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const regex = /(\d{4,7}):\s*\(([^)]+)\)\s*=>\s*\{/g;
const modules = [];
let m;
while ((m = regex.exec(content)) !== null) {
  modules.push({ id: m[1], start: m.index });
}

console.log('Modules in 16494:', modules.length);

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
    // Check if there are strings or names
    const names = [];
    const nr = /["']([A-Za-z0-9_]{3,30})["']/g;
    let nm;
    while ((nm = nr.exec(modCode)) !== null) {
      if (/Icon|Pen|Highlighter|Eraser|Laser|Ruler|Lasso|Theme|Dark|Sun|Moon|Shape|Arrow|Line|Circle|Square/i.test(nm[1])) {
        names.push(nm[1]);
      }
    }
    console.log(`Module ${mod.id} (${paths.length} paths): names=[${[...new Set(names)].join(', ')}]`);
    paths.slice(0, 2).forEach(p => console.log(`   ${p.substring(0, 80)}...`));
  }
}
