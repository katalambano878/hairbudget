import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';
import { SITE } from '@/lib/seo';

export const revalidate = 3600;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

type Entry = MetadataRoute.Sitemap[number];

const url = (path: string) => `${SITE.url}${path.startsWith('/') ? path : `/${path}`}`;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticPages: Entry[] = [
    { url: url('/'),          lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: url('/shop'),      lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: url('/categories'),lastModified: now, changeFrequency: 'weekly',  priority: 0.8 },
    { url: url('/about'),     lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/contact'),   lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: url('/blog'),      lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: url('/faqs'),      lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/help'),      lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/shipping'),  lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/returns'),   lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: url('/terms'),     lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
    { url: url('/privacy'),   lastModified: now, changeFrequency: 'yearly',  priority: 0.3 },
  ];

  let productPages: Entry[] = [];
  let categoryPages: Entry[] = [];

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    const [{ data: products }, { data: categories }] = await Promise.all([
      supabase.from('products').select('slug, updated_at').eq('status', 'active'),
      supabase.from('categories').select('slug, updated_at').eq('status', 'active'),
    ]);

    if (products?.length) {
      productPages = products.map((p) => ({
        url: url(`/product/${p.slug}`),
        lastModified: p.updated_at ? new Date(p.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }

    if (categories?.length) {
      categoryPages = categories.map((c) => ({
        url: url(`/category/${c.slug}`),
        lastModified: c.updated_at ? new Date(c.updated_at) : now,
        changeFrequency: 'weekly',
        priority: 0.6,
      }));
    }
  } catch (err) {
    console.error('[sitemap] dynamic entries failed:', err);
  }

  // Hard-coded blog post IDs that ship with the starter content.
  const blogPages: Entry[] = ['1', '2', '3'].map((id) => ({
    url: url(`/blog/${id}`),
    lastModified: now,
    changeFrequency: 'monthly',
    priority: 0.5,
  }));

  return [...staticPages, ...productPages, ...categoryPages, ...blogPages];
}
