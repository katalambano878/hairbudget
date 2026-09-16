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

async function updateStock(sb, slug, qty) {
  const { data, error } = await sb.from('products').select('id,name,slug').eq('slug', slug).maybeSingle();
  if (error) throw error;
  if (!data) {
    console.log(`MISSING: ${slug}`);
    return;
  }
  const { error: upErr } = await sb.from('products').update({ quantity: qty }).eq('id', data.id);
  if (upErr) throw upErr;
  console.log(`UPDATED: ${data.slug} (${data.name}) => qty=${qty}`);
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const updates = [
    ['48pcs-uom-gel', 4], // "48 ... gel polish"
    ['30pcs-cat-eye-gel', 2], // written as 20/30pcs cateye gel
    ['magik-branded-soak-off-uv-gel-polish-kit', 6],
    ['300g-beginners-set', 19],
    ['dust-collector', 15], // 10 + 5
    ['2-in-1-uv-lamp', 6], // "double hand uv lamp"
    ['single-hand-uv-lamp', 9],
    ['rechargeable-drill-1', 17],
    ['rechargeable-drill-2', 21],
    ['rechargeable-drill-3', 11],
    ['gndg-branded-magnetic-nail', 57], // Press on stand
    ['cat-eye-magnet', 78],
    ['acrylic-brush-set', 29], // "4pcs acrylic brush"
  ];

  for (const [slug, qty] of updates) {
    await updateStock(sb, slug, Number(qty));
  }

  console.log('Photo 16 stock-only sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
