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
  console.log(`UPDATED: ${slug} => qty=${qty}`);
  return true;
}

async function createOrUpdateByName(sb, catBySlug, item) {
  const slug = slugify(item.slug || item.name);
  const ok = await upsertStockBySlug(sb, slug, item.quantity);
  if (ok) return;
  const { error: iErr } = await sb.from('products').insert({
    name: item.name,
    slug,
    description: `${item.name} added from handwritten stock mini-sheet.`,
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
  console.log(`CREATED: ${item.name} (${slug}) => qty=${item.quantity}`);
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
    ['dxebiz-brand-professional-acrylic-system-kit', 28], // Acrylic system set
    ['misscheering-dipping-powder-kit', 13],
    ['3pcs-liner-brush', 24],
    ['15pcs-brush-set', 85],
  ];

  for (const [slug, qty] of updates) {
    await upsertStockBySlug(sb, slug, Number(qty));
  }

  const createOrUpdate = [
    { name: 'Blue Acrylic Brush', slug: 'blue-acrylic-brush', quantity: 39, category: 'nail-essentials' },
    { name: 'Pink Liner Brush', slug: 'pink-liner-brush', quantity: 25, category: 'nail-essentials' },
  ];

  for (const item of createOrUpdate) {
    await createOrUpdateByName(sb, catBySlug, item);
  }

  console.log('Photo 15 stock-only sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
