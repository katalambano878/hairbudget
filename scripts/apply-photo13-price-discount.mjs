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

async function createOrUpdateByName(sb, catBySlug, item) {
  const slug = slugify(item.slug || item.name);
  const ok = await upsertPriceBySlug(sb, slug, item.price, item.sale_price);
  if (ok) return;

  const { error: iErr } = await sb.from('products').insert({
    name: item.name,
    slug,
    description: `${item.name} added from handwritten pricing sheet.`,
    price: item.price,
    sale_price: item.sale_price,
    quantity: 0,
    category_id: catBySlug.get(item.category) || null,
    status: 'active',
    featured: false,
    tags: ['paper-import', 'price-sheet'],
    metadata: { source: 'handwritten-price-sheet' },
    moq: 1,
  });
  if (iErr) throw iErr;
  console.log(`CREATED: ${item.name} (${slug}) => price=${item.price}, sale_price=${item.sale_price}`);
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: cErr } = await sb.from('categories').select('id,slug');
  if (cErr) throw cErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  const updates = [
    ['6pcs-blue-brush-set', 35, 30],
    ['15pcs-brush-set', 25, 20],
    ['3d-silicon-brush', 35, 30],
    ['dotting-pen', 30, 25],
    ['rhinestone-picker', 10, 10],
    ['dissolving-bowl', 18, 15],
    ['nails-wipe', 25, 20],
    ['high-quality-dust-brush', 38, 35],
    ['gndg-branded-magnetic-nail', 200, 180], // press on stand
    ['cat-eye-magnet', 45, 40],
    ['rosaline-dehydrator-primer', 70, 60],
    ['stainless-steel-pallet', 30, 25],
    ['resin-pallet', 25, 20],
    ['trimmer-set', 15, 15],
    ['cuticle-remover', 50, 40],
    ['table-organizer', 40, 35],
    ['blooming-gel', 40, 35],
    ['bun-pretty-dehydrator-bonder', 70, 60],
    ['stainless-dappen-dish', 100, 80],
    ['gloves', 75, 65],
    ['nail-practice-hand', 140, 115],
    ['dust-collector', 250, 220],
    ['wooden-arm-rest-short', 150, 120],
    ['wooden-arm-rest-long', 180, 140],
  ];

  for (const [slug, price, sale] of updates) {
    await upsertPriceBySlug(sb, slug, Number(price), Number(sale));
  }

  const createOrUpdate = [
    // Discount column looked blank on sheet for this row; keep sale same as price for now.
    { name: '3pcs Liner Brush', slug: '3pcs-liner-brush', price: 15, sale_price: 15, category: 'nail-essentials' },
    { name: 'Rainbow Brush Set', slug: 'rainbow-brush-set', price: 40, sale_price: 35, category: 'nail-essentials' },
  ];

  for (const item of createOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 13 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
