'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { firstProductThumb } from '@/lib/product-image';

type ReviewStatus = 'pending' | 'approved' | 'rejected';

type AdminReview = {
  id: string;
  rating: number;
  title: string;
  comment: string;
  date: string;
  createdAt: string;
  status: ReviewStatus;
  helpful: number;
  customer: { name: string; email: string; avatar: string };
  product: { name: string; image: string };
};

function getInitials(name: string) {
  if (!name) return '??';
  return (
    name
      .replace(/[^a-zA-Z ]/g, '')
      .split(' ')
      .map((n) => n?.[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || '??'
  );
}

export default function AdminReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<'all' | ReviewStatus>('all');
  const [sortBy, setSortBy] = useState<'date' | 'rating' | 'helpful'>('date');
  const [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      const { data, error: reviewError } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (reviewError) throw reviewError;

      const rows = data || [];
      const productIds = [...new Set(rows.map((r: any) => r.product_id).filter(Boolean))];
      const userIds = [...new Set(rows.map((r: any) => r.user_id).filter(Boolean))];

      const [{ data: products }, { data: profiles }] = await Promise.all([
        productIds.length
          ? supabase.from('products').select('id, name, product_images(url, position)').in('id', productIds)
          : Promise.resolve({ data: [] as any[] }),
        userIds.length
          ? supabase.from('profiles').select('id, full_name, email').in('id', userIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const productMap = new Map((products || []).map((p: any) => [p.id, p]));
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setReviews(
        rows.map((r: any) => {
          const product = productMap.get(r.product_id);
          const profile = profileMap.get(r.user_id);
          const name = profile?.full_name || profile?.email || 'Anonymous';
          const status = (String(r.status || 'pending').toLowerCase() as ReviewStatus);
          return {
            id: r.id,
            rating: Number(r.rating) || 0,
            title: r.title || '',
            comment: r.content || '',
            date: r.created_at ? new Date(r.created_at).toLocaleDateString() : '',
            createdAt: r.created_at,
            status: ['pending', 'approved', 'rejected'].includes(status) ? status : 'pending',
            helpful: r.helpful_votes || 0,
            customer: {
              name,
              email: profile?.email || 'N/A',
              avatar: getInitials(name),
            },
            product: {
              name: product?.name || 'Unknown product',
              image: firstProductThumb(product?.product_images) || '',
            },
          };
        })
      );
    } catch (err: any) {
      console.error('Error fetching reviews:', err);
      setError(err?.message || 'Failed to load reviews');
      setReviews([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const filteredReviews = useMemo(() => {
    const list = reviews.filter((r) => statusFilter === 'all' || r.status === statusFilter);
    const sorted = [...list];
    if (sortBy === 'rating') sorted.sort((a, b) => b.rating - a.rating);
    else if (sortBy === 'helpful') sorted.sort((a, b) => b.helpful - a.helpful);
    else sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return sorted;
  }, [reviews, statusFilter, sortBy]);

  const stats = {
    total: reviews.length,
    pending: reviews.filter((r) => r.status === 'pending').length,
    approved: reviews.filter((r) => r.status === 'approved').length,
    rejected: reviews.filter((r) => r.status === 'rejected').length,
  };

  const statusColors: Record<ReviewStatus, string> = {
    pending: 'bg-amber-100 text-amber-800',
    approved: 'bg-emerald-100 text-emerald-800',
    rejected: 'bg-red-100 text-red-700',
  };

  const handleSelectAll = () => {
    if (selectedReviews.length === filteredReviews.length) {
      setSelectedReviews([]);
    } else {
      setSelectedReviews(filteredReviews.map((r) => r.id));
    }
  };

  const handleSelectReview = (reviewId: string) => {
    setSelectedReviews((prev) =>
      prev.includes(reviewId) ? prev.filter((id) => id !== reviewId) : [...prev, reviewId]
    );
  };

  const updateStatus = async (ids: string[], status: ReviewStatus) => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const { error: updateError } = await supabase.from('reviews').update({ status }).in('id', ids);
      if (updateError) throw updateError;
      setSelectedReviews([]);
      await fetchReviews();
    } catch (err: any) {
      alert(err?.message || 'Failed to update reviews');
    } finally {
      setBusy(false);
    }
  };

  const deleteReviews = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} review${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const { error: imageError } = await supabase.from('review_images').delete().in('review_id', ids);
      if (imageError) throw imageError;
      const { error: deleteError } = await supabase.from('reviews').delete().in('id', ids);
      if (deleteError) throw deleteError;
      setSelectedReviews((prev) => prev.filter((id) => !ids.includes(id)));
      await fetchReviews();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete reviews');
    } finally {
      setBusy(false);
    }
  };

  const renderStars = (rating: number) => (
    <div className="flex items-center space-x-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <i
          key={star}
          className={`${star <= rating ? 'ri-star-fill text-amber-500' : 'ri-star-line text-gray-300'} text-lg`}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-6 tracking-normal">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 tracking-normal">Reviews</h1>
        <p className="text-gray-600 mt-1 tracking-normal">Moderate and manage customer reviews</p>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          type="button"
          onClick={() => setStatusFilter('all')}
          className={`p-4 rounded-xl border-2 transition-all text-left ${statusFilter === 'all' ? 'border-slate-700 bg-slate-50' : 'border-gray-200 bg-white'}`}
        >
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          <p className="text-sm text-gray-600 mt-1">Total Reviews</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('pending')}
          className={`p-4 rounded-xl border-2 transition-all text-left ${statusFilter === 'pending' ? 'border-amber-600 bg-amber-50' : 'border-gray-200 bg-white'}`}
        >
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
          <p className="text-sm text-gray-600 mt-1">Pending Review</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('approved')}
          className={`p-4 rounded-xl border-2 transition-all text-left ${statusFilter === 'approved' ? 'border-emerald-700 bg-emerald-50' : 'border-gray-200 bg-white'}`}
        >
          <p className="text-2xl font-bold text-emerald-700">{stats.approved}</p>
          <p className="text-sm text-gray-600 mt-1">Approved</p>
        </button>
        <button
          type="button"
          onClick={() => setStatusFilter('rejected')}
          className={`p-4 rounded-xl border-2 transition-all text-left ${statusFilter === 'rejected' ? 'border-red-700 bg-red-50' : 'border-gray-200 bg-white'}`}
        >
          <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
          <p className="text-sm text-gray-600 mt-1">Rejected</p>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-gray-900 capitalize tracking-normal">
              {statusFilter === 'all' ? 'All Reviews' : `${statusFilter} Reviews`}
            </h2>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-4 py-2 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-medium cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="rating">Sort by Rating</option>
              <option value="helpful">Sort by Helpful</option>
            </select>
          </div>
        </div>

        {selectedReviews.length > 0 && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <p className="text-slate-800 font-semibold">
              {selectedReviews.length} review{selectedReviews.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => updateStatus(selectedReviews, 'approved')}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <i className="ri-check-line mr-2" />
                Approve
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => updateStatus(selectedReviews, 'rejected')}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <i className="ri-close-line mr-2" />
                Reject
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => deleteReviews(selectedReviews)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
              >
                <i className="ri-delete-bin-line mr-2" />
                Delete
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="py-4 px-6">
                  <input
                    type="checkbox"
                    checked={selectedReviews.length === filteredReviews.length && filteredReviews.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-slate-700 border-gray-300 rounded focus:ring-slate-500 cursor-pointer"
                  />
                </th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 w-1/4">Product</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 w-1/4">Customer</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700 w-1/3">Review</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Date</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    Loading reviews...
                  </td>
                </tr>
              ) : filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No reviews found in this category.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((review) => (
                  <tr key={review.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedReviews.includes(review.id)}
                        onChange={() => handleSelectReview(review.id)}
                        className="w-4 h-4 text-slate-700 border-gray-300 rounded focus:ring-slate-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        {review.product.image ? (
                          <img
                            src={review.product.image}
                            alt={review.product.name}
                            className="w-12 h-12 rounded-lg object-cover border border-gray-100"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-gray-100 grid place-items-center text-gray-400">
                            <i className="ri-image-line" />
                          </div>
                        )}
                        <span className="text-sm font-medium text-gray-900 line-clamp-2">{review.product.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                          {review.customer.avatar}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{review.customer.name}</p>
                          <p className="text-xs text-gray-500">{review.customer.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="space-y-1">
                        {renderStars(review.rating)}
                        <p className="text-sm font-bold text-gray-900">{review.title}</p>
                        <p className="text-sm text-gray-600 line-clamp-2">{review.comment}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-gray-600 whitespace-nowrap">{review.date}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap capitalize ${statusColors[review.status]}`}>
                        {review.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-1">
                        {review.status !== 'approved' && (
                          <button
                            type="button"
                            disabled={busy}
                            title="Approve"
                            onClick={() => updateStatus([review.id], 'approved')}
                            className="w-8 h-8 grid place-items-center text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg"
                          >
                            <i className="ri-check-line text-lg" />
                          </button>
                        )}
                        {review.status !== 'rejected' && (
                          <button
                            type="button"
                            disabled={busy}
                            title="Reject"
                            onClick={() => updateStatus([review.id], 'rejected')}
                            className="w-8 h-8 grid place-items-center text-gray-600 hover:text-amber-700 hover:bg-amber-50 rounded-lg"
                          >
                            <i className="ri-close-line text-lg" />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={busy}
                          title="Delete"
                          onClick={() => deleteReviews([review.id])}
                          className="w-8 h-8 grid place-items-center text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg"
                        >
                          <i className="ri-delete-bin-line text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-6 border-t border-gray-200">
          <p className="text-gray-600 text-sm">Showing {filteredReviews.length} reviews</p>
        </div>
      </div>
    </div>
  );
}
