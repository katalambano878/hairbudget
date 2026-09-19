-- HairBudget product catalog seed (24 products + images).
-- Run after categories.sql. Images live at /public/products/<slug>.jpg

DO $$
DECLARE
  r RECORD;
  pid uuid;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      ('Black Noir',           'black-noir',           92.00,   'wigs',                 25, 'HB-BLACKNOIR-NOIR'),
      ('Blazer',               'blazer',              224.95,   'human-hairs',          15, 'HB-BLAZER-0001'),
      ('Blend',                'blend',                65.00,   'human-hair-blends',    40, 'HB-BLEND-00001'),
      ('Bone Straight',        'bone-straight',        85.20,   'bone-straight',        30, 'HB-BONESTRA-IGHT'),
      ('Bone Straight- Black', 'bone-straight-black',  75.50,   'bone-straight',        30, 'HB-BONESTBL-ACK'),
      ('Braids',               'braids',              419.95,   'braiding-extensions',  20, 'HB-BRAIDS-0001'),
      ('Curls',                'curls',                55.00,   'boho-curls',           35, 'HB-CURLS-00001'),
      ('Curly Hair',           'curly-hair',          139.95,   'boho-curls',           25, 'HB-CURLYHAI-R001'),
      ('Extension',            'extension',            55.00,   'braiding-extensions',  50, 'HB-EXTENSIO-N001'),
      ('French curl',          'french-curl',         250.50,   'italian-curls',        18, 'HB-FRENCHCU-R001'),
      ('French Curls',         'french-curls-109',    109.95,   'italian-curls',        22, 'HB-FRENCH10-9CUR'),
      ('French Curls',         'french-curls-120',    120.00,   'italian-curls',        22, 'HB-FRENCH12-0CUR'),
      ('French curly hair',    'french-curly-hair',   100.12,   'italian-curls',        24, 'HB-FRENCHCU-RLYH'),
      ('Grey spiral',          'grey-spiral',          95.00,   'spiral-curls',         28, 'HB-GREYSPIR-AL01'),
      ('Indian Hair',          'indian-hair',          67.95,   'human-hairs',          40, 'HB-INDIANHA-IR01'),
      ('Indian Spiral',        'indian-spiral',       281.95,   'spiral-curls',         16, 'HB-INDIANSP-IRAL'),
      ('Lash Hair',            'lash-hair',            70.00,   'human-hairs',          35, 'HB-LASHHAIR-0001'),
      ('Peruvian',             'peruvian',             32.95,   'human-hairs',          45, 'HB-PERUVIAN-0001'),
      ('Peruvian Hair',        'peruvian-hair',        90.00,   'human-hairs',          30, 'HB-PERUVIAN-HAIR'),
      ('Spiral Hair',          'spiral-hair',         189.95,   'spiral-curls',         20, 'HB-SPIRALHA-IR01'),
      ('Wavy curls',           'wavy-curls',          100.12,   'body-waves',           24, 'HB-WAVYCURL-S001'),
      ('White hair',           'white-hair',           85.00,   'human-hairs',          18, 'HB-WHITEHAI-R001'),
      ('Wig',                  'wig',                 105.00,   'wigs',                 20, 'HB-WIG-0000001'),
      ('Wig (human hair)',     'wig-human-hair',       75.00,   'wigs',                 22, 'HB-WIGHUMAN-HAIR')
    ) AS t(name, slug, price, category_slug, qty, sku)
  LOOP
    INSERT INTO public.products (
      name, slug, description, short_description, price, sku, quantity,
      category_id, status, featured, moq, metadata
    )
    VALUES (
      r.name,
      r.slug,
      'Premium ' || lower(r.name) || ' — available at HairBudget Ghana.',
      'Premium ' || lower(r.name) || ' — available at HairBudget Ghana.',
      r.price,
      r.sku,
      r.qty,
      (SELECT id FROM public.categories WHERE slug = r.category_slug LIMIT 1),
      'active',
      false,
      1,
      '{"low_stock_threshold": 5}'::jsonb
    )
    ON CONFLICT (slug) DO UPDATE SET
      name             = EXCLUDED.name,
      description      = EXCLUDED.description,
      short_description= EXCLUDED.short_description,
      price            = EXCLUDED.price,
      sku              = EXCLUDED.sku,
      quantity         = EXCLUDED.quantity,
      category_id      = EXCLUDED.category_id,
      status           = EXCLUDED.status,
      updated_at       = now()
    RETURNING id INTO pid;

    DELETE FROM public.product_images WHERE product_id = pid;

    INSERT INTO public.product_images (product_id, url, alt_text, position, width, height)
    VALUES (pid, '/api/storage/products/' || r.slug || '.jpg', r.name, 0, 1000, 1000);
  END LOOP;
END $$;
