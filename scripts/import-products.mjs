/**
 * Bulk import products from CSV (name,price,discount,stock) into public.products.
 * Uses SUPABASE_SERVICE_ROLE_KEY + NEXT_PUBLIC_SUPABASE_URL from .env.local (same as create-admin-user.mjs).
 *
 * Pricing modes (--mode):
 *   list-and-sale   CSV price -> products.price, CSV discount -> products.sale_price (shown when site sales mode is ON)
 *   pay-lower       CSV discount -> products.price (customer pays); CSV price -> compare_at_price if higher
 *   ignore-discount Only CSV price -> products.price; sale_price null
 *
 * Usage:
 *   node scripts/import-products.mjs path/to/file.csv --dry-run
 *   node scripts/import-products.mjs path/to/file.csv --mode=pay-lower
 *   node scripts/import-products.mjs path/to/file.csv --skip-existing-slug
 *   node scripts/import-products.mjs path/to/file.csv --category-id=<uuid>
 */

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

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      out.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur.trim());
  return out;
}

function slugFromName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

function generateSku() {
  const prefix = 'MH';
  const timestamp = Date.now().toString(36).toUpperCase().slice(-4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

function mapPricing(mode, priceRaw, discountRaw) {
  const price = parseFloat(String(priceRaw ?? '').trim());
  const discStr = String(discountRaw ?? '').trim();
  const discount = discStr === '' ? NaN : parseFloat(discStr);

  if (mode === 'ignore-discount') {
    return {
      price: Number.isNaN(price) ? 0 : price,
      sale_price: null,
      compare_at_price: null,
    };
  }

  if (mode === 'pay-lower') {
    const hasDiscount = !Number.isNaN(discount) && discount > 0;
    const pay = hasDiscount ? discount : Number.isNaN(price) ? 0 : price;
    const list = !Number.isNaN(price) && price > pay ? price : null;
    return {
      price: pay,
      sale_price: null,
      compare_at_price: list,
    };
  }

  return {
    price: Number.isNaN(price) ? 0 : price,
    sale_price: !Number.isNaN(discount) && discount > 0 ? discount : null,
    compare_at_price: null,
  };
}

function parseArgs(argv) {
  const positional = [];
  let dryRun = false;
  let skipExistingSlug = false;
  let mode = 'list-and-sale';
  let categoryId = null;

  for (const a of argv) {
    if (a === '--help' || a === '-h') {
      return { help: true };
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a === '--skip-existing-slug') {
      skipExistingSlug = true;
      continue;
    }
    if (a.startsWith('--mode=')) {
      mode = a.slice('--mode='.length);
      continue;
    }
    if (a.startsWith('--category-id=')) {
      categoryId = a.slice('--category-id='.length).trim() || null;
      continue;
    }
    if (a.startsWith('-')) {
      console.error('Unknown flag:', a);
      return { error: true };
    }
    positional.push(a);
  }

  const allowed = new Set(['list-and-sale', 'pay-lower', 'ignore-discount']);
  if (!allowed.has(mode)) {
    console.error('Invalid --mode. Use: list-and-sale | pay-lower | ignore-discount');
    return { error: true };
  }

  return { file: positional[0] || null, dryRun, skipExistingSlug, mode, categoryId };
}

function printHelp() {
  console.log(`
Usage: node scripts/import-products.mjs <file.csv> [options]

CSV columns: name, price, discount, stock (header row required).

Options:
  --dry-run              Print rows; do not insert
  --mode=<mode>          list-and-sale | pay-lower | ignore-discount (default: list-and-sale)
  --skip-existing-slug   Skip rows whose natural slug (from name) already exists in the database
  --category-id=<uuid>   Set category_id for every imported row

Environment: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY in .env.local
`);
}

async function fetchExistingSlugs(supabase) {
  const slugs = new Set();
  const pageSize = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from('products').select('slug').range(from, from + pageSize - 1);
    if (error) throw error;
    if (!data?.length) break;
    for (const row of data) {
      if (row.slug) slugs.add(row.slug);
    }
    if (data.length < pageSize) break;
    from += pageSize;
  }
  return slugs;
}

function uniqueSlug(base, existing, usedInBatch) {
  let s = base || 'product';
  let n = 0;
  while (existing.has(s) || usedInBatch.has(s)) {
    n += 1;
    s = `${base}-${n + 1}`;
  }
  usedInBatch.add(s);
  return s;
}

function uniqueSku(usedSkus) {
  let sku;
  do {
    sku = generateSku();
  } while (usedSkus.has(sku));
  usedSkus.add(sku);
  return sku;
}

async function main() {
  const rawArgs = process.argv.slice(2);
  const args = parseArgs(rawArgs);

  if (args.help) {
    printHelp();
    process.exit(0);
  }
  if (args.error) {
    process.exit(1);
  }
  if (!args.file) {
    console.error('Missing CSV path.\n');
    printHelp();
    process.exit(1);
  }

  const csvPath = path.isAbsolute(args.file) ? args.file : path.join(process.cwd(), args.file);
  if (!fs.existsSync(csvPath)) {
    console.error('File not found:', csvPath);
    process.exit(1);
  }

  const env = { ...process.env, ...loadEnv() };
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let content = fs.readFileSync(csvPath, 'utf-8');
  if (content.charCodeAt(0) === 0xfeff) {
    content = content.slice(1);
  }

  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) {
    console.error('CSV needs a header row and at least one data row.');
    process.exit(1);
  }

  const headerCells = parseCsvLine(lines[0]).map((h) => h.toLowerCase().trim());
  const idx = {
    name: headerCells.indexOf('name'),
    price: headerCells.indexOf('price'),
    discount: headerCells.indexOf('discount'),
    stock: headerCells.indexOf('stock'),
  };
  if (idx.name < 0 || idx.price < 0) {
    console.error('CSV header must include at least: name, price');
    process.exit(1);
  }
  if (idx.discount < 0 && args.mode !== 'ignore-discount') {
    console.warn('No "discount" column; discount values will be treated as empty.');
  }

  const existingSlugs = await fetchExistingSlugs(supabase);
  const usedInBatch = new Set();
  const usedSkus = new Set();

  const { data: existingSkusRows, error: skuErr } = await supabase.from('products').select('sku').not('sku', 'is', null);
  if (skuErr) throw skuErr;
  for (const r of existingSkusRows || []) {
    if (r.sku) usedSkus.add(r.sku);
  }

  const rowsOut = [];
  let skipped = 0;

  for (let li = 1; li < lines.length; li++) {
    const cells = parseCsvLine(lines[li]);
    const name = (cells[idx.name] || '').trim();
    if (!name) continue;

    const priceRaw = cells[idx.price] ?? '';
    const discountRaw = idx.discount >= 0 ? cells[idx.discount] ?? '' : '';
    const stockRaw = idx.stock >= 0 ? cells[idx.stock] ?? '' : '';
    const qty = parseInt(String(stockRaw).trim(), 10);
    const quantity = Number.isFinite(qty) && qty >= 0 ? qty : 0;

    const { price, sale_price, compare_at_price } = mapPricing(args.mode, priceRaw, discountRaw);
    const naturalSlug = slugFromName(name);

    if (args.skipExistingSlug && existingSlugs.has(naturalSlug)) {
      skipped += 1;
      continue;
    }

    const slug = uniqueSlug(naturalSlug, existingSlugs, usedInBatch);
    const sku = uniqueSku(usedSkus);

    rowsOut.push({
      name,
      slug,
      description: '',
      category_id: args.categoryId,
      price,
      sale_price,
      compare_at_price,
      sku,
      quantity,
      moq: 1,
      status: 'active',
      featured: false,
      tags: [],
      metadata: { low_stock_threshold: 5 },
    });
  }

  console.log(
    `Mode: ${args.mode} | Rows to import: ${rowsOut.length}${skipped ? ` | Skipped (existing slug): ${skipped}` : ''}${args.dryRun ? ' | DRY RUN' : ''}\n`
  );

  for (const r of rowsOut) {
    console.log(
      `${r.name} | slug=${r.slug} | price=${r.price} | sale_price=${r.sale_price ?? 'null'} | compare_at=${r.compare_at_price ?? 'null'} | qty=${r.quantity} | sku=${r.sku}`
    );
  }

  if (args.dryRun) {
    console.log('\nDry run complete — no rows inserted.');
    return;
  }

  const batchSize = 100;
  for (let i = 0; i < rowsOut.length; i += batchSize) {
    const chunk = rowsOut.slice(i, i + batchSize);
    const { error } = await supabase.from('products').insert(chunk);
    if (error) {
      console.error('Insert failed at batch starting index', i, error.message);
      process.exit(1);
    }
  }

  console.log(`\nInserted ${rowsOut.length} product(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
