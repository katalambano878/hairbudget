import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'HairBudget — Confidence in every strand',
    short_name: 'HairBudget',
    description:
      'Stylish and quality hair products at budget-friendly prices. Wigs, extensions, bundles and shapewear — retail and wholesale in Ghana.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#EEE5D4',
    theme_color: '#0C4534',
    lang: 'en',
    categories: ['shopping', 'lifestyle', 'beauty'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      { src: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    shortcuts: [
      { name: 'Shop All', short_name: 'Shop', url: '/shop' },
      { name: 'Categories', short_name: 'Categories', url: '/categories' },
      { name: 'My Account', short_name: 'Account', url: '/account' },
    ],
  };
}
