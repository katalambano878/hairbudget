'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

type BlogStatus = 'draft' | 'published' | 'archived';

type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  featured_image: string | null;
  status: BlogStatus;
  published_at: string | null;
  created_at: string;
  tags: string[] | null;
  author_id: string | null;
  author: string;
};

export default function AdminBlogPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | BlogStatus>('all');
  const [tagFilter, setTagFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'title'>('date');

  const fetchPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      const rows = data || [];
      const authorIds = [...new Set(rows.map((p: any) => p.author_id).filter(Boolean))];
      const { data: profiles } = authorIds.length
        ? await supabase.from('profiles').select('id, full_name, email').in('id', authorIds)
        : { data: [] as any[] };
      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

      setPosts(
        rows.map((p: any) => {
          const profile = profileMap.get(p.author_id);
          return {
            id: p.id,
            title: p.title,
            slug: p.slug,
            excerpt: p.excerpt || '',
            featured_image: p.featured_image,
            status: (String(p.status || 'draft').toLowerCase() as BlogStatus),
            published_at: p.published_at,
            created_at: p.created_at,
            tags: p.tags,
            author_id: p.author_id,
            author: profile?.full_name || profile?.email || 'Editor',
          };
        })
      );
    } catch (err: any) {
      console.error('Error fetching blog posts:', err);
      setError(err?.message || 'Failed to load posts');
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const tags = useMemo(
    () => [...new Set(posts.flatMap((p) => p.tags || []).filter(Boolean))].sort(),
    [posts]
  );

  const filteredPosts = useMemo(() => {
    const list = posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (tagFilter !== 'all' && !(p.tags || []).includes(tagFilter)) return false;
      return true;
    });
    const sorted = [...list];
    if (sortBy === 'title') sorted.sort((a, b) => a.title.localeCompare(b.title));
    else {
      sorted.sort((a, b) => {
        const aDate = new Date(a.published_at || a.created_at).getTime();
        const bDate = new Date(b.published_at || b.created_at).getTime();
        return bDate - aDate;
      });
    }
    return sorted;
  }, [posts, statusFilter, tagFilter, sortBy]);

  const statusColors: Record<BlogStatus, string> = {
    published: 'bg-emerald-100 text-emerald-800',
    draft: 'bg-gray-100 text-gray-700',
    archived: 'bg-slate-100 text-slate-700',
  };

  const handleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) setSelectedPosts([]);
    else setSelectedPosts(filteredPosts.map((p) => p.id));
  };

  const handleSelectPost = (postId: string) => {
    setSelectedPosts((prev) =>
      prev.includes(postId) ? prev.filter((id) => id !== postId) : [...prev, postId]
    );
  };

  const updateStatus = async (ids: string[], status: BlogStatus) => {
    if (!ids.length) return;
    setBusy(true);
    try {
      const patch: Record<string, any> = { status };
      if (status === 'published') patch.published_at = new Date().toISOString();
      const { error: updateError } = await supabase.from('blog_posts').update(patch).in('id', ids);
      if (updateError) throw updateError;
      setSelectedPosts([]);
      await fetchPosts();
    } catch (err: any) {
      alert(err?.message || 'Failed to update posts');
    } finally {
      setBusy(false);
    }
  };

  const deletePosts = async (ids: string[]) => {
    if (!ids.length) return;
    if (!confirm(`Delete ${ids.length} post${ids.length > 1 ? 's' : ''}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const { error: deleteError } = await supabase.from('blog_posts').delete().in('id', ids);
      if (deleteError) throw deleteError;
      setSelectedPosts((prev) => prev.filter((id) => !ids.includes(id)));
      await fetchPosts();
    } catch (err: any) {
      alert(err?.message || 'Failed to delete posts');
    } finally {
      setBusy(false);
    }
  };

  const formatDate = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString() : '—';

  return (
    <div className="space-y-6 tracking-normal">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-normal">Blog Posts</h1>
          <p className="text-gray-600 mt-1 tracking-normal">Create and manage your blog content</p>
        </div>
        <Link
          href="/admin/blog/new"
          className="bg-slate-700 hover:bg-slate-800 text-white px-6 py-3 rounded-lg font-semibold transition-colors whitespace-nowrap"
        >
          <i className="ri-add-line mr-2" />
          New Post
        </Link>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Total Posts</p>
          <p className="text-2xl font-bold text-gray-900">{posts.length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Published</p>
          <p className="text-2xl font-bold text-slate-700">{posts.filter((p) => p.status === 'published').length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Drafts</p>
          <p className="text-2xl font-bold text-gray-900">{posts.filter((p) => p.status === 'draft').length}</p>
        </div>
        <div className="bg-white rounded-xl border-2 border-gray-200 p-4">
          <p className="text-sm text-gray-600 mb-1">Archived</p>
          <p className="text-2xl font-bold text-slate-700">{posts.filter((p) => p.status === 'archived').length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                className="px-4 py-2 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-medium cursor-pointer"
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="archived">Archived</option>
              </select>
              <select
                value={tagFilter}
                onChange={(e) => setTagFilter(e.target.value)}
                className="px-4 py-2 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-medium cursor-pointer"
              >
                <option value="all">All Categories</option>
                {tags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="px-4 py-2 pr-8 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 font-medium cursor-pointer"
              >
                <option value="date">Sort by Date</option>
                <option value="title">Sort by Title</option>
              </select>
            </div>
            <div className="flex border-2 border-gray-300 rounded-lg overflow-hidden">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-10 h-10 flex items-center justify-center transition-colors ${
                  viewMode === 'grid' ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className="ri-grid-line text-xl" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`w-10 h-10 flex items-center justify-center border-l-2 border-gray-300 transition-colors ${
                  viewMode === 'list' ? 'bg-slate-700 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <i className="ri-list-check text-xl" />
              </button>
            </div>
          </div>
        </div>

        {selectedPosts.length > 0 && (
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <p className="text-slate-800 font-semibold">
              {selectedPosts.length} post{selectedPosts.length > 1 ? 's' : ''} selected
            </p>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => updateStatus(selectedPosts, 'published')}
                className="px-4 py-2 bg-slate-600 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50"
              >
                Publish
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => updateStatus(selectedPosts, 'draft')}
                className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50"
              >
                Draft
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => deletePosts(selectedPosts)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap disabled:opacity-50"
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="p-10 text-center text-gray-500">Loading posts...</p>
        ) : filteredPosts.length === 0 ? (
          <p className="p-10 text-center text-gray-500">No blog posts yet. Create one to get started.</p>
        ) : viewMode === 'grid' ? (
          <div className="p-6 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredPosts.map((post) => (
              <div key={post.id} className="border-2 border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-shadow">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={selectedPosts.includes(post.id)}
                    onChange={() => handleSelectPost(post.id)}
                    className="absolute top-3 left-3 w-5 h-5 text-slate-700 border-gray-300 rounded focus:ring-slate-500 cursor-pointer z-10"
                  />
                  <div className="aspect-video bg-gray-100 overflow-hidden">
                    {post.featured_image ? (
                      <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-gray-400">
                        <i className="ri-image-line text-3xl" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-slate-700">{post.tags?.[0] || 'Uncategorized'}</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold capitalize ${statusColors[post.status]}`}>
                      {post.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2 line-clamp-2">{post.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{post.excerpt || 'No excerpt'}</p>
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-4 pb-4 border-b border-gray-200">
                    <span>{post.author}</span>
                    <span className="whitespace-nowrap">{formatDate(post.published_at || post.created_at)}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/admin/blog/${post.id}`}
                      className="flex-1 bg-slate-700 hover:bg-slate-800 text-white py-2 rounded-lg text-sm font-medium text-center transition-colors whitespace-nowrap"
                    >
                      Edit Post
                    </Link>
                    <button
                      type="button"
                      disabled={busy}
                      title="Delete"
                      onClick={() => deletePosts([post.id])}
                      className="w-9 h-9 flex items-center justify-center border-2 border-gray-300 text-gray-700 hover:border-red-600 hover:text-red-600 rounded-lg transition-colors"
                    >
                      <i className="ri-delete-bin-line" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-4 px-6">
                    <input
                      type="checkbox"
                      checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-slate-700 border-gray-300 rounded focus:ring-slate-500 cursor-pointer"
                    />
                  </th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Post</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Author</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Category</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Status</th>
                  <th className="text-left py-4 px-4 text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-6">
                      <input
                        type="checkbox"
                        checked={selectedPosts.includes(post.id)}
                        onChange={() => handleSelectPost(post.id)}
                        className="w-4 h-4 text-slate-700 border-gray-300 rounded focus:ring-slate-500 cursor-pointer"
                      />
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-20 h-14 bg-gray-100 rounded-lg overflow-hidden">
                          {post.featured_image ? (
                            <img src={post.featured_image} alt={post.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full grid place-items-center text-gray-400">
                              <i className="ri-image-line" />
                            </div>
                          )}
                        </div>
                        <div>
                          <Link href={`/admin/blog/${post.id}`} className="font-semibold text-gray-900 hover:text-slate-700">
                            {post.title}
                          </Link>
                          <p className="text-sm text-gray-500 mt-1">{formatDate(post.published_at || post.created_at)}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-gray-700">{post.author}</td>
                    <td className="py-4 px-4 text-gray-700">{post.tags?.[0] || '—'}</td>
                    <td className="py-4 px-4">
                      <span className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap capitalize ${statusColors[post.status]}`}>
                        {post.status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center space-x-2">
                        <Link
                          href={`/admin/blog/${post.id}`}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <i className="ri-edit-line text-lg" />
                        </Link>
                        <a
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-colors"
                        >
                          <i className="ri-eye-line text-lg" />
                        </a>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => deletePosts([post.id])}
                          className="w-8 h-8 flex items-center justify-center text-gray-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <i className="ri-delete-bin-line text-lg" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="p-6 border-t border-gray-200">
          <p className="text-gray-600">Showing {filteredPosts.length} posts</p>
        </div>
      </div>
    </div>
  );
}
