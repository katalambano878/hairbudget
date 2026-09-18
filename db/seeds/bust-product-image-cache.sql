UPDATE public.product_images
SET url = url || '?v=20260918photo'
WHERE url LIKE '/api/storage/products/%'
  AND url NOT LIKE '%?v=%';
