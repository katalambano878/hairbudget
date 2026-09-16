-- Blog posts: display author name + category label for the storefront
-- (author_id references auth users, but posts are often bylined editorially).
ALTER TABLE public.blog_posts
  ADD COLUMN IF NOT EXISTS author_name text,
  ADD COLUMN IF NOT EXISTS category text;
