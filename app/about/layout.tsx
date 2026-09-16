import type { Metadata } from 'next';
import { buildMetadata } from '@/lib/seo';

export const metadata: Metadata = buildMetadata({
  title: 'About HairBudget',
  description:
    'HairBudget was founded in 2017 to make high-quality women’s hair accessible without excessive pricing. Confidence in every strand.',
  path: '/about',
  keywords: ['about HairBudget', 'Hair Budget GH', 'hair shop Adenta', 'wholesale hair Ghana'],
});

export default function AboutLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
