const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '453072:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

function getSvgDef(varName) {
  const p = mod.indexOf(`const ${varName}=n.createElement("svg"`);
  if (p === -1) {
    const p2 = mod.indexOf(`${varName}=n.createElement("svg"`);
    if (p2 === -1) return null;
    return mod.substring(p2, mod.indexOf('));', p2) + 3);
  }
  return mod.substring(p, mod.indexOf('));', p) + 3);
}

const list = [
  ['Undo_Regular', 'T'],
  ['Undo_Filled', 'A'],
  ['Redo_Regular', 'D'],
  ['Redo_Filled', 'z'],
  ['Lasso_Regular', 'Ke'],
  ['Lasso_Filled', 'Ye'],
  ['Note_Regular', 'Ce'],
  ['Note_Filled', 'ce'],
  ['Text_Regular', 'ke'],
  ['Text_Filled', 'Se'],
  ['Shapes_Regular', 'be'],
  ['Shapes_Filled', 'He'],
  ['Sticker_Regular', 'Pe'],
  ['Sticker_Filled', 'Ne'],
  ['Image_Regular', '$'],
  ['Image_Filled', 'Y'],
  ['Document_Regular', 'nt'],
  ['Document_Filled', 'it'],
  ['Ink_Regular', 'X'],
  ['Ink_Filled', 'Q'],
  ['Settings_Regular', 'pe'],
  ['Settings_Filled', 'we']
];

list.forEach(([name, v]) => {
  const code = getSvgDef(v);
  if (!code) {
    console.log(`[NOT FOUND] ${name} (${v})`);
    return;
  }
  const paths = [];
  const pr = /d:\s*"([^"]+)"/g;
  let pm;
  while ((pm = pr.exec(code)) !== null) {
    paths.push(pm[1]);
  }
  console.log(`=== ${name} (${v}) -> ${paths.length} paths ===`);
  paths.forEach((p, idx) => {
    console.log(`  d: "${p}"`);
  });
});
