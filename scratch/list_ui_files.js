import fs from 'fs';

const content = fs.readFileSync('C:\\Users\\peake\\.gemini\\antigravity-ide\\brain\\745ff8e4-f6f8-45fc-8b7c-75b4711d7875\\.system_generated\\steps\\7859\\content.md', 'utf8');
const jsonStr = content.slice(content.indexOf('['), content.lastIndexOf(']') + 1);
const files = JSON.parse(jsonStr);

console.log('Total files:', files.length);
for (const f of files) {
  if (f.name.includes('text') || f.name.includes('select') || f.name.includes('canvas') || f.name.includes('render') || f.name.includes('view') || f.name.includes('page')) {
    console.log(f.name, `(${f.size} bytes)`);
  }
}
