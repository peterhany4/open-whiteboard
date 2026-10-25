import fs from 'fs';
import path from 'path';

const chunksDir = 'd:/Programming/whiteboard-REA/targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks';
const file2 = 'BoardEditorComponent-852bcd1f.d8ba3dff26421f7774a2.js';
const content2 = fs.readFileSync(path.join(chunksDir, file2), 'utf8');

console.log(content2.slice(122500, 123500));
