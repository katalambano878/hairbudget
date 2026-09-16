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

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: catErr } = await supabase.from('categories').select('id,slug,name');
  if (catErr) throw catErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  const items = [
    {
      name: 'Packaging Net Medium',
      quantity: 70,
      categorySlug: 'hair-and-salon-tools',
      description: 'Packaging net (Medium size) added from handwritten stock sheet.',
    },
    {
      name: 'Packaging Net Large',
      quantity: 62,
      categorySlug: 'hair-and-salon-tools',
      description: 'Packaging net (Large size) added from handwritten stock sheet.',
    },
    {
      name: 'Packaging Net XL',
      quantity: 47,
      categorySlug: 'hair-and-salon-tools',
      description: 'Packaging net (XL size) added from handwritten stock sheet.',
    },
    {
      name: 'Packaging Net Small',
      quantity: 0,
      categorySlug: 'hair-and-salon-tools',
      description: 'Packaging net (Small size) added from handwritten stock sheet. Quantity pending confirmation.',
    },
    {
      name: 'Mesh Dome Cap',
      quantity: 100,
      categorySlug: 'hair-and-salon-tools',
      description: 'Mesh dome cap added from handwritten stock sheet.',
    },
    {
      name: '600pcs Ultra Short Tips',
      quantity: 5,
      categorySlug: 'nail-essentials',
      description: '600pcs ultra short tips added from handwritten stock sheet.',
    },
    {
      name: 'Refill Nails',
      quantity: 15,
      categorySlug: 'nail-essentials',
      description: 'Refill nails added from handwritten stock sheet.',
    },
  ];

  const results = [];
  for (const item of items) {
    const slug = slugify(item.name);
    const category_id = catBySlug.get(item.categorySlug) || null;

    const { data: existing, error: exErr } = await supabase
      .from('products')
      .select('id,name,slug,quantity,price,category_id')
      .eq('slug', slug)
      .maybeSingle();
    if (exErr) throw exErr;

    if (existing) {
      const { error: upErr } = await supabase
        .from('products')
        .update({
          quantity: item.quantity,
          status: 'active',
          category_id: existing.category_id || category_id,
        })
        .eq('id', existing.id);
      if (upErr) throw upErr;
      results.push(`UPDATED: ${existing.name} (${existing.slug}) qty=${item.quantity}`);
      continue;
    }

    const { error: insErr } = await supabase.from('products').insert({
      name: item.name,
      slug,
      description: item.description,
      price: 0,
      compare_at_price: null,
      quantity: item.quantity,
      category_id,
      status: 'active',
      featured: false,
      sku: null,
      tags: ['paper-import'],
      metadata: { source: 'handwritten-stock-sheet' },
      moq: 1,
    });
    if (insErr) throw insErr;
    results.push(`CREATED: ${item.name} (${slug}) qty=${item.quantity}`);
  }

  console.log('Done.');
  for (const r of results) console.log(r);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
