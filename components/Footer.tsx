"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useCMS } from '@/context/CMSContext';
import { BRAND, whatsappHref } from '@/lib/brand';
import BrandLogo from '@/components/BrandLogo';

export default function Footer() {
  const { getSetting } = useCMS();
  const siteName = getSetting('site_name') || BRAND.name;
  const siteTagline = getSetting('site_tagline') || BRAND.tagline;

  const [showTop, setShowTop] = useState(false);
  const year = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 600);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  const COLS: { title: string; links: { href: string; label: string }[] }[] = [
    {
      title: 'Shop',
      links: [
        { href: '/shop', label: 'All Products' },
        { href: '/categories', label: 'Collections' },
        { href: '/shop?sort=new', label: 'New Arrivals' },
        { href: '/shop?sale=true', label: 'On Sale' },
      ],
    },
    {
      title: 'Help',
      links: [
        { href: '/contact', label: 'Contact' },
        { href: '/order-tracking', label: 'Track Order' },
        { href: '/pay', label: 'Pay Balance' },
        { href: '/shipping', label: 'Shipping' },
        { href: '/returns', label: 'Returns' },
      ],
    },
    {
      title: 'About',
      links: [
        { href: '/about', label: 'Our Story' },
        { href: '/blog', label: 'Journal' },
        { href: '/privacy', label: 'Privacy' },
        { href: '/terms', label: 'Terms' },
      ],
    },
  ];

  return (
    <footer className="relative mt-16 lg:mt-24 bg-brand-deep text-white overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-brand-gold/40 to-transparent" />
      <div className="absolute -bottom-20 right-[-10%] w-[380px] h-[380px] bg-brand-gold/[0.06] rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 sm:px-6 lg:px-8 pt-14 pb-8">
        {/* Top row: brand + link columns */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10 md:gap-8 pb-12">
          {/* Brand */}
          <div className="col-span-2 space-y-4">
            <BrandLogo
              onDark
              imgClassName="h-10 md:h-11 w-auto max-w-[220px]"
            />
            <p className="text-brand-gold text-sm leading-relaxed max-w-xs">{siteTagline}</p>
            <p className="text-[11px] font-black tracking-[0.35em] uppercase text-brand-gold/80">
              Est. {BRAND.foundedYear} · Adenta, Ghana
            </p>
            <div className="space-y-2 text-sm text-brand-cream/80">
              <a href={`tel:${BRAND.contact.phoneTel}`} className="flex items-center gap-2 hover:text-brand-ivory">
                <i className="ri-phone-line text-brand-gold" />
                {BRAND.contact.phoneDisplay}
              </a>
              <a href={whatsappHref()} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-brand-ivory">
                <i className="ri-whatsapp-line text-brand-gold" />
                WhatsApp {BRAND.contact.whatsappDisplay}
              </a>
              <a href={`mailto:${BRAND.contact.email}`} className="flex items-center gap-2 hover:text-brand-ivory">
                <i className="ri-mail-line text-brand-gold" />
                {BRAND.contact.email}
              </a>
              <p className="flex items-start gap-2">
                <i className="ri-map-pin-line text-brand-gold mt-0.5" />
                {BRAND.contact.store}
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <a href={BRAND.social.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="hover:text-brand-gold">
                <i className="ri-instagram-line text-lg" />
              </a>
              <a href={BRAND.social.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="hover:text-brand-gold">
                <i className="ri-tiktok-line text-lg" />
              </a>
              <a href={BRAND.social.snapchat} target="_blank" rel="noopener noreferrer" aria-label="Snapchat" className="hover:text-brand-gold">
                <i className="ri-snapchat-line text-lg" />
              </a>
            </div>
          </div>

          {/* Link columns */}
          {COLS.map((col) => (
            <div key={col.title}>
              <h4 className="font-black text-[11px] tracking-[0.3em] uppercase text-white mb-4">
                {col.title}
              </h4>
              <ul className="space-y-2.5 text-brand-cream/80 text-sm">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="group inline-flex items-center gap-2 hover:text-brand-ivory transition-colors"
                    >
                      <span className="w-0 h-px bg-brand-gold group-hover:w-3 transition-all duration-300" />
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom strip */}
        <div className="border-t border-brand-gold/20 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-brand-cream/70 text-xs">
            &copy; {year} <span className="text-brand-ivory font-semibold">{siteName}</span>. Powered By{' '}
            <a
              href="https://doctorbarns.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand-gold font-semibold hover:text-brand-ivory transition-colors underline-offset-2 hover:underline"
            >
              Doctor Barns Tech
            </a>
            .
          </p>

          <div className="flex items-center gap-4">
            <Link
              href="/admin/login"
              className="group inline-flex items-center gap-1.5 text-[10px] font-bold tracking-[0.25em] uppercase text-brand-cream/70 hover:text-brand-gold transition-colors"
            >
              <i className="ri-shield-user-line text-sm" />
              <span>Admin</span>
            </Link>

            <div className="hidden sm:block w-px h-4 bg-brand-gold/25" />

            <div className="flex items-center gap-2">
              {['ri-visa-line', 'ri-mastercard-line', 'ri-paypal-line', 'ri-smartphone-line'].map(
                (icon, i) => (
                  <div
                    key={i}
                    className="w-9 h-6 rounded-md bg-brand-forest/60 border border-brand-gold/25 flex items-center justify-center hover:border-brand-gold/60 transition-colors"
                  >
                    <i className={`${icon} text-brand-cream/80 text-sm`} />
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Back-to-top */}
      <button
        onClick={scrollToTop}
        aria-label="Back to top"
        className={`fixed bottom-24 right-24 z-40 lg:bottom-6 lg:right-24 w-11 h-11 rounded-full bg-brand-ivory text-brand-forest shadow-xl flex items-center justify-center transition-all duration-500 hover:bg-brand-gold hover:text-brand-ink hover:scale-110 ${
          showTop
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
      >
        <i className="ri-arrow-up-line text-lg" />
      </button>
    </footer>
  );
}
