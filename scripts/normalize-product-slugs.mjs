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

function slugify(name) {
  return (name || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function uniqueSlug(base, used) {
  let slug = base || 'product';
  let i = 2;
  while (used.has(slug)) {
    slug = `${base}-${i}`;
    i += 1;
  }
  used.add(slug);
  return slug;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error } = await supabase
    .from('products')
    .select('id,name,slug,created_at')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });

  if (error) throw error;

  const used = new Set();
  const changes = [];

  for (const p of products || []) {
    const base = slugify(p.name) || 'product';
    const desired = uniqueSlug(base, used);
    const current = (p.slug || '').trim();
    if (current !== desired) {
      changes.push({
        id: p.id,
        name: p.name,
        old_slug: current,
        new_slug: desired,
      });
    }
  }

  console.log(`Products checked: ${products?.length || 0}`);
  console.log(`Slug updates needed: ${changes.length}${dryRun ? ' (dry run)' : ''}`);
  for (const c of changes) {
    console.log(`- ${c.name}: ${c.old_slug} -> ${c.new_slug}`);
  }

  if (dryRun) return;

  for (const c of changes) {
    const { error: upErr } = await supabase.from('products').update({ slug: c.new_slug }).eq('id', c.id);
    if (upErr) throw upErr;
  }

  console.log(`Updated ${changes.length} product slug(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

