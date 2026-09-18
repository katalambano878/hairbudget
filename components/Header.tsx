'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import MiniCart from './MiniCart';
import { useCart } from '@/context/CartContext';
import { supabase } from '@/lib/supabase';
import { useCMS } from '@/context/CMSContext';
import { useStorePricing } from '@/context/StorePricingContext';
import { resolveProductPrice } from '@/lib/pricing';
import { useDebouncedValue } from '@/components/useDebouncedValue';
import type { StorefrontSearchHit } from '@/lib/storefront-search-types';
import BrandLogo from '@/components/BrandLogo';
import { BRAND, whatsappHref } from '@/lib/brand';

const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

const RAIL_ITEMS = [
  { icon: 'ri-map-pin-2-line', text: '1 Kwei-Fio St, Adenta' },
  { icon: 'ri-truck-line', text: 'Pickup & Delivery Nationwide' },
  { icon: 'ri-store-2-line', text: 'Retail + Wholesale' },
  { icon: 'ri-award-line', text: 'Trusted Since 2017' },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [progress, setProgress] = useState(0);
  const lastScrollY = useRef(0);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchHits, setSearchHits] = useState<StorefrontSearchHit[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const debouncedSearch = useDebouncedValue(searchQuery, 280);

  const { salesActive } = useStorePricing();
  const [wishlistCount, setWishlistCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const { cartCount, isCartOpen, setIsCartOpen } = useCart();
  const { getSetting } = useCMS();

  const siteName = getSetting('site_name') || BRAND.name;

  // Scroll: elevation, auto-hide, read progress
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 24);
      setHidden(y > lastScrollY.current && y > 140);
      lastScrollY.current = y;

      const track = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(track > 0 ? Math.min(1, y / track) : 0);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Lock body scroll while an overlay is open
  useEffect(() => {
    const locked = isMobileMenuOpen || isSearchOpen;
    document.body.style.overflow = locked ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isMobileMenuOpen, isSearchOpen]);

  // Wishlist + auth
  useEffect(() => {
    const update = () =>
      setWishlistCount(JSON.parse(localStorage.getItem('wishlist') || '[]').length);
    update();
    window.addEventListener('wishlistUpdated', update);
    supabase.auth.getSession().then(({ data: { session } }) => setUser(session?.user ?? null));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => { window.removeEventListener('wishlistUpdated', update); subscription.unsubscribe(); };
  }, []);

  // Search fetch
  useEffect(() => {
    if (!isSearchOpen) return;
    const q = debouncedSearch.trim();
    if (!q) { setSearchHits([]); setSearchLoading(false); return; }
    const ac = new AbortController();
    setSearchLoading(true);
    fetch(`/api/storefront/search?q=${encodeURIComponent(q)}&limit=12`, { signal: ac.signal })
      .then(r => r.ok ? r.json() : [])
      .then(d => { if (!ac.signal.aborted) setSearchHits(Array.isArray(d) ? d : []); })
      .catch(() => { if (!ac.signal.aborted) setSearchHits([]); })
      .finally(() => { if (!ac.signal.aborted) setSearchLoading(false); });
    return () => ac.abort();
  }, [debouncedSearch, isSearchOpen]);

  const closeSearch = useCallback(() => {
    setIsSearchOpen(false); setSearchQuery(''); setSearchHits([]); setSearchLoading(false);
  }, []);

  // Esc closes overlays
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      closeSearch();
      setIsMobileMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [closeSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/shop?search=${encodeURIComponent(searchQuery)}`;
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  const iconButton =
    'relative grid place-items-center w-10 h-10 rounded-full border border-brand-forest/12 text-brand-forest bg-white/70 hover:bg-brand-forest hover:text-brand-ivory hover:border-brand-forest transition-all duration-300';

  const badge =
    'absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 grid place-items-center rounded-full bg-brand-gold text-brand-deep text-[10px] font-black leading-none ring-2 ring-white';

  return (
    <>
      {/* ─── HEADER ──────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        }`}
      >
        {/* ── Tier 1: forest utility rail ── */}
        <div
          className={`bg-brand-deep text-brand-cream overflow-hidden transition-all duration-500 ${
            scrolled ? 'max-h-0 opacity-0' : 'max-h-12 opacity-100'
          }`}
        >
          <div className="safe-area-top" />
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10">
            <div className="h-9 flex items-center justify-between gap-6">

              {/* Marquee of trust points */}
              <div className="flex-1 min-w-0 overflow-hidden">
                <div className="flex w-max animate-marquee lg:animate-none">
                  {[0, 1].map(dup => (
                    <div key={dup} className="flex items-center lg:w-auto" aria-hidden={dup === 1}>
                      {RAIL_ITEMS.map(({ icon, text }) => (
                        <span
                          key={`${dup}-${text}`}
                          className="flex items-center gap-2 px-5 lg:px-0 lg:pr-7 text-[10px] tracking-[0.22em] uppercase font-semibold whitespace-nowrap"
                        >
                          <i className={`${icon} text-brand-gold text-[13px]`} />
                          {text}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Contact */}
              <div className="hidden md:flex items-center gap-5 flex-shrink-0">
                <a
                  href={`tel:${BRAND.contact.phoneTel}`}
                  className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-semibold text-brand-cream/85 hover:text-brand-ivory transition-colors"
                >
                  <i className="ri-phone-line text-brand-gold text-[13px]" />
                  {BRAND.contact.phoneDisplay}
                </a>
                <span className="w-px h-3 bg-brand-gold/30" />
                <a
                  href={whatsappHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-[10px] tracking-[0.22em] uppercase font-semibold text-brand-gold hover:text-brand-ivory transition-colors"
                >
                  <i className="ri-whatsapp-line text-[13px]" />
                  WhatsApp Us
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* ── Tier 2: main bar ── */}
        <div
          className={`relative transition-all duration-500 ${
            scrolled
              ? 'bg-white/92 backdrop-blur-xl shadow-[0_8px_30px_-12px_rgba(9,60,45,0.18)]'
              : 'bg-white'
          }`}
        >
          <nav aria-label="Main navigation" className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10">
            <div
              className={`flex items-center justify-between gap-4 transition-all duration-500 lg:grid lg:grid-cols-[1fr_auto_1fr] ${
                scrolled ? 'h-[62px]' : 'h-[76px]'
              }`}
            >

              {/* ── LEFT: logo ── */}
              <div className="flex items-center min-w-0">
                <BrandLogo
                  imgClassName={`w-auto transition-all duration-500 hover:opacity-75 ${
                    scrolled ? 'h-6 md:h-7' : 'h-7 md:h-9'
                  } max-w-[150px] sm:max-w-[200px]`}
                  priority
                />
              </div>

              {/* ── CENTER: capsule nav ── */}
              <div className="hidden lg:flex items-center justify-center">
                <div className="flex items-center gap-1 rounded-full border border-brand-forest/10 bg-brand-cream/45 p-1.5">
                  {NAV_LINKS.map(({ label, href }) => {
                    const active = isActive(href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={`relative px-5 py-2 rounded-full text-[11px] font-bold tracking-[0.24em] uppercase transition-all duration-300 ${
                          active
                            ? 'bg-brand-forest text-brand-ivory shadow-[0_6px_18px_-8px_rgba(12,69,52,0.8)]'
                            : 'text-brand-forest/65 hover:text-brand-forest hover:bg-white'
                        }`}
                      >
                        {label}
                        {active && (
                          <span className="absolute left-1/2 -translate-x-1/2 bottom-1 w-3 h-[2px] rounded-full bg-brand-gold" />
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* ── RIGHT: actions ── */}
              <div className="flex items-center justify-end gap-2">

                {/* WhatsApp CTA */}
                <a
                  href={whatsappHref()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hidden xl:inline-flex items-center gap-2 mr-1 pl-4 pr-5 h-10 rounded-full border border-brand-gold bg-brand-gold/12 text-brand-forest text-[10px] font-black tracking-[0.24em] uppercase hover:bg-brand-forest hover:text-brand-ivory hover:border-brand-forest transition-all duration-300"
                >
                  <i className="ri-whatsapp-line text-[15px]" />
                  Order
                </a>

                <button onClick={() => setIsSearchOpen(true)} aria-label="Search" className={iconButton}>
                  <i className="ri-search-line text-[17px]" />
                </button>

                <Link href="/wishlist" aria-label="Wishlist" className={`${iconButton} hidden sm:grid`}>
                  <i className="ri-heart-line text-[17px]" />
                  {wishlistCount > 0 && <span className={badge}>{wishlistCount > 9 ? '9+' : wishlistCount}</span>}
                </Link>

                <Link
                  href={user ? '/account' : '/auth/login'}
                  aria-label={user ? 'My Account' : 'Login'}
                  className={`${iconButton} hidden sm:grid ${user ? 'bg-brand-forest text-brand-ivory border-brand-forest' : ''}`}
                >
                  <i className={`${user ? 'ri-user-fill' : 'ri-user-line'} text-[17px]`} />
                </Link>

                <div className="relative">
                  <button onClick={() => setIsCartOpen(!isCartOpen)} aria-label="Shopping bag" className={iconButton}>
                    <i className="ri-shopping-bag-line text-[17px]" />
                    {cartCount > 0 && <span className={badge}>{cartCount > 9 ? '9+' : cartCount}</span>}
                  </button>
                  <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
                </div>

                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  aria-label="Open navigation"
                  className={`${iconButton} lg:hidden`}
                >
                  <i className="ri-menu-3-line text-[18px]" />
                </button>
              </div>

            </div>
          </nav>

          {/* Gold hairline + read progress */}
          <div className="relative h-[2px] bg-brand-cream/70">
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-brand-forest via-brand-gold to-brand-champagne transition-[width] duration-150 ease-out"
              style={{ width: `${Math.max(progress * 100, 0)}%` }}
            />
          </div>
        </div>
      </header>

      {/* ─── FULL-SCREEN SEARCH OVERLAY ─────────────── */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-28 sm:pt-32 px-4"
          style={{ animation: 'fadeIn 0.25s ease forwards' }}
        >
          <div className="absolute inset-0 bg-brand-deep/96 backdrop-blur-2xl" onClick={closeSearch} />

          <div
            className="relative w-full max-w-3xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease forwards' }}
          >
            <button
              onClick={closeSearch}
              className="absolute -top-16 right-0 flex items-center gap-2 text-brand-cream/60 hover:text-brand-ivory transition-colors duration-300 text-xs tracking-[0.2em] uppercase font-semibold"
            >
              Close <i className="ri-close-line text-xl" />
            </button>

            <form onSubmit={handleSearch} className="group relative">
              <div className="flex items-center gap-4">
                <i className="ri-search-line text-2xl text-brand-gold flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search wigs, bundles, braids…"
                  autoComplete="off"
                  className="flex-1 bg-transparent text-3xl sm:text-5xl text-brand-ivory placeholder-brand-cream/25 focus:outline-none font-serif tracking-wide py-4"
                />
              </div>
              <div className="relative h-px bg-brand-cream/15 mt-2">
                <div className="absolute inset-y-0 left-0 bg-brand-gold w-0 group-focus-within:w-full transition-all duration-500 ease-out" />
              </div>
            </form>

            {(searchHits.length > 0 || (searchLoading && searchQuery.trim()) || (!searchLoading && searchQuery.trim() && debouncedSearch.trim() && searchHits.length === 0)) && (
              <div className="mt-6 rounded-2xl overflow-hidden border border-brand-gold/20 bg-brand-forest/60 backdrop-blur-md shadow-2xl max-h-[50vh] overflow-y-auto">
                {searchLoading && searchQuery.trim() && (
                  <div className="p-6 flex items-center justify-center gap-3 text-brand-cream/70 text-sm">
                    <i className="ri-loader-4-line animate-spin text-xl" /> Finding products…
                  </div>
                )}
                {!searchLoading && searchQuery.trim() && debouncedSearch.trim() && searchHits.length === 0 && (
                  <div className="p-8 text-center text-brand-cream/60 text-sm">
                    No products found — try a different search.
                  </div>
                )}
                {searchHits.length > 0 && (
                  <ul className="divide-y divide-brand-gold/10">
                    {searchHits.map(p => {
                      const { effective, originalDisplay } = resolveProductPrice({
                        salesActive, price: Number(p.price) || 0, salePrice: p.sale_price, compareAtPrice: p.compare_at_price,
                      });
                      return (
                        <li key={p.id}>
                          <Link
                            href={`/product/${encodeURIComponent(p.slug)}`}
                            onClick={closeSearch}
                            className="flex items-center gap-4 p-4 hover:bg-brand-gold/10 transition-colors"
                          >
                            <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-brand-deep">
                              <img src={p.image || '/logo.png'} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-brand-ivory font-medium text-sm leading-snug line-clamp-2">{p.name}</p>
                              {p.categoryName && <p className="text-brand-cream/55 text-xs mt-0.5">{p.categoryName}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-brand-gold font-semibold text-sm">GH₵{effective.toFixed(2)}</p>
                              {originalDisplay != null && originalDisplay > effective && (
                                <p className="text-brand-cream/40 text-xs line-through">GH₵{originalDisplay.toFixed(2)}</p>
                              )}
                            </div>
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}

            {!searchQuery.trim() && (
              <p className="mt-8 text-brand-cream/40 text-xs tracking-[0.3em] uppercase text-center">
                Start typing to search our store
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── FULL-SCREEN MOBILE MENU ─────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden flex">
          <div className="absolute inset-0 bg-brand-deep" style={{ animation: 'fadeIn 0.3s ease forwards' }} />

          <div className="relative w-full flex flex-col" style={{ animation: 'slideUp 0.35s ease forwards' }}>
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <BrandLogo onDark imgClassName="h-8 w-auto max-w-[180px]" />
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 grid place-items-center rounded-full border border-brand-gold/40 text-brand-cream hover:bg-brand-gold hover:text-brand-deep transition-all"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            <div className="h-px bg-brand-gold/25 mx-6" />

            <nav className="flex-1 px-6 py-8 flex flex-col justify-center gap-1 overflow-y-auto">
              {[{ label: 'Home', href: '/' }, ...NAV_LINKS].map(({ label, href }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center justify-between py-4 border-b border-brand-gold/12 transition-colors duration-200 ${
                      active ? 'text-brand-gold' : 'text-brand-cream/75 hover:text-brand-ivory'
                    }`}
                  >
                    <span className="font-serif text-4xl sm:text-5xl tracking-tight leading-none">{label}</span>
                    <i className="ri-arrow-right-up-line text-xl transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1" />
                  </Link>
                );
              })}

              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-8">
                {[
                  { label: 'Track Order', href: '/order-tracking' },
                  { label: 'Wishlist', href: '/wishlist' },
                  { label: user ? 'My Account' : 'Login', href: user ? '/account' : '/auth/login' },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-brand-cream/55 hover:text-brand-gold text-xs tracking-[0.25em] uppercase font-semibold transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="px-6 pb-10 space-y-5">
              <a
                href={whatsappHref()}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full h-14 rounded-full bg-brand-gold text-brand-deep text-[11px] font-black tracking-[0.28em] uppercase"
              >
                <i className="ri-whatsapp-line text-lg" />
                Order on WhatsApp
              </a>
              <div className="flex items-center justify-between text-brand-cream/45 text-[10px] tracking-[0.25em] uppercase">
                <span>{siteName}</span>
                <a href={`tel:${BRAND.contact.phoneTel}`} className="hover:text-brand-gold transition-colors">
                  {BRAND.contact.phoneDisplay}
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
