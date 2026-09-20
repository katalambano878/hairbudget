'use client';

import Link from 'next/link';
import Image from 'next/image';
import { isVideoUrl } from '@/components/LazyImage';
import { firstStorefrontMedia, productImageUnoptimized, resolveProductImageUrl, sortStorefrontMedia, videoPosterUrl } from '@/lib/product-image';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { cachedQuery } from '@/lib/query-cache';
import ProductCard from '@/components/ProductCard';
import ProductReviews from '@/components/ProductReviews';
import { StructuredData, generateProductSchema, generateBreadcrumbSchema } from '@/components/SEOHead';
import { notFound } from 'next/navigation';
import { useCart } from '@/context/CartContext';
import { usePageTitle } from '@/hooks/usePageTitle';
import { useStorePricing } from '@/context/StorePricingContext';
import { resolveProductPrice, resolveVariantPrice } from '@/lib/pricing';

// Map common color names to hex values for the swatch preview
function colorNameToHex(name: string): string {
  const map: Record<string, string> = {
    red: '#ef4444', blue: '#3b82f6', green: '#22c55e', yellow: '#eab308',
    orange: '#f97316', purple: '#a855f7', pink: '#ec4899', black: '#111827',
    white: '#ffffff', gray: '#6b7280', grey: '#6b7280', brown: '#92400e',
    navy: '#1e3a5f', gold: '#d4a017', silver: '#c0c0c0', beige: '#f5f5dc',
    maroon: '#800000', teal: '#14b8a6', coral: '#ff7f50', ivory: '#fffff0',
    cream: '#fffdd0', burgundy: '#800020', lavender: '#e6e6fa', cyan: '#06b6d4',
    magenta: '#d946ef', olive: '#84cc16', peach: '#ffcba4', mint: '#98f5e1',
    rose: '#f43f5e', wine: '#722f37', charcoal: '#374151', sky: '#0ea5e9',
  };
  return map[name.toLowerCase().trim()] || '#d1d5db';
}

export default function ProductDetailClient({ slug }: { slug: string }) {
  const [product, setProduct] = useState<any>(null);
  usePageTitle(product?.name || 'Product');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<any>(null);
  const [selectedColor, setSelectedColor] = useState('');
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState('description');
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [relatedProducts, setRelatedProducts] = useState<any[]>([]);

  const { addToCart } = useCart();
  const { salesActive } = useStorePricing();

  useEffect(() => {
    async function fetchProduct() {
      try {
        setLoading(true);
        // Fetch main product (cached for 2 minutes)
        const { data: productData, error } = await cachedQuery<{ data: any; error: any }>(
          `product:${slug}`,
          async () => {
            let query = supabase
              .from('products')
              .select(`
                *,
                categories(name),
                product_variants(*),
                product_images(url, position, alt_text)
              `);

            const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(slug);

            if (isUUID) {
              query = query.or(`id.eq.${slug},slug.eq.${slug}`);
            } else {
              query = query.eq('slug', slug);
            }

            return query.single() as any;
          },
          2 * 60 * 1000 // 2 minutes
        );

        if (error || !productData) {
          console.error('Error fetching product:', error);
          setLoading(false);
          return;
        }

        // Transform product data
        // Map variant colors from option2, and extract color_hex from metadata
        const rawVariants = (productData.product_variants || []).map((v: any) => ({
          ...v,
          color: v.option2 || '',
          colorHex: v.metadata?.color_hex || ''
        }));

        // Build a color-to-hex map from variants (prefer stored hex, fallback to colorNameToHex)
        const colorHexMap: Record<string, string> = {};
        rawVariants.forEach((v: any) => {
          if (v.color) {
            if (!colorHexMap[v.color]) {
              colorHexMap[v.color] = v.colorHex || colorNameToHex(v.color);
            }
          }
        });

        const transformedProduct = {
          ...productData,
          images: sortStorefrontMedia(productData.product_images || []).map((img: any) => resolveProductImageUrl(img.url)),
          category: productData.categories?.name || 'Shop',
          rating: productData.rating_avg || 0,
          reviewCount: 0,
          stockCount: productData.quantity,
          moq: productData.moq || 1,
          colors: [...new Set(rawVariants.map((v: any) => v.color).filter(Boolean))],
          colorHexMap,
          variants: rawVariants,
          sizes: rawVariants.map((v: any) => v.name) || [],
          features: ['Carefully Curated', 'Quality Thrift Find'],
          featured: ['Carefully Curated', 'Quality Thrift Find'],
          care: 'Handle with care.',
          preorderShipping: productData.metadata?.preorder_shipping || null
        };

        // Ensure at least one image/placeholder
        if (transformedProduct.images.length === 0) {
          transformedProduct.images = ['https://via.placeholder.com/800x800?text=No+Image'];
        }

        setProduct(transformedProduct);

        // Set initial quantity to MOQ
        if (transformedProduct.moq > 1) {
          setQuantity(transformedProduct.moq);
        }

        // If exactly one variant is in stock, auto-select it so the shopper
        // doesn't have to pick the only available option. Otherwise force a choice.
        const inStockVariants = rawVariants.filter(
          (v: any) => (v.stock ?? v.quantity ?? 0) > 0
        );
        if (inStockVariants.length === 1) {
          const onlyVariant = inStockVariants[0];
          setSelectedVariant(onlyVariant);
          setSelectedSize(onlyVariant.name || '');
          setSelectedColor(onlyVariant.color || '');
        } else {
          setSelectedVariant(null);
          setSelectedSize('');
          setSelectedColor('');
        }

        // Fetch related products (cached for 5 minutes)
        if (productData.category_id) {
          const { data: related } = await cachedQuery<{ data: any; error: any }>(
            `related:${productData.category_id}:${productData.id}`,
            (() => supabase
              .from('products')
              .select('*, product_images(url, position), product_variants(id, name, price, quantity)')
              .eq('category_id', productData.category_id)
              .neq('id', productData.id)
              .limit(4)) as any,
            5 * 60 * 1000
          );

          if (related) {
            setRelatedProducts(related.map((p: any) => {
              const variants = p.product_variants || [];
              const hasVariants = variants.length > 0;
              const minVariantPrice = hasVariants ? Math.min(...variants.map((v: any) => v.price || p.price)) : undefined;
              const totalVariantStock = hasVariants ? variants.reduce((sum: number, v: any) => sum + (v.quantity || 0), 0) : 0;
              const effectiveStock = hasVariants ? totalVariantStock : p.quantity;
              return {
                id: p.id,
                slug: p.slug,
                name: p.name,
                price: p.price,
                image: firstStorefrontMedia(p.product_images) || 'https://via.placeholder.com/800?text=No+Image',
                rating: p.rating_avg || 0,
                reviewCount: 0,
                inStock: effectiveStock > 0,
                maxStock: effectiveStock || 50,
                moq: p.moq || 1,
                hasVariants,
                minVariantPrice
              };
            }));
          }
        }

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const hasVariants = product?.variants?.length > 0;
  const hasColors = product?.colors?.length > 0;
  const needsVariantSelection = hasVariants && !selectedVariant;
  const needsColorSelection = hasColors && !selectedColor;

  // Determine the active price: variant price if selected, otherwise base price
  const resolvedPrice = selectedVariant
    ? resolveVariantPrice({
        salesActive,
        productPrice: product?.price ?? 0,
        productSalePrice: product?.sale_price,
        variantPrice: Number(selectedVariant.price ?? product?.price ?? 0),
        variantSalePrice: selectedVariant.sale_price,
        compareAtPrice: product?.compare_at_price,
      })
    : resolveProductPrice({
        salesActive,
        price: product?.price ?? 0,
        salePrice: product?.sale_price,
        compareAtPrice: product?.compare_at_price,
      });
  const activePrice = resolvedPrice.effective;
  const comparePrice = resolvedPrice.originalDisplay;
  const activeStock = selectedVariant ? (selectedVariant.stock ?? selectedVariant.quantity ?? product?.stockCount ?? 0) : (product?.stockCount ?? 0);

  const handleAddToCart = () => {
    if (!product) return;
    if (needsVariantSelection) return; // Safety check

    // Build variant display string: "Color / Name" or just "Name" or just "Color"
    let variantLabel: string | undefined;
    if (selectedVariant) {
      const color = selectedVariant.color || selectedColor || '';
      const name = selectedVariant.name || '';
      if (color && name) {
        variantLabel = `${color} / ${name}`;
      } else {
        variantLabel = color || name || undefined;
      }
    }

    addToCart({
      id: product.id,
      name: product.name,
      price: activePrice,
      image: product.images[0],
      quantity: quantity,
      variant: variantLabel,
      slug: product.slug,
      maxStock: activeStock,
      moq: product.moq || 1
    });
  };

  const handleBuyNow = () => {
    handleAddToCart();
    window.location.href = '/checkout';
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-6 bg-blue-500" />
            <span className="text-blue-600 text-[10px] font-black tracking-[0.5em] uppercase">Loading</span>
            <span className="h-px w-6 bg-blue-500" />
          </div>
          <p className="font-serif italic text-2xl text-slate-700">Curating your piece…</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-[70vh] bg-white flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="inline-flex items-center gap-3 mb-4">
            <span className="h-px w-6 bg-blue-500" />
            <span className="text-blue-600 text-[10px] font-black tracking-[0.5em] uppercase">404</span>
            <span className="h-px w-6 bg-blue-500" />
          </div>
          <h2 className="font-serif text-3xl sm:text-4xl text-slate-900 mb-3 tracking-tight">
            Product{' '}
            <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-700">
              not found
            </span>
          </h2>
          <p className="text-slate-500 mb-8">It may have been removed or the link is incorrect.</p>
          <Link
            href="/shop"
            className="group relative inline-flex items-center gap-3 bg-slate-950 text-white px-7 py-4 text-[11px] font-black tracking-[0.35em] uppercase overflow-hidden"
          >
            <span className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
            <span className="relative z-10">Return to Shop</span>
            <i className="relative z-10 ri-arrow-right-up-line text-sm" />
          </Link>
        </div>
      </div>
    );
  }

  const discount = comparePrice && comparePrice > activePrice
    ? Math.round((1 - activePrice / comparePrice) * 100)
    : 0;
  const minVariantPrice = hasVariants
    ? Math.min(
        ...product.variants.map((v: any) =>
          resolveVariantPrice({
            salesActive,
            productPrice: product.price,
            productSalePrice: product.sale_price,
            variantPrice: Number(v.price ?? product.price),
            variantSalePrice: v.sale_price,
            compareAtPrice: product.compare_at_price,
          }).effective
        )
      )
    : activePrice;

  const productSchema = generateProductSchema({
    name: product.name,
    description: product.description,
    image: product.images[0],
    price: hasVariants ? minVariantPrice : activePrice,
    currency: 'GHS',
    sku: product.sku,
    rating: product.rating,
    reviewCount: product.reviewCount,
    availability: product.quantity > 0 ? 'in_stock' : 'out_of_stock',
    category: product.category
  });

  const siteUrl = (process.env.NEXT_PUBLIC_APP_URL || 'https://hairbudgetgh.com').replace(/\/+$/, '');
  const breadcrumbSchema = generateBreadcrumbSchema([
    { name: 'Home', url: siteUrl },
    { name: 'Shop', url: `${siteUrl}/shop` },
    { name: product.category, url: `${siteUrl}/shop?category=${product.category.toLowerCase().replace(/\s+/g, '-')}` },
    { name: product.name, url: `${siteUrl}/product/${slug}` }
  ]);

  const trustItems = [
    { icon: 'ri-store-2-line', title: 'Store Pickup', sub: 'Available in Accra' },
    { icon: 'ri-arrow-left-right-line', title: 'Easy Returns', sub: '24-hour exchange window' },
    { icon: 'ri-shield-check-line', title: 'Secure Checkout', sub: 'Encrypted MoMo & cards' },
    { icon: 'ri-truck-line', title: 'Fast Delivery', sub: 'Nationwide shipping' },
  ];

  return (
    <>
      <StructuredData data={productSchema} />
      <StructuredData data={breadcrumbSchema} />

      <main className="min-h-screen bg-white relative overflow-hidden">
        {/* Ambient background glows */}
        <div className="absolute -top-32 -right-32 w-[520px] h-[520px] bg-blue-100/40 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-[60vh] -left-32 w-[420px] h-[420px] bg-blue-50/70 rounded-full blur-3xl pointer-events-none" />

        {/* ── BREADCRUMB ───────────────────────────────────── */}
        <section className="border-b border-slate-100 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <nav className="flex items-center gap-2.5 text-[10px] font-bold tracking-[0.3em] uppercase text-slate-400 flex-wrap">
              <Link href="/" className="hover:text-slate-900 transition-colors">Home</Link>
              <span className="w-3 h-px bg-slate-300" />
              <Link href="/shop" className="hover:text-slate-900 transition-colors">Shop</Link>
              <span className="w-3 h-px bg-slate-300" />
              <Link href={`/shop?category=${(product.category || '').toLowerCase().replace(/\s+/g, '-')}`} className="hover:text-slate-900 transition-colors">{product.category}</Link>
              <span className="w-3 h-px bg-slate-300" />
              <span className="text-slate-900 truncate max-w-[160px] sm:max-w-[280px] normal-case tracking-normal font-serif italic text-xs">{product.name}</span>
            </nav>
          </div>
        </section>

        {/* ── PRODUCT HERO ─────────────────────────────────── */}
        <section className="py-10 lg:py-16 relative z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid lg:grid-cols-[1.05fr_1fr] gap-10 lg:gap-16">

              {/* ── GALLERY ───────────────────────────────── */}
              <div className="lg:h-full lg:flex lg:flex-col">
                <div className="relative aspect-square lg:aspect-auto lg:flex-1 lg:min-h-0 rounded-3xl overflow-hidden bg-slate-100 group">
                  {isVideoUrl(product.images[selectedImage]) ? (
                    <video
                      key={product.images[selectedImage]}
                      src={product.images[selectedImage]}
                      poster={videoPosterUrl(product.images[selectedImage])}
                      className="absolute inset-0 w-full h-full object-cover object-center"
                      autoPlay
                      muted
                      loop
                      playsInline
                      controls
                      preload="metadata"
                    />
                  ) : (
                    <Image
                      src={product.images[selectedImage]}
                      alt={product.name}
                      fill
                      unoptimized={productImageUnoptimized(product.images[selectedImage])}
                      className="object-cover object-center transition-transform duration-[1500ms] ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-[1.04]"
                      sizes="(max-width: 1024px) 100vw, 55vw"
                      priority
                      quality={85}
                    />
                  )}
                  <div className="absolute inset-0 ring-1 ring-inset ring-black/5 rounded-3xl pointer-events-none" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/[0.04] via-transparent to-transparent pointer-events-none" />

                  {/* Sale badge — editorial */}
                  {discount > 0 && (
                    <div className="absolute top-5 left-5 inline-flex items-center gap-3 bg-slate-950 text-white px-4 py-2.5">
                      <span className="text-[9px] font-black tracking-[0.4em] uppercase">Save</span>
                      <span className="font-serif italic text-base">{discount}%</span>
                    </div>
                  )}

                  {/* Wishlist + image counter */}
                  <div className="absolute top-5 right-5 flex flex-col gap-2.5">
                    <button
                      onClick={() => setIsWishlisted(!isWishlisted)}
                      className="w-11 h-11 rounded-full bg-white/95 backdrop-blur shadow-md flex items-center justify-center hover:scale-110 transition-transform"
                      aria-label="Add to wishlist"
                    >
                      <i className={`${isWishlisted ? 'ri-heart-fill text-blue-600' : 'ri-heart-line text-slate-700'} text-lg`} />
                    </button>
                    {product.images.length > 1 && (
                      <div className="px-3 py-1.5 rounded-full bg-white/95 backdrop-blur shadow-sm font-serif italic text-[11px] text-slate-700 tabular-nums text-center">
                        0{selectedImage + 1} / 0{product.images.length}
                      </div>
                    )}
                  </div>
                </div>

                {/* Thumbnails */}
                {product.images.length > 1 && (
                  <div className="mt-4 grid grid-cols-5 gap-3">
                    {product.images.slice(0, 5).map((image: string, index: number) => {
                      const isVid = isVideoUrl(image);
                      return (
                        <button
                          key={index}
                          onClick={() => setSelectedImage(index)}
                          className={`relative aspect-square rounded-xl overflow-hidden border transition-all cursor-pointer ${
                            selectedImage === index
                              ? 'border-slate-900 shadow-md ring-2 ring-blue-200'
                              : 'border-slate-200 hover:border-slate-400'
                          }`}
                          aria-label={isVid ? `${product.name} video ${index + 1}` : `${product.name} view ${index + 1}`}
                        >
                          {isVid ? (
                            <>
                              <img
                                src={videoPosterUrl(image)}
                                alt=""
                                className="absolute inset-0 w-full h-full object-cover object-center"
                              />
                              <span className="absolute inset-0 flex items-center justify-center bg-black/30 pointer-events-none">
                                <i className="ri-play-fill text-white text-2xl drop-shadow"></i>
                              </span>
                            </>
                          ) : (
                            <Image
                              src={image}
                              alt={`${product.name} view ${index + 1}`}
                              fill
                              unoptimized={productImageUnoptimized(image)}
                              className="object-cover object-center"
                              sizes="(max-width: 1024px) 20vw, 10vw"
                              quality={60}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* ── INFO COLUMN ──────────────────────────── */}
              <div className="lg:pt-2">

                {/* Eyebrow */}
                <div className="flex items-center gap-3 mb-5">
                  <span className="h-px w-8 bg-blue-500" />
                  <span className="text-blue-600 text-[10px] font-black tracking-[0.5em] uppercase">{product.category}</span>
                </div>

                {/* Headline */}
                <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-slate-900 leading-[1.05] tracking-tight mb-5">
                  {product.name}
                </h1>

                {/* Rating */}
                <div className="flex items-center gap-3 mb-8">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <i
                        key={star}
                        className={`${
                          star <= Math.round(product.rating) ? 'ri-star-fill text-blue-500' : 'ri-star-line text-slate-400'
                        } text-base`}
                      />
                    ))}
                  </div>
                  <span className="font-serif italic text-slate-700 text-sm tabular-nums">{Number(product.rating).toFixed(1)}</span>
                  <span className="w-px h-3 bg-slate-300" />
                  <button
                    onClick={() => {
                      setActiveTab('reviews');
                      document.getElementById('reviews')?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="text-slate-500 hover:text-slate-900 text-[10px] font-bold tracking-[0.3em] uppercase transition-colors"
                  >
                    Read reviews
                  </button>
                </div>

                {/* Price */}
                <div className="mb-8 pb-8 border-b border-slate-100">
                  <div className="flex items-baseline gap-4 flex-wrap">
                    {hasVariants && !selectedVariant ? (
                      <>
                        <span className="text-[10px] font-bold tracking-[0.4em] uppercase text-slate-400">From</span>
                        <span className="font-serif text-4xl lg:text-5xl text-slate-900 tracking-tight">
                          GH₵{minVariantPrice.toFixed(2)}
                        </span>
                      </>
                    ) : (
                      <span className="font-serif text-4xl lg:text-5xl text-slate-900 tracking-tight">
                        GH₵{activePrice.toFixed(2)}
                      </span>
                    )}
                    {comparePrice && comparePrice > activePrice && (
                      <>
                        <span className="text-slate-400 line-through font-light text-xl">
                          GH₵{comparePrice.toFixed(2)}
                        </span>
                        {discount > 0 && (
                          <span className="text-blue-600 font-serif italic text-sm">
                            — you save {discount}%
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Description */}
                {product.description && (
                  <p className="text-slate-600 leading-relaxed mb-9 max-w-md">{product.description}</p>
                )}

                {/* Color Selector */}
                {hasVariants && product.colors.length > 0 && (
                  <div className="mb-7">
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-900">Colour</span>
                      {selectedColor ? (
                        <span className="font-serif italic text-slate-600 text-sm">{selectedColor}</span>
                      ) : (
                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-600">Pick one</span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {product.colors.map((color: string) => {
                        const isSelected = selectedColor === color;
                        const colorVariants = product.variants.filter((v: any) => v.color === color);
                        const colorStock = colorVariants.reduce((sum: number, v: any) => sum + (v.stock ?? v.quantity ?? 0), 0);
                        const isOutOfStock = colorStock === 0 && product.stockCount === 0;
                        return (
                          <button
                            key={color}
                            onClick={() => {
                              setSelectedColor(color);
                              const matching = product.variants.filter((v: any) => v.color === color);
                              if (matching.length === 1) {
                                setSelectedVariant(matching[0]);
                                setSelectedSize(matching[0].name);
                              } else {
                                setSelectedVariant(null);
                                setSelectedSize('');
                              }
                            }}
                            disabled={isOutOfStock}
                            title={color}
                            aria-label={color}
                            className={`relative w-11 h-11 rounded-full transition-all cursor-pointer ${
                              isSelected
                                ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-white'
                                : isOutOfStock
                                ? 'opacity-30 cursor-not-allowed'
                                : 'ring-1 ring-slate-200 hover:ring-slate-400 hover:scale-105'
                            }`}
                          >
                            <span
                              className="absolute inset-0 rounded-full"
                              style={{ backgroundColor: product.colorHexMap?.[color] || colorNameToHex(color) }}
                            />
                            {isOutOfStock && (
                              <span className="absolute inset-0 flex items-center justify-center">
                                <span className="block w-full h-px bg-slate-700 rotate-45" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Variant Selector */}
                {hasVariants && (() => {
                  const _hasColors = product.colors.length > 0;
                  const visibleVariants = _hasColors && selectedColor
                    ? product.variants.filter((v: any) => v.color === selectedColor)
                    : _hasColors
                    ? []
                    : product.variants;

                  const showSelector = visibleVariants.length > 1 || (!_hasColors && visibleVariants.length > 0);
                  if (!showSelector) return null;

                  return (
                    <div className="mb-9">
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-900">
                          {_hasColors ? 'Length / style' : 'Variant'}
                        </span>
                        {selectedVariant ? (
                          <span className="font-serif italic text-slate-600 text-sm">
                            {selectedVariant.name} — GH₵{selectedVariant.price?.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold tracking-[0.3em] uppercase text-blue-600">Pick one</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {visibleVariants.map((variant: any) => {
                          const isSelected = selectedVariant?.id === variant.id;
                          const variantStock = variant.stock ?? variant.quantity ?? 0;
                          const isOutOfStock = variantStock === 0 && product.stockCount === 0;
                          return (
                            <button
                              key={variant.id || variant.name}
                              onClick={() => {
                                setSelectedVariant(variant);
                                setSelectedSize(variant.name);
                              }}
                              disabled={isOutOfStock}
                              className={`relative px-4 py-3 border transition-all cursor-pointer flex flex-col items-start text-left ${
                                isSelected
                                  ? 'border-slate-900 bg-slate-50 shadow-sm'
                                  : isOutOfStock
                                  ? 'border-slate-100 text-slate-400 cursor-not-allowed bg-slate-50/40'
                                  : 'border-slate-200 hover:border-slate-400'
                              }`}
                            >
                              <span className={`text-sm font-semibold ${isSelected ? 'text-slate-900' : 'text-slate-700'}`}>
                                {variant.name}
                              </span>
                              <span className={`font-serif italic text-xs mt-1 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`}>
                                GH₵{(variant.price || product.price).toFixed(2)}
                              </span>
                              {isOutOfStock && (
                                <span className="absolute top-1.5 right-2 text-[8px] font-bold tracking-wider uppercase text-slate-400">
                                  Sold out
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}

                {/* Quantity + Stock Status */}
                <div className="mb-9">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-black tracking-[0.4em] uppercase text-slate-900">Quantity</span>
                    {activeStock > 10 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        In stock
                      </span>
                    )}
                    {activeStock > 0 && activeStock <= 10 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                        Only {activeStock} left
                      </span>
                    )}
                    {activeStock === 0 && (
                      <span className="inline-flex items-center gap-1.5 text-xs text-red-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                        Out of stock
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="inline-flex items-center border border-slate-300">
                      <button
                        onClick={() => setQuantity(Math.max(product.moq || 1, quantity - 1))}
                        className="w-12 h-12 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={activeStock === 0 || quantity <= (product.moq || 1)}
                        aria-label="Decrease quantity"
                      >
                        <i className="ri-subtract-line text-lg" />
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) =>
                          setQuantity(
                            Math.max(product.moq || 1, Math.min(activeStock, parseInt(e.target.value) || (product.moq || 1)))
                          )
                        }
                        className="w-14 h-12 text-center font-serif text-lg focus:outline-none border-x border-slate-300 tabular-nums"
                        min={product.moq || 1}
                        max={activeStock}
                        disabled={activeStock === 0}
                      />
                      <button
                        onClick={() => setQuantity(Math.min(activeStock, quantity + 1))}
                        className="w-12 h-12 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                        disabled={activeStock === 0}
                        aria-label="Increase quantity"
                      >
                        <i className="ri-add-line text-lg" />
                      </button>
                    </div>
                    {product.moq > 1 && (
                      <span className="text-xs text-slate-500 italic font-serif">
                        Min. order {product.moq} units
                      </span>
                    )}
                  </div>
                </div>

                {/* CTAs — editorial flood-fill style */}
                <div className="flex flex-col sm:flex-row gap-3 mb-10">
                  <button
                    disabled={activeStock === 0 || needsVariantSelection || needsColorSelection}
                    onClick={handleAddToCart}
                    className={`group relative flex-1 inline-flex items-center justify-center gap-3 bg-slate-950 text-white px-8 py-[18px] text-[11px] font-black tracking-[0.35em] uppercase overflow-hidden transition-all duration-300 ${
                      activeStock === 0 || needsVariantSelection || needsColorSelection
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:shadow-[0_10px_40px_-10px_rgba(15,23,42,0.4)]'
                    }`}
                  >
                    <span className="absolute inset-0 bg-blue-600 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
                    <span className="relative z-10 flex items-center gap-3 whitespace-nowrap">
                      <i className="ri-shopping-bag-line text-base" />
                      {activeStock === 0
                        ? 'Out of Stock'
                        : needsColorSelection
                        ? 'Select a Colour'
                        : needsVariantSelection
                        ? 'Select a Variant'
                        : 'Add to Cart'}
                    </span>
                  </button>
                  {activeStock > 0 && !needsVariantSelection && !needsColorSelection && (
                    <button
                      onClick={handleBuyNow}
                      className="group sm:w-auto inline-flex items-center justify-center gap-3 border border-slate-900 text-slate-900 hover:bg-slate-900 hover:text-white px-7 py-[18px] text-[11px] font-black tracking-[0.35em] uppercase transition-all duration-300"
                    >
                      Buy Now
                      <i className="ri-arrow-right-up-line text-sm group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                    </button>
                  )}
                </div>

                {/* Trust pills */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-5 pt-6 border-t border-slate-100">
                  {trustItems.map((t) => (
                    <div key={t.title} className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                        <i className={`${t.icon} text-blue-600 text-base`} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900 leading-tight">{t.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{t.sub}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* SKU footnote */}
                {product.sku && (
                  <p className="mt-6 text-[10px] font-bold tracking-[0.3em] uppercase text-slate-400">
                    SKU · <span className="text-slate-600 font-serif italic normal-case tracking-normal text-xs">{product.sku}</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* ── DETAILS / TABS ────────────────────────────── */}
        <section className="bg-white py-16 lg:py-24 relative">
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-3 mb-6">
              <span className="h-px w-8 bg-blue-500" />
              <span className="text-blue-600 text-[10px] font-black tracking-[0.5em] uppercase">The Details</span>
            </div>
            <h2 className="font-serif text-3xl lg:text-4xl text-slate-900 leading-tight mb-10 max-w-2xl">
              Everything you need to{' '}
              <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-700">
                know
              </span>
            </h2>

            {/* Editorial tab nav */}
            <div className="flex flex-wrap gap-x-8 gap-y-2 mb-10 border-b border-slate-200">
              {['description', 'features', 'care', 'reviews'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`relative pb-4 font-bold text-[11px] tracking-[0.35em] uppercase transition-colors cursor-pointer ${
                    activeTab === tab ? 'text-slate-900' : 'text-slate-400 hover:text-slate-700'
                  }`}
                >
                  {tab}
                  {activeTab === tab && (
                    <span className="absolute bottom-0 left-0 w-full h-[2px] bg-slate-900" />
                  )}
                </button>
              ))}
            </div>

            <div className="max-w-3xl">
              {activeTab === 'description' && (
                <p className="text-slate-700 text-base lg:text-lg leading-relaxed font-light">
                  {product.description || 'A premium piece curated for those who wear style with intention.'}
                </p>
              )}

              {activeTab === 'features' && (
                <ul className="grid sm:grid-cols-2 gap-4">
                  {product.features.map((feature: string, index: number) => (
                    <li key={index} className="flex items-start gap-3 bg-white border border-slate-100 rounded-xl px-5 py-4">
                      <i className="ri-check-line text-blue-600 text-lg flex-shrink-0 mt-0.5" />
                      <span className="text-slate-700 text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              )}

              {activeTab === 'care' && (
                <div className="bg-white border border-slate-100 rounded-2xl p-8">
                  <p className="text-slate-700 text-base lg:text-lg leading-relaxed font-light">{product.care}</p>
                </div>
              )}

              {activeTab === 'reviews' && (
                <div id="reviews">
                  <ProductReviews productId={product.id} />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* ── YOU MAY ALSO LIKE ─────────────────────────── */}
        {relatedProducts.length > 0 && (
          <section className="py-20 lg:py-24 bg-white relative" data-product-shop>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-end justify-between gap-6 mb-12">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="h-px w-8 bg-blue-500" />
                    <span className="text-blue-600 text-[10px] font-black tracking-[0.5em] uppercase">You May Also Like</span>
                  </div>
                  <h2 className="font-serif text-3xl sm:text-4xl lg:text-5xl text-slate-900 leading-[1.05] tracking-tight">
                    More{' '}
                    <span className="italic font-light text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-700">
                      favourites
                    </span>
                  </h2>
                </div>
                <Link
                  href="/shop"
                  className="hidden md:inline-flex items-center gap-2 text-[11px] font-bold tracking-[0.3em] uppercase text-slate-700 hover:text-slate-900 transition-colors group whitespace-nowrap"
                >
                  View all
                  <i className="ri-arrow-right-up-line text-sm group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform duration-200" />
                </Link>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
                {relatedProducts.map((p) => (
                  <ProductCard key={p.id} {...p} />
                ))}
              </div>

              {/* Mobile view-all */}
              <Link
                href="/shop"
                className="mt-10 md:hidden inline-flex items-center justify-center gap-2 w-full border border-slate-300 hover:border-slate-900 text-slate-900 px-6 py-4 text-[11px] font-bold tracking-[0.3em] uppercase transition-colors"
              >
                View all products
                <i className="ri-arrow-right-up-line text-sm" />
              </Link>
            </div>
          </section>
        )}
      </main>
    </>
  );
}
