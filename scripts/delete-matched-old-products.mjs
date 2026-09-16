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

function normalizeName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

// Pairs confirmed by the clone run.
const matchedPairs = [
  { target: 'Keratin Conditioner', source: 'Keratin Nutrition Moisturizing & Smooth Conditioner' },
  { target: 'Olive Oil Shampoo', source: 'ORS Olive Oil Neutralizing Shampoo' },
  { target: 'ORS Twist Gel', source: 'ORS Lock & Twist Gel' },
  { target: 'Rhinestone Glue', source: 'MissCheering Rhinestone Glue' },
  { target: 'Portable Electric Drill', source: 'portable electric nail drill kit' },
  { target: 'Mannequin Hand', source: 'flexible mannequin practice hand' },
  { target: 'Rhinestone Picker', source: 'wax rhinestone picker pencil' },
  { target: 'Desk Lamp', source: 'black metal desk lamp' },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id,name,slug,created_at')
    .order('created_at', { ascending: true });
  if (pErr) throw pErr;

  const byNorm = new Map();
  for (const p of products || []) {
    const key = normalizeName(p.name);
    byNorm.set(key, [...(byNorm.get(key) || []), p]);
  }

  const sourcesToDelete = [];
  const preview = [];

  for (const pair of matchedPairs) {
    const targetCandidates = byNorm.get(normalizeName(pair.target)) || [];
    const sourceCandidates = byNorm.get(normalizeName(pair.source)) || [];
    if (!targetCandidates.length || !sourceCandidates.length) continue;

    // Prefer newest target (newly added) and oldest source (legacy/old).
    const target = targetCandidates[targetCandidates.length - 1];
    const source = sourceCandidates.find((s) => new Date(s.created_at).getTime() < new Date(target.created_at).getTime())
      || sourceCandidates[0];

    if (!source || source.id === target.id) continue;

    sourcesToDelete.push(source);
    preview.push({
      target_name: target.name,
      target_slug: target.slug,
      source_name: source.name,
      source_slug: source.slug,
      source_id: source.id,
    });
  }

  // Unique by ID
  const uniqueSources = [...new Map(sourcesToDelete.map((s) => [s.id, s])).values()];
  const sourceIds = uniqueSources.map((s) => s.id);

  console.log(`Matched source products to delete: ${sourceIds.length}${dryRun ? ' (dry run)' : ''}`);
  for (const row of preview) {
    console.log(`- DELETE source "${row.source_name}" (${row.source_slug}) | kept target "${row.target_name}" (${row.target_slug})`);
  }

  if (dryRun || sourceIds.length === 0) return;

  const { error: imgErr } = await supabase.from('product_images').delete().in('product_id', sourceIds);
  if (imgErr) throw imgErr;

  const { error: varErr } = await supabase.from('product_variants').delete().in('product_id', sourceIds);
  if (varErr) throw varErr;

  const { error: prodErr } = await supabase.from('products').delete().in('id', sourceIds);
  if (prodErr) throw prodErr;

  console.log(`Deleted ${sourceIds.length} old matched product(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

