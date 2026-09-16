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

async function upsertPriceBySlug(sb, slug, price, salePrice) {
  const { data: existing, error: eErr } = await sb
    .from('products')
    .select('id,slug,name')
    .eq('slug', slug)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!existing) {
    return false;
  }

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

async function createIfMissing(sb, slug, name, price, salePrice, categoryId) {
  const { error } = await sb.from('products').insert({
    name,
    slug,
    description: `${name} added from handwritten pricing sheet.`,
    price,
    sale_price: salePrice,
    quantity: 0,
    category_id: categoryId,
    status: 'active',
    featured: false,
    tags: ['paper-import', 'price-sheet'],
    metadata: { source: 'handwritten-price-sheet' },
    moq: 1,
  });
  if (error) throw error;
  console.log(`CREATED: ${slug} => price=${price}, sale_price=${salePrice}`);
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: cErr } = await sb.from('categories').select('id,slug');
  if (cErr) throw cErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  // Price/discount parsed from this handwritten sheet.
  const updates = [
    ['pinkee-s-liquid-big', 200, 170], // Ezflow monomer big
    ['pinkee-s-liquid-medium', 120, 99], // Ezflow monomer medium
    ['pinkee-s-liquid-small', 40, 35], // Ezflow monomer small
    ['acetone-big', 95, 85],
    ['acetone-small', 60, 50],
    ['magic-primer', 20, 20],
    ['magic-top-coat', 20, 20],
    ['magic-base-coat', 20, 20],
    ['mushering-top-base-coat', 35, 30],
    ['ibd-builder-gel', 60, 50],
    ['buffer-set', 40, 35],
    ['buffer-single', 15, 15],
    ['rosaline-base-coat', 35, 25],
    ['flowers-charms', 18, 15],
    ['nails-stones', 45, 40],
    ['nails-charms', 35, 30],
    ['chrome', 20, 20],
    ['nail-glue', 10, 10],
    ['rhinestone-glue', 40, 35],
    ['spider-gel', 25, 25],
    ['debonder', 20, 20],
    ['nails-finger-spas', 40, 40],
    ['cutters', 25, 20],
    ['nippers', 45, 40],
    ['dissolving-finger-bowl', 40, 40],
    // "Foldable arm rest" price was unclear on the page, so not overridden here.
    ['btc-cuticle-softner', 20, 20],
  ];

  for (const [slug, price, sale] of updates) {
    const ok = await upsertPriceBySlug(sb, slug, Number(price), Number(sale));
    if (!ok && slug === 'btc-cuticle-softner') {
      await createIfMissing(
        sb,
        slug,
        'BTC Cuticle Softner',
        Number(price),
        Number(sale),
        catBySlug.get('nail-essentials') || null
      );
    } else if (!ok) {
      console.log(`SKIP (not found): ${slug}`);
    }
  }

  console.log('Photo 12 price/discount sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
