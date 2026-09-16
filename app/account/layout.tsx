import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Your Account',
  description: 'Manage your HairBudget orders, addresses, wishlist and account details.',
  path: '/account',
  noindex: true,
});

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
