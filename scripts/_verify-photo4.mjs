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
  'long-neck-mannequin',
  'gloves',
  'olive-sheen',
  'organ-needles',
  'got2b-glue',
  'ikt-brand-hair-styling-wax',
  'kuura-honey-and-papaya-leave-in-conditioner',
  'j',
  'elastic-band',
  'kuura-beauty-avocado-batana-blend-moisturizing-conditioner',
  'kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo',
  'ghost-bond',
  'glue-remover',
  'edge-melt',
  'keratin-mask',
  'mannequin-head',
  'tripod-stand-mini',
  'minkin-avocado-hair-styling-gel',
  'vitale-olive-oil-hair-polisher-2',
  'xhc-argan-oil-hydrating-hair-mask',
  'snap-on-rollers',
  'professional-argan-oil-nourishing-hair-mask',
  'kuuqa-anti-itch',
  'kuura-supergro-hair-oil',
  'oligei-heat-resistant-gloves',
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
