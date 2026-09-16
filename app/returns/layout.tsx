import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Returns & Refunds',
  description:
    'HairBudget does not offer refunds. Unused items may be exchanged within 24 hours of purchase.',
  path: '/returns',
  keywords: ['wig returns', 'wig refund policy', 'return wig Ghana'],
});

export default function ReturnsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
