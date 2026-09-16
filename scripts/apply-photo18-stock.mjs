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
    { name: 'Ombre Brush', slug: 'ombre-brush', category: 'nail-essentials' },
    { name: 'Diamond Gel', slug: 'diamond-gel', category: 'nail-essentials' },
    { name: 'Rainbow Brush Set', slug: 'rainbow-brush-set', category: 'nail-essentials' },
  ];
  for (const item of maybeCreate) {
    await createIfMissing(sb, catBySlug, item);
  }

  const updates = [
    ['rainbow-brush-set', 58],
    ['3d-silicon-brush', 76],
    ['dotting-pen', 85],
    ['ombre-brush', 2],
    ['synthetic-bristle-gel-sculpting-brush', 25], // Golden acrylic brush
    ['rhinestone-picker', 111],
    ['dust-brush', 177],
    ['6pcs-very-good-gel-polish', 24],
    ['rosaline-dehydrator-primer', 4], // Rosaline dehydrator + primer
    ['resin-pallet', 55],
    ['cuticle-remover', 24], // Blue Cross cuticle remover
    ['pedicure-knife', 36], // handwritten as "Pelicus knife"
    ['blooming-gel', 33],
    ['born-pretty-nail-prep-dehydrator', 41], // Born pretty dehydrator + primer
    ['stainless-dappen-dish', 38],
    ['trimmer-set', 176], // handwritten as "10mmx set"
    ['generic-purple-plastic-soak-off-nail-polish-remover', 2], // "removable keeper"
    ['rhinestone-glue', 175],
    ['nail-art-practice-finger', 66],
    ['spider-gel', 34],
    ['mannequin-brush-small', 64], // handwritten as "manicure brush small"
    ['nippers', 85],
    ['cutters', 25],
    ['diamond-gel', 12],
  ];

  for (const [slug, qty] of updates) {
    await updateStock(sb, slug, Number(qty));
  }

  console.log('Photo 18 stock-only sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
