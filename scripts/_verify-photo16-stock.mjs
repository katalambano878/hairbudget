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
        const val = l.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
        return [key, val];
      })
  );
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const checks = [
    ['48pcs-uom-gel', 4],
    ['30pcs-cat-eye-gel', 2],
    ['magik-branded-soak-off-uv-gel-polish-kit', 6],
    ['300g-beginners-set', 19],
    ['dust-collector', 15],
    ['2-in-1-uv-lamp', 6],
    ['single-hand-uv-lamp', 9],
    ['rechargeable-drill-1', 17],
    ['rechargeable-drill-2', 21],
    ['rechargeable-drill-3', 11],
    ['gndg-branded-magnetic-nail', 57],
    ['cat-eye-magnet', 78],
    ['acrylic-brush-set', 29],
  ];

  for (const [slug, expected] of checks) {
    const { data, error } = await sb.from('products').select('name,slug,quantity').eq('slug', slug).maybeSingle();
    if (error) throw error;
    if (!data) {
      console.log(`MISSING: ${slug}`);
      continue;
    }
    const mark = data.quantity === expected ? 'OK' : 'MISMATCH';
    console.log(`${mark}: ${data.slug} (${data.name}) qty=${data.quantity} expected=${expected}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
