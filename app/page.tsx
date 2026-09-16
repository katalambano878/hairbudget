'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import ProductCard, { type ColorVariant, getColorHex } from '@/components/ProductCard';
import ProductCardSkeleton from '@/components/skeletons/ProductCardSkeleton';
import AnimatedSection, { AnimatedGrid } from '@/components/AnimatedSection';
import NewsletterSection from '@/components/NewsletterSection';
import WhatsAppButton from '@/components/WhatsAppButton';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStorePricing } from '@/context/StorePricingContext';
import { getProductCardPricing } from '@/lib/pricing';
import { BRAND } from '@/lib/brand';

const HERO_SLIDES = [
  {
    image: '/hero_trio.jpg',
    tag: 'HairBudget by Yassi',
    heading: (
      <>
        Confidence in{' '}
        <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-brand-ivory to-brand-gold">
          every strand
        </span>
      </>
    ),
    subtext: 'Stylish, quality hair at budget-friendly prices — wigs, extensions, bundles and more for retail and wholesale.',
    cta: { text: 'Shop Now', href: '/shop' },
    cta2: { text: 'View Collections', href: '/categories' },
    position: 'object-top',
  },
  {
    image: '/hero_ombre.jpg',
    tag: 'Retail + Wholesale',
    heading: (
      <>
        Hair for{' '}
        <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-brand-ivory to-brand-gold">
          every look
        </span>
      </>
    ),
    subtext: 'Human hair wigs, braiding extensions, body wave, bobs, blonde and coloured styles — plus shapewear.',
    cta: { text: 'Shop Hair', href: '/shop' },
    cta2: { text: 'Our Story', href: '/about' },
    position: 'object-top',
  },
  {
    image: '/hero_salon.jpg',
    tag: 'Pickup & Delivery',
    heading: (
      <>
        Quality without{' '}
        <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-brand-ivory to-brand-gold">
          the markup
        </span>
      </>
    ),
    subtext: 'Visit us in Adenta or chat on WhatsApp. Pickup and delivery available across Ghana.',
    cta: { text: 'Shop All', href: '/shop' },
    cta2: { text: 'WhatsApp Us', href: BRAND.contact.whatsappUrl },
    position: 'object-top',
  },
];

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
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

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
          .select('id, name, slug, image_url, metadata')
          .eq('status', 'active')
          .order('name');

        if (categoriesError) throw categoriesError;

        const featuredCategories = (categoriesData || []).filter(
          (cat: any) => cat.metadata?.featured === true
        );
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

      {/* ─── HERO SLIDER ──────────────────────────────────────────────── */}
      <section className="relative w-full h-[88vh] md:h-screen overflow-hidden bg-black">
        {/* Slide progress bar */}
        <div className="absolute top-0 inset-x-0 z-50 h-[2px] bg-white/10">
          <div
            key={currentSlide}
            className="h-full bg-gradient-to-r from-white/60 via-white to-white/60 animate-progress origin-left shadow-[0_0_12px_rgba(255,255,255,0.6)]"
            style={{ animationDuration: '5000ms' }}
          />
        </div>

        {/* Slides */}
        {HERO_SLIDES.map((slide, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-[1500ms] ease-in-out ${
              index === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            {/* Background image */}
            <div className={`absolute inset-0 ${index === currentSlide ? 'animate-ken-burns' : ''}`}>
              <Image
                src={slide.image}
                alt={`HairBudget — ${slide.tag}`}
                fill
                className={`object-cover ${slide.position}`}
                priority={index === 0}
                sizes="100vw"
                quality={85}
              />
            </div>

            {/* Layered overlays for cinematic depth */}
            <div className="absolute inset-0 bg-black/15" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/25 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

            {/* Film grain */}
            <div
              className="absolute inset-0 opacity-[0.04] mix-blend-overlay pointer-events-none"
              style={{
                backgroundImage:
                  'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
              }}
            />

            {/* Slide content — left-aligned editorial layout */}
            <div className="absolute inset-0 z-20 flex flex-col justify-end md:justify-center pb-24 md:pb-0 px-6 sm:px-12 md:px-20 lg:px-28 max-w-7xl mx-auto w-full h-full">
              <div className="max-w-xl lg:max-w-2xl">

                {/* Tag pill */}
                <div
                  className={`inline-flex items-center gap-3 mb-6 transition-all duration-1000 delay-200 ${
                    index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                  }`}
                >
                  <span className="h-[1px] w-6 bg-white/70" />
                  <span className="text-white/80 text-[11px] md:text-xs tracking-[0.45em] uppercase font-semibold">
                    {slide.tag}
                  </span>
                  <span className="h-[1px] w-6 bg-white/70" />
                </div>

                {/* Main heading */}
                <div
                  className={`transition-all duration-1000 delay-300 ${
                    index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                >
                  <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] font-serif text-white leading-[1.05] tracking-tight mb-6 drop-shadow-2xl">
                    {slide.heading}
                  </h1>
                </div>

                {/* Subtext */}
                <div
                  className={`transition-all duration-1000 delay-[420ms] ${
                    index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                >
                  <p className="text-base md:text-lg lg:text-xl text-white/65 mb-10 font-light leading-relaxed max-w-lg">
                    {slide.subtext}
                  </p>
                </div>

                {/* CTAs */}
                <div
                  className={`flex flex-col sm:flex-row items-start sm:items-center gap-6 transition-all duration-1000 delay-500 ${
                    index === currentSlide ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                  }`}
                >
                  {/* Primary — sharp rectangle, black flood fills up on hover */}
                  <Link
                    href={slide.cta.href}
                    className="group relative inline-flex items-center gap-4 bg-white text-black px-8 py-[15px] text-[11px] font-black tracking-[0.35em] uppercase overflow-hidden transition-all duration-300 hover:shadow-[0_0_40px_rgba(255,255,255,0.18)] w-fit"
                  >
                    {/* Black flood from bottom */}
                    <span className="absolute inset-0 bg-black translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                    <span className="relative z-10 group-hover:text-white transition-colors duration-100 delay-[180ms] whitespace-nowrap">
                      {slide.cta.text}
                    </span>
                    <span className="relative z-10 w-px h-3.5 bg-black/30 group-hover:bg-white/30 transition-colors duration-100 delay-[180ms]" />
                    <i className="relative z-10 ri-arrow-right-up-line text-sm group-hover:text-white group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-200 delay-[180ms]" />
                  </Link>

                  {/* Secondary — pure text, expanding underline from left */}
                  <div className="group inline-flex flex-col items-start gap-1.5 cursor-pointer">
                    <Link
                      href={slide.cta2.href}
                      className="inline-flex items-center gap-2.5 text-white/70 group-hover:text-white text-[11px] font-bold tracking-[0.35em] uppercase transition-colors duration-300 whitespace-nowrap"
                    >
                      {slide.cta2.text}
                      <i className="ri-arrow-right-up-line text-xs group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-300" />
                    </Link>
                    {/* Line expands from left */}
                    <span className="block h-[1px] w-0 group-hover:w-full bg-white/50 transition-all duration-500 ease-out" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Slide counter + dot indicators */}
        <div className="absolute bottom-8 md:bottom-10 right-6 md:right-14 z-30 flex items-center gap-5">
          <span className="text-white/60 font-serif text-sm tabular-nums">0{currentSlide + 1}</span>
          <div className="flex gap-2">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`relative overflow-hidden rounded-full transition-all duration-500 h-[2px] ${
                  i === currentSlide ? 'w-14 bg-white/20' : 'w-4 bg-white/25 hover:bg-white/45'
                }`}
              >
                {i === currentSlide && (
                  <span
                    className="absolute inset-y-0 left-0 bg-white animate-progress origin-left"
                    style={{ animationDuration: '5000ms' }}
                  />
                )}
              </button>
            ))}
          </div>
          <span className="text-white/30 font-serif text-xs tabular-nums">03</span>
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
              <span className="inline-flex items-center gap-2 text-slate-500 text-xs tracking-[0.35em] uppercase font-semibold mb-3">
                <span className="w-5 h-[1px] bg-slate-400 inline-block" />
                Collections
              </span>
              <h2 className="font-serif text-3xl sm:text-4xl md:text-5xl text-gray-900 leading-tight">
                Shop by Category
              </h2>
            </div>
            <Link
              href="/categories"
              className="hidden md:inline-flex items-center gap-2 text-sm font-semibold text-slate-700 border border-slate-200 px-6 py-3 rounded-full hover:bg-slate-900 hover:text-white hover:border-slate-900 transition-all duration-300 whitespace-nowrap"
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
                  <div className="aspect-[3/4] rounded-2xl overflow-hidden relative shadow-sm group-hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.35)] transition-all duration-700 group-hover:-translate-y-2">
                    <Image
                      src={category.image_url || `https://via.placeholder.com/600x800?text=${encodeURIComponent(category.name)}`}
                      alt={category.name}
                      fill
                      className="object-cover transition-transform duration-[1400ms] ease-out group-hover:scale-110"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      quality={85}
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
                    <div className="absolute inset-0 rounded-2xl border border-white/10 pointer-events-none group-hover:border-white/25 transition-colors duration-500 z-10" />

                    <div className="absolute inset-0 p-5 md:p-7 flex flex-col justify-end z-20">
                      <div>
                        <h3 className="font-serif text-white text-xl md:text-2xl lg:text-3xl tracking-wide">
                          {category.name}
                        </h3>
                      </div>
                      <div className="flex items-center gap-3 text-white/80 mt-2.5 opacity-0 group-hover:opacity-100 translate-y-3 group-hover:translate-y-0 transition-all duration-500 delay-75">
                        <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Explore</span>
                        <div className="flex-1 h-[1px] bg-white/50 max-w-[40px] group-hover:max-w-[60px] transition-all duration-500" />
                        <i className="ri-arrow-right-line text-sm" />
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
      <section className="py-16 md:py-24 bg-slate-50">
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
                title: 'Affordability Without Compromise',
                desc: 'Beautiful, high-quality hair at prices that respect your budget — for retail shoppers and wholesale resellers.',
                highlight: 'Best Value',
              },
              {
                icon: 'ri-sparkle-line',
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
                className="group relative bg-slate-50 hover:bg-slate-900 rounded-2xl p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-1 overflow-hidden"
              >
                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-400 bg-slate-800 px-2 py-1 rounded-full">
                    {item.highlight}
                  </span>
                </div>
                <div className="w-12 h-12 bg-white group-hover:bg-slate-800 rounded-xl flex items-center justify-center mb-5 shadow-sm transition-colors duration-500">
                  <i className={`${item.icon} text-2xl text-slate-700 group-hover:text-slate-200 transition-colors duration-500`}></i>
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

      {/* ─── NEWSLETTER ─────────────────────────────────────────────────────── */}
      <NewsletterSection />

    </main>
  );
}
