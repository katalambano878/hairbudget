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
    ['pinkee-s-liquid-big', 150, 130],
    ['pinkee-s-liquid-medium', 95, 80],
    ['pinkee-s-liquid-small', 60, 50],
    ['u-shape-arm-rest', 250, 220],
    ['mannequin-brush-small', 5, 5],
    ['mannequin-bowl-big', 7, 7],
    ['desk-lamp', 150, 130],
    ['home-services-bag-big', 350, 299],
    ['home-services-bag-small', 150, 130],
    ['pedicure-knife', 35, 30],
    ['240pcs-soft-gel-tips', 45, 39],
    ['normal-nail', 45, 39],
    ['french-bamboo-coffin-nail', 50, 40],
    ['600pcs-ultrabond', 65, 55],
    ['pink-arm-rest', 180, 160],
    ['push-bottle-dispenser', 10, 10],
    ['polygel-set', 220, 199],
    ['polygel-single', 35, 30],
  ];

  for (const [slug, price, sale] of updates) {
    await upsertPriceBySlug(sb, slug, Number(price), Number(sale));
  }

  // "60pcs soft gel tips" appears as separate line from 240pcs; create dedicated SKU.
  const createOrUpdate = [
    { name: '60pcs Soft Gel Tips', slug: '60pcs-soft-gel-tips', price: 45, sale_price: 39, category: 'nail-essentials' },
  ];

  for (const item of createOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 11 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
