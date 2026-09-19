'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  couponStatus,
  normalizeCouponCode,
  type CouponRow,
  type CouponType,
} from '@/lib/coupons';

const EMPTY: CouponRow = {
  code: '',
  description: '',
  type: 'percentage',
  value: 10,
  minimum_purchase: 0,
  maximum_discount: null,
  usage_limit: null,
  start_date: null,
  end_date: null,
  is_active: true,
};

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-800',
  scheduled: 'bg-sky-50 text-sky-800',
  expired: 'bg-ui-100 text-ui-600',
  disabled: 'bg-red-50 text-red-700',
  exhausted: 'bg-amber-50 text-amber-800',
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<CouponRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CouponRow | null>(null);
  const [form, setForm] = useState<CouponRow>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('coupons')
        .select('*')
        .order('created_at', { ascending: false });
      if (fetchError) throw fetchError;
      setCoupons((data || []) as CouponRow[]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load coupons');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, code: '' });
    setOpen(true);
  };

  const openEdit = (c: CouponRow) => {
    setEditing(c);
    setForm({
      ...c,
      start_date: c.start_date ? String(c.start_date).slice(0, 16) : '',
      end_date: c.end_date ? String(c.end_date).slice(0, 16) : '',
    });
    setOpen(true);
  };

  const save = async () => {
    const code = normalizeCouponCode(form.code);
    if (!code) {
      setError('Code is required');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = {
        code,
        description: form.description || null,
        type: form.type,
        value: Number(form.value) || 0,
        minimum_purchase: Number(form.minimum_purchase) || 0,
        maximum_discount: form.maximum_discount ? Number(form.maximum_discount) : null,
        usage_limit: form.usage_limit ? Number(form.usage_limit) : null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        is_active: form.is_active !== false,
      };
      if (editing?.id) {
        const { error: updateError } = await supabase.from('coupons').update(payload).eq('id', editing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('coupons').insert(payload);
        if (insertError) throw insertError;
      }
      setOpen(false);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not save coupon');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (c: CouponRow) => {
    if (!c.id || !confirm(`Delete ${c.code}?`)) return;
    const { error: deleteError } = await supabase.from('coupons').delete().eq('id', c.id);
    if (deleteError) setError(deleteError.message);
    else await load();
  };

  const toggle = async (c: CouponRow) => {
    if (!c.id) return;
    const { error: updateError } = await supabase.from('coupons').update({ is_active: !c.is_active }).eq('id', c.id);
    if (updateError) setError(updateError.message);
    else await load();
  };

  const rows = useMemo(() => {
    let list = coupons.map((c) => ({ ...c, _status: couponStatus(c) }));
    if (statusFilter !== 'all') list = list.filter((c) => c._status === statusFilter);
    if (sortBy === 'usage') list = [...list].sort((a, b) => Number(b.usage_count || 0) - Number(a.usage_count || 0));
    if (sortBy === 'value') list = [...list].sort((a, b) => Number(b.value || 0) - Number(a.value || 0));
    return list;
  }, [coupons, statusFilter, sortBy]);

  const active = coupons.filter((c) => couponStatus(c) === 'active');
  const uses = coupons.reduce((s, c) => s + Number(c.usage_count || 0), 0);

  const valueLabel = (c: CouponRow) => {
    if (c.type === 'percentage') return `${c.value}%`;
    if (c.type === 'fixed_amount') return `GH₵ ${Number(c.value).toFixed(2)}`;
    return 'Free shipping';
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold text-ui-900">Coupons & Promotions</h1>
          <p className="text-ui-500 mt-1">Create discount codes. Customers apply them in the cart; checkout honours them.</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="bg-brand-forest text-brand-ivory px-5 py-3 rounded-xl font-semibold"
        >
          + Create coupon
        </button>
      </div>

      {error && <div className="p-4 rounded-xl bg-red-50 text-red-800 text-sm">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Total coupons" value={String(coupons.length)} />
        <Card label="Active" value={String(active.length)} />
        <Card label="Total uses" value={String(uses)} />
        <Card label="Types" value="% · GH₵ · Ship" />
      </div>

      <div className="bg-white rounded-2xl border border-ui-200">
        <div className="p-4 border-b border-ui-100 flex flex-wrap gap-3 justify-between">
          <h2 className="font-bold">All coupons</h2>
          <div className="flex gap-2">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-ui-200 text-sm">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="scheduled">Scheduled</option>
              <option value="expired">Expired</option>
              <option value="disabled">Disabled</option>
              <option value="exhausted">Exhausted</option>
            </select>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="px-3 py-2 rounded-xl border border-ui-200 text-sm">
              <option value="date">Sort by date</option>
              <option value="usage">Sort by usage</option>
              <option value="value">Sort by value</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ui-50 text-left text-ui-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Code</th>
                <th className="px-4 py-3 font-semibold">Value</th>
                <th className="px-4 py-3 font-semibold">Min</th>
                <th className="px-4 py-3 font-semibold">Usage</th>
                <th className="px-4 py-3 font-semibold">Dates</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="p-8 text-center text-ui-500">Loading…</td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7} className="p-8 text-center text-ui-500">No coupons yet.</td></tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id} className="border-t border-ui-100">
                    <td className="px-4 py-3">
                      <span className="font-mono font-bold bg-ui-50 px-2 py-1 rounded">{c.code}</span>
                      {c.description && <p className="text-xs text-ui-500 mt-1">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-semibold">{valueLabel(c)}</td>
                    <td className="px-4 py-3">{Number(c.minimum_purchase || 0) > 0 ? `GH₵${Number(c.minimum_purchase).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3">{c.usage_count || 0} / {c.usage_limit ?? '∞'}</td>
                    <td className="px-4 py-3 text-xs text-ui-500">
                      {c.start_date ? new Date(c.start_date).toLocaleDateString() : 'Now'}
                      {' → '}
                      {c.end_date ? new Date(c.end_date).toLocaleDateString() : 'No end'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${STATUS_STYLES[c._status] || ''}`}>
                        {c._status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <button type="button" onClick={() => toggle(c)} className="text-xs font-semibold mr-3">
                        {c.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button type="button" onClick={() => openEdit(c)} className="text-xs font-semibold mr-3">Edit</button>
                      <button type="button" onClick={() => remove(c)} className="text-xs font-semibold text-red-600">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold">{editing ? 'Edit coupon' : 'Create coupon'}</h2>
            <Field label="Code">
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 rounded-xl border border-ui-200 font-mono"
                placeholder="WELCOME10"
              />
            </Field>
            <Field label="Description">
              <input
                value={form.description || ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-ui-200"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value as CouponType })}
                  className="w-full px-3 py-2 rounded-xl border border-ui-200"
                >
                  <option value="percentage">Percentage</option>
                  <option value="fixed_amount">Fixed amount</option>
                  <option value="free_shipping">Free shipping</option>
                </select>
              </Field>
              <Field label={form.type === 'percentage' ? 'Percent' : 'Amount (GH₵)'}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.value}
                  onChange={(e) => setForm({ ...form, value: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-ui-200"
                  disabled={form.type === 'free_shipping'}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Minimum purchase">
                <input
                  type="number"
                  min="0"
                  value={form.minimum_purchase || 0}
                  onChange={(e) => setForm({ ...form, minimum_purchase: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-ui-200"
                />
              </Field>
              <Field label="Max discount (optional)">
                <input
                  type="number"
                  min="0"
                  value={form.maximum_discount || ''}
                  onChange={(e) => setForm({ ...form, maximum_discount: e.target.value ? Number(e.target.value) : null })}
                  className="w-full px-3 py-2 rounded-xl border border-ui-200"
                />
              </Field>
            </div>
            <Field label="Usage limit (blank = unlimited)">
              <input
                type="number"
                min="1"
                value={form.usage_limit || ''}
                onChange={(e) => setForm({ ...form, usage_limit: e.target.value ? Number(e.target.value) : null })}
                className="w-full px-3 py-2 rounded-xl border border-ui-200"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Starts">
                <input
                  type="datetime-local"
                  value={form.start_date || ''}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-xl border border-ui-200"
                />
              </Field>
              <Field label="Ends">
                <input
                  type="datetime-local"
                  value={form.end_date || ''}
                  onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
                  className="w-full px-3 py-2 rounded-xl border border-ui-200"
                />
              </Field>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_active !== false}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
              />
              Active
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-ui-200">
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={save}
                className="px-4 py-2 rounded-xl bg-brand-forest text-brand-ivory font-semibold disabled:opacity-50"
              >
                {saving ? 'Saving…' : 'Save coupon'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-2xl border border-ui-200 p-4">
      <p className="text-sm text-ui-500">{label}</p>
      <p className="text-2xl font-bold text-ui-900 mt-1">{value}</p>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ui-500 mb-1">{label}</span>
      {children}
    </label>
  );
}
