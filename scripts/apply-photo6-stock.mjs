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

  // Clear matches
  const directUpdates = [
    ['electric-hair-straightening-hot-comb', 181], // hot comb
    ['kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo', 11], // kuura shampoo big
    ['kuura-honey-papaya-no-breakage-hair', 60], // kuura treatment
    ['kuura-mousse', 82],
    ['adore-dye', 229],
    ['envy-gel-big', 37],
    ['envy-gel-small', 83],
    ['10pcs-relaxer-set', 9],
    ['15pcs-relaxer-set', 6],
    ['6pcs-relaxer-set', 14],
    ['olive-oil-shampoo', 40], // ORS shampoo
    ['ors-mayonnaise-big', 45],
    ['ors-mousse-wrap', 40],
    ['ors-olive-sheen-big', 41],
    ['ors-twist-gel', 50], // lock & twist
    ['dread-foam', 57],
    ['ebin-melting-spray-sport', 94],
    ['ebin-melting-spray-colored', 22],
    ['keratin-melting-spray', 111], // ebin melting spray big
    ['ebin-new-york-wonder-lace-bond-lace-melt-spray-3', 15], // ebin melting spray small
    ['pinkee-s-liquid-medium', 57], // ebin adhesive medium
  ];

  for (const [slug, qty] of directUpdates) {
    await upsertStockBySlug(sb, slug, qty);
  }

  const toCreateOrUpdate = [
    { name: 'Ebin Adhesive Big', quantity: 59, category: 'haircare-products' },
    { name: 'Kuura Conditioner Long', quantity: 6, category: 'haircare-products' },
    { name: 'ORS Mayonnaise Small', quantity: 54, category: 'haircare-products' },
  ];

  for (const item of toCreateOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 6 stock sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
