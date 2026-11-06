const fs = require('fs');
const path = require('path');

function searchFiles(dir, regex, results = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      searchFiles(fullPath, regex, results);
    } else if (entry.isFile() && (entry.name.endsWith('.js') || entry.name.endsWith('.json'))) {
      try {
        const content = fs.readFileSync(fullPath, 'utf8');
        let match;
        while ((match = regex.exec(content)) !== null) {
          const start = Math.max(0, match.index - 100);
          const end = Math.min(content.length, match.index + 200);
          results.push({
            file: fullPath,
            index: match.index,
            snippet: content.substring(start, end).replace(/\s+/g, ' ')
          });
          if (results.length > 30) break;
        }
      } catch (err) {}
    }
  }
  return results;
}

const terms = [
  /PenTool/i,
  /BallpointPen/i,
  /CalligraphyPen/i,
  /FountainPen/i,
  /HighlighterTool/i,
  /colorPicker/i
];

console.log('Searching targets...');
const res = searchFiles('targets', /pen1|pen2|pen3|pen4|pen5|PenTool|InkingTool/i);
console.log(`Found ${res.length} matches`);
res.slice(0, 10).forEach(r => {
  console.log('---', path.basename(r.file), '---');
  console.log(r.snippet);
});
