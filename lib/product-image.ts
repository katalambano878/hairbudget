import { publicAsset } from '@/lib/assets';

/**
 * Normalize product image URLs for the storefront.
 * - /api/storage/... must bypass next/image (optimizer returns 400 for API routes)
 * - /products/... get a public cache-bust query for static files in /public
 */
export function resolveProductImageUrl(url: string | undefined | null): string {
  if (!url) return '';

  if (url.startsWith('/api/storage/')) {
    return url;
  }

  if (url.startsWith('/products/')) {
    return publicAsset(url.split('?')[0]);
  }

  return url;
}

/** next/image cannot optimize our storage API responses — load them directly. */
export function productImageUnoptimized(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.startsWith('/api/storage/');
}
