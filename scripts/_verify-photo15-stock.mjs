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
    ['dxebiz-brand-professional-acrylic-system-kit', 28],
    ['misscheering-dipping-powder-kit', 13],
    ['3pcs-liner-brush', 24],
    ['blue-acrylic-brush', 39],
    ['pink-liner-brush', 25],
    ['15pcs-brush-set', 85],
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
