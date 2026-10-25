import fs from 'fs';
import path from 'path';

const chunksDir = 'd:/Programming/whiteboard-REA/targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks';
const file = 'BoardEditorComponent-84781932.a42f38c8c9aa0e756cd7.js';
const content = fs.readFileSync(path.join(chunksDir, file), 'utf8');

// Find onContextMenu definitions
const regex = /onContextMenu\s*[:=]\s*(?:function|\([^)]*\)\s*=>)[^}]+}/g;
let match;
while ((match = regex.exec(content)) !== null) {
  console.log('--- DEF ---');
  console.log(match[0]);
}

// Also search in BoardEditorComponent-852bcd1f
const file2 = 'BoardEditorComponent-852bcd1f.d8ba3dff26421f7774a2.js';
const content2 = fs.readFileSync(path.join(chunksDir, file2), 'utf8');
let match2;
while ((match2 = regex.exec(content2)) !== null) {
  console.log('--- DEF 852 ---');
  console.log(match2[0]);
}
