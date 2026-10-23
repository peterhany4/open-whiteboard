const fs = require('fs');
const path = require('path');

const chunk45173 = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/45173.257b0efe77bb99c967d8.js');
const content45173 = fs.readFileSync(chunk45173, 'utf8');

console.log('Snippet around 76767 in 45173:\n', content45173.substring(76700, 77500));
console.log('\nSnippet around 77961 in 45173:\n', content45173.substring(77900, 78800));
