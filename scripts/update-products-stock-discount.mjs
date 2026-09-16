import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const altPath = path.join(__dirname, '..', '.env');
  const p = fs.existsSync(envPath) ? envPath : fs.existsSync(altPath) ? altPath : null;
  if (!p) return {};
  return Object.fromEntries(
    fs
      .readFileSync(p, 'utf-8')
      .split('\n')
      .filter((l) => /^[A-Z_]+=/.test(l.trim()))
      .map((l) => {
        const eq = l.indexOf('=');
        const key = l.slice(0, eq).trim();
        let val = l.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return [key, val];
      })
  );
}

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
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

function normalizeName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function slugifyLike(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function parseCsvFile(fp) {
  const lines = fs.readFileSync(fp, 'utf-8').split(/\r?\n/).filter(Boolean);
  if (!lines.length) return [];
  const headers = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(headers.map((h, i) => [h.trim(), i]));

  const rows = [];
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    const name = (c[idx.name] || '').trim();
    if (!name) continue;
    rows.push({
      name,
      price: Number(c[idx.price] || 0),
      discount: Number(c[idx.discount] || 0),
      stockRaw: (c[idx.stock] || '').trim(),
    });
  }
  return rows;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const files = [
    path.join(process.cwd(), 'data', 'products-import.csv'),
    path.join(process.cwd(), 'data', 'products-import-remaining.csv'),
  ].filter((fp) => fs.existsSync(fp));

  if (!files.length) throw new Error('No import CSV files found in data/.');
  const allRows = files.flatMap(parseCsvFile);

  const uniqueByNorm = new Map();
  for (const r of allRows) {
    uniqueByNorm.set(normalizeName(r.name), r);
  }
  const rows = [...uniqueByNorm.values()];

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id,name,slug,price,sale_price,quantity');
  if (pErr) throw pErr;

  const byNorm = new Map();
  const bySlug = new Map();
  for (const p of products || []) {
    const n = normalizeName(p.name);
    const s = (p.slug || '').toLowerCase();
    byNorm.set(n, [...(byNorm.get(n) || []), p]);
    bySlug.set(s, [...(bySlug.get(s) || []), p]);
  }

  const alias = new Map([
    ['rosaline dehydrator primer', 'rosaline-dehydrator-primer'],
    ['rosaline base coat', 'rosaline-base-coat'],
    ['mushering top base coat', 'mushering-top-base-coat'],
    ['pink arm rest', 'pink-arm-rest'],
    ['ibd builder gel', 'ibd-builder-gel'],
    ['bun pretty dehydrator bonder', 'bun-pretty-dehydrator-bonder'],
    ['nbi wax gel', 'nbi-wax-gel'],
    ['wig fix stick', 'wig-fix-stick'],
    ['eunera shampoo big', 'ewura-shampoo-big'],
    ['eunera conditioner big', 'ewura-conditioner-big'],
    ['silicon mix shampoo big', 'silicon-mix-shampoo-big'],
    ['silicon mix shampoo medium', 'silicon-mix-shampoo-medium'],
    ['silicon mix shampoo small', 'silicon-mix-shampoo-small'],
    ['600pcs soft gel tips', '600pcs-soft-gel-tips'],
    ['round bowl scrub set', 'round-bowl-scrub-set'],
  ]);

  const updates = [];
  const missing = [];
  const ambiguous = [];

  for (const row of rows) {
    const norm = normalizeName(row.name);
    const slugGuess = slugifyLike(row.name);
    let candidates = byNorm.get(norm) || bySlug.get(slugGuess) || [];

    if (!candidates.length && alias.has(norm)) {
      candidates = bySlug.get(alias.get(norm)) || [];
    }

    if (!candidates.length) {
      missing.push(row.name);
      continue;
    }
    if (candidates.length > 1) {
      ambiguous.push({ name: row.name, candidates: candidates.map((x) => `${x.name} (${x.slug})`) });
      continue;
    }

    const p = candidates[0];
    const payload = {
      id: p.id,
      price: row.price > 0 ? row.price : p.price,
      sale_price: row.discount > 0 ? row.discount : null,
      quantity:
        row.stockRaw !== '' && Number.isFinite(Number(row.stockRaw))
          ? Number(row.stockRaw)
          : p.quantity,
    };
    updates.push({ product: p, payload, source: row });
  }

  console.log(`Rows parsed: ${rows.length}`);
  console.log(`Matched updates: ${updates.length}${dryRun ? ' (dry run)' : ''}`);
  console.log(`Missing matches: ${missing.length}`);
  console.log(`Ambiguous matches: ${ambiguous.length}`);

  for (const u of updates.slice(0, 30)) {
    console.log(
      `- ${u.product.name} (${u.product.slug}) => price=${u.payload.price}, sale_price=${u.payload.sale_price}, qty=${u.payload.quantity}`
    );
  }
  if (updates.length > 30) console.log(`...and ${updates.length - 30} more`);

  if (missing.length) {
    console.log('\nMissing:');
    for (const m of missing.slice(0, 40)) console.log(`- ${m}`);
    if (missing.length > 40) console.log(`...and ${missing.length - 40} more`);
  }

  if (ambiguous.length) {
    console.log('\nAmbiguous:');
    for (const a of ambiguous.slice(0, 20)) {
      console.log(`- ${a.name} => ${a.candidates.join(' | ')}`);
    }
    if (ambiguous.length > 20) console.log(`...and ${ambiguous.length - 20} more`);
  }

  if (dryRun) return;
  if (!updates.length) return;

  for (const u of updates) {
    const { error } = await supabase
      .from('products')
      .update({
        price: u.payload.price,
        sale_price: u.payload.sale_price,
        quantity: u.payload.quantity,
      })
      .eq('id', u.payload.id);
    if (error) throw error;
  }

  console.log(`Applied ${updates.length} product updates.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

