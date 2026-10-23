const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const startPattern = '453072:(';
const idx = content.indexOf(startPattern);
const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
const mod = content.substring(idx, end);

// The mapping in Kl:
const iconVars = {
  AddPerson: 'r',
  AltText: 'Lt',
  Copy: 'ut',
  ClearCanvas: 'wt',
  Cursor: 's',
  Delete: 'Ue',
  Diagram: 'f',
  Dismiss: 'E',
  Document: 'at',
  Lasso: 'Ge',
  Hand: 'Z',
  Home: 'B',
  Undo_HookUpLeft: 'I',
  Redo_HookUpRight: 'W',
  Image: 'j',
  Ink: 'J',
  Open: 'me',
  More: 'te',
  Move: 'Oe',
  Note: 'ie',
  Paste: 'ot',
  Settings: 'ue',
  Shapes: 've',
  Sticker: 'ye',
  Text: 'xe',
  Template: 'qe'
};

for (const [name, v] of Object.entries(iconVars)) {
  // Let's find function v({filled:..., large:...})
  // Usually in this bundle: function v({filled:e,large:t}){return ...}
  const funcRegex = new RegExp(`function\\s+${v}\\s*\\([^)]*\\)\\s*\\{([\\s\\S]*?)\\}`);
  const match = mod.match(funcRegex);
  if (match) {
    console.log(`\n=== Icon ${name} (${v}) ===`);
    console.log(match[0]);
    // find what variables it returns, e.g. return t?e?c:C:e?o:i
    const retMatch = match[0].match(/return\s+([^;]+)/);
    if (retMatch) {
      console.log(`   Returns: ${retMatch[1]}`);
      // find definitions of those returned vars, e.g. const i=n.createElement("svg", ...)
      const tokens = retMatch[1].match(/[a-zA-Z0-9_$]+/g) || [];
      tokens.forEach(tok => {
        if (tok === 't' || tok === 'e' || tok === 'return') return;
        const constRegex = new RegExp(`(?:const|var|let)\\s+${tok}\\s*=\\s*n\\.createElement\\("svg"[\\s\\S]*?\\)\\)\\)`);
        const cMatch = mod.match(constRegex);
        if (cMatch) {
          // extract paths
          const paths = [];
          const pr = /d:\s*["']([^"']+)["']/g;
          let pm;
          while ((pm = pr.exec(cMatch[0])) !== null) {
            paths.push(pm[1]);
          }
          console.log(`     -> ${tok}: SVG paths (${paths.length})`);
          paths.forEach((p, pi) => console.log(`        [${pi}]: ${p.substring(0, 100)}...`));
        }
      });
    }
  } else {
    console.log(`Could not find function ${v} for ${name}`);
  }
}
