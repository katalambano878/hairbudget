'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type BlogStatus = 'draft' | 'published' | 'archived';

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

export default function BlogEditor({ postId }: { postId?: string }) {
  const router = useRouter();
  const isNew = !postId;
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    title: '',
    slug: '',
    excerpt: '',
    content: '',
    featured_image: '',
    status: 'draft' as BlogStatus,
    tags: '',
  });
  const [slugTouched, setSlugTouched] = useState(false);

  useEffect(() => {
    if (!postId) return;
    (async () => {
      const { data, error: fetchError } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();
      if (fetchError || !data) {
        setError(fetchError?.message || 'Post not found');
        setLoading(false);
        return;
      }
      setForm({
        title: data.title || '',
        slug: data.slug || '',
        excerpt: data.excerpt || '',
        content: data.content || '',
        featured_image: data.featured_image || '',
        status: (String(data.status || 'draft').toLowerCase() as BlogStatus),
        tags: Array.isArray(data.tags) ? data.tags.join(', ') : '',
      });
      setSlugTouched(true);
      setLoading(false);
    })();
  }, [postId]);

  const setField = (key: keyof typeof form, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === 'title' && !slugTouched) next.slug = slugify(value);
      return next;
    });
  };

  const save = async (status = form.status) => {
    if (!form.title.trim() || !form.content.trim()) {
      setError('Title and content are required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const payload = {
        title: form.title.trim(),
        slug: slugify(form.slug || form.title) || `post-${Date.now()}`,
        excerpt: form.excerpt.trim() || null,
        content: form.content.trim(),
        featured_image: form.featured_image.trim() || null,
        status,
        tags: form.tags
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        published_at: status === 'published' ? new Date().toISOString() : null,
        author_id: session?.user?.id || null,
      };

      if (isNew) {
        const { error: insertError } = await supabase.from('blog_posts').insert([payload]);
        if (insertError) throw insertError;
      } else {
        const { error: updateError } = await supabase.from('blog_posts').update(payload).eq('id', postId);
        if (updateError) throw updateError;
      }
      router.push('/admin/blog');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Failed to save post');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <p className="p-8 text-gray-500">Loading post...</p>;

  return (
    <div className="max-w-3xl space-y-6 tracking-normal">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{isNew ? 'New Post' : 'Edit Post'}</h1>
          <p className="text-gray-600 mt-1">Write and publish HairBudget journal posts</p>
        </div>
        <Link href="/admin/blog" className="text-sm font-semibold text-slate-700">
          Back to posts
        </Link>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Title</span>
          <input
            value={form.title}
            onChange={(e) => setField('title', e.target.value)}
            className="mt-1 w-full border-2 border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Slug</span>
          <input
            value={form.slug}
            onChange={(e) => {
              setSlugTouched(true);
              setField('slug', e.target.value);
            }}
            className="mt-1 w-full border-2 border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Excerpt</span>
          <textarea
            value={form.excerpt}
            onChange={(e) => setField('excerpt', e.target.value)}
            rows={3}
            className="mt-1 w-full border-2 border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Content</span>
          <textarea
            value={form.content}
            onChange={(e) => setField('content', e.target.value)}
            rows={12}
            className="mt-1 w-full border-2 border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Featured image URL</span>
          <input
            value={form.featured_image}
            onChange={(e) => setField('featured_image', e.target.value)}
            className="mt-1 w-full border-2 border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Tags (comma separated)</span>
          <input
            value={form.tags}
            onChange={(e) => setField('tags', e.target.value)}
            className="mt-1 w-full border-2 border-gray-300 rounded-lg px-3 py-2"
          />
        </label>
        <label className="block">
          <span className="text-sm font-semibold text-gray-700">Status</span>
          <select
            value={form.status}
            onChange={(e) => setField('status', e.target.value)}
            className="mt-1 w-full border-2 border-gray-300 rounded-lg px-3 py-2"
          >
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
        </label>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={saving}
            onClick={() => save(form.status)}
            className="px-5 py-2.5 bg-slate-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => save('published')}
            className="px-5 py-2.5 bg-emerald-700 text-white rounded-lg font-semibold disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>
    </div>
  );
}
