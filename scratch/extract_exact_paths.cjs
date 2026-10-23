const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '453072:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

const varsToExtract = {
  Undo_Regular: 'T',
  Undo_Filled: 'A',
  Redo_Regular: 'D',
  Redo_Filled: 'z',
  Lasso_Regular: 'Ke',
  Lasso_Filled: 'Ye',
  Note_Regular: 'Ce',
  Note_Filled: 'ce',
  Text_Regular: 'ke',
  Text_Filled: 'Se',
  Shapes_Regular: 'be',
  Shapes_Filled: 'He',
  Sticker_Regular: 'Pe',
  Sticker_Filled: 'Ne',
  Image_Regular: '$',
  Image_Filled: 'Y',
  Document_Regular: 'nt',
  Document_Filled: 'it',
  Ink_Regular: 'X',
  Ink_Filled: 'Q',
  Settings_Regular: 'pe',
  Settings_Filled: 'we',
  More_Regular: 'le',
  Delete_Regular: 'ze',
  Cursor_Regular: 'm',
  Hand_Regular: 'y',
  Dismiss_Regular: 'v'
};

const extracted = {};

for (const [name, varName] of Object.entries(varsToExtract)) {
  // Find const varName=n.createElement("svg", ...)
  // Note: varName could be $, which needs escaping in regex
  const escapedVar = varName.replace(/[$]/g, '\\$');
  const reg = new RegExp(`const\\s+${escapedVar}\\s*=\\s*n\\.createElement\\("svg",\\{([^}]+)\\},([\\s\\S]*?)(?:\\);|\\),\\w+=|\\),function)`);
  const match = mod.match(reg);
  if (!match) {
    extracted[name] = { error: 'Not matched' };
    continue;
  }
  
  const attrs = match[1];
  const children = match[2];
  
  // Extract viewBox or width/height
  const vb = attrs.match(/viewBox:\s*"([^"]+)"/);
  const w = attrs.match(/width:\s*"([^"]+)"/);
  const h = attrs.match(/height:\s*"([^"]+)"/);
  
  // Extract path d
  const paths = [];
  const pr = /d:\s*"([^"]+)"/g;
  let pm;
  while ((pm = pr.exec(children)) !== null) {
    paths.push(pm[1]);
  }

  // Extract fillRule or clipRule
  const fillRules = [];
  const fr = /fillRule:\s*"([^"]+)"/g;
  let fm;
  while ((fm = fr.exec(children)) !== null) {
    fillRules.push(fm[1]);
  }

  extracted[name] = {
    var: varName,
    viewBox: vb ? vb[1] : `0 0 ${w ? w[1] : 20} ${h ? h[1] : 20}`,
    paths,
    fillRules
  };
}

console.log(JSON.stringify(extracted, null, 2));
