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
    ['rainbow-brush-set', 58],
    ['3d-silicon-brush', 76],
    ['dotting-pen', 85],
    ['ombre-brush', 2],
    ['synthetic-bristle-gel-sculpting-brush', 25],
    ['rhinestone-picker', 111],
    ['dust-brush', 177],
    ['6pcs-very-good-gel-polish', 24],
    ['rosaline-dehydrator-primer', 4],
    ['resin-pallet', 55],
    ['cuticle-remover', 24],
    ['pedicure-knife', 36],
    ['blooming-gel', 33],
    ['born-pretty-nail-prep-dehydrator', 41],
    ['stainless-dappen-dish', 38],
    ['trimmer-set', 176],
    ['generic-purple-plastic-soak-off-nail-polish-remover', 2],
    ['rhinestone-glue', 175],
    ['nail-art-practice-finger', 66],
    ['spider-gel', 34],
    ['mannequin-brush-small', 64],
    ['nippers', 85],
    ['cutters', 25],
    ['diamond-gel', 12],
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
