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

function normalizeName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows, headers) {
  const head = headers.join(',');
  const lines = rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','));
  return `${head}\n${lines.join('\n')}\n`;
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id,slug,name');
  if (catErr) throw catErr;
  const catById = new Map((categories || []).map((c) => [c.id, c.slug]));

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id,name,slug,price,sale_price,category_id,created_at,external_source,external_id')
    .order('created_at', { ascending: true });
  if (prodErr) throw prodErr;

  const byNorm = new Map();
  for (const p of products || []) {
    const norm = normalizeName(p.name);
    byNorm.set(norm, [...(byNorm.get(norm) || []), p]);
  }

  const exactGroups = [...byNorm.entries()]
    .filter(([k, group]) => k && group.length > 1)
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));

  const exactRows = [];
  for (const [norm, group] of exactGroups) {
    const oldest = group[0];
    const newest = group[group.length - 1];
    for (const p of group) {
      exactRows.push({
        normalized_name: norm,
        duplicate_count: group.length,
        id: p.id,
        name: p.name,
        slug: p.slug,
        created_at: p.created_at,
        category: catById.get(p.category_id) || '',
        price: p.price,
        sale_price: p.sale_price ?? '',
        external_source: p.external_source ?? '',
        external_id: p.external_id ?? '',
        oldest_id: oldest.id,
        newest_id: newest.id,
      });
    }
  }

  const summaryRows = exactGroups.map(([norm, group]) => ({
    normalized_name: norm,
    duplicate_count: group.length,
    ids: group.map((x) => x.id).join(' | '),
    names: group.map((x) => x.name).join(' | '),
    slugs: group.map((x) => x.slug).join(' | '),
    created_at_oldest: group[0].created_at,
    created_at_newest: group[group.length - 1].created_at,
  }));

  const outDir = path.join(process.cwd(), 'data');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const detailsPath = path.join(outDir, 'duplicate-products-audit-details.csv');
  const summaryPath = path.join(outDir, 'duplicate-products-audit-summary.csv');

  fs.writeFileSync(
    detailsPath,
    toCsv(exactRows, [
      'normalized_name',
      'duplicate_count',
      'id',
      'name',
      'slug',
      'created_at',
      'category',
      'price',
      'sale_price',
      'external_source',
      'external_id',
      'oldest_id',
      'newest_id',
    ]),
    'utf-8'
  );

  fs.writeFileSync(
    summaryPath,
    toCsv(summaryRows, [
      'normalized_name',
      'duplicate_count',
      'ids',
      'names',
      'slugs',
      'created_at_oldest',
      'created_at_newest',
    ]),
    'utf-8'
  );

  console.log(`Total products: ${products?.length || 0}`);
  console.log(`Duplicate name groups: ${exactGroups.length}`);
  for (const [norm, group] of exactGroups) {
    console.log(`- ${norm} (count=${group.length})`);
  }
  console.log(`\nWrote report files:`);
  console.log(`- ${summaryPath}`);
  console.log(`- ${detailsPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

