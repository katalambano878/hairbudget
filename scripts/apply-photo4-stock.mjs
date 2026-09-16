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
    ['long-neck-mannequin', 13], // human hair mannequin
    ['gloves', 20],
    ['olive-sheen', 37],
    ['organ-needles', 37], // c-needles
    ['got2b-glue', 32],
    ['ikt-brand-hair-styling-wax', 107], // ikt gel
    ['kuura-honey-and-papaya-leave-in-conditioner', 54],
    ['j', 1], // kuura shampoo small
    ['elastic-band', 65],
    ['kuura-beauty-avocado-batana-blend-moisturizing-conditioner', 7], // kuura conditioner big
    ['kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo', 1], // kuura shampoo big
    ['glue-remover', 11],
    ['keratin-mask', 17],
    ['tripod-stand-mini', 10],
    ['minkin-avocado-hair-styling-gel', 162], // 83 + 79
    ['vitale-olive-oil-hair-polisher-2', 58],
    ['xhc-argan-oil-hydrating-hair-mask', 14], // argan mask small
    ['snap-on-rollers', 125],
    ['professional-argan-oil-nourishing-hair-mask', 17], // argan heat protectant
    ['kuuqa-anti-itch', 56],
    ['kuura-supergro-hair-oil', 85], // kuura goo
    ['oligei-heat-resistant-gloves', 51],
  ];

  for (const [slug, qty] of updates) {
    const { error } = await sb.from('products').update({ quantity: qty }).eq('slug', slug);
    if (error) throw error;
    console.log(`UPDATED: ${slug} => ${qty}`);
  }

  const maybeNew = [
    { name: 'Ghost Bond', quantity: 3, category: 'haircare-products' },
    { name: 'Mannequin Head', quantity: 10, category: 'hair-and-salon-tools' },
    { name: 'Edge Melt', quantity: 5, category: 'haircare-products' },
  ];

  for (const item of maybeNew) {
    const slug = slugify(item.name);
    const { data: existing, error: eErr } = await sb
      .from('products')
      .select('id,slug,name')
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

  console.log('Photo 4 stock sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
