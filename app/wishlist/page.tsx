'use client';

import Link from 'next/link';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';
import ProductCard from '@/components/ProductCard';
import PageHero from '@/components/PageHero';
import { usePageTitle } from '@/hooks/usePageTitle';

export default function WishlistPage() {
  usePageTitle('Wishlist');
  const { wishlist: wishlistItems, removeFromWishlist } = useWishlist();
  const { addToCart } = useCart();

  const addAllToCart = () => {
    const inStockItems = wishlistItems.filter(item => item.inStock);
    inStockItems.forEach(item => {
      addToCart({
        id: item.id,
        name: item.name,
        price: item.price,
        image: item.image,
        quantity: 1,
        slug: item.slug || item.id,
        maxStock: 99
      });
    });
    if (inStockItems.length > 0) {
      alert(`Added ${inStockItems.length} items to cart`);
    }
  };

  return (
    <main className="min-h-screen bg-white">

      <PageHero
        image="/hero_wishlist.jpg"
        imageAlt="Your HairBudget wishlist"
        eyebrow="Saved Items"
        ghostLetter="W"
        minHeightClass="min-h-[36vh] md:min-h-[42vh]"
        breadcrumb={[
          { label: 'Home', href: '/' },
          { label: 'Wishlist' },
        ]}
        title={
          <h1 className="italic leading-[0.9]" style={{ fontSize: 'clamp(2.25rem, 6vw, 4.5rem)' }}>
            My
            <br />
            <span className="text-brand-gold">Wishlist</span>
          </h1>
        }
      >
        {wishlistItems.length > 0 ? (
          <div className="flex flex-wrap items-center gap-4 mt-6">
            <span className="text-brand-cream/90 text-sm">
              <span className="text-brand-ivory font-bold">{wishlistItems.length}</span>{' '}
              {wishlistItems.length === 1 ? 'item' : 'items'} saved
            </span>
            <button
              type="button"
              onClick={addAllToCart}
              className="inline-flex items-center gap-2 bg-brand-ivory hover:bg-brand-gold text-brand-ink px-5 py-2.5 rounded-xl font-bold text-xs tracking-[0.2em] uppercase transition-colors"
            >
              Add All to Cart <i className="ri-shopping-cart-line" />
            </button>
          </div>
        ) : null}
      </PageHero>

      {/* ── BREADCRUMB STRIP ─────────────────────────────── */}
      <div className="border-b border-slate-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <nav className="flex items-center gap-2 text-xs text-slate-400">
            <Link href="/" className="hover:text-slate-700 transition-colors">Home</Link>
            <i className="ri-arrow-right-s-line" />
            <span className="text-slate-700 font-semibold">Wishlist</span>
          </nav>
        </div>
      </div>

      {/* ── CONTENT ──────────────────────────────────────── */}
      {wishlistItems.length === 0 ? (

        /* ── EMPTY STATE ── */
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center py-24 px-4">
          <div className="w-20 h-20 rounded-2xl bg-brand-cream/60 border border-brand-gold/30 flex items-center justify-center mb-6">
            <i className="ri-heart-line text-3xl text-brand-forest" />
          </div>
          <h2 className="font-serif text-3xl italic text-brand-ink mb-3">Your wishlist is empty</h2>
          <p className="text-brand-mid text-sm max-w-xs mb-8 leading-relaxed">
            Save your favourite items here to easily find them later.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-3 bg-brand-forest hover:bg-brand-deep text-brand-ivory px-8 py-4 rounded-full font-bold text-xs tracking-[0.25em] uppercase transition-colors"
          >
            Explore Products <i className="ri-arrow-right-line" />
          </Link>
        </div>

      ) : (

        <section className="py-12 lg:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

            {/* Section header */}
            <div className="flex items-end justify-between mb-10 pb-6 border-b border-brand-gold/30">
              <div>
                <p className="text-[9px] font-black tracking-[0.5em] uppercase text-brand-mid mb-1">Your Picks</p>
                <h2 className="font-serif text-3xl italic text-brand-ink">
                  Saved Items <span className="text-brand-mid font-light">({wishlistItems.length})</span>
                </h2>
              </div>
              <button
                onClick={addAllToCart}
                className="hidden sm:inline-flex items-center gap-2 bg-brand-forest hover:bg-brand-deep text-brand-ivory px-6 py-3 rounded-full font-bold text-xs tracking-[0.2em] uppercase transition-colors"
              >
                Add All to Cart <i className="ri-shopping-cart-line" />
              </button>
            </div>

            {/* Product grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {wishlistItems.map((product) => (
                <ProductCard key={product.id} {...product} slug={product.slug || product.id} />
              ))}
            </div>

          </div>
        </section>
      )}

    </main>
  );
}
