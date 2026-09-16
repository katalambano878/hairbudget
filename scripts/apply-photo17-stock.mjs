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

async function createIfMissing(sb, catBySlug, item) {
  const { data: existing, error: eErr } = await sb.from('products').select('id').eq('slug', item.slug).maybeSingle();
  if (eErr) throw eErr;
  if (existing) return;

  const { error: iErr } = await sb.from('products').insert({
    name: item.name,
    slug: item.slug,
    description: `${item.name} added from handwritten stock sheet.`,
    price: 0,
    quantity: 0,
    category_id: catBySlug.get(item.category) || null,
    status: 'active',
    featured: false,
    tags: ['paper-import'],
    metadata: { source: 'handwritten-stock-sheet' },
    moq: 1,
  });
  if (iErr) throw iErr;
  console.log(`CREATED: ${item.slug}`);
}

async function updateStock(sb, slug, qty) {
  const { data, error } = await sb.from('products').select('id,name,slug').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) {
    console.log(`MISSING: ${slug}`);
    return;
  }
  const { error: upErr } = await sb.from('products').update({ quantity: qty }).eq('id', data.id);
  if (upErr) throw upErr;
  console.log(`UPDATED: ${data.slug} (${data.name}) => qty=${qty}`);
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: cErr } = await sb.from('categories').select('id,slug');
  if (cErr) throw cErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  const maybeCreate = [
    { name: 'Muscheering Brush Cleaner', slug: 'muscheering-brush-cleaner', category: 'nail-essentials' },
    { name: 'Manicure Brush Big', slug: 'manicure-brush-big', category: 'nail-essentials' },
  ];
  for (const item of maybeCreate) {
    await createIfMissing(sb, catBySlug, item);
  }

  const updates = [
    ['dissolving-finger-bowl', 17],
    ['nail-glue', 292],
    ['chrome', 53],
    ['flowers-charms', 43],
    ['debonder', 4],
    ['muscheering-brush-cleaner', 14],
    ['stainless-dappen-dish', 3],
    ['born-pretty-functional-gel-polish', 16],
    ['ibd-builder-gel', 20],
    ['rosaline-base-coat', 19],
    ['cuticle-remover', 27],
    ['muscheering-top-coat-and-base-coat-uv-gel', 101],
    ['polygel-single', 172],
    ['polygel-set', 24],
    ['manicure-brush-big', 78],
    ['applicator-bottle', 145],
    ['normal-nail', 36],
    ['nails-stones', 84],
    ['nails-charms', 165],
  ];

  for (const [slug, qty] of updates) {
    await updateStock(sb, slug, Number(qty));
  }

  console.log('Photo 17 stock-only sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
