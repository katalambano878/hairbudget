import { publicAsset } from '@/lib/assets';

const VIDEO_EXT = /\.(mp4|webm|mov|m4v|ogg|avi)(\?|$)/i;

export function isVideoUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return VIDEO_EXT.test(url.split('?')[0]);
}

/** Matching still for a product video (`foo.mp4` → `foo.jpg`). */
export function videoPosterUrl(url: string): string {
  return url.replace(/\.(mp4|webm|mov|m4v|ogg|avi)(\?.*)?$/i, '.jpg$2');
}

type MediaItem = { url?: string; position?: number } | string;

/** First still photo for cards/admin. Never returns a video URL. */
export function firstProductThumb(images?: MediaItem[] | null): string {
  if (!images?.length) return '';
  const items = images.map((item, index) =>
    typeof item === 'string' ? { url: item, position: index } : item
  );
  const sorted = [...items].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  const still = sorted.find((item) => item.url && !isVideoUrl(item.url));
  const picked = still?.url || (sorted[0]?.url ? videoPosterUrl(sorted[0].url) : '');
  return resolveProductImageUrl(picked);
}

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
