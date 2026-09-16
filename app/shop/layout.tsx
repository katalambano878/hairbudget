import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Shop Wigs, Extensions & Bundles',
  description:
    'Shop HairBudget wigs, human hair, braiding extensions, bundles, body wave, bobs, blonde and coloured hair, plus shapewear. Retail and wholesale in Ghana.',
  path: '/shop',
  keywords: ['shop wigs Ghana', 'buy wigs online Accra', 'hair extensions shop', 'wholesale hair Ghana'],
});

export default function ShopLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
