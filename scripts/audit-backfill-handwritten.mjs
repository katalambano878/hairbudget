import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');
const scriptsDir = __dirname;

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

function loadStockMap() {
  const csvPath = path.join(rootDir, 'data', 'stock-updates.csv');
  const map = new Map();
  if (!fs.existsSync(csvPath)) return map;
  const lines = fs.readFileSync(csvPath, 'utf-8').split(/\r?\n/).slice(1);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(',');
    if (parts.length < 3) continue;
    const stock = Number(parts[1]);
    const slug = String(parts[2] || '').trim();
    if (!slug || Number.isNaN(stock)) continue;
    map.set(slug, stock);
  }
  return map;
}

function loadPriceMapFromScripts() {
  const map = new Map();
  const files = fs
    .readdirSync(scriptsDir)
    .filter((f) => /^apply-photo\d+-price-discount\.mjs$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const tupleRe = /\['([^']+)',\s*([0-9]+(?:\.[0-9]+)?),\s*([0-9]+(?:\.[0-9]+)?)\]/g;
  const objRe = /slug:\s*'([^']+)'\s*,\s*price:\s*([0-9]+(?:\.[0-9]+)?)\s*,\s*sale_price:\s*([0-9]+(?:\.[0-9]+)?)/g;

  for (const file of files) {
    const fullPath = path.join(scriptsDir, file);
    const text = fs.readFileSync(fullPath, 'utf-8');

    let m;
    while ((m = tupleRe.exec(text)) !== null) {
      const slug = m[1];
      const price = Number(m[2]);
      const sale = Number(m[3]);
      if (!Number.isNaN(price) && !Number.isNaN(sale)) {
        map.set(slug, { price, sale_price: sale, source: file });
      }
    }

    while ((m = objRe.exec(text)) !== null) {
      const slug = m[1];
      const price = Number(m[2]);
      const sale = Number(m[3]);
      if (!Number.isNaN(price) && !Number.isNaN(sale)) {
        map.set(slug, { price, sale_price: sale, source: file });
      }
    }
  }

  return map;
}

function isMissingPrice(v) {
  return v == null || Number(v) <= 0;
}

function isMissingStock(v) {
  return v == null || Number(v) <= 0;
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const stockMap = loadStockMap();
  const priceMap = loadPriceMapFromScripts();

  const { data: products, error } = await sb
    .from('products')
    .select('id,name,slug,quantity,price,sale_price')
    .order('name');
  if (error) throw error;

  const fixes = [];
  for (const p of products || []) {
    const patch = {};
    const expectedStock = stockMap.get(p.slug);
    const expectedPrice = priceMap.get(p.slug);

    if (expectedStock != null && isMissingStock(p.quantity) && expectedStock > 0) {
      patch.quantity = expectedStock;
    }

    if (expectedPrice && (isMissingPrice(p.price) || isMissingPrice(p.sale_price))) {
      if (!isMissingPrice(expectedPrice.price)) patch.price = expectedPrice.price;
      if (!isMissingPrice(expectedPrice.sale_price)) patch.sale_price = expectedPrice.sale_price;
    }

    if (Object.keys(patch).length) {
      fixes.push({ id: p.id, slug: p.slug, name: p.name, patch });
    }
  }

  for (const f of fixes) {
    const { error: upErr } = await sb.from('products').update(f.patch).eq('id', f.id);
    if (upErr) throw upErr;
  }

  const { data: after, error: afterErr } = await sb
    .from('products')
    .select('name,slug,quantity,price,sale_price')
    .order('name');
  if (afterErr) throw afterErr;

  const missingAll = [];
  const missingAny = [];
  for (const p of after || []) {
    const noPrice = isMissingPrice(p.price);
    const noSale = isMissingPrice(p.sale_price);
    const noStock = isMissingStock(p.quantity);
    if (noPrice || noSale || noStock) {
      missingAny.push(p);
    }
    if (noPrice && noSale && noStock) {
      missingAll.push(p);
    }
  }

  const report = {
    total_products: (after || []).length,
    backfilled_count: fixes.length,
    missing_all_three_count: missingAll.length,
    missing_any_of_three_count: missingAny.length,
    backfilled: fixes.map((f) => ({ slug: f.slug, name: f.name, ...f.patch })),
    missing_all_three: missingAll.map((p) => ({
      slug: p.slug,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      sale_price: p.sale_price,
      in_stock_sheet: stockMap.has(p.slug),
      in_price_sheet: priceMap.has(p.slug),
    })),
    missing_any_of_three: missingAny.map((p) => ({
      slug: p.slug,
      name: p.name,
      quantity: p.quantity,
      price: p.price,
      sale_price: p.sale_price,
      in_stock_sheet: stockMap.has(p.slug),
      in_price_sheet: priceMap.has(p.slug),
    })),
  };

  const outPath = path.join(rootDir, 'data', 'audit-missing-backfill-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Backfilled ${fixes.length} product(s).`);
  console.log(`Missing all three (price, sale_price, quantity): ${missingAll.length}`);
  console.log(`Missing any of the three: ${missingAny.length}`);
  console.log(`Report saved: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
