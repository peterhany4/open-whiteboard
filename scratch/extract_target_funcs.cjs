const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '453072:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

const targetFuncs = {
  Undo: 'I',
  Redo: 'W',
  Lasso: 'Ge',
  Note: 'ie',
  Text: 'xe',
  Shapes: 've',
  Sticker: 'ye',
  Image: 'j',
  Document: 'at',
  Ink: 'J',
  Settings: 'ue',
  More: 'te',
  Delete: 'Ue',
  Cursor: 's',
  Hand: 'Z',
  Dismiss: 'E'
};

const results = {};

for (const [name, fnName] of Object.entries(targetFuncs)) {
  // Find function fnName(...)
  const r = new RegExp(`function\\s+${fnName}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\}`);
  const match = mod.match(r);
  if (!match) {
    results[name] = 'function not found: ' + fnName;
    continue;
  }
  
  // What does it return?
  // Typically: return t?e?c:C:e?o:i
  const body = match[1];
  const ret = body.match(/return\s+([^;]+)/);
  results[name] = {
    fn: fnName,
    body: match[0],
    returns: ret ? ret[1] : 'unknown'
  };
}

console.log(JSON.stringify(results, null, 2));
