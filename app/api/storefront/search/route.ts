import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

/** Escape % and _ so user input is literal in PostgreSQL ILIKE */
function escapeIlike(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

function firstImageUrl(rows: { url: string | null; position: number | null }[] | null | undefined): string | null {
  if (!rows?.length) return null;
  const sorted = [...rows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  return sorted[0]?.url || null;
}

const SELECT = `
  id,
  name,
  slug,
  price,
  sale_price,
  compare_at_price,
  categories(name),
  product_images(url, position)
`;

async function fetchByPrefix(raw: string, limit: number) {
  const q = escapeIlike(raw);
  const pattern = `${q}%`;

  const [nameRes, slugRes] = await Promise.all([
    supabase
      .from('products')
      .select(SELECT)
      .eq('status', 'active')
      .ilike('name', pattern)
      .order('name', { ascending: true })
      .limit(limit),
    supabase
      .from('products')
      .select(SELECT)
      .eq('status', 'active')
      .ilike('slug', pattern)
      .order('name', { ascending: true })
      .limit(limit),
  ]);

  if (nameRes.error) throw nameRes.error;
  if (slugRes.error) throw slugRes.error;

  const map = new Map<string, any>();
  for (const p of [...(nameRes.data || []), ...(slugRes.data || [])]) {
    if (p?.id && !map.has(p.id)) map.set(p.id, p);
  }
  return [...map.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).slice(0, limit);
}

async function fetchByContains(raw: string, limit: number) {
  const q = escapeIlike(raw);
  const pattern = `%${q}%`;

  const [nameRes, slugRes] = await Promise.all([
    supabase
      .from('products')
      .select(SELECT)
      .eq('status', 'active')
      .ilike('name', pattern)
      .order('name', { ascending: true })
      .limit(limit),
    supabase
      .from('products')
      .select(SELECT)
      .eq('status', 'active')
      .ilike('slug', pattern)
      .order('name', { ascending: true })
      .limit(limit),
  ]);

  if (nameRes.error) throw nameRes.error;
  if (slugRes.error) throw slugRes.error;

  const map = new Map<string, any>();
  for (const p of [...(nameRes.data || []), ...(slugRes.data || [])]) {
    if (p?.id && !map.has(p.id)) map.set(p.id, p);
  }
  return [...map.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''))).slice(0, limit);
}

/**
 * GET /api/storefront/search?q=foo&limit=12
 * Prefers name/slug **starting with** q; if none and q is 2+ chars, falls back to **contains** q.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get('q')?.trim() ?? '';
  const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '12', 10) || 12, 1), 30);

  if (raw.length < 1) {
    return NextResponse.json([], {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  }

  try {
    let rows = await fetchByPrefix(raw, limit);

    if (!rows.length && raw.length >= 2) {
      rows = await fetchByContains(raw, limit);
    }

    const payload = rows.map((p: any) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      price: p.price,
      sale_price: p.sale_price,
      compare_at_price: p.compare_at_price,
      categoryName: Array.isArray(p.categories) ? p.categories[0]?.name : p.categories?.name,
      image: firstImageUrl(p.product_images),
    }));

    return NextResponse.json(payload, {
      headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' },
    });
  } catch (e: unknown) {
    console.error('[storefront/search]', e);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}
