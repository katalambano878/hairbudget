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
    ['dissolving-finger-bowl', 17],
    ['nail-glue', 292],
    ['chrome', 53],
    ['flowers-charms', 43],
    ['debonder', 4],
    ['muscheering-brush-cleaner', 14],
    ['stainless-dappen-dish', 3],
    ['born-pretty-functional-gel-polish', 16],
    ['ibd-builder-gel', 20],
    ['rosaline-base-coat', 19],
    ['cuticle-remover', 27],
    ['muscheering-top-coat-and-base-coat-uv-gel', 101],
    ['polygel-single', 172],
    ['polygel-set', 24],
    ['manicure-brush-big', 78],
    ['applicator-bottle', 145],
    ['normal-nail', 36],
    ['nails-stones', 84],
    ['nails-charms', 165],
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
