import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Shop All — Wigs, Bundles, Closures & Hair Care',
  description:
    'Discover the full HairBudget collection — premium wigs, hair bundles, closures, frontals and styling essentials, delivered across Ghana.',
  path: '/shop',
  keywords: ['shop wigs Ghana', 'buy wigs online', 'wig store', 'hair bundles shop'],
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
