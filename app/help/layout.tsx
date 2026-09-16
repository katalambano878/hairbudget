import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Help Centre',
  description:
    'Browse the HairBudget help centre for guides on orders, returns, wig care, sizing, delivery, payments and account help.',
  path: '/help',
  keywords: ['HairBudget help', 'wig help centre', 'order help'],
});

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
