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

async function upsertStockBySlug(sb, slug, qty) {
  const { data: existing, error: eErr } = await sb
    .from('products')
    .select('id,slug,name')
    .eq('slug', slug)
    .maybeSingle();
  if (eErr) throw eErr;
  if (!existing) return false;
  const { error: uErr } = await sb.from('products').update({ quantity: qty }).eq('id', existing.id);
  if (uErr) throw uErr;
  console.log(`UPDATED: ${slug} => ${qty}`);
  return true;
}

async function createOrUpdateByName(sb, catBySlug, item) {
  const slug = slugify(item.slug || item.name);
  const ok = await upsertStockBySlug(sb, slug, item.quantity);
  if (ok) return;
  const { error: iErr } = await sb.from('products').insert({
    name: item.name,
    slug,
    description: `${item.name} added from handwritten stock sheet.`,
    price: 0,
    quantity: item.quantity,
    category_id: catBySlug.get(item.category) || null,
    status: 'active',
    featured: false,
    tags: ['paper-import'],
    metadata: { source: 'handwritten-stock-sheet' },
    moq: 1,
  });
  if (iErr) throw iErr;
  console.log(`CREATED: ${item.name} (${slug}) => ${item.quantity}`);
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: cErr } = await sb.from('categories').select('id,slug');
  if (cErr) throw cErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  // Clear/known matches from this photo
  const directUpdates = [
    ['korres-pure-greek-olive-3-in-1-nourishing-oil', 40], // ORS conditioner
    ['tresseme-shampoo-small', 26],
    ['tresseme-conditioner-small', 30],
    ['tresseme-shampoo-big', 3],
    ['tresemm-rich-moisture-conditioner', 1], // color revitalize
    ['magnetic-band', 40],
    ['olive-oil-edge-control', 607],
    ['keratin-melting-spray', 76],
    ['keratin-shampoo', 22],
    ['keratin-conditioner', 58], // 14 + 44
    ['ebin-melting-spray-colored', 22],
    ['foaming-wax', 82],
    ['spiral-rods', 92],
    ['nbi-wax-gel', 41], // wax stick
    ['leodais-serum', 39], // loodais
  ];

  for (const [slug, qty] of directUpdates) {
    await upsertStockBySlug(sb, slug, qty);
  }

  // Lines that are on paper but represented as separate products for reliability
  const toCreateOrUpdate = [
    { name: 'Flexi Rods', quantity: 110, category: 'hair-and-salon-tools' }, // 98 + 12
    { name: 'Bonding Glue Big', quantity: 84, category: 'haircare-products' },
    { name: 'Bonding Glue Small', quantity: 7, category: 'haircare-products' },
    { name: 'Sabalon', quantity: 17, category: 'haircare-products' },
    { name: 'Wrefn Toshn CombL', slug: 'wrefn-toshn-combl', quantity: 195, category: 'hair-and-salon-tools' },
    { name: 'Ebin Adhesive Small', quantity: 39, category: 'haircare-products' }, // 15 + 24
    { name: 'Ebin Adhesive Sports Small', quantity: 12, category: 'haircare-products' },
    { name: 'Ebin Adhesive Sports Medium', quantity: 31, category: 'haircare-products' },
    { name: 'Ebin Adhesive Sports Big', quantity: 1, category: 'haircare-products' },
    { name: 'Disposable Frontal Wrap', quantity: 93, category: 'hair-and-salon-tools' },
  ];

  for (const item of toCreateOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 5 stock sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
