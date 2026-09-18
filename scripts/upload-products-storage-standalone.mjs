import fs from 'fs';
import path from 'path';
import pg from 'pg';

const dir = process.argv[2] || '/app/public/products';
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

await client.connect();
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.jpg'));

for (const file of files) {
  const slug = file.replace(/\.jpg$/, '');
  const buf = fs.readFileSync(path.join(dir, file));
  await client.query(
    `INSERT INTO public.storage_objects (bucket, path, content_type, size, data)
     VALUES ('products', $1, 'image/jpeg', $2, $3)
     ON CONFLICT (bucket, path) DO UPDATE SET
       content_type = EXCLUDED.content_type,
       size = EXCLUDED.size,
       data = EXCLUDED.data`,
    [`${slug}.jpg`, buf.length, buf]
  );
  const url = `/api/storage/products/${slug}.jpg`;
  await client.query(
    `UPDATE public.product_images pi SET url = $1
     FROM public.products p
     WHERE pi.product_id = p.id AND p.slug = $2`,
    [url, slug]
  );
  console.log(url);
}

await client.end();
console.log(`done ${files.length}`);
