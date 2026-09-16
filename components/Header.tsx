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

const NAV_LINKS = [
  { label: 'Shop', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Header() {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
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

  const siteName = getSetting('site_name') || 'HairBudget';
  const headerLogo = getSetting('site_logo') || '/logo.png';

  // Scroll: elevation + auto-hide
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      if (y > lastScrollY.current && y > 100) {
        setHidden(true);
      } else {
        setHidden(false);
      }
      lastScrollY.current = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) window.location.href = `/shop?search=${encodeURIComponent(searchQuery)}`;
  };

  const isActive = (href: string) =>
    href === '/' ? pathname === '/' : pathname?.startsWith(href);

  return (
    <>
      {/* ─── HEADER ──────────────────────────────────── */}
      <header
        className={`sticky top-0 z-50 transition-all duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
          hidden ? '-translate-y-full' : 'translate-y-0'
        } ${
          scrolled
            ? 'bg-white shadow-[0_1px_0_0_rgba(0,0,0,0.06),0_4px_24px_-4px_rgba(0,0,0,0.08)]'
            : 'bg-white'
        }`}
      >
        {/* Brand accent — ultra-thin violet gradient strip */}
        <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70" />

        <div className="safe-area-top" />

        <nav
          aria-label="Main navigation"
          className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-10"
        >
          <div className="h-[66px] flex items-center justify-between lg:grid lg:grid-cols-[1fr_auto_1fr]">

            {/* ── LEFT: Logo ── */}
            <div className="flex items-center">
              <Link href="/" aria-label={siteName}>
                <img
                  src={headerLogo}
                  alt={siteName}
                  className="h-11 md:h-12 w-auto max-w-[180px] sm:max-w-[220px] object-contain object-left transition-opacity duration-300 hover:opacity-80"
                />
              </Link>
            </div>

            {/* ── CENTER: Desktop nav ── */}
            <div className="hidden lg:flex items-center">
              {/* thin left rule */}
              <span className="w-px h-4 bg-slate-200 mr-8" />

              {NAV_LINKS.map(({ label, href }) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`group relative px-5 py-2 overflow-hidden text-[11px] font-bold tracking-[0.28em] uppercase transition-colors duration-200 ${
                      active ? 'text-slate-900' : 'text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {/* Text flip on hover */}
                    <span className="relative block overflow-hidden h-[1.1em]">
                      <span
                        className="block transition-transform duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-full"
                        aria-hidden={!active}
                      >
                        {label}
                      </span>
                      <span
                        className="absolute inset-0 translate-y-full transition-transform duration-300 ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:translate-y-0 text-slate-900 font-black"
                      >
                        {label}
                      </span>
                    </span>

                    {/* Active dot */}
                    {active && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-blue-500" />
                    )}
                  </Link>
                );
              })}

              {/* thin right rule */}
              <span className="w-px h-4 bg-slate-200 ml-8" />
            </div>

            {/* ── RIGHT: Icons ── */}
            <div className="flex items-center justify-end gap-1 sm:gap-0.5">

              {/* Search */}
              <button
                onClick={() => setIsSearchOpen(true)}
                aria-label="Search"
                className="group p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
              >
                <i className="ri-search-line text-[17px]" />
              </button>

              {/* Wishlist */}
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="group relative p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 hidden sm:flex"
              >
                <i className="ri-heart-line text-[17px]" />
                {wishlistCount > 0 && (
                  <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500 ring-1 ring-white" />
                )}
              </Link>

              {/* Account */}
              <Link
                href={user ? '/account' : '/auth/login'}
                aria-label={user ? 'My Account' : 'Login'}
                className="group p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200 hidden sm:flex"
              >
                <i className={`${user ? 'ri-user-fill text-blue-600' : 'ri-user-line'} text-[17px]`} />
              </Link>

              {/* Cart */}
              <div className="relative">
                <button
                  onClick={() => setIsCartOpen(!isCartOpen)}
                  aria-label="Shopping bag"
                  className="group relative p-2.5 rounded-xl text-slate-400 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
                >
                  <i className="ri-shopping-bag-line text-[17px]" />
                  {cartCount > 0 && (
                    <span className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-500 ring-1 ring-white" />
                  )}
                </button>
                <MiniCart isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
              </div>

              {/* Mobile burger */}
              <button
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open navigation"
                className="lg:hidden ml-1 p-2.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition-all duration-200"
              >
                <i className="ri-menu-3-line text-[18px]" />
              </button>
            </div>

          </div>
        </nav>
      </header>

      {/* ─── FULL-SCREEN SEARCH OVERLAY ─────────────── */}
      {isSearchOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-start justify-center pt-28 sm:pt-32 px-4"
          style={{ animation: 'fadeIn 0.25s ease forwards' }}
        >
          <div
            className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl"
            onClick={closeSearch}
          />

          <div
            className="relative w-full max-w-3xl"
            onClick={e => e.stopPropagation()}
            style={{ animation: 'slideUp 0.3s ease forwards' }}
          >
            {/* Close */}
            <button
              onClick={closeSearch}
              className="absolute -top-16 right-0 flex items-center gap-2 text-slate-500 hover:text-white transition-colors duration-300 text-xs tracking-[0.2em] uppercase font-semibold"
            >
              Close <i className="ri-close-line text-xl" />
            </button>

            {/* Search input */}
            <form onSubmit={handleSearch} className="group relative">
              <div className="flex items-center gap-4">
                <i className="ri-search-line text-2xl text-slate-600 group-focus-within:text-white transition-colors duration-400 flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search products…"
                  autoComplete="off"
                  className="flex-1 bg-transparent text-3xl sm:text-5xl text-white placeholder-slate-700 focus:outline-none font-serif tracking-wide py-4"
                />
              </div>
              {/* Animated underline */}
              <div className="relative h-px bg-slate-800 mt-2">
                <div className="absolute inset-y-0 left-0 bg-white w-0 group-focus-within:w-full transition-all duration-600 ease-out" />
              </div>
            </form>

            {/* Results */}
            {(searchHits.length > 0 || (searchLoading && searchQuery.trim()) || (!searchLoading && searchQuery.trim() && debouncedSearch.trim() && searchHits.length === 0)) && (
              <div className="mt-6 rounded-2xl overflow-hidden border border-white/8 bg-slate-900/70 backdrop-blur-md shadow-2xl max-h-[50vh] overflow-y-auto">
                {searchLoading && searchQuery.trim() && (
                  <div className="p-6 flex items-center justify-center gap-3 text-slate-500 text-sm">
                    <i className="ri-loader-4-line animate-spin text-xl" /> Finding products…
                  </div>
                )}
                {!searchLoading && searchQuery.trim() && debouncedSearch.trim() && searchHits.length === 0 && (
                  <div className="p-8 text-center text-slate-600 text-sm">No products found — try a different search.</div>
                )}
                {searchHits.length > 0 && (
                  <ul className="divide-y divide-white/5">
                    {searchHits.map(p => {
                      const { effective, originalDisplay } = resolveProductPrice({
                        salesActive, price: Number(p.price) || 0, salePrice: p.sale_price, compareAtPrice: p.compare_at_price,
                      });
                      return (
                        <li key={p.id}>
                          <Link
                            href={`/product/${encodeURIComponent(p.slug)}`}
                            onClick={closeSearch}
                            className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
                          >
                            <div className="w-14 h-14 flex-shrink-0 rounded-xl overflow-hidden bg-slate-800">
                              <img src={p.image || '/logo.png'} alt="" className="w-full h-full object-cover" loading="lazy" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm leading-snug line-clamp-2">{p.name}</p>
                              {p.categoryName && <p className="text-slate-500 text-xs mt-0.5">{p.categoryName}</p>}
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-white font-semibold text-sm">GH₵{effective.toFixed(2)}</p>
                              {originalDisplay != null && originalDisplay > effective && (
                                <p className="text-slate-600 text-xs line-through">GH₵{originalDisplay.toFixed(2)}</p>
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
              <p className="mt-8 text-slate-700 text-xs tracking-[0.3em] uppercase text-center">
                Start typing to search our store
              </p>
            )}
          </div>
        </div>
      )}

      {/* ─── FULL-SCREEN MOBILE MENU ─────────────────── */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[200] lg:hidden flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-950"
            style={{ animation: 'fadeIn 0.3s ease forwards' }}
          />

          <div
            className="relative w-full flex flex-col"
            style={{ animation: 'slideUp 0.35s ease forwards' }}
          >
            {/* Top bar */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4">
              <Link href="/" onClick={() => setIsMobileMenuOpen(false)}>
                <img
                  src={headerLogo}
                  alt={siteName}
                  className="h-11 w-auto max-w-[200px] object-contain object-left"
                />
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all"
                aria-label="Close menu"
              >
                <i className="ri-close-line text-xl" />
              </button>
            </div>

            {/* Thin divider */}
            <div className="h-px bg-slate-800 mx-6" />

            {/* Nav links — large, editorial */}
            <nav className="flex-1 px-6 py-8 flex flex-col justify-center gap-1">
              {[
                { label: 'Home', href: '/' },
                ...NAV_LINKS,
              ].map(({ label, href }, i) => {
                const active = isActive(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className={`group flex items-center justify-between py-4 border-b border-slate-800/60 transition-all duration-200 ${
                      active ? 'text-white' : 'text-slate-500 hover:text-white'
                    }`}
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <span className="font-serif text-4xl sm:text-5xl tracking-tight leading-none">
                      {label}
                    </span>
                    <i className={`ri-arrow-right-up-line text-xl transition-all duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 ${active ? 'text-blue-400' : 'text-slate-700 group-hover:text-slate-300'}`} />
                  </Link>
                );
              })}

              {/* Sub-links */}
              <div className="flex flex-wrap gap-x-6 gap-y-2 mt-6">
                {[
                  { label: 'Track Order', href: '/order-tracking' },
                  { label: 'Wishlist', href: '/wishlist' },
                  { label: user ? 'My Account' : 'Login', href: user ? '/account' : '/auth/login' },
                ].map(({ label, href }) => (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-slate-600 hover:text-slate-300 text-xs tracking-[0.25em] uppercase font-semibold transition-colors"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </nav>

            <div className="px-6 pb-10">
              <p className="text-slate-700 text-xs tracking-widest uppercase">
                {siteName}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
