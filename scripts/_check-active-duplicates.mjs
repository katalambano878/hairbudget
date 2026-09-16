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

function norm(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data, error } = await sb
    .from('products')
    .select('id,name,slug,status,category_id')
    .neq('status', 'archived');
  if (error) throw error;

  const byNormName = new Map();
  for (const p of data || []) {
    const k = norm(p.name);
    if (!k) continue;
    byNormName.set(k, [...(byNormName.get(k) || []), p]);
  }
  const dup = [...byNormName.entries()].filter(([, g]) => g.length > 1);
  console.log(`Active/non-archived products: ${(data || []).length}`);
  console.log(`Exact duplicate-name groups (active only): ${dup.length}`);
  for (const [k, g] of dup) {
    console.log(`- ${k} (${g.length}) :: ${g.map((x) => x.slug).join(' | ')}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
