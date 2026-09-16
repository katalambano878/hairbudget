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
    .select(`id, name, slug, description, image_url, position`)
    .eq('status', 'active')
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

          <div className="flex items-end justify-between mb-12 pb-6 border-b border-slate-100">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-mid mb-2">Browse All</p>
              <h2 className="font-serif text-4xl lg:text-5xl text-brand-ink italic">Our Collections</h2>
            </div>
            <Link
              href="/shop"
              className="hidden sm:flex items-center gap-2 text-[10px] font-black tracking-[0.3em] uppercase text-slate-400 hover:text-slate-900 transition-colors"
            >
              View All <i className="ri-arrow-right-line" />
            </Link>
          </div>

          {categories.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-0.5 bg-slate-100">
              {categories.map((category, i) => (
                <Link
                  key={category.id}
                  href={`/shop?category=${category.slug}`}
                  className="group relative bg-white overflow-hidden"
                  style={{ aspectRatio: '4/3' }}
                >
                  {/* Image */}
                  <img
                    src={category.image}
                    alt={category.name}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />

                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />

                  {/* Index number */}
                  <div className="absolute top-5 left-5 text-[10px] font-black text-white/25 font-serif italic">
                    {String(i + 1).padStart(2, '0')}
                  </div>

                  {/* Content */}
                  <div className="absolute bottom-0 left-0 right-0 p-6">
                    <p className="text-[8px] font-black tracking-[0.5em] uppercase text-brand-gold mb-1.5">Collection</p>
                    <h3 className="font-serif text-2xl italic text-white font-semibold mb-3">{category.name}</h3>
                    <p className="text-slate-300 text-xs leading-relaxed line-clamp-2 mb-4 max-h-0 group-hover:max-h-12 overflow-hidden transition-all duration-500">
                      {category.description || 'Explore our exclusive collection in this category.'}
                    </p>
                    <div className="flex items-center gap-2 text-white text-[10px] font-bold tracking-[0.25em] uppercase">
                      <span>Browse</span>
                      <div className="w-5 h-px bg-white group-hover:w-10 transition-all duration-300" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-32">
              <div className="w-20 h-20 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto mb-6">
                <i className="ri-inbox-line text-3xl text-slate-300" />
              </div>
              <h3 className="font-serif text-3xl text-slate-900 italic mb-3">Nothing here yet</h3>
              <p className="text-slate-400 text-sm">Categories will appear here once added.</p>
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="bg-slate-950 py-20">
        <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
            <div>
              <p className="text-[9px] font-black tracking-[0.5em] uppercase text-blue-400 mb-4">Can&apos;t find it?</p>
              <h2 className="font-serif text-4xl lg:text-5xl italic text-white leading-[1.05]">
                Browse Everything<br />
                <span className="text-white/20">At Once.</span>
              </h2>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <Link
                href="/shop"
                className="inline-flex items-center justify-center gap-3 bg-white text-slate-900 px-8 py-4 rounded-xl font-bold text-xs tracking-[0.2em] uppercase hover:bg-blue-400 transition-colors"
              >
                Search All Products <i className="ri-search-line" />
              </Link>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center gap-3 border border-slate-700 text-slate-400 px-8 py-4 rounded-xl font-bold text-xs tracking-[0.2em] uppercase hover:border-slate-400 hover:text-white transition-colors"
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
