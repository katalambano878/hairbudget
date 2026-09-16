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
  console.log(`UPDATED: ${slug} => price=${price}, sale_price=${salePrice ?? 'null'}`);
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
  console.log(`CREATED: ${item.name} (${slug}) => price=${item.price}, sale_price=${item.sale_price ?? 'null'}`);
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: cErr } = await sb.from('categories').select('id,slug');
  if (cErr) throw cErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  // Parsed from this image: [name, slug, price, sale_price]
  const existing = [
    ['wide-knife-comb', 5, 5],
    ['dread-foam', 28, 22],
    ['olive-bleach-powder', 45, 40],
    ['6pcs-relaxer-set', 140, 130],
    ['10pcs-relaxer-set', 165, 135],
    ['15pcs-relaxer-set', 175, 165],
    ['ors-twist-gel', 75, 65],
    ['ors-olive-sheen-big', 78, 68],
    ['ors-olive-sheen-small', 38, 25],
    ['adore-dye', 85, 79],
    ['ors-mousse-wrap', 75, 65],
    ['olive-oil-edge-control', 25, 20],
    ['tresseme-shampoo-big', 120, 110],
    ['tresseme-shampoo-small', 95, 80],
    ['tresseme-conditioner-small', 95, 80],
    ['olive-oil-shampoo', 60, 50],
    ['olive-oil-conditioner', 60, 50],
    ['ors-mayonnaise-big', 150, 130],
    ['ors-mayonnaise-small', 130, 110],
    ['tripod-stand-mini', 60, 50],
    ['tripod-stand', 160, 135],
    ['extreme-sewing-machine', 1250, 1150],
    ['parting-ring', 10, null],
  ];

  for (const [slug, price, sale] of existing) {
    await upsertPriceBySlug(sb, slug, Number(price), sale == null ? null : Number(sale));
  }

  // Missing from catalog in many cases: silicon mix size variants
  const createOrUpdate = [
    { name: 'Silicon Mix Shampoo Big', slug: 'silicon-mix-shampoo-big', price: 195, sale_price: 170, category: 'haircare-products' },
    { name: 'Silicon Mix Shampoo Medium', slug: 'silicon-mix-shampoo-medium', price: 120, sale_price: 100, category: 'haircare-products' },
    { name: 'Silicon Mix Shampoo Small', slug: 'silicon-mix-shampoo-small', price: 85, sale_price: 75, category: 'haircare-products' },
  ];

  for (const item of createOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 7 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
