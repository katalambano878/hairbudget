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
    ['42pcs-very-good-gel', 600, 550],
    ['44pcs-very-good-gel', 650, 599],
    ['6pcs-very-good-gel-polish', 750, 700],
    ['60pcs-very-good-gel-professional', 650, 600],
    ['60pcs-very-good-purple', 750, 700],
    ['48pcs-uom-gel', 899, 850],
    ['30pcs-cat-eye-gel', 580, 540],
    ['6pcs-modeling-gel', 100, 80],
    ['300g-beginners-set', 350, 330],
    ['beginners-set-with-case', 350, 310],
    ['beginners-set-with-gel-polish', 399, 350],
    ['2-in-1-uv-lamp', 220, 180],
    ['single-hand-uv-lamp', 120, 99],
    ['rechargeable-drill-1', 320, 280],
    ['rechargeable-drill-2', 350, 320],
    ['rechargeable-drill-3', 390, 350],
    ['portable-electric-drill', 300, 270],
    ['mannequin-hand', 60, 50],
    ['mannequin-foot', 60, 50],
    ['dust-brush', 25, 20],
    ['acrylic-powder', 55, 48],
    ['acrylic-powder-nude-big', 75, 69],
    ['acrylic-powder-nude-small', 45, 40],
    ['acrylic-brush-set', 95, 80],
  ];

  for (const [slug, price, sale] of updates) {
    await upsertPriceBySlug(sb, slug, Number(price), Number(sale));
  }

  // Lines that look missing from current catalog as dedicated names.
  const createOrUpdate = [
    { name: 'Misscheering Acrylic Kit', slug: 'misscheering-acrylic-kit', price: 95, sale_price: 80, category: 'nail-essentials' },
    // "Acrylic nail art" line was hard to read (looked like 99/89 with stock 28),
    // so we do not override it from this sheet to avoid corrupting an existing value.
  ];

  for (const item of createOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 14 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
