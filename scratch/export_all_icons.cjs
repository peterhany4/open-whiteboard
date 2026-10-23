const fs = require('fs');
const path = require('path');

const chunk91464 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const c91464 = fs.readFileSync(chunk91464, 'utf8');

const chunk3644 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/3644.110e4f725e64dcb36fa7.js');
const c3644 = fs.readFileSync(chunk3644, 'utf8');

const chunk16494 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/16494.b7be05d84f7a3d5ba72b.js');
const c16494 = fs.readFileSync(chunk16494, 'utf8');

const iconDict = {};

function extractFrom91464(name, varName) {
  const p = c91464.indexOf(`const ${varName}=n.createElement("svg"`);
  if (p === -1) {
    const p2 = c91464.indexOf(`${varName}=n.createElement("svg"`);
    if (p2 === -1) return;
  }
  const pos = p !== -1 ? p : c91464.indexOf(`${varName}=n.createElement("svg"`);
  const code = c91464.substring(pos, c91464.indexOf('));', pos) + 3);
  
  const paths = [];
  const pr = /d:\s*"([^"]+)"/g;
  let pm;
  while ((pm = pr.exec(code)) !== null) {
    paths.push(pm[1]);
  }
  
  const vb = code.match(/viewBox:\s*"([^"]+)"/) || code.match(/viewBox:"([^"]+)"/);
  iconDict[name] = {
    source: '91464/Module 453072',
    viewBox: vb ? vb[1] : '0 0 20 20',
    paths
  };
}

function extractFrom3644(name, modId) {
  const p = c3644.indexOf(`${modId}:(`);
  if (p === -1) return;
  const nextP = c3644.slice(p + 10).search(/\d{4,7}:\s*\(/);
  const end = (nextP !== -1) ? p + 10 + nextP : c3644.length;
  const code = c3644.substring(p, end);
  
  const paths = [];
  const pr = /d:\s*"([^"]+)"/g;
  let pm;
  while ((pm = pr.exec(code)) !== null) {
    paths.push(pm[1]);
  }
  const vb = code.match(/viewBox:\s*"([^"]+)"/) || code.match(/viewBox:"([^"]+)"/);
  iconDict[name] = {
    source: '3644/Module ' + modId,
    viewBox: vb ? vb[1] : '0 0 20 20',
    paths
  };
}

function extractFrom16494(name, modId) {
  const p = c16494.indexOf(`${modId}:(`);
  if (p === -1) return;
  const nextP = c16494.slice(p + 10).search(/\d{4,7}:\s*\(/);
  const end = (nextP !== -1) ? p + 10 + nextP : c16494.length;
  const code = c16494.substring(p, end);
  
  const paths = [];
  const pr = /d:\s*"([^"]+)"/g;
  let pm;
  while ((pm = pr.exec(code)) !== null) {
    paths.push(pm[1]);
  }
  const vb = code.match(/viewBox:\s*"([^"]+)"/) || code.match(/viewBox:"([^"]+)"/);
  iconDict[name] = {
    source: '16494/Module ' + modId,
    viewBox: vb ? vb[1] : '0 0 20 20',
    paths
  };
}

extractFrom91464('Undo', 'T');
extractFrom91464('Redo', 'D');
extractFrom91464('Lasso', 'Ke');
extractFrom91464('Note', 'Ce');
extractFrom91464('Text', 'ke');
extractFrom91464('Shapes', 'be');
extractFrom91464('Sticker', 'Pe');
extractFrom91464('Image', '$');
extractFrom91464('Document', 'nt');
extractFrom91464('Ink', 'X');
extractFrom91464('Settings', 'pe');
extractFrom91464('More', 'le');
extractFrom91464('Delete', 'ze');
extractFrom91464('Cursor', 'm');
extractFrom91464('Hand', 'y');
extractFrom91464('Dismiss', 'v');

extractFrom3644('Ruler', 181117);
extractFrom3644('Eraser', 736830);
extractFrom3644('ZoomIn', 31350);
extractFrom3644('ZoomOut', 950686);
extractFrom3644('FitToScreen', 865891);
extractFrom3644('ScaleFit', 658495);
extractFrom3644('ChevronDown', 393703);
extractFrom3644('ChevronLeft', 775346);
extractFrom3644('ChevronRight', 113171);
extractFrom3644('DocumentPDF', 953008);
extractFrom3644('PaintBrush', 785854);

extractFrom16494('Add', 840643);

fs.writeFileSync('scratch/all_extracted_icons.json', JSON.stringify(iconDict, null, 2));
console.log('Saved all_extracted_icons.json, total icons:', Object.keys(iconDict).length);
