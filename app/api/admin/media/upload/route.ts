import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { supabaseAdmin } from '@/lib/supabase-admin';

export const runtime = 'nodejs';

const MAX_BYTES = 50 * 1024 * 1024; // 50 MB — matches Supabase products bucket limit
const BUCKET = 'products';

const VIDEO_EXTS = new Set(['mp4', 'webm', 'ogg', 'mov', 'avi', 'm4v', 'mpeg', 'mpg']);
const IMAGE_EXTS = new Set(['jpg', 'jpeg', 'png', 'webp', 'gif']);

const EXT_TO_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  webm: 'video/webm',
  ogg: 'video/ogg',
  mov: 'video/quicktime',
  avi: 'video/x-msvideo',
  m4v: 'video/x-m4v',
  mpeg: 'video/mpeg',
  mpg: 'video/mpeg',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
};

const ALLOWED_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/jpg',
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-m4v',
  'video/mpeg',
]);

function sanitizeExt(name: string): string {
  const raw = (name.split('.').pop() || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  return raw || 'bin';
}

function resolveContentType(filename: string, provided?: string | null): string {
  const ext = sanitizeExt(filename);
  if (provided && ALLOWED_MIME.has(provided)) return provided;
  return EXT_TO_MIME[ext] || 'application/octet-stream';
}

/**
 * POST /api/admin/media/upload
 * Body JSON: { filename: string, contentType?: string, size: number }
 *
 * Returns a Supabase signed upload URL so the browser can put the file
 * directly into the products bucket (bypasses RLS + Coolify body limits).
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request, { requireAdmin: true });
    if (!auth.authenticated) {
      return NextResponse.json(
        { success: false, data: null, error: auth.error || 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body.filename !== 'string' || typeof body.size !== 'number') {
      return NextResponse.json(
        { success: false, data: null, error: 'filename and size are required' },
        { status: 400 }
      );
    }

    const filename = body.filename as string;
    const size = body.size as number;
    const ext = sanitizeExt(filename);

    if (!IMAGE_EXTS.has(ext) && !VIDEO_EXTS.has(ext)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: 'Unsupported file type. Use JPG/PNG/WebP/GIF or MP4/WebM/MOV/AVI.',
        },
        { status: 400 }
      );
    }

    if (size <= 0) {
      return NextResponse.json(
        { success: false, data: null, error: 'Invalid file size' },
        { status: 400 }
      );
    }

    if (size > MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: `File is too large (${(size / (1024 * 1024)).toFixed(1)} MB). Max is 50 MB. Compress the video (720p MP4) and try again.`,
        },
        { status: 413 }
      );
    }

    const contentType = resolveContentType(filename, body.contentType);
    if (!ALLOWED_MIME.has(contentType)) {
      return NextResponse.json(
        {
          success: false,
          data: null,
          error: `MIME type "${contentType}" is not allowed on the products bucket.`,
        },
        { status: 400 }
      );
    }

    const path = `media/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ext}`;

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUploadUrl(path);

    if (error || !data) {
      console.error('[admin/media/upload] signed URL failed:', error);
      return NextResponse.json(
        { success: false, data: null, error: error?.message || 'Could not create upload URL' },
        { status: 500 }
      );
    }

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);

    return NextResponse.json({
      success: true,
      data: {
        path: data.path || path,
        token: data.token,
        signedUrl: data.signedUrl,
        publicUrl: pub.publicUrl,
        contentType,
        isVideo: VIDEO_EXTS.has(ext),
        maxBytes: MAX_BYTES,
      },
      error: null,
    });
  } catch (err: any) {
    console.error('[admin/media/upload]', err);
    return NextResponse.json(
      { success: false, data: null, error: err?.message || 'Upload init failed' },
      { status: 500 }
    );
  }
}
