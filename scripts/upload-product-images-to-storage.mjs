#!/usr/bin/env node
/**
 * Upload public/products/*.jpg into storage_objects (bucket: products)
 * and point product_images.url at /api/storage/products/<slug>.jpg
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createDbClient, loadEnv } from './db-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PRODUCTS_DIR = path.join(__dirname, '..', 'public', 'products');

async function main() {
  const client = createDbClient(loadEnv());
  await client.connect();

  const files = fs.readdirSync(PRODUCTS_DIR).filter((f) => f.endsWith('.jpg'));
  let uploaded = 0;

  for (const file of files) {
    const slug = file.replace(/\.jpg$/, '');
    const objectPath = `${slug}.jpg`;
    const buffer = fs.readFileSync(path.join(PRODUCTS_DIR, file));

    await client.query(
      `INSERT INTO public.storage_objects (bucket, path, content_type, size, data)
       VALUES ('products', $1, 'image/jpeg', $2, $3)
       ON CONFLICT (bucket, path) DO UPDATE SET
         content_type = EXCLUDED.content_type,
         size = EXCLUDED.size,
         data = EXCLUDED.data`,
      [objectPath, buffer.length, buffer]
    );

    const storageUrl = `/api/storage/products/${objectPath}`;
    await client.query(
      `UPDATE public.product_images pi
       SET url = $1
       FROM public.products p
       WHERE pi.product_id = p.id AND p.slug = $2`,
      [storageUrl, slug]
    );

    uploaded += 1;
    console.log(storageUrl);
  }

  await client.end();
  console.log(`\nUploaded ${uploaded} images to storage_objects.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
