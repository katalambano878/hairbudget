import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import {
  buildMetadata,
  productJsonLd,
  breadcrumbJsonLd,
  jsonLdScript,
  SITE,
} from '@/lib/seo';
import ProductDetailClient from './ProductDetailClient';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function fetchProduct(slug: string) {
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data } = await supabase
      .from('products')
      .select(
        'id, name, slug, description, short_description, price, sale_price, sku, status, image_urls, stock_quantity, category:categories(name, slug)'
      )
      .eq('slug', slug)
      .maybeSingle();
    return data;
  } catch (err) {
    console.error('[product metadata] fetch failed', err);
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  if (!product) {
    return buildMetadata({
      title: 'Product Not Found',
      description: 'This product is no longer available.',
      path: `/product/${slug}`,
      noindex: true,
    });
  }

  const description = (product.short_description || product.description || SITE.description)
    .toString()
    .replace(/<[^>]+>/g, '')
    .trim()
    .slice(0, 160);

  const ogImage = Array.isArray(product.image_urls) && product.image_urls.length
    ? product.image_urls[0]
    : undefined;

  return buildMetadata({
    title: product.name,
    description,
    path: `/product/${slug}`,
    image: ogImage,
    type: 'product',
    keywords: [product.name, (product as any)?.category?.name].filter(Boolean) as string[],
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await fetchProduct(slug);

  const productSchema = product
    ? productJsonLd({
        name: product.name,
        description: (product.short_description || product.description || '')
          .toString()
          .replace(/<[^>]+>/g, '')
          .trim(),
        image: Array.isArray(product.image_urls) && product.image_urls.length
          ? product.image_urls
          : `${SITE.url}/og-image.png`,
        slug: product.slug,
        sku: product.sku || product.id,
        price: Number(product.sale_price ?? product.price ?? 0),
        availability:
          product.status === 'active' && (product.stock_quantity ?? 0) > 0
            ? 'in_stock'
            : 'out_of_stock',
        category: (product as any)?.category?.name,
      })
    : null;

  const breadcrumb = product
    ? breadcrumbJsonLd([
        { name: 'Home', url: '/' },
        { name: 'Shop', url: '/shop' },
        { name: product.name, url: `/product/${slug}` },
      ])
    : null;

  return (
    <>
      {productSchema && <script {...jsonLdScript(productSchema)} />}
      {breadcrumb && <script {...jsonLdScript(breadcrumb)} />}
      <ProductDetailClient slug={slug} />
    </>
  );
}
