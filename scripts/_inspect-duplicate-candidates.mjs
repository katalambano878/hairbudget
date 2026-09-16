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
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')];
      })
  );
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const slugs = [
    'mxbon-pro-s-choice-brush',
    'nail-glue',
    'leopard-print-headband',
    'ear-protective-frontal-band',
    'hot-melt-glue-gun',
    'glue-gun',
  ];

  const { data, error } = await sb
    .from('products')
    .select('id,name,slug,status,quantity,price,sale_price,category_id,metadata,created_at')
    .in('slug', slugs);
  if (error) throw error;

  const ids = (data || []).map((x) => x.id);
  const { data: imgs, error: iErr } = await sb
    .from('product_images')
    .select('product_id,url,position')
    .in('product_id', ids);
  if (iErr) throw iErr;
  const byPid = new Map();
  for (const i of imgs || []) byPid.set(i.product_id, [...(byPid.get(i.product_id) || []), i]);
  for (const l of byPid.values()) l.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));

  for (const p of data || []) {
    const list = byPid.get(p.id) || [];
    console.log('---');
    console.log(`name=${p.name}`);
    console.log(`slug=${p.slug}`);
    console.log(`status=${p.status} qty=${p.quantity} price=${p.price} sale=${p.sale_price}`);
    console.log(`images=${list.length} first=${list[0]?.url || ''}`);
    console.log(`created_at=${p.created_at}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
