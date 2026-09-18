'use client';

import { useState } from 'react';
import Link from 'next/link';
import LazyImage from './LazyImage';
import { useCart } from '@/context/CartContext';
import { useWishlist } from '@/context/WishlistContext';

// Map common color names to hex values for swatches
const COLOR_MAP: Record<string, string> = {
  black: '#000000', white: '#FFFFFF', red: '#EF4444', blue: '#3B82F6',
  navy: '#1E3A5F', green: '#22C55E', yellow: '#EAB308', orange: '#F97316',
  pink: '#EC4899', purple: '#A855F7', brown: '#92400E', beige: '#D4C5A9',
  grey: '#6B7280', gray: '#6B7280', cream: '#FFFDD0', teal: '#14B8A6',
  maroon: '#800000', coral: '#FF7F50', burgundy: '#800020', olive: '#808000',
  tan: '#D2B48C', khaki: '#C3B091', charcoal: '#36454F', ivory: '#FFFFF0',
  gold: '#FFD700', silver: '#C0C0C0', rose: '#FF007F', lavender: '#E6E6FA',
  mint: '#98FB98', peach: '#FFDAB9', wine: '#722F37', denim: '#1560BD',
  nude: '#E3BC9A', camel: '#C19A6B', sage: '#BCB88A', rust: '#B7410E',
  mustard: '#FFDB58', plum: '#8E4585', lilac: '#C8A2C8', stone: '#928E85',
  sand: '#C2B280', taupe: '#483C32', mauve: '#E0B0FF', sky: '#87CEEB',
  forest: '#228B22', cobalt: '#0047AB', emerald: '#50C878', scarlet: '#FF2400',
  aqua: '#00FFFF', turquoise: '#40E0D0', indigo: '#4B0082', crimson: '#DC143C',
  magenta: '#FF00FF', cyan: '#00FFFF', chocolate: '#7B3F00', coffee: '#6F4E37',
};

export function getColorHex(colorName: string): string | null {
  const lower = colorName.toLowerCase().trim();
  if (COLOR_MAP[lower]) return COLOR_MAP[lower];
  // Try partial match (e.g. "Light Blue" -> "blue")
  for (const [key, val] of Object.entries(COLOR_MAP)) {
    if (lower.includes(key)) return val;
  }
  return null;
}

export interface ColorVariant {
  name: string;
  hex: string;
}

interface ProductCardProps {
  id: string;
  slug: string;
  name: string;
  price: number;
  originalPrice?: number;
  image: string;
  rating?: number;
  reviewCount?: number;
  badge?: string;
  inStock?: boolean;
  maxStock?: number;
  moq?: number;
  hasVariants?: boolean;
  minVariantPrice?: number;
  colorVariants?: ColorVariant[];
}

export default function ProductCard({
  id,
  slug,
  name,
  price,
  originalPrice,
  image,
  rating = 5,
  reviewCount = 0,
  badge,
  inStock = true,
  maxStock = 50,
  moq = 1,
  hasVariants = false,
  minVariantPrice,
  colorVariants = []
}: ProductCardProps) {
  const { addToCart } = useCart();
  const { isInWishlist, addToWishlist, removeFromWishlist } = useWishlist();
  const [activeColor, setActiveColor] = useState<string | null>(null);

  const displayPrice = hasVariants && minVariantPrice ? minVariantPrice : price;
  const discount = originalPrice ? Math.round((1 - displayPrice / originalPrice) * 100) : 0;
  const saved = isInWishlist(id);
  const MAX_SWATCHES = 5;

  const formatPrice = (val: number) => `GH\u20B5${val.toFixed(2)}`;

  const toggleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (saved) {
      removeFromWishlist(id);
    } else {
      addToWishlist({ id, name, price: displayPrice, originalPrice, image, rating, reviewCount, badge, inStock, slug });
    }
  };

  return (
    <article className="group h-full flex flex-col">
      <div className="relative">
        <Link
          href={`/product/${slug}`}
          className="relative block aspect-[3/4] overflow-hidden rounded-[22px] bg-brand-cream/50 ring-1 ring-brand-forest/10 group-hover:ring-brand-gold transition-all duration-500"
        >
          <LazyImage
            src={image}
            alt={name}
            className="w-full h-full object-cover object-top group-hover:scale-[1.06] transition-transform duration-[900ms] ease-[cubic-bezier(0.25,0.1,0.25,1)]"
          />

          {/* Forest wash so the overlaid action stays legible */}
          <div className="absolute inset-0 bg-gradient-to-t from-brand-deep/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

          {/* Inset gold hairline */}
          <div className="absolute inset-2.5 rounded-[16px] border border-brand-ivory/0 group-hover:border-brand-ivory/25 transition-colors duration-500 pointer-events-none" />

          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col items-start gap-2 z-10">
            {badge && (
              <span className="bg-brand-forest text-brand-ivory text-[9px] uppercase tracking-[0.22em] font-black px-3 py-1.5 rounded-full">
                {badge}
              </span>
            )}
            {discount > 0 && (
              <span className="bg-brand-gold text-brand-deep text-[9px] uppercase tracking-[0.22em] font-black px-3 py-1.5 rounded-full">
                Save {discount}%
              </span>
            )}
          </div>

          {!inStock && (
            <div className="absolute inset-0 bg-brand-deep/70 backdrop-blur-[2px] flex items-center justify-center z-10">
              <span className="border border-brand-gold/70 text-brand-ivory px-5 py-2 rounded-full text-[10px] font-black tracking-[0.28em] uppercase">
                Sold Out
              </span>
            </div>
          )}

          {/* Desktop action over the image */}
          {inStock && (
            <div className="absolute bottom-4 left-4 right-4 hidden lg:flex items-center justify-between gap-3 opacity-0 translate-y-3 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 z-10">
              <span className="text-brand-ivory text-[10px] font-black tracking-[0.28em] uppercase">
                {hasVariants ? 'Select Options' : 'Quick Add'}
              </span>
              {hasVariants ? (
                <span className="grid place-items-center w-11 h-11 rounded-full bg-brand-ivory text-brand-forest shadow-lg">
                  <i className="ri-list-check text-lg" />
                </span>
              ) : (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    addToCart({ id, name, price, image, quantity: moq, slug, maxStock, moq });
                  }}
                  aria-label={moq > 1 ? `Add ${moq} to cart` : 'Add to cart'}
                  className="grid place-items-center w-11 h-11 rounded-full bg-brand-gold text-brand-deep shadow-lg hover:bg-brand-ivory transition-colors duration-300"
                >
                  <i className="ri-shopping-bag-line text-lg" />
                </button>
              )}
            </div>
          )}
        </Link>

        {/* Wishlist sits outside the link so it never navigates */}
        <button
          onClick={toggleWishlist}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
          aria-pressed={saved}
          className={`absolute top-3 right-3 z-20 grid place-items-center w-9 h-9 rounded-full backdrop-blur transition-all duration-300 ${
            saved
              ? 'bg-brand-forest text-brand-gold'
              : 'bg-white/85 text-brand-forest hover:bg-brand-forest hover:text-brand-ivory'
          }`}
        >
          <i className={`${saved ? 'ri-heart-fill' : 'ri-heart-line'} text-[15px]`} />
        </button>
      </div>

      {/* ── Details ── */}
      <div className="flex flex-col flex-grow pt-4">
        <Link href={`/product/${slug}`}>
          <h3 className="font-serif text-lg leading-snug text-brand-ink group-hover:text-brand-forest transition-colors line-clamp-2">
            {name}
          </h3>
        </Link>

        {reviewCount > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <i
                  key={s}
                  className={`text-[11px] ${s <= Math.round(rating) ? 'ri-star-fill text-brand-gold' : 'ri-star-line text-brand-taupe'}`}
                />
              ))}
            </div>
            <span className="text-[11px] text-brand-mid">({reviewCount})</span>
          </div>
        )}

        {colorVariants.length > 0 && (
          <div className="flex items-center gap-1.5 mt-3">
            {colorVariants.slice(0, MAX_SWATCHES).map((color) => (
              <button
                key={color.name}
                title={color.name}
                aria-label={color.name}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveColor(activeColor === color.name ? null : color.name);
                }}
                className={`w-4 h-4 rounded-full transition-all duration-200 flex-shrink-0 ring-1 ${
                  activeColor === color.name
                    ? 'ring-2 ring-offset-2 ring-brand-forest scale-110'
                    : 'ring-brand-forest/15 hover:scale-110'
                }`}
                style={{ backgroundColor: color.hex }}
              />
            ))}
            {colorVariants.length > MAX_SWATCHES && (
              <span className="text-[11px] text-brand-mid ml-0.5">+{colorVariants.length - MAX_SWATCHES}</span>
            )}
          </div>
        )}

        {/* Price rail with gold marker */}
        <div className="flex items-center gap-2.5 mt-3">
          <span className="w-3 h-px bg-brand-gold flex-shrink-0" />
          <span className="text-brand-ink font-semibold tracking-tight">
            {hasVariants && minVariantPrice ? `From ${formatPrice(minVariantPrice)}` : formatPrice(price)}
          </span>
          {originalPrice && (
            <span className="text-xs text-brand-mid/70 line-through">{formatPrice(originalPrice)}</span>
          )}
        </div>

        {/* Mobile action */}
        <div className="mt-auto pt-4 lg:hidden">
          {hasVariants ? (
            <Link
              href={`/product/${slug}`}
              className="w-full border border-brand-forest/20 text-brand-forest py-3 rounded-full text-[10px] font-black tracking-[0.24em] uppercase hover:bg-brand-forest hover:text-brand-ivory hover:border-brand-forest transition-colors flex items-center justify-center gap-2"
            >
              <i className="ri-list-check text-sm" />
              Select Options
            </Link>
          ) : (
            <button
              onClick={(e) => {
                e.preventDefault();
                addToCart({ id, name, price, image, quantity: moq, slug, maxStock, moq });
              }}
              disabled={!inStock}
              className="w-full border border-brand-forest/20 text-brand-forest py-3 rounded-full text-[10px] font-black tracking-[0.24em] uppercase hover:bg-brand-forest hover:text-brand-ivory hover:border-brand-forest transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <i className="ri-shopping-bag-line text-sm" />
              {moq > 1 ? `Add ${moq} to Cart` : 'Add to Cart'}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
