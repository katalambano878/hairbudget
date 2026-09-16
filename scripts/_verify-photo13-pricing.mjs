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
  '3pcs-liner-brush',
  '6pcs-blue-brush-set',
  '15pcs-brush-set',
  '3d-silicon-brush',
  'rainbow-brush-set',
  'dotting-pen',
  'rhinestone-picker',
  'dissolving-bowl',
  'nails-wipe',
  'high-quality-dust-brush',
  'gndg-branded-magnetic-nail',
  'cat-eye-magnet',
  'rosaline-dehydrator-primer',
  'stainless-steel-pallet',
  'resin-pallet',
  'trimmer-set',
  'cuticle-remover',
  'table-organizer',
  'blooming-gel',
  'bun-pretty-dehydrator-bonder',
  'stainless-dappen-dish',
  'gloves',
  'nail-practice-hand',
  'dust-collector',
  'wooden-arm-rest-short',
  'wooden-arm-rest-long',
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
