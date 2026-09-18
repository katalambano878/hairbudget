'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import ProductCard, { type ColorVariant, getColorHex } from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton';
import AnimatedSection, { AnimatedGrid } from '@/components/AnimatedSection';
import CollectionCards from '@/components/CollectionCards';
import HeroVideo from '@/components/HeroVideo';
import WhatsAppButton from '@/components/WhatsAppButton';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStorePricing } from '@/context/StorePricingContext';
import { getProductCardPricing } from '@/lib/pricing';

const HERO = {
  tag: 'HairBudget by Yassi',
  heading: (
    <>
      Confidence in{' '}
      <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-brand-ivory to-brand-gold">
        every strand
      </span>
    </>
  ),
  cta: { text: 'Shop Now', href: '/shop' },
  cta2: { text: 'View Collections', href: '/categories' },
};

const TICKER_ITEMS = [
  'Wigs & Human Hair',
  'Braiding Extensions',
  'Bundles · Curly · Wavy · Straight',
  'Body Wave · Bobs · Blonde',
  'Retail + Wholesale',
  'Pickup & Delivery',
  'Est. 2017 · Adenta, Ghana',
];

const TRUST_FEATURES = [
  {
    icon: 'ri-truck-line',
    title: 'Pickup & Delivery',
    desc: 'Collect in Adenta or have your order delivered',
  },
  {
    icon: 'ri-shield-check-line',
    title: 'Secure Payments',
    desc: 'MTN MoMo, Vodafone Cash & Card',
  },
  {
    icon: 'ri-hand-heart-line',
    title: 'Quality on a Budget',
    desc: 'Stylish hair without compromising quality or price',
  },
  {
    icon: 'ri-arrow-go-back-line',
    title: '24-Hour Exchange',
    desc: 'No refunds — exchange unused items within 24 hours',
  },
];

export default function Home() {
  usePageTitle('');
  const { salesActive } = useStorePricing();
  const [featuredProducts, setFeaturedProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*, product_variants(*), product_images(*)')
          .eq('status', 'active')
          .eq('featured', true)
          .order('created_at', { ascending: false })
          .limit(8);

        if (productsError) throw productsError;
        setFeaturedProducts(productsData || []);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('categories')
          .select('id, name, slug, image_url, metadata, position')
          .eq('status', 'active')
          .order('position', { ascending: true });

        if (categoriesError) throw categoriesError;

        // The homepage row holds four tiles; `featured` in metadata picks which.
        const featuredCategories = (categoriesData || [])
          .filter((cat: any) => cat.metadata?.featured === true)
          .slice(0, 4);
        setCategories(featuredCategories);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [salesActive]);

  return (
    <main className="min-h-screen bg-white">

      <section className="relative w-full h-[88vh] md:h-screen overflow-hidden bg-brand-deep">
        <HeroVideo />

        <div className="absolute inset-0 bg-black/5" />
        <div className="absolute inset-0 bg-gradient-to-r from-brand-deep/50 via-brand-deep/10 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/45 via-transparent to-brand-deep/5" />

        <div className="absolute inset-0 z-20 flex flex-col justify-end md:justify-center pb-24 md:pb-0 px-6 sm:px-12 md:px-20 lg:px-28 max-w-7xl mx-auto w-full h-full">
          <div className="max-w-xl lg:max-w-2xl">
            <div className="inline-flex items-center gap-3 mb-6">
              <span className="h-[1px] w-6 bg-brand-gold" />
              <span className="text-brand-ivory/85 text-[11px] md:text-xs tracking-[0.45em] uppercase font-semibold">
                {HERO.tag}
              </span>
              <span className="h-[1px] w-6 bg-brand-gold" />
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-serif text-white leading-[1.05] tracking-tight mb-10 drop-shadow-2xl">
              {HERO.heading}
            </h1>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 mb-2">
              <Link
                href={HERO.cta.href}
                className="group relative inline-flex items-center gap-4 bg-white text-black px-8 py-[15px] text-[11px] font-black tracking-[0.35em] uppercase overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.18)] w-fit"
              >
                <span className="absolute inset-0 bg-brand-forest translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                <span className="relative z-10 group-hover:text-brand-ivory transition-colors duration-100 delay-[180ms] whitespace-nowrap">
                  {HERO.cta.text}
                </span>
                <span className="relative z-10 w-px h-3.5 bg-black/30 group-hover:bg-white/30 transition-colors duration-100 delay-[180ms]" />
                <i className="relative z-10 ri-arrow-right-up-line text-sm group-hover:text-brand-ivory group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 delay-[180ms]" />
              </Link>

              <div className="group inline-flex flex-col items-start gap-1.5">
                <Link
                  href={HERO.cta2.href}
                  className="inline-flex items-center gap-2.5 text-white/70 group-hover:text-white text-[11px] font-bold tracking-[0.35em] uppercase transition-colors duration-300 whitespace-nowrap"
                >
                  {HERO.cta2.text}
                  <i className="ri-arrow-right-up-line text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                </Link>
                <span className="block h-[1px] w-0 group-hover:w-full bg-brand-gold/70 transition-all duration-500 ease-out" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── SCROLLING TICKER ────────────────────────────────────────────── */}
      <div className="bg-slate-950 border-y border-slate-800 py-3 overflow-hidden select-none">
        <div className="flex animate-marquee whitespace-nowrap">
          {[...TICKER_ITEMS, ...TICKER_ITEMS].map((item, i) => (
            <span key={i} className="inline-flex items-center mx-8 text-slate-400 text-xs tracking-[0.3em] uppercase font-medium">
              {item}
              <span className="ml-8 w-1 h-1 rounded-full bg-slate-600 inline-block" />
            </span>
          ))}
        </div>
      </div>

      {/* ─── TRUST FEATURES STRIP (hidden on mobile) ──────────────────────── */}
      <section className="hidden md:block bg-white border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-slate-100">
            {TRUST_FEATURES.map((f) => (
              <div key={f.title} className="flex flex-col sm:flex-row items-center sm:items-start gap-3 px-6 py-6 text-center sm:text-left">
                <div className="flex-shrink-0 w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                  <i className={`${f.icon} text-xl text-slate-700`} />
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm leading-tight">{f.title}</p>
                  <p className="text-gray-500 text-xs mt-0.5 leading-snug">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SHOP BY CATEGORY ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">

          <AnimatedSection className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="inline-flex items-center gap-2 text-brand-mid text-xs tracking-[0.35em] uppercase font-semibold mb-3">
                <span className="w-5 h-[1px] bg-brand-gold inline-block" />
                Collections
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-brand-ink leading-tight">
                Shop by Category
              </h2>
            </div>
            <Link
              href="/categories"
              className="hidden md:inline-flex items-center gap-2 text-xs font-black tracking-[0.2em] uppercase text-brand-forest border border-brand-forest/20 px-6 py-3 rounded-full hover:bg-brand-forest hover:text-brand-ivory hover:border-brand-forest transition-all duration-300 whitespace-nowrap"
            >
              All Categories
              <i className="ri-arrow-right-line" />
            </Link>
          </AnimatedSection>

          {categories.length > 0 ? (
            <AnimatedGrid className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {categories.map((category) => (
                <Link
                  href={`/shop?category=${category.slug}`}
                  key={category.id}
                  className="group block relative"
                >
                  <div className="aspect-[3/4] rounded-[26px] overflow-hidden relative bg-brand-deep ring-1 ring-brand-forest/15 group-hover:ring-brand-gold transition-all duration-500 group-hover:-translate-y-1.5">
                    <Image
                      src={category.image_url || `https://via.placeholder.com/600x800?text=${encodeURIComponent(category.name)}`}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-[1200ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.07]"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      quality={85}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/75 via-brand-deep/25 to-transparent" />
                    <div className="absolute inset-3 rounded-[18px] border border-brand-ivory/20 group-hover:border-brand-gold/70 transition-colors duration-500 pointer-events-none z-10" />

                    <div className="absolute inset-0 p-5 md:p-6 flex flex-col justify-end z-20">
                      <p className="text-[8px] font-black tracking-[0.5em] uppercase text-brand-gold mb-2">Collection</p>
                      <h3 className="font-serif italic text-brand-ivory text-xl md:text-2xl leading-tight transition-transform duration-500 group-hover:-translate-y-1">
                        {category.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-3 text-brand-ivory text-[9px] font-black tracking-[0.3em] uppercase">
                        <span>Explore</span>
                        <span className="w-5 h-px bg-brand-gold group-hover:w-10 transition-all duration-500" />
                        <i className="ri-arrow-right-up-line text-brand-gold text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </AnimatedGrid>
          ) : !loading ? (
            <div className="text-center py-16 text-gray-400 border border-dashed border-slate-200 rounded-2xl">
              <i className="ri-grid-line text-5xl mb-4 block opacity-30" />
              <p className="text-lg text-gray-500">Categories coming soon.</p>
              <p className="text-sm text-gray-400 mt-1">Check back shortly for our latest collections.</p>
            </div>
          ) : null}

          <div className="mt-10 text-center md:hidden">
            <Link
              href="/categories"
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 px-6 py-3 rounded-full"
            >
              All Categories <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── FEATURED PRODUCTS ─────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <AnimatedSection className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-14">
            <div>
              <span className="inline-flex items-center gap-2 text-slate-500 text-xs tracking-[0.35em] uppercase font-semibold mb-3">
                <span className="w-5 h-[1px] bg-slate-400 inline-block" />
                Handpicked
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gray-900 leading-tight">
                Featured Products
              </h2>
              <p className="text-gray-500 mt-3 text-base max-w-sm leading-relaxed">
                Top picks from our latest wig drops and hair care arrivals.
              </p>
            </div>
            <Link
              href="/shop"
              className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 px-6 py-3 rounded-full hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 whitespace-nowrap"
            >
              View All Products
              <i className="ri-arrow-right-line" />
            </Link>
          </AnimatedSection>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
              {[...Array(8)].map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : featuredProducts.length > 0 ? (
            <AnimatedGrid className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
              {featuredProducts.map((product) => {
                const variants = product.product_variants || [];
                const hasVariants = variants.length > 0;
                const pricing = getProductCardPricing(product, salesActive);
                const totalVariantStock = hasVariants
                  ? variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0)
                  : 0;
                const effectiveStock = hasVariants ? totalVariantStock : product.quantity;

                const colorVariants: ColorVariant[] = [];
                const seenColors = new Set<string>();
                for (const v of variants) {
                  const colorName = (v as any).option2;
                  if (colorName && !seenColors.has(colorName.toLowerCase().trim())) {
                    const hex = getColorHex(colorName);
                    if (hex) {
                      seenColors.add(colorName.toLowerCase().trim());
                      colorVariants.push({ name: colorName.trim(), hex });
                    }
                  }
                }

                return (
                  <ProductCard
                    key={product.id}
                    id={product.id}
                    slug={product.slug}
                    name={product.name}
                    price={pricing.price}
                    originalPrice={pricing.originalPrice}
                    image={product.product_images?.[0]?.url || 'https://via.placeholder.com/400x500'}
                    rating={product.rating_avg || 5}
                    reviewCount={product.review_count || 0}
                    badge={pricing.saleBadge ? 'Sale' : product.featured ? 'Featured' : undefined}
                    inStock={effectiveStock > 0}
                    maxStock={effectiveStock || 50}
                    moq={product.moq || 1}
                    hasVariants={hasVariants}
                    minVariantPrice={pricing.minVariantPrice}
                    colorVariants={colorVariants}
                  />
                );
              })}
            </AnimatedGrid>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <i className="ri-shopping-bag-line text-5xl mb-4 block opacity-30" />
              <p className="text-lg">Products loading soon — check back shortly.</p>
            </div>
          )}

          <div className="text-center mt-12 md:hidden">
            <Link
              href="/shop"
              className="inline-flex items-center gap-2 bg-slate-900 text-white px-8 py-4 rounded-full font-semibold text-sm hover:bg-slate-800 transition-colors"
            >
              View All Products <i className="ri-arrow-right-line" />
            </Link>
          </div>
        </div>
      </section>

      {/* ─── WHY SHOP WITH US ──────────────────────────────────────────────── */}
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-14">
            <span className="inline-flex items-center gap-2 text-brand-mid text-xs tracking-[0.35em] uppercase font-semibold mb-4">
              <span className="w-5 h-[1px] bg-brand-gold" />
              Why HairBudget
              <span className="w-5 h-[1px] bg-brand-gold" />
            </span>
            <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-brand-ink">
              Confidence in every strand
            </h2>
          </AnimatedSection>

          <AnimatedGrid className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8" staggerDelay={120}>
            {[
              {
                icon: 'ri-price-tag-3-line',
                title: 'Affordable Quality',
                desc: 'Quality hair at prices that fit your budget.',
                highlight: 'Best Value',
              },
              {
                icon: 'ri-shield-check-line',
                title: 'Quality You Can Trust',
                desc: 'Durable, authentic hair products that meet a high standard every time.',
                highlight: 'Hand-Picked',
              },
              {
                icon: 'ri-store-2-line',
                title: 'Retail + Wholesale',
                desc: 'Shop for yourself or stock your business. Pickup and delivery available from Adenta.',
                highlight: 'Trusted',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="group relative bg-white hover:bg-brand-forest rounded-2xl p-8 border border-brand-gold/40 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-brand-gold bg-brand-deep px-2 py-1 rounded-full">
                    {item.highlight}
                  </span>
                </div>
                <div className="w-12 h-12 bg-white group-hover:bg-brand-deep rounded-xl flex items-center justify-center mb-5 shadow-sm transition-colors duration-500">
                  <i className={`${item.icon} text-2xl text-brand-forest group-hover:text-brand-gold transition-colors duration-500`} />
                </div>
                <h3 className="font-semibold text-gray-900 group-hover:text-white text-lg mb-2 transition-colors duration-500">
                  {item.title}
                </h3>
                <p className="text-gray-500 group-hover:text-slate-400 text-sm leading-relaxed transition-colors duration-500">
                  {item.desc}
                </p>
              </div>
            ))}
          </AnimatedGrid>
        </div>
      </section>

      <section className="py-16 md:py-20 bg-brand-forest text-brand-ivory">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-[10px] font-black tracking-[0.45em] uppercase text-brand-gold mb-4">Chat with Yassi</p>
          <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl italic mb-4">Need help picking a style?</h2>
          <p className="text-brand-cream/80 text-base max-w-xl mx-auto mb-8">
            WhatsApp HairBudget for retail or wholesale orders, pickup in Adenta, or product advice.
          </p>
          <WhatsAppButton className="mx-auto bg-brand-gold text-brand-ink hover:bg-brand-champagne" />
        </div>
      </section>

      <CollectionCards />

    </main>
  );
}
