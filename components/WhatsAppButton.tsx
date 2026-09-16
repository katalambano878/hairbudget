'use client';

import { BRAND, whatsappHref } from '@/lib/brand';

export default function WhatsAppButton({
  className = '',
  label = 'Chat on WhatsApp',
  compact = false,
}: {
  className?: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp HairBudget at ${BRAND.contact.whatsappDisplay}`}
      className={`inline-flex items-center justify-center gap-2 bg-brand-forest text-brand-ivory hover:bg-brand-deep transition-colors ${
        compact
          ? 'w-14 h-14 rounded-full shadow-xl'
          : 'px-6 py-3 rounded-full text-xs font-black tracking-[0.2em] uppercase'
      } ${className}`}
    >
      <i className={`ri-whatsapp-line ${compact ? 'text-2xl' : 'text-lg'}`} />
      {!compact && <span>{label}</span>}
    </a>
  );
}

export function WhatsAppFloat() {
  return (
    <a
      href={whatsappHref()}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`WhatsApp HairBudget at ${BRAND.contact.whatsappDisplay}`}
      className="fixed bottom-24 right-5 z-50 lg:bottom-6 w-14 h-14 rounded-full bg-brand-forest text-brand-ivory shadow-2xl flex items-center justify-center hover:bg-brand-deep hover:scale-110 transition-transform"
    >
      <i className="ri-whatsapp-line text-2xl" />
    </a>
  );
}
