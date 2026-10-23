const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/91464.7aeadf3b6ddc55b8cdc3.js');
const content = fs.readFileSync(chunkFile, 'utf8');

// Find module 453072 and module 667907
function getModuleCode(modId) {
  const startPattern = `${modId}:(`;
  const startAlt = `${modId}: (`;
  let idx = content.indexOf(startPattern);
  if (idx === -1) idx = content.indexOf(startAlt);
  if (idx === -1) return null;
  // find next module
  const nextMod = content.slice(idx + 10).search(/\d{4,7}:\s*\(/);
  const end = (nextMod !== -1) ? idx + 10 + nextMod : content.length;
  return content.substring(idx, end);
}

const mod453072 = getModuleCode(453072);
console.log('Mod 453072 len:', mod453072 ? mod453072.length : 'not found');
if (mod453072) {
  console.log('Mod 453072 preview:', mod453072.substring(0, 1500));
}

const mod667907 = getModuleCode(667907);
console.log('Mod 667907 len:', mod667907 ? mod667907.length : 'not found');
if (mod667907) {
  console.log('Mod 667907 preview:', mod667907.substring(0, 1500));
}
