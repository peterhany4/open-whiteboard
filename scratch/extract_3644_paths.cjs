const fs = require('fs');
const path = require('path');

const chunkFile = path.resolve('targets/whiteboard-bundles/files/origins/a650871511badba1e97f5f5aed128f690852a70301ed0b10907af73136ba0667/blueboard/chunks/3644.110e4f725e64dcb36fa7.js');
const content = fs.readFileSync(chunkFile, 'utf8');

const targetMods = {
  Undo_Regular: 661214,
  Undo_Filled: 906981,
  Redo_Regular: 92315,
  Redo_Filled: 879109,
  Ruler_Regular: 644265,
  Ruler_Filled: 530869,
  Eraser_Regular: 321111,
  Eraser_Filled: 817730,
  Lasso_Regular: 980486,
  Lasso_Filled: 146030,
  Note_Regular: 545624,
  Note_Filled: 114949,
  Text_Regular: 600509,
  Shapes_Regular: 909774,
  Shapes_Filled: 948839,
  Heart_Regular: 466810,
  Heart_Filled: 477810,
  Image_Regular: 597502,
  Image_Filled: 985396,
  Document_Regular: 601956,
  Document_Filled: 424888,
  DocumentPDF_Regular: 953008,
  DocumentPDF_Filled: 185057,
  ZoomIn_Regular: 31350,
  ZoomIn_Filled: 646477,
  ZoomOut_Regular: 950686,
  ZoomOut_Filled: 831882,
  ZoomFit_Regular: 865891,
  ZoomFit_Filled: 366676,
  ScaleFit_Regular: 658495,
  ScaleFit_Filled: 595576,
  Settings_Regular: 894472,
  Settings_Filled: 146353,
  ChevronDown_Regular: 393703,
  ChevronDown_Filled: 319327,
  ChevronLeft_Regular: 775346,
  ChevronRight_Regular: 113171,
  MoreHorizontal_Regular: 195484,
  MoreVertical_Regular: 582557,
  Delete_Regular: 45201,
  Dismiss_Filled: 157565,
  PaintBrush_Regular: 785854,
  PaintBrush_Filled: 355734,
  InkStroke_Regular: 99354,
  InkStroke_Filled: 258693
};

const results = {};

for (const [name, id] of Object.entries(targetMods)) {
  const p = content.indexOf(`${id}:(`);
  if (p === -1) {
    results[name] = { found: false, id };
    continue;
  }
  const nextP = content.slice(p + 10).search(/\d{4,7}:\s*\(/);
  const end = (nextP !== -1) ? p + 10 + nextP : content.length;
  const modCode = content.substring(p, end);
  
  // Extract path d attributes
  const paths = [];
  const pathRegex = /d:\s*["']([^"']+)["']/g;
  let pm;
  while ((pm = pathRegex.exec(modCode)) !== null) {
    paths.push(pm[1]);
  }
  
  results[name] = {
    found: true,
    id,
    pathCount: paths.length,
    paths
  };
}

for (const [name, data] of Object.entries(results)) {
  if (data.found) {
    console.log(`[OK] ${name} (mod ${data.id}) -> ${data.pathCount} paths`);
    data.paths.forEach((p, idx) => console.log(`      path[${idx}]: ${p.substring(0, 80)}...`));
  } else {
    console.log(`[MISSING] ${name} (mod ${data.id})`);
  }
}
