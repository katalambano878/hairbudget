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

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: cErr } = await sb.from('categories').select('id,slug');
  if (cErr) throw cErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  const updates = [
    ['glue-gun', 68],
    ['silicone-hair-scalp-massager-and-shampoo-brush', 24], // 18 + 6
    ['hair-bonnet', 21],
    ['oligei-heat-resistant-gloves', 52],
    ['stainless-steel-pinking', 80],
    ['ear-protective-frontal-band', 96],
    ['head-band-wig-cap', 128],
    ['drawstring-ponytail', 466],
    ['detangling-brush', 4], // 3 + 1
    ['akendy-brand-lace-tint-mousse', 215],
    ['10-pieces-comb-set', 65],
    ['control-clips', 222],
    ['15pcs-brush-set', 190], // 72 + 118
    ['home-services-bag-big', 47], // 8 + 32 + 6 + 1
    ['titanium-straightener', 191], // 168 + 23
    ['sharpie-marker-set', 1704],
    ['kuura-beauty-moisture-seal-conditioner', 26],
    ['kuura-honey-and-papaya-leave-in-conditioner', 47],
  ];

  for (const [slug, qty] of updates) {
    const { error } = await sb.from('products').update({ quantity: qty }).eq('slug', slug);
    if (error) throw error;
    console.log(`UPDATED: ${slug} => ${qty}`);
  }

  const maybeNew = [
    { name: 'Kuura Fro Shampoo', quantity: 25, category: 'haircare-products' },
    { name: 'Kelo Rollers', quantity: 23, category: 'hair-and-salon-tools' },
    { name: 'Butterfly Clips', quantity: 20, category: 'hair-and-salon-tools' },
    { name: 'Hangers', quantity: 19, category: 'hair-and-salon-tools' },
    { name: 'Parting Ring', quantity: 39, category: 'hair-and-salon-tools' },
    { name: '3 in 1 Tripod', quantity: 91, category: 'hair-and-salon-tools' }, // 81 + 5 + 5
  ];

  for (const item of maybeNew) {
    const slug = slugify(item.name);
    const { data: existing, error: eErr } = await sb
      .from('products')
      .select('id,name,slug')
      .eq('slug', slug)
      .maybeSingle();
    if (eErr) throw eErr;

    if (existing) {
      const { error: uErr } = await sb.from('products').update({ quantity: item.quantity }).eq('id', existing.id);
      if (uErr) throw uErr;
      console.log(`UPDATED: ${existing.slug} => ${item.quantity}`);
      continue;
    }

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

  console.log('Photo 3 stock sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
