-- Homepage "Featured Products" row (12 tiles: 4 columns x 3 rows).
-- Chosen for a spread of categories, textures and price points.
UPDATE public.products SET featured = false WHERE featured = true;

UPDATE public.products
SET featured = true, updated_at = now()
WHERE slug IN (
  -- Wigs
  'black-noir',
  'wig',
  'wig-human-hair',
  -- Human hair blends
  'blend',
  -- Human hairs
  'bone-straight',
  'french-curl',
  'curly-hair',
  'indian-spiral',
  'peruvian-hair',
  -- Braiding extensions
  'braids',
  'extension',
  'grey-spiral'
);
