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

function normalize(v) {
  return (v || '').toLowerCase().trim();
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: catErr } = await supabase
    .from('categories')
    .select('id,name,slug')
    .order('name');
  if (catErr) throw catErr;

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id,name,slug,category_id')
    .order('name');
  if (prodErr) throw prodErr;

  console.log('Categories:');
  for (const c of categories || []) {
    console.log(`- ${c.name} (${c.slug}) | ${c.id}`);
  }
  console.log('');

  const byName = new Map();
  const bySlug = new Map();
  for (const p of products || []) {
    const n = normalize(p.name);
    const s = normalize(p.slug);
    byName.set(n, [...(byName.get(n) || []), p]);
    bySlug.set(s, [...(bySlug.get(s) || []), p]);
  }

  const dupNames = [...byName.values()].filter((x) => x.length > 1);
  const dupSlugs = [...bySlug.values()].filter((x) => x.length > 1);

  console.log(`Total products: ${products?.length || 0}`);
  console.log(`Duplicate names: ${dupNames.length}`);
  for (const group of dupNames) {
    console.log(`  name="${group[0].name}" count=${group.length}`);
  }
  console.log(`Duplicate slugs: ${dupSlugs.length}`);
  for (const group of dupSlugs) {
    console.log(`  slug="${group[0].slug}" count=${group.length}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

