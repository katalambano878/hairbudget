import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  const altPath = path.join(rootDir, '.env');
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

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractVariantTokens(name, slug) {
  const text = `${normalize(name)} ${normalize(slug)}`;
  const tokens = new Set();
  const patterns = [
    ['small', /\bsmall\b|\bsm\b/],
    ['medium', /\bmedium\b|\bmed\b/],
    ['big', /\bbig\b/],
    ['large', /\blarge\b|\blg\b/],
    ['mini', /\bmini\b/],
    ['short', /\bshort\b/],
    ['long', /\blong\b/],
    ['single', /\bsingle\b/],
    ['set', /\bset\b/],
  ];
  for (const [tag, re] of patterns) {
    if (re.test(text)) tokens.add(tag);
  }
  const units = text.match(/\b\d+(?:ml|g|kg|oz|pcs|pc|mm)\b/g) || [];
  for (const u of units) tokens.add(u);
  return [...tokens].sort();
}

function baseKey(name, slug) {
  let text = `${normalize(name)} ${normalize(slug)}`;
  text = text
    .replace(/\b(small|sm|medium|med|big|large|lg|mini|short|long|single|set)\b/g, ' ')
    .replace(/\b\d+(?:ml|g|kg|oz|pcs|pc|mm)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error } = await sb
    .from('products')
    .select('id,name,slug,price,sale_price,quantity,status,category_id')
    .neq('status', 'archived')
    .order('name');
  if (error) throw error;

  const { data: categories, error: cErr } = await sb.from('categories').select('id,name,slug');
  if (cErr) throw cErr;
  const catById = new Map((categories || []).map((c) => [c.id, c]));

  const { data: images, error: iErr } = await sb.from('product_images').select('product_id');
  if (iErr) throw iErr;
  const imageCountByProductId = new Map();
  for (const img of images || []) {
    imageCountByProductId.set(img.product_id, (imageCountByProductId.get(img.product_id) || 0) + 1);
  }

  const groups = new Map();
  for (const p of products || []) {
    const tags = extractVariantTokens(p.name, p.slug);
    if (!tags.length) continue;
    const b = baseKey(p.name, p.slug);
    if (!b) continue;
    const key = `${b}||${p.category_id || ''}`;
    groups.set(key, [...(groups.get(key) || []), { ...p, tags }]);
  }

  const families = [];
  for (const [key, list] of groups.entries()) {
    if (list.length < 2) continue;
    const uniqueTagProfiles = new Set(list.map((p) => p.tags.join('|')));
    if (uniqueTagProfiles.size < 2) continue;
    const [base, categoryId] = key.split('||');
    const category = catById.get(categoryId || '');
    families.push({
      base_name: base,
      category_slug: category?.slug || '',
      category_name: category?.name || '',
      count: list.length,
      products: list
        .map((p) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          tags: p.tags,
          price: p.price,
          sale_price: p.sale_price,
          quantity: p.quantity,
          image_count: imageCountByProductId.get(p.id) || 0,
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    });
  }

  families.sort((a, b) => b.count - a.count || a.base_name.localeCompare(b.base_name));

  const outJson = path.join(rootDir, 'data', 'size-variant-families.json');
  fs.writeFileSync(outJson, JSON.stringify({ count: families.length, families }, null, 2));

  const outCsv = path.join(rootDir, 'data', 'size-variant-families.csv');
  const header = [
    'base_name',
    'category_slug',
    'product_name',
    'slug',
    'tags',
    'price',
    'sale_price',
    'quantity',
    'image_count',
    'id',
  ];
  const rows = [header.join(',')];
  for (const fam of families) {
    for (const p of fam.products) {
      rows.push(
        [
          fam.base_name,
          fam.category_slug,
          p.name,
          p.slug,
          p.tags.join('|'),
          p.price ?? '',
          p.sale_price ?? '',
          p.quantity ?? '',
          p.image_count ?? 0,
          p.id,
        ]
          .map(csvEscape)
          .join(',')
      );
    }
  }
  fs.writeFileSync(outCsv, `${rows.join('\n')}\n`);

  console.log(`Found ${families.length} size-variant family groups.`);
  console.log(`JSON report: ${outJson}`);
  console.log(`CSV report: ${outCsv}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
