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
    ['rubbing-alcohol', 43, 39],
    ['organ-needles', 20, 15],
    ['thread-clippers', 7, 7],
    ['control-clips', 20, 17],
    ['metallic-bobbin', 48, 39],
    ['plastic-bobbins', 45, 35],
    ['razor-comb', 7, 5],
    ['nova-hand-dryer', 130, 110],
    ['long-neck-mannequin', 130, 110],
    ['snap-on-rollers', 18, 15],
    ['envy-gel-big', 75, 69],
    ['envy-gel-small', 40, 35],
    ['kuura-mousse', 55, 50],
    ['kuura-fro-shampoo', 65, 60],
    ['silicone-hair-scalp-massager-and-shampoo-brush', 15, 10],
    ['minkin-avocado-hair-styling-gel', 40, 35],
    ['oligei-heat-resistant-gloves', 20, 20],
    ['vitale-olive-oil-hair-polisher-2', 25, 20],
    ['hair-bonnet', 25, 20],
    ['flexi-rods', 20, 15],
    ['kuura-supergro-hair-oil', 50, 45],
  ];

  for (const [slug, price, sale] of updates) {
    await upsertPriceBySlug(sb, slug, Number(price), Number(sale));
  }

  const createOrUpdate = [
    { name: 'Velcro Rollers', slug: 'velcro-rollers', price: 55, sale_price: 45, category: 'hair-and-salon-tools' },
    { name: 'Kuura Fro Conditioner', slug: 'kuura-fro-conditioner', price: 65, sale_price: 60, category: 'haircare-products' },
    { name: 'Kuura Fro Leave In Conditioner', slug: 'kuura-fro-leave-in-conditioner', price: 70, sale_price: 65, category: 'haircare-products' },
    { name: 'Hair Bow', slug: 'hair-bow', price: 15, sale_price: 15, category: 'hair-and-salon-tools' },
    { name: 'Stylist Bag', slug: 'stylist-bag', price: 300, sale_price: 299, category: 'hair-and-salon-tools' },
  ];

  for (const item of createOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 9 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
