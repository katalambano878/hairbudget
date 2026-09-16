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
        const i = l.indexOf('=');
        let v = l.slice(i + 1).trim();
        if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
        return [l.slice(0, i).trim(), v];
      })
  );
}

const slugs = [
  'rubbing-alcohol',
  'organ-needles',
  'thread-clippers',
  'control-clips',
  'metallic-bobbin',
  'plastic-bobbins',
  'razor-comb',
  'nova-hand-dryer',
  'long-neck-mannequin',
  'velcro-rollers',
  'snap-on-rollers',
  'envy-gel-big',
  'envy-gel-small',
  'kuura-mousse',
  'kuura-fro-shampoo',
  'kuura-fro-conditioner',
  'kuura-fro-leave-in-conditioner',
  'silicone-hair-scalp-massager-and-shampoo-brush',
  'minkin-avocado-hair-styling-gel',
  'oligei-heat-resistant-gloves',
  'vitale-olive-oil-hair-polisher-2',
  'hair-bonnet',
  'hair-bow',
  'flexi-rods',
  'kuura-supergro-hair-oil',
  'stylist-bag',
];

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb
    .from('products')
    .select('slug,name,price,sale_price,quantity')
    .in('slug', slugs)
    .order('slug');
  if (error) throw error;
  for (const r of data || []) {
    console.log(`${r.slug}\tprice=${r.price}\tsale=${r.sale_price}\tqty=${r.quantity}\t${r.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
