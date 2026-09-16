import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Z]:)/, '$1'), '..');
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'data', 'patches']);
const EXT = new Set(['.ts', '.tsx', '.js', '.jsx', '.css', '.sql', '.json', '.md', '.mjs']);

const REPLACEMENTS = [
  [/Wig Century/g, 'HairBudget'],
  [/wig century/g, 'hairbudget'],
  [/WigCentury/g, 'HairBudget'],
  [/wigcentury\.com/g, 'hairbudgetgh.com'],
  [/wigcentury/g, 'hairbudget'],
  [/wig-century/g, 'hairbudget'],
  [/#2563[eE][bB]/g, '#0C4534'],
  [/#1e40af/gi, '#093C2D'],
  [/#0c4a6e/gi, '#093C2D'],
  [/#EFF6FF/gi, '#EEE5D4'],
  [/#EDE9FE/gi, '#EEE5D4'],
  [/#4C1D95/gi, '#093C2D'],
  [/#1e293b/gi, '#0C4534'],
  [/#334155/gi, '#194E3C'],
  [/#0f172a/gi, '#093C2D'],
  [/#64748b/gi, '#BDBCB8'],
  [/rgba\(56,\s*189,\s*248/g, 'rgba(218, 204, 169'],
  [/admin@hairbudget\.com/g, 'info@hairbudgetgh.com'],
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    if (SKIP_DIRS.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (EXT.has(path.extname(name))) files.push(full);
  }
  return files;
}

let changed = 0;
for (const file of walk(ROOT)) {
  if (file.endsWith('package-lock.json')) continue;
  if (file.includes(`${path.sep}scripts${path.sep}rebrand-hairbudget.mjs`)) continue;
  let text = fs.readFileSync(file, 'utf8');
  const original = text;
  for (const [re, to] of REPLACEMENTS) text = text.replace(re, to);
  if (text !== original) {
    fs.writeFileSync(file, text);
    changed += 1;
    console.log('updated', path.relative(ROOT, file));
  }
}
console.log(`\n${changed} files updated`);
