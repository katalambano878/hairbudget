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

const checklist = [
  { label: 'Oucheless band', slug: 'oucheless-band', expected: 24 },
  { label: 'Luxury protein shampoo', slug: 'luxury-protein-morocco-plant-oil', expected: 47 },
  { label: 'Luxury protein conditioner', slug: 'blend-moikuura-avocado-sturizing-detangling-conditioner', expected: 167 },
  { label: 'Canvas head', slug: 'canvas-block-head-mannequin', expected: 49 },
  { label: '600pcs gel tips', slug: '600pcs-ultrabond', expected: 124 },
  { label: '240pcs gel tips', slug: '240pcs-soft-gel-tips', expected: 13 },
  { label: '3D diamond nails', slug: '3d-silicon-brush', expected: 3 },
  { label: 'Normal stick on nails', slug: 'normal-nail', expected: 71 },
  { label: 'Derma roller', slug: 'derma-roller', expected: 84 },
  { label: 'Beginner nail set in case', slug: 'beginners-set-with-case', expected: 43 },
  { label: 'Wooden arm rest short legs', slug: 'wooden-arm-rest-short', expected: 15 },
  { label: 'Wrap ponytail net', slug: 'ponytail-wrap', expected: 275 },
];

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await supabase
    .from('products')
    .select('name,slug,quantity')
    .in('slug', checklist.map((x) => x.slug));
  if (error) throw error;

  const bySlug = new Map((data || []).map((p) => [p.slug, p]));

  console.log('=== CHECKABLE ITEMS FROM PHOTO ===');
  for (const item of checklist) {
    const row = bySlug.get(item.slug);
    if (!row) {
      console.log(`MISSING PRODUCT: ${item.label} (${item.slug}) expected=${item.expected}`);
      continue;
    }
    const qty = Number(row.quantity || 0);
    const ok = qty === item.expected;
    console.log(`${ok ? 'OK' : 'MISMATCH'} | ${item.label} | expected=${item.expected} actual=${qty} | ${row.slug}`);
  }

  console.log('\n=== PHOTO LINES WITH NO CATALOG MATCH FOUND YET ===');
  const missingCatalog = [
    'Packaging net (M, L, XL, small)',
    'Mesh dome cap',
    '600pcs ultra short tips',
    'Refill nails',
  ];
  for (const name of missingCatalog) {
    console.log(`NOT IN CATALOG: ${name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
