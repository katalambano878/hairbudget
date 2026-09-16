import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Track Your Order',
  description: 'Track the status of your HairBudget order.',
  path: '/order-tracking',
  noindex: true,
});

export default function OrderTrackingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
