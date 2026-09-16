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
  'korres-pure-greek-olive-3-in-1-nourishing-oil',
  'tresseme-shampoo-small',
  'tresseme-conditioner-small',
  'tresseme-shampoo-big',
  'tresemm-rich-moisture-conditioner',
  'magnetic-band',
  'olive-oil-edge-control',
  'keratin-melting-spray',
  'keratin-shampoo',
  'keratin-conditioner',
  'ebin-melting-spray-colored',
  'foaming-wax',
  'spiral-rods',
  'nbi-wax-gel',
  'leodais-serum',
  'flexi-rods',
  'bonding-glue-big',
  'bonding-glue-small',
  'sabalon',
  'wrefn-toshn-combl',
  'ebin-adhesive-small',
  'ebin-adhesive-sports-small',
  'ebin-adhesive-sports-medium',
  'ebin-adhesive-sports-big',
  'disposable-frontal-wrap',
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
