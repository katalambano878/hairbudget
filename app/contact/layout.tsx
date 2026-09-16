import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'Contact Us',
  description:
    'Visit HairBudget at 1 Kwei-Fio St, Adenta, WhatsApp 054 295 0338, or email info@hairbudgetgh.com. Pickup and delivery available.',
  path: '/contact',
  keywords: ['contact HairBudget', 'HairBudget WhatsApp', 'hair shop Adenta'],
});

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
