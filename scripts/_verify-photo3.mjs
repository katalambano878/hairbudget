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
  'glue-gun',
  'silicone-hair-scalp-massager-and-shampoo-brush',
  'hair-bonnet',
  'oligei-heat-resistant-gloves',
  'stainless-steel-pinking',
  'ear-protective-frontal-band',
  'head-band-wig-cap',
  'drawstring-ponytail',
  'detangling-brush',
  'akendy-brand-lace-tint-mousse',
  '10-pieces-comb-set',
  'control-clips',
  '15pcs-brush-set',
  'home-services-bag-big',
  'titanium-straightener',
  'sharpie-marker-set',
  'kuura-beauty-moisture-seal-conditioner',
  'kuura-honey-and-papaya-leave-in-conditioner',
  'kelo-rollers',
  'butterfly-clips',
  'hangers',
  'parting-ring',
  '3-in-1-tripod',
];

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
  const { data, error } = await sb.from('products').select('name,slug,quantity').in('slug', slugs).order('slug');
  if (error) throw error;
  for (const r of data || []) {
    console.log(`${r.slug}\t${r.quantity}\t${r.name}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
