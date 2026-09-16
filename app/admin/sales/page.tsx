'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { parseStorePricingValue } from '@/lib/pricing';

export default function AdminSalesPage() {
  const [salesActive, setSalesActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();
        setIsAdmin(profile?.role === 'admin');
      } else {
        setIsAdmin(false);
      }

      const { data, error: fetchError } = await supabase
        .from('site_settings')
        .select('id, value')
        .eq('key', 'store_pricing')
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
        setSalesActive(false);
        return;
      }

      setSalesActive(parseStorePricingValue(data?.value).sales_active);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleToggle = async (next: boolean) => {
    if (!isAdmin) return;
    setSaving(true);
    setError(null);
    try {
      const { error: upsertError } = await supabase.from('site_settings').upsert(
        {
          key: 'store_pricing',
          value: { sales_active: next },
          category: 'pricing',
        },
        { onConflict: 'key' }
      );
      if (upsertError) throw upsertError;
      setSalesActive(next);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh] text-gray-500">
        <i className="ri-loader-4-line text-3xl animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Sale pricing</h1>
        <p className="text-gray-600 mt-1">
          Turn on site-wide sale mode so customers see each product&apos;s <strong>sale price</strong> (set
          per product in Products → Pricing) instead of the regular price. Products without a sale price
          keep the regular price.
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-800 text-sm border border-red-100">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Store-wide sale</h2>
            <p className="text-sm text-gray-500 mt-1">
              Current status:{' '}
              <span className={salesActive ? 'text-red-600 font-medium' : 'text-gray-700 font-medium'}>
                {salesActive ? 'ON — sale prices active' : 'OFF — regular prices'}
              </span>
            </p>
          </div>
          {isAdmin ? (
            <button
              type="button"
              disabled={saving}
              onClick={() => handleToggle(!salesActive)}
              className={`relative inline-flex h-10 w-[3.5rem] shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 ${
                salesActive ? 'bg-red-600' : 'bg-gray-300'
              } ${saving ? 'opacity-60 cursor-wait' : ''}`}
              role="switch"
              aria-checked={salesActive}
            >
              <span
                className={`pointer-events-none inline-block h-9 w-9 transform rounded-full bg-white shadow ring-0 transition ${
                  salesActive ? 'translate-x-[1.4rem]' : 'translate-x-0.5'
                }`}
              />
            </button>
          ) : (
            <p className="text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg border border-blue-100">
              Only administrators can change this setting.
            </p>
          )}
        </div>
        {isAdmin && (
          <p className="text-xs text-gray-500 mt-4">
            Tip: After toggling, refresh the storefront if you have it open. Cart totals use prices from when
            items were added; checkout always uses current sale rules.
          </p>
        )}
      </div>
    </div>
  );
}
