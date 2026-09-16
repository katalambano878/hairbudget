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
    ['cloud-9-straightener', 160, 130],
    ['bbl-professional-hot-pressing-comb', 380, 360],
    ['electric-hair-straightening-hot-comb', 140, 115],
    ['baroel-32mm-ceramic-curling-tong', 170, 130],
    ['hot-air-brush', 130, 99],
    ['perfume-gift-set', 130, 110],
    ['silicon-heat-mat', 35, 25],
    ['oucheless-band', 15, 15],
    ['nova-curling-iron-set', 55, 45],
    ['canvas-block-head-mannequin', 130, 115],
    ['trimmer-set', 130, 110], // Kemei clipper
    ['titanium-straightener', 250, 220],
    ['derma-roller', 40, 35],
    ['10-pieces-comb-set', 25, 19],
    ['detangling-brush', 20, 15],
    ['akendy-brand-lace-tint-mousse', 30, 25],
    ['polymer-wig-block-mannequin-head-designed', 200, 170],
    ['hangers', 18, 15], // key hangers line
    ['sharpie-marker-set', 18, 15],
    ['applicator-bottle', 15, 10],
    ['extreme-sewing-machine', 1250, 1150],
  ];

  for (const [slug, price, sale] of updates) {
    await upsertPriceBySlug(sb, slug, Number(price), Number(sale));
  }

  const createOrUpdate = [
    { name: 'Hausess Straightener', slug: 'hausess-straightener', price: 280, sale_price: 199, category: 'styling-tools' },
    { name: 'Electric Steam Cap', slug: 'electric-steam-cap', price: 120, sale_price: 99, category: 'hair-and-salon-tools' },
    { name: 'Wig Combs', slug: 'wig-combs', price: 15, sale_price: 10, category: 'hair-and-salon-tools' },
    { name: 'Wig Clips', slug: 'wig-clips', price: 10, sale_price: 8, category: 'hair-and-salon-tools' },
    { name: 'U-Clips', slug: 'u-clips', price: 15, sale_price: 12, category: 'hair-and-salon-tools' },
  ];

  for (const item of createOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 10 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
