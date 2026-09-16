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
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') inQuotes = !inQuotes;
    else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else cur += c;
  }
  out.push(cur.trim());
  return out;
}

function csvNames(csvPath) {
  const content = fs.readFileSync(csvPath, 'utf-8').replace(/^\uFEFF/, '');
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];
  const header = parseCsvLine(lines[0]).map((h) => h.toLowerCase());
  const nameIdx = header.indexOf('name');
  if (nameIdx < 0) throw new Error('CSV missing name column');
  return lines.slice(1).map((l) => parseCsvLine(l)[nameIdx]?.trim()).filter(Boolean);
}

function normalize(v) {
  return (v || '').toLowerCase().trim();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const csvPath = path.join(process.cwd(), 'data', 'products-import.csv');
  const names = csvNames(csvPath);

  const byCategorySlug = {
    'hair-and-salon-tools': [
      'Pinky Shares',
      'Head Band Wig Cap',
      'Glue Gun',
      'Glue Sticks',
      'Ear Protective Frontal Band',
      'Chest Band',
      'Elastic Band',
      'Magnetic Band',
      'Spiral Rods',
      'Wide Knife Comb',
      'Tripod Stand Mini',
      'Tripod Stand',
      'Extreme Sewing Machine',
    ],
    'braid-extensions': [
      'Drawstring Ponytail',
      'Ponytail Wrap',
    ],
    'styling-tools': [
      'Wig Fix Stick',
      'Foaming Wax',
      'NBI Wax Gel',
      'Got2b Glue',
      'Dread Foam',
      'ORS Twist Gel',
      'ORS Olive Sheen Big',
      'ORS Olive Sheen Small',
      'ORS Mousse Wrap',
      'Olive Oil Edge Control',
    ],
    'haircare-products': [
      'Kuuqa Anti Itch',
      'Leodais Serum',
      'Glue Remover',
      'Apple Curl Keeper',
      'Olive Sheen',
      'Eunera Shampoo Big',
      'Eunera Conditioner Big',
      'Argan Mask',
      'Keratin Mask',
      'Keratin Shampoo',
      'Keratin Conditioner',
      'Olive Bleach Powder',
      'Silicon Mix Shampoo Big',
      'Silicon Mix Shampoo Medium',
      'Silicon Mix Shampoo Small',
      '6pcs Relaxer Set',
      '10pcs Relaxer Set',
      '15pcs Relaxer Set',
      'Adore Dye',
      'Tresseme Shampoo Big',
      'Tresseme Shampoo Small',
      'Tresseme Conditioner Small',
      'Olive Oil Shampoo',
      'Olive Oil Conditioner',
      'ORS Mayonnaise Big',
      'ORS Mayonnaise Small',
    ],
  };

  const mappedNames = new Set(
    Object.values(byCategorySlug)
      .flat()
      .map(normalize)
  );

  const csvNormalized = names.map(normalize);
  const unmapped = csvNormalized.filter((n) => !mappedNames.has(n));
  if (unmapped.length) {
    throw new Error(`Unmapped CSV names: ${unmapped.join(', ')}`);
  }

  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: catErr } = await supabase.from('categories').select('id,slug,name');
  if (catErr) throw catErr;
  const categoryIdBySlug = new Map((categories || []).map((c) => [c.slug, c.id]));

  for (const slug of Object.keys(byCategorySlug)) {
    if (!categoryIdBySlug.has(slug)) {
      throw new Error(`Category slug not found in DB: ${slug}`);
    }
  }

  const { data: importedRows, error: prodErr } = await supabase
    .from('products')
    .select('id,name,slug,category_id')
    .in('name', names);
  if (prodErr) throw prodErr;

  const groups = new Map();
  for (const p of importedRows || []) {
    const k = normalize(p.name);
    groups.set(k, [...(groups.get(k) || []), p]);
  }

  const dupes = [...groups.entries()].filter(([, list]) => list.length > 1);
  console.log(`Imported rows found: ${importedRows?.length || 0}`);
  console.log(`Duplicate imported names in DB: ${dupes.length}`);
  for (const [k, list] of dupes) {
    console.log(`- ${k} (count=${list.length})`);
  }

  const updates = [];
  for (const [slug, list] of Object.entries(byCategorySlug)) {
    const categoryId = categoryIdBySlug.get(slug);
    for (const name of list) {
      const matches = groups.get(normalize(name)) || [];
      for (const p of matches) {
        updates.push({ id: p.id, name: p.name, slug: p.slug, category_id: categoryId, category_slug: slug });
      }
    }
  }

  console.log(`Rows to categorize: ${updates.length}${dryRun ? ' (dry run)' : ''}`);
  for (const u of updates) {
    console.log(`- ${u.name} -> ${u.category_slug}`);
  }

  if (dryRun) return;

  for (const u of updates) {
    const { error } = await supabase.from('products').update({ category_id: u.category_id }).eq('id', u.id);
    if (error) throw error;
  }

  console.log(`Categorized ${updates.length} product row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

