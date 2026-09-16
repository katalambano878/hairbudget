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

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function upsertPriceBySlug(sb, slug, price, salePrice) {
  const { data: existing, error: eErr } = await sb
    .from('products')
    .select('id,slug,name')
    .eq('slug', slug)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!existing) return false;

  const { error: uErr } = await sb
    .from('products')
    .update({
      price,
      sale_price: salePrice,
    })
    .eq('id', existing.id);
  if (uErr) throw uErr;
  console.log(`UPDATED: ${slug} => price=${price}, sale_price=${salePrice}`);
  return true;
}

async function createIfMissing(sb, catBySlug, name, slug, price, salePrice, category) {
  const ok = await upsertPriceBySlug(sb, slug, price, salePrice);
  if (ok) return;
  const { error } = await sb.from('products').insert({
    name,
    slug,
    description: `${name} added from handwritten pricing sheet.`,
    price,
    sale_price: salePrice,
    quantity: 0,
    category_id: catBySlug.get(category) || null,
    status: 'active',
    featured: false,
    tags: ['paper-import', 'price-sheet'],
    metadata: { source: 'handwritten-price-sheet' },
    moq: 1,
  });
  if (error) throw error;
  console.log(`CREATED: ${name} (${slug}) => price=${price}, sale_price=${salePrice}`);
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: cErr } = await sb.from('categories').select('id,slug');
  if (cErr) throw cErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  const mappings = [
    ['kuuqa-anti-itch', 35, 30],
    ['leodais-serum', 25, 20],
    ['foaming-wax', 28, 22],
    ['pinky-shares', 50, 45],
    ['head-band-wig-cap', 25, 20],
    ['glue-gun', 35, 30],
    ['glue-sticks', 6, 6],
    ['drawstring-ponytail', 7, 6],
    ['ponytail-wrap', 6, 5],
    ['ear-protective-frontal-band', 20, 18],
    ['chest-band', 25, 20],
    ['glue-remover', 20, 17],
    ['apple-curl-keeper', 18, 15],
    ['olive-sheen', 25, 20],
    ['nbi-wax-gel', 25, 20],
    ['got2b-glue', 90, 85],
    ['kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo', 95, 89],
    ['kuura-beauty-avocado-batana-blend-moisturizing-conditioner', 95, 89],
    ['elastic-band', 55, 45],
    ['argan-mask', 55, 45],
    ['keratin-mask', 55, 45],
    ['keratin-shampoo', 60, 50],
    ['keratin-conditioner', 60, 50],
    ['magnetic-band', 35, 29],
    ['spiral-rods', 22, 18],
  ];

  for (const [slug, price, sale] of mappings) {
    await upsertPriceBySlug(sb, slug, Number(price), Number(sale));
  }

  // Product appears on this sheet but may still be missing.
  await createIfMissing(
    sb,
    catBySlug,
    'Wig Fix Stick',
    slugify('wig-fix-stick'),
    25,
    20,
    'haircare-products'
  );

  console.log('Photo 8 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
