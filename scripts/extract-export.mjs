import fs from 'fs';
import path from 'path';

const [,, sourcePath, outputDir] = process.argv;

if (!sourcePath || !outputDir) {
  console.error('Usage: node scripts/extract-export.mjs <source-export.txt> <output-dir>');
  process.exit(1);
}

const raw = fs.readFileSync(sourcePath, 'utf8');
const marker = /^===== FILE: \.\/(.+?) =====$/gm;
const matches = [...raw.matchAll(marker)];

if (matches.length === 0) {
  console.error('No file markers found in export');
  process.exit(1);
}

for (let index = 0; index < matches.length; index += 1) {
  const current = matches[index];
  const next = matches[index + 1];
  const relPath = current[1];
  const contentStart = current.index + current[0].length;
  const contentEnd = next ? next.index : raw.length;
  let content = raw.slice(contentStart, contentEnd);

  if (content.startsWith('\n\n')) {
    content = content.slice(2);
  } else if (content.startsWith('\n')) {
    content = content.slice(1);
  }

  content = content.replace(/\n+$/, '\n');

  const targetPath = path.join(outputDir, relPath);
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.writeFileSync(targetPath, content, 'utf8');
}

console.log(`Extracted ${matches.length} files into ${outputDir}`);
