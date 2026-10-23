const fs = require('fs');
const path = require('path');

const chunksDir = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks');

function inspectChunk(fileName) {
  const content = fs.readFileSync(path.join(chunksDir, fileName), 'utf8');
  console.log(`\n=================== ${fileName} ===================`);
  
  // Find all module IDs and look inside them
  const regex = /(\d{4,7}):\s*\(([^)]+)\)\s*=>\s*\{/g;
  let match;
  const modules = [];
  while ((match = regex.exec(content)) !== null) {
    modules.push({ id: match[1], start: match.index });
  }
  
  console.log(`Found ${modules.length} modules`);
  for (let i = 0; i < modules.length; i++) {
    const mod = modules[i];
    const end = (i + 1 < modules.length) ? modules[i + 1].start : content.length;
    const modContent = content.substring(mod.start, end);
    
    // Check if this module renders SVG
    const hasSvg = modContent.includes('createElement("svg"') || modContent.includes('createElement("path"') || modContent.includes('<svg') || modContent.includes('viewBox');
    
    // Extract any names, displayName, or strings
    const strings = [];
    const strRegex = /["']([A-Za-z0-9_ -]{3,40})["']/g;
    let sm;
    while ((sm = strRegex.exec(modContent)) !== null) {
      const s = sm[1];
      if (/Icon|Pen|Eraser|Ruler|Lasso|Highlighter|Laser|Undo|Redo|Zoom|Select|Note|Shape|Text|Reaction|Chevron|More|Setting/i.test(s)) {
        strings.push(s);
      }
    }
    
    // Extract path d attributes
    const paths = [];
    const pathRegex = /d:\s*["']([^"']+)["']/g;
    let pm;
    while ((pm = pathRegex.exec(modContent)) !== null) {
      paths.push(pm[1]);
    }

    // Viewbox
    const vb = modContent.match(/viewBox:\s*["']([^"']+)["']/);
    const viewBox = vb ? vb[1] : 'default (20x20 or standard)';
    
    if (strings.length > 0 || paths.length > 0) {
      console.log(`Module ${mod.id}: hasSvg=${hasSvg}, viewBox=${viewBox}, paths=${paths.length}, keywords=[${[...new Set(strings)].join(', ')}]`);
      if (paths.length > 0 && paths.length <= 4) {
        paths.forEach((p, idx) => {
          console.log(`   path[${idx}] (len ${p.length}): ${p.substring(0, 60)}...`);
        });
      }
    }
  }
}

inspectChunk('91464.7aeadf3b6ddc55b8cdc3.js');
inspectChunk('16494.b7be05d84f7a3d5ba72b.js');
