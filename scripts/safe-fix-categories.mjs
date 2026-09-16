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

function n(v) {
  return (v || '').trim().toLowerCase();
}

const safeFixes = [
  // Clearly tools/salon equipment.
  { name: 'Desk Lamp', to: 'hair-and-salon-tools' },
  { name: 'U-Shape Arm Rest', to: 'hair-and-salon-tools' },
  { name: 'Foldable Arm Rest', to: 'hair-and-salon-tools' },
  { name: 'Wooden Arm Rest Short', to: 'hair-and-salon-tools' },
  { name: 'Wooden Arm Rest Long', to: 'hair-and-salon-tools' },
  { name: 'Mannequin Brush Small', to: 'hair-and-salon-tools' },
  { name: 'Mannequin Bowl Big', to: 'hair-and-salon-tools' },
  { name: 'Dust Collector', to: 'hair-and-salon-tools' },
  { name: 'Table Organizer', to: 'hair-and-salon-tools' },
  { name: '10 pieces comb set', to: 'hair-and-salon-tools' },
  { name: 'Razor comb', to: 'hair-and-salon-tools' },
  { name: 'BBL professional hot pressing comb', to: 'hair-and-salon-tools' },
  { name: 'black metal desk lamp', to: 'hair-and-salon-tools' },
  { name: 'Detangling Brush', to: 'hair-and-salon-tools' },
  { name: 'Hot air brush', to: 'hair-and-salon-tools' },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: catErr } = await supabase.from('categories').select('id,name,slug');
  if (catErr) throw catErr;
  const bySlug = new Map((categories || []).map((c) => [c.slug, c]));

  const { data: products, error: prodErr } = await supabase.from('products').select('id,name,slug,category_id');
  if (prodErr) throw prodErr;

  const byName = new Map();
  for (const p of products || []) {
    const key = n(p.name);
    byName.set(key, [...(byName.get(key) || []), p]);
  }

  const pending = [];
  for (const fix of safeFixes) {
    const target = bySlug.get(fix.to);
    if (!target) throw new Error(`Missing category slug: ${fix.to}`);
    const matches = byName.get(n(fix.name)) || [];
    for (const p of matches) {
      if (p.category_id !== target.id) {
        pending.push({
          id: p.id,
          name: p.name,
          from: categories.find((c) => c.id === p.category_id)?.slug || 'uncategorized',
          to: fix.to,
          toId: target.id,
        });
      }
    }
  }

  console.log(`Safe fixes to apply: ${pending.length}${dryRun ? ' (dry run)' : ''}`);
  for (const p of pending) {
    console.log(`- ${p.name}: ${p.from} -> ${p.to}`);
  }

  if (dryRun) return;

  for (const p of pending) {
    const { error } = await supabase.from('products').update({ category_id: p.toId }).eq('id', p.id);
    if (error) throw error;
  }

  console.log(`Applied ${pending.length} safe category fix(es).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

