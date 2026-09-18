-- HairBudget storefront categories.
-- The four with metadata.featured = true are the ones the homepage shows.
INSERT INTO public.categories (name, slug, description, image_url, position, status, metadata)
VALUES
  ('Wigs',
   'wigs',
   'Ready-to-wear and lace wigs — bobs, body wave, straight and curly units for every day or a special occasion.',
   '/categories/wigs.jpg',
   1, 'active', '{"featured": true}'::jsonb),

  ('Human Hairs',
   'human-hairs',
   '100% human hair bundles and wefts in straight, body wave, deep wave and curly textures.',
   '/categories/human-hair.jpg',
   2, 'active', '{"featured": true}'::jsonb),

  ('Human Hair Blends',
   'human-hair-blends',
   'Blended bundles that mix human hair with premium fibre — the look you want at a friendlier price.',
   '/categories/human-hair-blends.jpg',
   3, 'active', '{"featured": true}'::jsonb),

  ('Braiding Extensions',
   'braiding-extensions',
   'Jumbo braid and pre-stretched braiding hair for protective styles — soft, durable and full of colour.',
   '/categories/braiding-extensions.jpg',
   4, 'active', '{"featured": true}'::jsonb),

  ('Wig Accessories',
   'wig-accessories',
   'Wig caps, elastic bands, edge brushes, combs, clips and lace adhesive to finish and maintain your install.',
   '/categories/wig-accessories.jpg',
   5, 'active', '{"featured": false}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url   = EXCLUDED.image_url,
  position    = EXCLUDED.position,
  status      = EXCLUDED.status,
  metadata    = EXCLUDED.metadata,
  updated_at  = now();
