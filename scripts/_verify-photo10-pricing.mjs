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
  'hausess-straightener',
  'cloud-9-straightener',
  'bbl-professional-hot-pressing-comb',
  'electric-hair-straightening-hot-comb',
  'baroel-32mm-ceramic-curling-tong',
  'hot-air-brush',
  'perfume-gift-set',
  'silicon-heat-mat',
  'oucheless-band',
  'nova-curling-iron-set',
  'canvas-block-head-mannequin',
  'trimmer-set',
  'titanium-straightener',
  'derma-roller',
  'electric-steam-cap',
  '10-pieces-comb-set',
  'detangling-brush',
  'akendy-brand-lace-tint-mousse',
  'polymer-wig-block-mannequin-head-designed',
  'hangers',
  'sharpie-marker-set',
  'applicator-bottle',
  'wig-combs',
  'wig-clips',
  'u-clips',
  'extreme-sewing-machine',
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
