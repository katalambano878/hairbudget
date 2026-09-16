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
  '42pcs-very-good-gel',
  '44pcs-very-good-gel',
  '6pcs-very-good-gel-polish',
  '60pcs-very-good-gel-professional',
  '60pcs-very-good-purple',
  '48pcs-uom-gel',
  '30pcs-cat-eye-gel',
  '6pcs-modeling-gel',
  '300g-beginners-set',
  'beginners-set-with-case',
  'beginners-set-with-gel-polish',
  '2-in-1-uv-lamp',
  'single-hand-uv-lamp',
  'rechargeable-drill-1',
  'rechargeable-drill-2',
  'rechargeable-drill-3',
  'portable-electric-drill',
  'mannequin-hand',
  'mannequin-foot',
  'dust-brush',
  'acrylic-powder',
  'acrylic-powder-nude-big',
  'acrylic-powder-nude-small',
  'acrylic-brush-set',
  'misscheering-acrylic-kit',
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
