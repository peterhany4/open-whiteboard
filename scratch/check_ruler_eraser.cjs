const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');
const files = ['3644.110e4f725e64dcb36fa7.js', 'FluentIcons_Size_20.c4f7f5a14fc4ae65f993.js'];

const checkMods = [181117, 790030, 736830, 575639];

files.forEach(f => {
  const content = fs.readFileSync(path.join(chunksDir, f), 'utf8');
  checkMods.forEach(id => {
    if (content.includes(`${id}:(`) || content.includes(`${id}: (`)) {
      console.log(`Found ${id} in ${f}!`);
      const p = content.indexOf(`${id}:(`);
      console.log(content.substring(p, p + 300));
    }
  });
});
