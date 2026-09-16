import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Us',
  description:
    'Talk to the HairBudget team about an order, a styling question, partnerships or anything else. We typically reply within one business day.',
  path: '/contact',
  keywords: ['contact HairBudget', 'wig customer service', 'wig support Ghana'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
