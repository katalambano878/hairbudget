#!/usr/bin/env node
/**
 * Seed HairBudget products + product_images (with generated /public/products images).
 *
 * Usage:
 *   node scripts/generate-product-images.mjs
 *   node scripts/seed-products.mjs [--dry-run]
 */
import { createDbClient, loadEnv } from './db-lib.mjs';
import { PRODUCT_SLUGS } from './generate-product-images.mjs';

const PRODUCTS = [
  { name: 'Black Noir', slug: 'black-noir', price: 92.0, category: 'wigs', qty: 25 },
  { name: 'Blazer', slug: 'blazer', price: 224.95, category: 'human-hairs', qty: 15 },
  { name: 'Blend', slug: 'blend', price: 65.0, category: 'human-hair-blends', qty: 40 },
  { name: 'Bone Straight', slug: 'bone-straight', price: 85.2, category: 'human-hairs', qty: 30 },
  { name: 'Bone Straight- Black', slug: 'bone-straight-black', price: 75.5, category: 'human-hairs', qty: 30 },
  { name: 'Braids', slug: 'braids', price: 419.95, category: 'braiding-extensions', qty: 20 },
  { name: 'Curls', slug: 'curls', price: 55.0, category: 'human-hairs', qty: 35 },
  { name: 'Curly Hair', slug: 'curly-hair', price: 139.95, category: 'human-hairs', qty: 25 },
  { name: 'Extension', slug: 'extension', price: 55.0, category: 'braiding-extensions', qty: 50 },
  { name: 'French curl', slug: 'french-curl', price: 250.5, category: 'human-hairs', qty: 18 },
  { name: 'French Curls', slug: 'french-curls-109', price: 109.95, category: 'human-hairs', qty: 22 },
  { name: 'French Curls', slug: 'french-curls-120', price: 120.0, category: 'human-hairs', qty: 22 },
  { name: 'French curly hair', slug: 'french-curly-hair', price: 100.12, category: 'human-hairs', qty: 24 },
  { name: 'Grey spiral', slug: 'grey-spiral', price: 95.0, category: 'braiding-extensions', qty: 28 },
  { name: 'Indian Hair', slug: 'indian-hair', price: 67.95, category: 'human-hairs', qty: 40 },
  { name: 'Indian Spiral', slug: 'indian-spiral', price: 281.95, category: 'human-hairs', qty: 16 },
  { name: 'Lash Hair', slug: 'lash-hair', price: 70.0, category: 'human-hairs', qty: 35 },
  { name: 'Peruvian', slug: 'peruvian', price: 32.95, category: 'human-hairs', qty: 45 },
  { name: 'Peruvian Hair', slug: 'peruvian-hair', price: 90.0, category: 'human-hairs', qty: 30 },
  { name: 'Spiral Hair', slug: 'spiral-hair', price: 189.95, category: 'human-hairs', qty: 20 },
  { name: 'Wavy curls', slug: 'wavy-curls', price: 100.12, category: 'human-hairs', qty: 24 },
  { name: 'White hair', slug: 'white-hair', price: 85.0, category: 'human-hairs', qty: 18 },
  { name: 'Wig', slug: 'wig', price: 105.0, category: 'wigs', qty: 20 },
  { name: 'Wig (human hair)', slug: 'wig-human-hair', price: 75.0, category: 'wigs', qty: 22 },
];

const visualSlugs = new Set(PRODUCT_SLUGS);

function skuFromSlug(slug) {
  return `HB-${slug.replace(/-/g, '').slice(0, 8).toUpperCase()}-${slug.slice(-4).toUpperCase()}`;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const missing = PRODUCTS.filter((p) => !visualSlugs.has(p.slug));
  if (missing.length) {
    console.error('Missing visuals for:', missing.map((p) => p.slug).join(', '));
    process.exit(1);
  }

  const client = createDbClient(loadEnv());
  await client.connect();

  const { rows: categories } = await client.query(
    `SELECT id, slug FROM public.categories WHERE status = 'active'`
  );
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]));

  let inserted = 0;
  let updated = 0;

  for (const p of PRODUCTS) {
    const categoryId = catBySlug[p.category];
    if (!categoryId) {
      console.error(`Unknown category slug "${p.category}" for ${p.name}`);
      process.exit(1);
    }

    const imageUrl = `/api/storage/products/${p.slug}.jpg`;
    const sku = skuFromSlug(p.slug);
    const shortDescription = `Premium ${p.name.toLowerCase()} — available at HairBudget Ghana.`;

    if (dryRun) {
      console.log(`[dry-run] ${p.name} | ${p.slug} | GH₵${p.price} | ${p.category} | ${imageUrl}`);
      continue;
    }

    const { rows } = await client.query(
      `INSERT INTO public.products (
         name, slug, description, short_description, price, sku, quantity,
         category_id, status, featured, moq, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active', false, 1, $9::jsonb)
       ON CONFLICT (slug) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         short_description = EXCLUDED.short_description,
         price = EXCLUDED.price,
         sku = EXCLUDED.sku,
         quantity = EXCLUDED.quantity,
         category_id = EXCLUDED.category_id,
         status = EXCLUDED.status,
         updated_at = now()
       RETURNING id, (xmax = 0) AS inserted`,
      [
        p.name,
        p.slug,
        shortDescription,
        shortDescription,
        p.price,
        sku,
        p.qty,
        categoryId,
        JSON.stringify({ low_stock_threshold: 5 }),
      ]
    );

    const productId = rows[0].id;
    if (rows[0].inserted) inserted += 1;
    else updated += 1;

    await client.query(`DELETE FROM public.product_images WHERE product_id = $1`, [productId]);
    await client.query(
      `INSERT INTO public.product_images (product_id, url, alt_text, position, width, height)
       VALUES ($1, $2, $3, 0, 1000, 1000)`,
      [productId, imageUrl, p.name]
    );
  }

  await client.end();

  if (dryRun) {
    console.log(`\nDry run — ${PRODUCTS.length} products ready to seed.`);
    return;
  }

  console.log(`Seeded ${PRODUCTS.length} products (${inserted} new, ${updated} updated) with images.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
