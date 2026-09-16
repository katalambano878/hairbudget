import type { Metadata } from 'next';

import { BRAND } from '@/lib/brand';

export const SITE = {
  name: BRAND.name,
  legalName: BRAND.legalName,
  tagline: BRAND.tagline,
  description: BRAND.description,
  url: BRAND.url,
  locale: BRAND.locale,
  countryCode: BRAND.countryCode,
  currency: BRAND.currency,
  themeColor: BRAND.themeColor,
  twitterHandle: BRAND.social.instagramHandle,
};

export const DEFAULT_KEYWORDS = [
  'HairBudget',
  'Hair Budget GH',
  'HairBudget by Yassi',
  'wigs Ghana',
  'buy wigs Accra',
  'human hair wigs',
  'hair extensions Ghana',
  'braiding extensions',
  'hair bundles',
  'body wave hair',
  'bob wigs',
  'blonde wigs Ghana',
  'shapewear Ghana',
  'wholesale hair Ghana',
  'Adenta hair shop',
  'budget wigs',
];

type SeoInput = {
  title: string;
  description?: string;
  path?: string;          // e.g. '/about'
  image?: string;         // absolute or root-relative; defaults to /og-image.png
  keywords?: string[];
  noindex?: boolean;
  type?: 'website' | 'article' | 'product';
};

/**
 * Build a fully populated <Metadata> object for a page. Falls back
 * to site defaults for anything not provided. Always emits canonical
 * URL, OpenGraph + Twitter tags, robots and the brand OG image.
 */
export function buildMetadata({
  title,
  description = SITE.description,
  path = '/',
  image,
  keywords = [],
  noindex = false,
  type = 'website',
}: SeoInput): Metadata {
  const url = `${SITE.url}${path}`;
  const ogImage = image
    ? image.startsWith('http')
      ? image
      : `${SITE.url}${image}`
    : `${SITE.url}/og-image.png`;

  const allKeywords = Array.from(new Set([...keywords, ...DEFAULT_KEYWORDS]));

  return {
    title,
    description,
    keywords: allKeywords,
    alternates: { canonical: url },
    robots: noindex
      ? { index: false, follow: false, nocache: true }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            'max-image-preview': 'large',
            'max-snippet': -1,
            'max-video-preview': -1,
          },
        },
    openGraph: {
      type: type === 'product' ? 'website' : type,
      url,
      siteName: SITE.name,
      title,
      description,
      locale: SITE.locale,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: `${SITE.name} — ${SITE.tagline}`,
          type: 'image/png',
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      site: SITE.twitterHandle,
      creator: SITE.twitterHandle,
      title,
      description,
      images: [ogImage],
    },
  };
}

/* ───────── Schema.org JSON-LD helpers ───────── */

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${SITE.url}/#organization`,
    name: SITE.name,
    legalName: SITE.legalName,
    url: SITE.url,
    logo: {
      '@type': 'ImageObject',
      url: `${SITE.url}/icon-512.png`,
      width: 512,
      height: 512,
    },
    image: `${SITE.url}/og-image.png`,
    description: SITE.description,
    sameAs: [
      BRAND.social.instagram,
      BRAND.social.tiktok,
      BRAND.social.snapchat,
    ],
    email: BRAND.contact.email,
    telephone: BRAND.contact.phoneTel,
    address: {
      '@type': 'PostalAddress',
      streetAddress: BRAND.contact.store,
      addressLocality: 'Adenta',
      addressCountry: 'GH',
    },
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${SITE.url}/#website`,
    name: SITE.name,
    url: SITE.url,
    description: SITE.description,
    inLanguage: 'en',
    publisher: { '@id': `${SITE.url}/#organization` },
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: `${SITE.url}/shop?search={search_term_string}`,
      },
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url.startsWith('http') ? item.url : `${SITE.url}${item.url}`,
    })),
  };
}

export function productJsonLd(p: {
  name: string;
  description: string;
  image: string | string[];
  slug: string;
  sku?: string;
  price: number;
  currency?: string;
  availability?: 'in_stock' | 'out_of_stock' | string;
  brand?: string;
  category?: string;
  rating?: number;
  reviewCount?: number;
}) {
  const url = `${SITE.url}/product/${p.slug}`;
  const images = (Array.isArray(p.image) ? p.image : [p.image]).map((src) =>
    src.startsWith('http') ? src : `${SITE.url}${src}`
  );

  const schema: Record<string, any> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    description: p.description,
    image: images,
    sku: p.sku,
    url,
    brand: { '@type': 'Brand', name: p.brand || SITE.name },
    offers: {
      '@type': 'Offer',
      url,
      priceCurrency: p.currency || SITE.currency,
      price: p.price,
      availability:
        p.availability === 'out_of_stock'
          ? 'https://schema.org/OutOfStock'
          : 'https://schema.org/InStock',
      priceValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0],
    },
  };

  if (p.category) schema.category = p.category;
  if (p.rating && p.reviewCount) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: p.rating,
      reviewCount: p.reviewCount,
      bestRating: 5,
      worstRating: 1,
    };
  }
  return schema;
}

/** Inline JSON-LD <script> tag — safe for use in server components. */
export function jsonLdScript(data: object) {
  return {
    type: 'application/ld+json',
    dangerouslySetInnerHTML: { __html: JSON.stringify(data) },
  } as const;
}
