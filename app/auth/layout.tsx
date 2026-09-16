import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Account Access',
  description: 'Sign in to your HairBudget account or create one to start shopping.',
  path: '/auth',
  noindex: true,
});

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
