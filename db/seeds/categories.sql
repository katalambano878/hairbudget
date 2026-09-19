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
   5, 'active', '{"featured": false}'::jsonb),

  ('Hair Extensions',
   'hair-extensions',
   'Wefts and bundles in popular textures — spiral curls, bone straight, deep wave, body wave, Italian curls and boho curls.',
   '/categories/hair-extensions.jpg',
   6, 'active', '{"featured": false}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url   = EXCLUDED.image_url,
  position    = EXCLUDED.position,
  status      = EXCLUDED.status,
  metadata    = EXCLUDED.metadata,
  updated_at  = now();

-- Texture children of Hair Extensions.
INSERT INTO public.categories (name, slug, description, image_url, position, status, parent_id, metadata)
VALUES
  ('Spiral curls',
   'spiral-curls',
   'Tight corkscrew spiral curl wefts — bouncy, defined and full of movement.',
   '/categories/spiral-curls.jpg',
   1, 'active',
   (SELECT id FROM public.categories WHERE slug = 'hair-extensions'),
   '{}'::jsonb),

  ('Bone straight',
   'bone-straight',
   'Ultra-smooth bone straight bundles — sleek, silky and easy to style.',
   '/categories/bone-straight.jpg',
   2, 'active',
   (SELECT id FROM public.categories WHERE slug = 'hair-extensions'),
   '{}'::jsonb),

  ('Deep waves',
   'deep-waves',
   'Deep wave wefts with a rich S-pattern — volume without tight ringlets.',
   '/categories/deep-waves.jpg',
   3, 'active',
   (SELECT id FROM public.categories WHERE slug = 'hair-extensions'),
   '{}'::jsonb),

  ('Body waves',
   'body-waves',
   'Soft body wave bundles — natural movement and everyday wear.',
   '/categories/body-waves.jpg',
   4, 'active',
   (SELECT id FROM public.categories WHERE slug = 'hair-extensions'),
   '{}'::jsonb),

  ('Italian curls',
   'italian-curls',
   'Defined Italian curl wefts — springy coils with a polished finish.',
   '/categories/italian-curls.jpg',
   5, 'active',
   (SELECT id FROM public.categories WHERE slug = 'hair-extensions'),
   '{}'::jsonb),

  ('Boho curls',
   'boho-curls',
   'Loose bohemian curls — textured, airy and easy to wear.',
   '/categories/boho-curls.jpg',
   6, 'active',
   (SELECT id FROM public.categories WHERE slug = 'hair-extensions'),
   '{}'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name        = EXCLUDED.name,
  description = EXCLUDED.description,
  image_url   = EXCLUDED.image_url,
  position    = EXCLUDED.position,
  status      = EXCLUDED.status,
  parent_id   = EXCLUDED.parent_id,
  metadata    = EXCLUDED.metadata,
  updated_at  = now();

-- Place existing texture products under the matching Hair Extensions child.
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'bone-straight'), updated_at = now()
WHERE slug IN ('bone-straight', 'bone-straight-black');
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'spiral-curls'), updated_at = now()
WHERE slug IN ('spiral-hair', 'indian-spiral', 'grey-spiral');
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'body-waves'), updated_at = now()
WHERE slug IN ('wavy-curls');
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'italian-curls'), updated_at = now()
WHERE slug IN ('french-curl', 'french-curls-109', 'french-curls-120', 'french-curly-hair');
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'boho-curls'), updated_at = now()
WHERE slug IN ('curls', 'curly-hair');
