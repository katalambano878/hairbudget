import type { MetadataRoute } from 'next';
import { SITE } from '@/lib/seo';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/'],
        disallow: [
          '/admin',
          '/admin/',
          '/api/',
          '/account',
          '/account/',
          '/checkout',
          '/cart',
          '/wishlist',
          '/order-success',
          '/order-tracking',
          '/pay/',
          '/auth/reset-password',
          '/auth/forgot-password',
          '/maintenance',
          '/offline',
          '/support/',
          '/pwa-settings',
        ],
      },
      // Block AI crawlers from training on the storefront content.
      { userAgent: 'GPTBot', disallow: ['/'] },
      { userAgent: 'CCBot', disallow: ['/'] },
      { userAgent: 'Google-Extended', disallow: ['/'] },
      { userAgent: 'anthropic-ai', disallow: ['/'] },
      { userAgent: 'ClaudeBot', disallow: ['/'] },
    ],
    sitemap: `${SITE.url}/sitemap.xml`,
    host: SITE.url,
  };
}
