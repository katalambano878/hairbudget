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

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.log('Usage: node scripts/_verify-variant-parent.mjs <parent-slug>');
    process.exit(1);
  }

  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: parent, error: pErr } = await sb
    .from('products')
    .select('id,name,slug,status,price,sale_price,quantity')
    .eq('slug', slug)
    .neq('status', 'archived')
    .maybeSingle();
  if (pErr) throw pErr;
  if (!parent) {
    console.log(`No active parent found for slug: ${slug}`);
    process.exit(0);
  }

  const { data: variants, error: vErr } = await sb
    .from('product_variants')
    .select('id,name,option1,price,sale_price,quantity,image_url')
    .eq('product_id', parent.id)
    .order('name');
  if (vErr) throw vErr;

  const { data: archivedChildren, error: cErr } = await sb
    .from('products')
    .select('id,name,slug,status')
    .eq('status', 'archived')
    .contains('metadata', { merged_into_variant_parent_slug: slug });
  if (cErr) throw cErr;

  console.log(`Parent: ${parent.slug} | ${parent.name} | price=${parent.price} sale=${parent.sale_price} qty=${parent.quantity}`);
  console.log(`Variants (${(variants || []).length}):`);
  for (const v of variants || []) {
    console.log(`- ${v.option1 || v.name} | price=${v.price} sale=${v.sale_price} qty=${v.quantity}`);
  }
  console.log(`Archived children: ${(archivedChildren || []).length}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
