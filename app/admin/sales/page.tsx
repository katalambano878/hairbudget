'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import { parseStorePricingValue } from '@/lib/pricing';
import EndOfDayReport from '@/components/admin/EndOfDayReport';
import { resolveProductImageUrl } from '@/lib/product-image';

type ProductRow = {
  id: string;
  name: string;
  sku: string | null;
  slug: string;
  price: number;
  sale_price: number | null;
  quantity: number;
  status: string;
  deal_of_day: boolean | null;
  product_images?: Array<{ url: string; position?: number }>;
};

function pctOff(price: number, sale: number | null) {
  if (!sale || sale <= 0 || !price) return 0;
  return Math.round((1 - sale / price) * 100);
}

function SalesHub() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab') === 'eod' ? 'eod' : 'sale';

  const [salesActive, setSalesActive] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQuery, setPickerQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkPct, setBulkPct] = useState('15');
  const [drafts, setDrafts] = useState<Record<string, { sale: string; pct: string }>>({});

  const setTab = (next: 'sale' | 'eod') => {
    router.replace(next === 'eod' ? '/admin/sales?tab=eod' : '/admin/sales');
  };

  const load = useCallback(async () => {
    setError(null);
    try {
      const [{ data: setting }, { data: rows, error: prodError }] = await Promise.all([
        supabase.from('site_settings').select('value').eq('key', 'store_pricing').maybeSingle(),
        supabase
          .from('products')
          .select('id, name, sku, slug, price, sale_price, quantity, status, deal_of_day, product_images(url, position)')
          .neq('status', 'archived')
          .order('name'),
      ]);
      if (prodError) throw prodError;
      setSalesActive(parseStorePricingValue(setting?.value).sales_active);
      setProducts((rows || []) as ProductRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load sales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSale = useMemo(
    () => products.filter((p) => p.sale_price != null && Number(p.sale_price) > 0),
    [products]
  );

  const filteredSale = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return onSale;
    return onSale.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku || '').toLowerCase().includes(q)
    );
  }, [onSale, query]);

  const pickerList = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase();
    return products.filter((p) => {
      const already = p.sale_price != null && Number(p.sale_price) > 0;
      if (already) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || (p.sku || '').toLowerCase().includes(q);
    }).slice(0, 40);
  }, [products, pickerQuery]);

  const stats = useMemo(() => {
    const avg = onSale.length
      ? Math.round(onSale.reduce((s, p) => s + pctOff(Number(p.price), p.sale_price), 0) / onSale.length)
      : 0;
    return { count: onSale.length, avg, catalog: products.length };
  }, [onSale, products.length]);

  const toggleSaleMode = async (next: boolean) => {
    setSaving(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase.from('site_settings').upsert(
        { key: 'store_pricing', value: { sales_active: next }, category: 'pricing' },
        { onConflict: 'key' }
      );
      if (upsertError) throw upsertError;
      setSalesActive(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save sale mode');
    } finally {
      setSaving(false);
    }
  };

  const updateProduct = async (id: string, patch: Record<string, unknown>) => {
    const { error: updateError } = await supabase.from('products').update(patch).eq('id', id);
    if (updateError) throw updateError;
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } as ProductRow : p)));
  };

  const addToSale = async (product: ProductRow, percent = 15) => {
    const sale = Math.max(0.01, Math.round(Number(product.price) * (1 - percent / 100) * 100) / 100);
    try {
      await updateProduct(product.id, { sale_price: sale });
      setPickerOpen(false);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not add product');
    }
  };

  const saveDraft = async (product: ProductRow) => {
    const draft = drafts[product.id];
    const sale = draft?.sale != null && draft.sale !== '' ? Number(draft.sale) : Number(product.sale_price);
    if (!sale || sale <= 0) return;
    try {
      await updateProduct(product.id, { sale_price: sale });
      setDrafts((d) => {
        const next = { ...d };
        delete next[product.id];
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save price');
    }
  };

  const removeFromSale = async (id: string) => {
    try {
      await updateProduct(id, { sale_price: null });
      setSelected((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not remove product');
    }
  };

  const applyBulk = async () => {
    const pct = Number(bulkPct);
    if (!pct || pct <= 0 || pct >= 100 || selected.size === 0) return;
    const ids = [...selected];
    try {
      for (const id of ids) {
        const product = products.find((p) => p.id === id);
        if (!product) continue;
        const sale = Math.max(0.01, Math.round(Number(product.price) * (1 - pct / 100) * 100) / 100);
        await updateProduct(id, { sale_price: sale });
      }
      setSelected(new Set());
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Bulk update failed');
    }
  };

  const thumb = (p: ProductRow) => {
    const imgs = [...(p.product_images || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
    return resolveProductImageUrl(imgs[0]?.url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500 mb-1">Promotions</p>
          <h1 className="text-3xl font-bold text-ui-900">Sales</h1>
          <p className="text-ui-500 mt-1 max-w-2xl">
            Put products on sale here, flip the storefront to sale prices, and close the till at the end of the day.
          </p>
        </div>
        <div className="inline-flex rounded-xl border border-ui-200 bg-white p-1">
          {(['sale', 'eod'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold ${
                tab === key ? 'bg-brand-forest text-brand-ivory' : 'text-ui-600 hover:text-ui-900'
              }`}
            >
              {key === 'sale' ? 'On sale' : 'End of day'}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm border border-red-100">{error}</div>
      )}

      {tab === 'eod' ? (
        <EndOfDayReport />
      ) : loading ? (
        <div className="flex items-center justify-center py-20 text-ui-500">
          <i className="ri-loader-4-line text-2xl animate-spin mr-2" /> Loading sales…
        </div>
      ) : (
        <>
          <div className={`rounded-2xl border p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
            salesActive ? 'bg-brand-forest text-brand-ivory border-brand-forest' : 'bg-white border-ui-200'
          }`}>
            <div>
              <h2 className="text-lg font-bold">Store-wide sale mode</h2>
              <p className={`text-sm mt-1 ${salesActive ? 'text-brand-ivory/80' : 'text-ui-500'}`}>
                {salesActive
                  ? 'Customers currently see sale prices on every product that has one.'
                  : 'Sale prices are saved, but the shop still shows regular prices until you turn this on.'}
              </p>
            </div>
            <button
              type="button"
              disabled={saving}
              onClick={() => toggleSaleMode(!salesActive)}
              className={`relative inline-flex h-10 w-16 shrink-0 rounded-full transition-colors ${
                salesActive ? 'bg-brand-gold' : 'bg-ui-300'
              }`}
              role="switch"
              aria-checked={salesActive}
            >
              <span className={`absolute top-1 h-8 w-8 rounded-full bg-white shadow transition-transform ${
                salesActive ? 'translate-x-7' : 'translate-x-1'
              }`} />
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Stat label="On sale" value={String(stats.count)} />
            <Stat label="Average off" value={`${stats.avg}%`} />
            <Stat label="In catalogue" value={String(stats.catalog)} />
            <Stat label="Storefront" value={salesActive ? 'Sale ON' : 'Regular'} />
          </div>

          <div className="bg-white rounded-2xl border border-ui-200">
            <div className="p-4 border-b border-ui-100 flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sale products…"
                className="px-3 py-2 rounded-xl border border-ui-200 w-full lg:max-w-sm"
              />
              <div className="flex flex-wrap items-center gap-2">
                {selected.size > 0 && (
                  <>
                    <input
                      type="number"
                      min="1"
                      max="90"
                      value={bulkPct}
                      onChange={(e) => setBulkPct(e.target.value)}
                      className="w-20 px-2 py-2 rounded-xl border border-ui-200"
                    />
                    <button type="button" onClick={applyBulk} className="px-3 py-2 rounded-xl bg-ui-900 text-white text-sm font-semibold">
                      Apply {bulkPct}% to {selected.size}
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setPickerOpen(true)}
                  className="px-4 py-2 rounded-xl bg-brand-forest text-brand-ivory text-sm font-semibold"
                >
                  + Add products
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ui-50 text-left text-ui-500">
                  <tr>
                    <th className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={filteredSale.length > 0 && filteredSale.every((p) => selected.has(p.id))}
                        onChange={(e) => {
                          if (e.target.checked) setSelected(new Set(filteredSale.map((p) => p.id)));
                          else setSelected(new Set());
                        }}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Product</th>
                    <th className="px-4 py-3 font-semibold">Regular</th>
                    <th className="px-4 py-3 font-semibold">Sale price</th>
                    <th className="px-4 py-3 font-semibold">% off</th>
                    <th className="px-4 py-3 font-semibold">Deal</th>
                    <th className="px-4 py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {filteredSale.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-16 text-center text-ui-500">
                        No products on sale yet. Add some from the catalogue.
                      </td>
                    </tr>
                  ) : (
                    filteredSale.map((p) => {
                      const draft = drafts[p.id];
                      const saleVal = draft?.sale ?? String(p.sale_price ?? '');
                      const saleNum = Number(saleVal);
                      const off = pctOff(Number(p.price), saleNum);
                      return (
                        <tr key={p.id} className="border-t border-ui-100">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selected.has(p.id)}
                              onChange={(e) => {
                                const next = new Set(selected);
                                if (e.target.checked) next.add(p.id);
                                else next.delete(p.id);
                                setSelected(next);
                              }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="w-12 h-12 rounded-lg bg-ui-100 overflow-hidden shrink-0">
                                {thumb(p) && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={thumb(p)} alt="" className="w-full h-full object-cover" />
                                )}
                              </div>
                              <div>
                                <p className="font-semibold text-ui-900">{p.name}</p>
                                <p className="text-xs text-ui-500">{p.sku || p.slug} · {p.quantity} in stock</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 tabular-nums">GH₵{Number(p.price).toFixed(2)}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                value={saleVal}
                                onChange={(e) => {
                                  const sale = e.target.value;
                                  const pct = Number(p.price) ? String(pctOff(Number(p.price), Number(sale))) : '';
                                  setDrafts((d) => ({ ...d, [p.id]: { sale, pct } }));
                                }}
                                className="w-28 px-2 py-1.5 rounded-lg border border-ui-200"
                              />
                              <button
                                type="button"
                                onClick={() => saveDraft(p)}
                                className="text-xs font-bold text-brand-forest"
                              >
                                Save
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              max="90"
                              value={draft?.pct ?? String(off || '')}
                              onChange={(e) => {
                                const pct = e.target.value;
                                const sale = String(Math.round(Number(p.price) * (1 - Number(pct) / 100) * 100) / 100);
                                setDrafts((d) => ({ ...d, [p.id]: { sale, pct } }));
                              }}
                              className="w-20 px-2 py-1.5 rounded-lg border border-ui-200"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => updateProduct(p.id, { deal_of_day: !p.deal_of_day })}
                              className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                p.deal_of_day ? 'bg-brand-gold/30 text-brand-forest' : 'bg-ui-100 text-ui-500'
                              }`}
                            >
                              {p.deal_of_day ? 'Deal' : 'Off'}
                            </button>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button type="button" onClick={() => removeFromSale(p.id)} className="text-red-600 text-xs font-semibold">
                              Remove
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-ui-100 flex items-center justify-between">
              <h3 className="font-bold text-lg">Add products to the sale</h3>
              <button type="button" onClick={() => setPickerOpen(false)} className="w-9 h-9 rounded-full bg-ui-100">
                <i className="ri-close-line" />
              </button>
            </div>
            <div className="p-4 border-b border-ui-100">
              <input
                autoFocus
                value={pickerQuery}
                onChange={(e) => setPickerQuery(e.target.value)}
                placeholder="Search the catalogue…"
                className="w-full px-3 py-2 rounded-xl border border-ui-200"
              />
            </div>
            <div className="overflow-y-auto p-2">
              {pickerList.length === 0 ? (
                <p className="p-6 text-sm text-ui-500 text-center">Everything matching that search is already on sale.</p>
              ) : (
                pickerList.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToSale(p)}
                    className="w-full flex items-center justify-between gap-3 px-3 py-2 rounded-xl hover:bg-ui-50 text-left"
                  >
                    <div>
                      <p className="font-semibold">{p.name}</p>
                      <p className="text-xs text-ui-500">GH₵{Number(p.price).toFixed(2)} · {p.sku || p.slug}</p>
                    </div>
                    <span className="text-xs font-bold text-brand-forest">Add at 15% off</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ui-200 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-ui-500">{label}</p>
      <p className="text-2xl font-bold text-ui-900 mt-1">{value}</p>
    </div>
  );
}

export default function AdminSalesPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-ui-500">Loading sales…</div>}>
      <SalesHub />
    </Suspense>
  );
}
