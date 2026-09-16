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
  'electric-hair-straightening-hot-comb',
  'kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo',
  'kuura-honey-papaya-no-breakage-hair',
  'kuura-mousse',
  'adore-dye',
  'envy-gel-big',
  'envy-gel-small',
  '10pcs-relaxer-set',
  '15pcs-relaxer-set',
  '6pcs-relaxer-set',
  'olive-oil-shampoo',
  'ors-mayonnaise-big',
  'ors-mayonnaise-small',
  'ors-mousse-wrap',
  'ors-olive-sheen-big',
  'ors-twist-gel',
  'dread-foam',
  'ebin-melting-spray-sport',
  'ebin-melting-spray-colored',
  'keratin-melting-spray',
  'ebin-new-york-wonder-lace-bond-lace-melt-spray-3',
  'pinkee-s-liquid-medium',
  'ebin-adhesive-big',
  'kuura-conditioner-long',
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
