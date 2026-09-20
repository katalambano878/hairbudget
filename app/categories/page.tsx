import Link from 'next/link';
import type { Metadata } from 'next';
import PageHero from '@/components/PageHero';
import { supabaseAdmin as supabase } from '@/lib/supabase-admin';
import { buildMetadata } from '@/lib/seo';

export const revalidate = 0;

export const metadata: Metadata = buildMetadata({
  title: 'Shop by Category — Wigs, Bundles & Hair Care',
  description:
    'Browse HairBudget categories: lace fronts, closure wigs, hair bundles, frontals and styling essentials. Find the look you love.',
  path: '/categories',
  keywords: ['wig categories', 'wig types', 'lace front category', 'bundles category'],
});

export default async function CategoriesPage() {
  const { data: categoriesData } = await supabase
    .from('categories')
    .select(`id, name, slug, description, image_url, position, parent_id`)
    .eq('status', 'active')
    .is('parent_id', null)
    .order('position', { ascending: true });

  const palette = [
    { icon: 'ri-store-2-line' },
    { icon: 'ri-shopping-bag-3-line' },
    { icon: 'ri-t-shirt-line' },
    { icon: 'ri-home-smile-line' },
    { icon: 'ri-heart-line' },
    { icon: 'ri-star-smile-line' },
  ];

  const categories = categoriesData?.map((c, i) => ({
    ...c,
    image: c.image_url || 'https://via.placeholder.com/600x400?text=Category',
    icon: palette[i % palette.length].icon,
  })) || [];

  return (
    <div className="min-h-screen bg-white">

      <PageHero
        image="/hero_categories.jpg"
        imageAlt="HairBudget collections — wigs, bundles and braiding hair"
        eyebrow="Collections"
        ghostLetter="C"
        minHeightClass="min-h-[52vh] md:min-h-[60vh]"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Categories' },
        ]}
        title={
          <h1 className="italic leading-[0.95] drop-shadow-xl">
            <span className="block" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>Shop by</span>
            <span className="block text-brand-gold" style={{ fontSize: 'clamp(2.5rem, 6vw, 4.5rem)' }}>Category</span>
            <span className="block text-brand-ivory mt-2 font-medium not-italic" style={{ fontSize: 'clamp(1.25rem, 3vw, 2rem)' }}>
              Find your style
            </span>
          </h1>
        }
        description="Wigs, bundles, closures and hair care — all in one place."
      />

      {/* ── GRID ─────────────────────────────────────────── */}
      <section className="py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="flex items-end justify-between mb-12 pb-6 border-b border-brand-gold/30">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-mid mb-2">Browse All</p>
              <h2 className="font-serif text-4xl lg:text-5xl text-brand-ink italic">Our Collections</h2>
            </div>
            <Link
              href="/shop"
              className="hidden sm:flex items-center gap-2 text-[10px] font-black tracking-[0.3em] uppercase text-brand-forest hover:text-brand-gold transition-colors"
            >
              View All <i className="ri-arrow-right-line" />
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-6">
              {categories.map((category, i) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${category.slug}`}
                  className="group relative block aspect-[3/4] overflow-hidden rounded-[26px] bg-brand-deep ring-1 ring-brand-forest/15 hover:ring-brand-gold transition-all duration-500"
                >
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.07] transition-transform duration-[900ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
                  />

                  {/* Forest wash keeps the cream type readable over any photo */}
                  <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/70 via-brand-deep/20 to-transparent" />

                  {/* Thin champagne frame */}
                  <div className="absolute inset-3 rounded-[18px] border border-brand-ivory/20 group-hover:border-brand-gold/70 transition-colors duration-500 pointer-events-none" />

                  {/* Index */}
                  <span className="absolute top-6 left-6 font-serif italic text-brand-gold/70 text-sm z-10">
                    {String(i + 1).padStart(2, '0')}
                  </span>

                  <div className="absolute inset-x-0 bottom-0 p-6 z-10">
                    <p className="text-[8px] font-black tracking-[0.5em] uppercase text-brand-gold mb-2">Collection</p>
                    <h3 className="font-serif text-2xl lg:text-[1.6rem] italic text-brand-ivory leading-tight transition-transform duration-500 group-hover:-translate-y-1">
                      {category.name}
                    </h3>
                    <p className="text-brand-cream/75 text-xs leading-relaxed line-clamp-2 max-h-0 opacity-0 group-hover:max-h-12 group-hover:opacity-100 group-hover:mt-2 overflow-hidden transition-all duration-500">
                      {category.description || 'Explore this collection.'}
                    </p>
                    <div className="flex items-center gap-2 mt-4 text-brand-ivory text-[9px] font-black tracking-[0.3em] uppercase">
                      <span>Explore</span>
                      <span className="w-5 h-px bg-brand-gold group-hover:w-10 transition-all duration-500" />
                      <i className="ri-arrow-right-up-line text-brand-gold text-sm transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-32">
              <div className="w-20 h-20 rounded-2xl bg-brand-cream/60 border border-brand-gold/30 flex items-center justify-center mx-auto mb-6">
                <i className="ri-inbox-line text-3xl text-brand-forest" />
              </div>
              <h3 className="font-serif text-3xl text-brand-ink italic mb-3">Nothing here yet</h3>
              <p className="text-brand-mid text-sm">Categories will appear here once added.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-brand-deep py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-gold mb-4">Can&apos;t find it?</p>
              <h2 className="font-serif text-4xl lg:text-5xl italic text-brand-ivory leading-[1.05]">
                Browse Everything<br />
                <span className="text-brand-cream/40">At Once.</span>
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-3 bg-brand-ivory text-brand-forest px-8 py-4 rounded-full font-bold text-xs tracking-[0.2em] uppercase hover:bg-brand-gold transition-colors"
              >
                Search All Products <i className="ri-search-line" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-3 border border-brand-gold/40 text-brand-cream px-8 py-4 rounded-full font-bold text-xs tracking-[0.2em] uppercase hover:border-brand-gold hover:text-brand-ivory transition-colors"
              >
                Contact Us <i className="ri-customer-service-line" />
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
