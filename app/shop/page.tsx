'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { usePageTitle } from '@/hooks/usePageTitle';
import ProductCard, { type ColorVariant } from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton';
import { getColorHex } from '@/components/ProductCard';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/query-cache';
import { useStorePricing } from '@/context/StorePricingContext';
import { getProductCardPricing } from '@/lib/pricing';

const SORT_OPTIONS = [
  { value: 'popular',    label: 'Popular'    },
  { value: 'new',        label: 'Newest'     },
  { value: 'price-low',  label: 'Price ↑'   },
  { value: 'price-high', label: 'Price ↓'   },
  { value: 'rating',     label: 'Top Rated'  },
];

function paginationRange(current: number, total: number): (number | '…')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | '…')[] = [1];
  if (current > 3) pages.push('…');
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) pages.push(i);
  if (current < total - 2) pages.push('…');
  pages.push(total);
  return pages;
}

function ShopContent() {
  usePageTitle('Shop All Products');
  const searchParams = useSearchParams();
  const { salesActive } = useStorePricing();

  const [products,      setProducts]      = useState<any[]>([]);
  const [categories,    setCategories]    = useState<any[]>([{ id: 'all', name: 'All Products', count: 0 }]);
  const [loading,       setLoading]       = useState(true);
  const [totalProducts, setTotalProducts] = useState(0);

  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange,        setPriceRange]       = useState([0, 5000]);
  const [selectedRating,    setSelectedRating]   = useState(0);
  const [sortBy,            setSortBy]           = useState('popular');
  const [isFilterOpen,      setIsFilterOpen]     = useState(false);
  const [page,              setPage]             = useState(1);
  const productsPerPage = 9;

  const [heroStats, setHeroStats] = useState({ totalItems: 0, totalCategories: 0, minPrice: 0 });
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    let lastY = 0;
    const onScroll = () => {
      const y = window.scrollY;
      if (y > lastY && y > 100) setHeaderHidden(true);
      else setHeaderHidden(false);
      lastY = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    async function fetchHeroStats() {
      try {
        const [{ count: itemCount }, { count: catCount }, { data: minPriceData }] = await Promise.all([
          supabase.from('products').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('categories').select('*', { count: 'exact', head: true }).eq('status', 'active'),
          supabase.from('products').select('price').eq('status', 'active').order('price', { ascending: true }).limit(1),
        ]);
        setHeroStats({
          totalItems: itemCount || 0,
          totalCategories: catCount || 0,
          minPrice: minPriceData?.[0]?.price || 0,
        });
      } catch {}
    }
    fetchHeroStats();
  }, []);

  useEffect(() => {
    const category = searchParams.get('category');
    const sort     = searchParams.get('sort');
    if (category) setSelectedCategory(category);
    if (sort)     setSortBy(sort);
  }, [searchParams]);

  useEffect(() => {
    fetch('/api/storefront/categories')
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d) setCategories(d); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    async function fetchProducts() {
      setLoading(true);
      try {
        const search   = searchParams.get('search');
        const cacheKey = `shop:${selectedCategory}:${search || ''}:${priceRange.join('-')}:${selectedRating}:${sortBy}:${page}:sale:${salesActive}`;

        const { data, count, error } = await cachedQuery<{ data: any[] | null; count: number | null; error: any }>(
          cacheKey,
          async () => {
            let query = supabase
              .from('products')
              .select(`*, categories(name, slug), product_images(url, position), product_variants(id, name, price, sale_price, quantity, option1, option2, image_url)`, { count: 'exact' })
              .order('position', { foreignTable: 'product_images', ascending: true });

            if (search) query = query.ilike('name', `%${search}%`);

            if (selectedCategory !== 'all') {
              const categoryObj = categories.find((c: any) => c.slug === selectedCategory);
              if (categoryObj) {
                const targetSlugs = [selectedCategory];
                const childSlugs  = (categories as any[]).filter((c: any) => c.parent_id === categoryObj.id).map((c: any) => c.slug);
                targetSlugs.push(...childSlugs);
                query = query.in('categories.slug', targetSlugs);
              } else {
                query = query.eq('categories.slug', selectedCategory);
              }
            }

            if (priceRange[1] < 5000) query = query.gte('price', priceRange[0]).lte('price', priceRange[1]);
            if (selectedRating > 0)    query = query.gte('rating_avg', selectedRating);

            switch (sortBy) {
              case 'price-low':  query = query.order('price',      { ascending: true  }); break;
              case 'price-high': query = query.order('price',      { ascending: false }); break;
              case 'rating':     query = query.order('rating_avg', { ascending: false }); break;
              default:           query = query.order('created_at', { ascending: false }); break;
            }

            const from = (page - 1) * productsPerPage;
            query      = query.range(from, from + productsPerPage - 1);
            const result = await query;
            return { data: result.data, count: result.count, error: result.error };
          },
          2 * 60 * 1000
        );

        if (error) throw error;

        if (data) {
          const formatted = data.map((p: any) => {
            const variants          = p.product_variants || [];
            const hasVariants       = variants.length > 0;
            const pricing           = getProductCardPricing(p, salesActive);
            const totalVariantStock = hasVariants ? variants.reduce((s: number, v: any) => s + (v.quantity || 0), 0) : 0;
            const effectiveStock    = hasVariants ? totalVariantStock : p.quantity;

            const colorVariants: ColorVariant[] = [];
            const seenColors = new Set<string>();
            for (const v of variants) {
              const colorName = v.option2;
              if (colorName && !seenColors.has(colorName.toLowerCase().trim())) {
                const hex = getColorHex(colorName);
                if (hex) { seenColors.add(colorName.toLowerCase().trim()); colorVariants.push({ name: colorName.trim(), hex }); }
              }
            }

            return {
              id: p.id, slug: p.slug, name: p.name,
              price: pricing.price, originalPrice: pricing.originalPrice,
              image: p.product_images?.[0]?.url || 'https://via.placeholder.com/800x800?text=No+Image',
              rating: p.rating_avg || 0, reviewCount: 0,
              badge: pricing.saleBadge ? 'Sale' : undefined,
              inStock: effectiveStock > 0, maxStock: effectiveStock || 50,
              moq: p.moq || 1, category: p.categories?.name,
              hasVariants, minVariantPrice: pricing.minVariantPrice, colorVariants,
            };
          });
          setProducts(formatted);
          setTotalProducts(count || 0);
        }
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, [selectedCategory, priceRange, selectedRating, sortBy, page, searchParams, categories, salesActive]);

  const totalPages = Math.ceil(totalProducts / productsPerPage);
  const parentCats = categories.filter(c => !c.parent_id && c.id !== 'all');
  const searchTerm = searchParams.get('search');

  const activeFilters: { label: string; onClear: () => void }[] = [];
  if (selectedCategory !== 'all') {
    const cat = categories.find(c => c.slug === selectedCategory);
    if (cat) activeFilters.push({ label: cat.name, onClear: () => { setSelectedCategory('all'); setPage(1); } });
  }
  if (priceRange[1] < 5000) activeFilters.push({ label: `up to GH₵${priceRange[1]}`, onClear: () => { setPriceRange([0, 5000]); setPage(1); } });
  if (selectedRating > 0)   activeFilters.push({ label: `${selectedRating}★ & up`,    onClear: () => { setSelectedRating(0); setPage(1); } });
  if (searchTerm)           activeFilters.push({ label: `"${searchTerm}"`,              onClear: () => {} });

  const clearAll = () => { setSelectedCategory('all'); setPriceRange([0, 5000]); setSelectedRating(0); setPage(1); };

  return (
    <main className="min-h-screen bg-white">

      {/* ── SHOP HERO ───────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-slate-950">

        {/* Background image */}
        <Image
          src="/hero_trio.jpg"
          alt="Shop hero background"
          fill
          className="object-cover object-top"
          priority
          sizes="100vw"
          quality={82}
        />

        {/* Dark overlay — keeps text crisp */}
        <div className="absolute inset-0 bg-slate-950/80 z-0" />

        {/* Subtle top accent line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-400/30 to-transparent z-20" />

        {/* Film grain texture */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none z-10"
          style={{
            backgroundImage:
              'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
          }}
        />

        {/* Ghost decorative letter */}
        <div
          aria-hidden="true"
          className="absolute -right-8 -top-6 leading-none pointer-events-none select-none font-serif italic text-white/[0.02]"
          style={{ fontSize: 'clamp(10rem, 28vw, 22rem)' }}
        >
          S
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12">

          {/* Top row: eyebrow + breadcrumb */}
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-px bg-blue-400/60" />
              <span className="text-blue-400/80 text-[9px] font-black tracking-[0.5em] uppercase">
                Shop All
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-2 text-[10px] tracking-widest uppercase text-slate-600">
              <span className="hover:text-slate-400 transition-colors cursor-pointer">Home</span>
              <i className="ri-arrow-right-s-line text-slate-700 text-xs" />
              <span className="text-slate-400">Shop</span>
            </div>
          </div>

          {/* Main heading + description row */}
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 lg:gap-16">
            <div className="max-w-xl">
              <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-white leading-[1.08] tracking-tight">
                Everything You{' '}
                <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-blue-500">
                  Need
                </span>
              </h1>
              <p className="text-slate-500 text-sm md:text-base font-light leading-relaxed mt-5 max-w-md">
                Wigs, bundles, closures &amp; hair care essentials — all curated and priced for you.
              </p>
            </div>

            {/* Stats — hidden on mobile, visible from sm and up */}
            <div className="hidden sm:flex items-center gap-8 lg:gap-10 lg:pb-1.5">
              {[
                { value: heroStats.totalItems > 0 ? `${heroStats.totalItems}+` : '—', label: 'Items' },
                { value: heroStats.totalCategories > 0 ? `${heroStats.totalCategories}+` : '—', label: 'Styles' },
                { value: heroStats.minPrice > 0 ? `GH₵${heroStats.minPrice}` : '—', label: 'From' },
              ].map((s, i) => (
                <div key={s.label} className="flex items-center gap-8">
                  <div>
                    <div className="text-2xl font-bold text-white tracking-tight font-serif">{s.value}</div>
                    <div className="text-[9px] font-bold tracking-[0.3em] uppercase text-slate-600 mt-0.5">{s.label}</div>
                  </div>
                  {i < 2 && <div className="w-px h-8 bg-slate-800 hidden sm:block" />}
                </div>
              ))}
            </div>
          </div>


        </div>

        {/* Bottom border glow */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />
      </section>

      {/* ── MOBILE TOOLBAR (sticky) ────────────────────────────── */}
      <div className={`lg:hidden fixed left-0 right-0 z-30 bg-white border-b border-slate-100 shadow-sm transition-[top] duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${headerHidden ? 'top-0' : 'top-[68px]'}`}>
        <div className="flex items-center justify-between px-4 h-12">
          <button
            onClick={() => setIsFilterOpen(true)}
            className="flex items-center gap-2 text-slate-700 hover:text-slate-900 transition-colors"
          >
            <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-slate-100">
              <i className="ri-equalizer-2-line text-sm" />
            </span>
            <span className="text-xs font-bold tracking-[0.2em] uppercase">Filters</span>
            {activeFilters.length > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-slate-900 text-white text-[9px] font-black">
                {activeFilters.length}
              </span>
            )}
          </button>

          <div className="flex items-center gap-2">
            <span className="text-[10px] tracking-widest uppercase text-slate-400 font-medium">
              {loading ? '—' : `${totalProducts} items`}
            </span>
            <select
              value={sortBy}
              onChange={e => { setSortBy(e.target.value); setPage(1); }}
              className="text-[10px] font-bold uppercase tracking-wider border border-slate-200 rounded-lg px-2 py-1.5 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Active filter chips */}
        {activeFilters.length > 0 && (
          <div className="flex items-center gap-2 px-4 pb-2.5 overflow-x-auto scrollbar-hide">
            {activeFilters.map((f, i) => (
              <button
                key={i}
                onClick={f.onClear}
                className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-900 text-white text-[9px] font-bold tracking-wider uppercase"
              >
                {f.label} <i className="ri-close-line text-[10px]" />
              </button>
            ))}
            <button onClick={clearAll} className="flex-shrink-0 text-[9px] font-bold tracking-wider uppercase text-slate-400 underline underline-offset-2">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── MAIN LAYOUT ───────────────────────────────────────── */}
      <section className="pt-14 pb-10 lg:pt-14 lg:pb-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">

            {/* ════════════════════════════════════════
                SIDEBAR
            ════════════════════════════════════════ */}
            <aside className={`
              ${isFilterOpen
                ? 'fixed inset-0 z-50 overflow-y-auto bg-white'
                : 'hidden'}
              lg:block lg:w-64 xl:w-72 lg:flex-shrink-0
            `}>
              <div className="lg:sticky lg:top-28">
                <div className="p-5 lg:p-0">

                  {/* Mobile sidebar header */}
                  <div className="flex items-center justify-between mb-7 lg:hidden">
                    <div>
                      <h2 className="font-serif text-2xl text-slate-900">Refine</h2>
                      <p className="text-[10px] tracking-[0.3em] uppercase text-slate-400 mt-0.5">
                        {loading ? '—' : `${totalProducts} products`}
                      </p>
                    </div>
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                    >
                      <i className="ri-close-line text-lg" />
                    </button>
                  </div>

                  {/* Desktop sidebar label */}
                  <div className="hidden lg:flex items-center justify-between mb-7">
                    <p className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-400">Refine Results</p>
                    {activeFilters.length > 0 && (
                      <button
                        onClick={clearAll}
                        className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-400 hover:text-slate-700 transition-colors underline underline-offset-2"
                      >
                        Reset
                      </button>
                    )}
                  </div>

                  <div className="space-y-0 divide-y divide-slate-100">

                    {/* ── CATEGORIES ──────────────────── */}
                    <div className="pb-6">
                      <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-300 mb-3">Category</p>

                      {/* All */}
                      <button
                        onClick={() => { setSelectedCategory('all'); setPage(1); setIsFilterOpen(false); }}
                        className={`group w-full flex items-center justify-between py-2 pl-3 transition-all duration-150 border-l-2 ${
                          selectedCategory === 'all'
                            ? 'border-slate-900 text-slate-900 font-semibold'
                            : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                        }`}
                      >
                        <span className="text-sm">All Products</span>
                        <span className={`text-xs ${selectedCategory === 'all' ? 'text-slate-400' : 'text-slate-300'}`}>
                          {loading ? '' : totalProducts}
                        </span>
                      </button>

                      {/* Parent categories */}
                      {parentCats.map(parent => {
                        const children  = categories.filter(c => c.parent_id === parent.id);
                        const isActive  = selectedCategory === parent.slug;
                        const childActive = children.some(c => c.slug === selectedCategory);

                        return (
                          <div key={parent.id}>
                            <button
                              onClick={() => { setSelectedCategory(parent.slug); setPage(1); }}
                              className={`group w-full flex items-center justify-between py-2 pl-3 transition-all duration-150 border-l-2 ${
                                isActive
                                  ? 'border-slate-900 text-slate-900 font-semibold'
                                  : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                              }`}
                            >
                              <span className="text-sm">{parent.name}</span>
                              {children.length > 0 && (
                                <i className={`text-xs transition-transform duration-200 ${isActive || childActive ? 'ri-subtract-line text-slate-400' : 'ri-add-line text-slate-300 group-hover:text-slate-400'}`} />
                              )}
                            </button>

                            {/* Children — show when parent or child is active */}
                            {children.length > 0 && (isActive || childActive) && (
                              <div className="ml-3 pl-3 border-l border-slate-100 mb-1">
                                {children.map(child => (
                                  <button
                                    key={child.id}
                                    onClick={() => { setSelectedCategory(child.slug); setPage(1); setIsFilterOpen(false); }}
                                    className={`w-full flex items-center justify-between py-1.5 pl-2 text-xs transition-all border-l-2 ${
                                      selectedCategory === child.slug
                                        ? 'border-slate-600 text-slate-900 font-semibold'
                                        : 'border-transparent text-slate-400 hover:text-slate-700 hover:border-slate-200'
                                    }`}
                                  >
                                    <span>{child.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── PRICE ───────────────────────── */}
                    <div className="py-6">
                      <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-300 mb-4">Price Range</p>

                      {/* Price display */}
                      <div className="flex items-end justify-between mb-3">
                        <div>
                          <p className="text-[9px] text-slate-300 uppercase tracking-widest mb-0.5">Max</p>
                          <p className={`text-2xl font-light leading-none transition-colors ${priceRange[1] < 5000 ? 'text-slate-900' : 'text-slate-300'}`}>
                            GH₵<span className="font-semibold">{priceRange[1] < 5000 ? priceRange[1].toLocaleString() : '5,000'}</span>
                            {priceRange[1] >= 5000 && <span className="text-base">+</span>}
                          </p>
                        </div>
                        {priceRange[1] < 5000 && (
                          <button
                            onClick={() => { setPriceRange([0, 5000]); setPage(1); }}
                            className="text-[9px] font-bold tracking-[0.2em] uppercase text-slate-300 hover:text-slate-600 transition-colors"
                          >
                            Reset
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <div className="h-px bg-slate-200 absolute top-1/2 left-0 right-0" />
                        <input
                          type="range"
                          min="0" max="5000" step="50"
                          value={priceRange[1]}
                          onChange={e => { setPriceRange([0, parseInt(e.target.value)]); setPage(1); }}
                          className="relative w-full h-px appearance-none cursor-pointer bg-transparent accent-slate-900"
                          style={{ WebkitAppearance: 'none' }}
                        />
                      </div>

                      <div className="flex justify-between text-[9px] text-slate-300 uppercase tracking-widest mt-2">
                        <span>GH₵0</span>
                        <span>GH₵5,000+</span>
                      </div>
                    </div>

                    {/* ── RATING ──────────────────────── */}
                    <div className="py-6">
                      <p className="text-[9px] font-black tracking-[0.4em] uppercase text-slate-300 mb-3">Customer Rating</p>
                      <div className="space-y-1">
                        {[4, 3, 2, 1].map(r => (
                          <button
                            key={r}
                            onClick={() => { setSelectedRating(r === selectedRating ? 0 : r); setPage(1); }}
                            className={`group w-full flex items-center gap-3 py-2.5 px-3 rounded-xl transition-all duration-150 ${
                              selectedRating === r
                                ? 'bg-slate-900 text-white'
                                : 'hover:bg-slate-50 text-slate-600'
                            }`}
                          >
                            <div className="flex items-center gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <i
                                  key={s}
                                  className={`text-xs ${
                                    s <= r
                                      ? selectedRating === r ? 'ri-star-fill text-blue-300' : 'ri-star-fill text-blue-400'
                                      : selectedRating === r ? 'ri-star-line text-slate-600' : 'ri-star-line text-slate-200'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className={`text-xs font-medium ${selectedRating === r ? 'text-slate-300' : 'text-slate-400'}`}>
                              & up
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* ── APPLY (mobile: show results / desktop: hidden) ── */}
                  <div className="mt-6 space-y-2">
                    <button
                      onClick={() => setIsFilterOpen(false)}
                      className="w-full bg-slate-900 hover:bg-slate-700 text-white py-3.5 rounded-xl font-bold text-xs tracking-[0.25em] uppercase transition-colors"
                    >
                      {loading ? 'Loading…' : `Show ${totalProducts} Results`}
                    </button>
                    {activeFilters.length > 0 && (
                      <button
                        onClick={() => { clearAll(); setIsFilterOpen(false); }}
                        className="w-full text-center text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 hover:text-slate-700 transition-colors py-1"
                      >
                        Clear all filters
                      </button>
                    )}
                  </div>

                </div>
              </div>
            </aside>

            {/* ════════════════════════════════════════
                PRODUCT AREA
            ════════════════════════════════════════ */}
            <div className="flex-1 min-w-0">

              {/* ── Sort & count bar ────────────────── */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-6 border-b border-slate-100">

                <div className="flex items-center gap-3">
                  {loading ? (
                    <div className="flex items-center gap-2 text-slate-400">
                      <span className="w-3 h-3 rounded-full border border-slate-300 border-t-slate-600 animate-spin inline-block" />
                      <span className="text-sm">Loading…</span>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-500">
                      <span className="font-semibold text-slate-900">{products.length}</span>
                      <span className="text-slate-300 mx-1.5">/</span>
                      <span className="font-semibold text-slate-900">{totalProducts}</span>
                      <span className="ml-1.5">products</span>
                    </p>
                  )}

                  {/* Active filter chips (desktop) */}
                  {activeFilters.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
                      {activeFilters.map((f, i) => (
                        <button
                          key={i}
                          onClick={f.onClear}
                          className="flex items-center gap-1 pl-2.5 pr-2 py-1 rounded-full bg-slate-100 text-slate-700 text-[10px] font-semibold tracking-wide hover:bg-slate-200 transition-colors"
                        >
                          {f.label} <i className="ri-close-line text-xs text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sort pills — desktop */}
                <div className="hidden sm:flex items-center gap-1 bg-slate-50 rounded-xl p-1">
                  {SORT_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setPage(1); }}
                      className={`px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-[0.15em] uppercase transition-all duration-150 whitespace-nowrap ${
                        sortBy === opt.value
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'text-slate-400 hover:text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* ── Grid ───────────────────────────── */}
              {loading ? (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {[...Array(9)].map((_, i) => <ProductCardSkeleton key={i} />)}
                </div>
              ) : products.length === 0 ? (

                /* Empty state */
                <div className="min-h-[420px] flex flex-col items-center justify-center text-center py-20">
                  <div className="relative mb-8">
                    <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                      <i className="ri-search-2-line text-3xl text-slate-300" />
                    </div>
                  </div>
                  <h3 className="font-serif text-3xl text-slate-900 mb-3">Nothing found</h3>
                  <p className="text-slate-400 text-sm max-w-xs mb-8 leading-relaxed">
                    Try adjusting your filters or browsing a different category.
                  </p>
                  <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-700 text-white px-7 py-3.5 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-colors"
                  >
                    Clear all filters <i className="ri-arrow-right-line" />
                  </button>
                </div>

              ) : (
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6" data-product-shop>
                  {products.map(product => (
                    <ProductCard key={product.id} {...product} />
                  ))}
                </div>
              )}

              {/* ── Pagination ─────────────────────── */}
              {totalPages > 1 && !loading && (
                <div className="mt-16 flex items-center justify-center gap-1">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                    aria-label="Previous"
                  >
                    <i className="ri-arrow-left-s-line text-xl" />
                  </button>

                  {paginationRange(page, totalPages).map((p, i) =>
                    p === '…' ? (
                      <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-slate-300 text-sm">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setPage(p as number)}
                        className={`w-9 h-9 flex items-center justify-center rounded-lg text-sm font-semibold transition-all ${
                          page === p
                            ? 'bg-slate-900 text-white shadow-sm'
                            : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}

                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="w-9 h-9 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-25 disabled:cursor-not-allowed transition-all"
                    aria-label="Next"
                  >
                    <i className="ri-arrow-right-s-line text-xl" />
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      </section>


    </main>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        <p className="text-[10px] tracking-[0.35em] uppercase text-slate-400">Loading the shop…</p>
      </div>
    }>
      <ShopContent />
    </Suspense>
  );
}
