import fs from 'fs';
import path from 'path';

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
}

const fp = path.join(process.cwd(), 'data', 'image-gap-candidates.csv');
const lines = fs.readFileSync(fp, 'utf-8').split(/\r?\n/).filter(Boolean);
const headers = parseCsvLine(lines[0]);
const idx = Object.fromEntries(headers.map((h, i) => [h, i]));

const rows = [];
for (const line of lines.slice(1)) {
  const c = parseCsvLine(line);
  const candidate1 = c[idx.candidate1_name] || '';
  if (!candidate1) continue;
  rows.push({
    target: c[idx.target_name],
    target_slug: c[idx.target_slug],
    score1: Number(c[idx.candidate1_score] || 0),
    c1: candidate1,
    c1slug: c[idx.candidate1_slug],
    c1img: c[idx.candidate1_image],
    score2: Number(c[idx.candidate2_score] || 0),
    c2: c[idx.candidate2_name],
    c2slug: c[idx.candidate2_slug],
    c2img: c[idx.candidate2_image],
  });
}

rows.sort((a, b) => b.score1 - a.score1 || a.target.localeCompare(b.target));
console.log(`Rows with candidate1: ${rows.length}`);
for (const r of rows) {
  console.log(
    `${r.target} [${r.target_slug}] <= ${r.c1} [${r.c1slug}] score=${r.score1.toFixed(3)}`
  );
}

