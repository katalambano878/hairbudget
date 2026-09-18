#!/usr/bin/env node
/**
 * Product image manifest for HairBudget.
 *
 * Real product photos live in public/products/<slug>.jpg and are uploaded to
 * storage with scripts/upload-product-images-to-storage.mjs (or upload-products-storage-standalone.mjs on VPS).
 *
 * Images should match each product name (texture, color, style) — hair only,
 * no people, no brand logos, ivory/cream studio background.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const OUT_DIR = path.join(__dirname, '..', 'public', 'products');

/** All storefront product slugs that require an image file. */
export const PRODUCT_SLUGS = [
  'black-noir',
  'blazer',
  'blend',
  'bone-straight',
  'bone-straight-black',
  'braids',
  'curls',
  'curly-hair',
  'extension',
  'french-curl',
  'french-curls-109',
  'french-curls-120',
  'french-curly-hair',
  'grey-spiral',
  'indian-hair',
  'indian-spiral',
  'lash-hair',
  'peruvian',
  'peruvian-hair',
  'spiral-hair',
  'wavy-curls',
  'white-hair',
  'wig',
  'wig-human-hair',
];

export function listMissingProductImages() {
  return PRODUCT_SLUGS.filter((slug) => !fs.existsSync(path.join(OUT_DIR, `${slug}.jpg`)));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const missing = listMissingProductImages();
  if (missing.length) {
    console.error('Missing images:', missing.join(', '));
    process.exit(1);
  }
  console.log(`All ${PRODUCT_SLUGS.length} product images present in public/products/`);
}
