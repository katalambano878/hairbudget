import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Order Confirmed',
  description: 'Thank you for shopping with HairBudget.',
  path: '/order-success',
  noindex: true,
});

export default function OrderSuccessLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
