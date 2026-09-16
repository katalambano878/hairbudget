import type { Metadata } from 'next';
import { buildMetadata, jsonLdScript } from '@/lib/seo';
import { faqPageJsonLd } from '@/lib/faqs';

export const metadata: Metadata = buildMetadata({
  title: 'Frequently Asked Questions',
  description:
    'Answers to the most common questions about HairBudget — orders, payments, delivery, returns, wig care and styling.',
  path: '/faqs',
  keywords: ['wig FAQ', 'HairBudget questions', 'how to order wigs', 'wig care FAQ'],
});

export default function FaqsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script {...jsonLdScript(faqPageJsonLd())} />
      {children}
    </>
  );
}
