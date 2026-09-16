import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';
import { verifyStorageUploadToken } from '@/lib/db/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
const ALLOWED_BUCKETS = new Set(['products', 'avatars', 'blog', 'media', 'reviews']);
const PATH_RE = /^[a-zA-Z0-9._\/-]+$/;

/**
 * Public file serving from the storage_objects table.
 * GET /api/storage/<bucket>/<path...>
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
    const { bucket, path } = await params;
    const objectPath = (path || []).join('/');

    if (!bucket || !objectPath) {
        return new NextResponse('Not found', { status: 404 });
    }

    try {
        const res = await pool.query(
            'SELECT content_type, data FROM public.storage_objects WHERE bucket = $1 AND path = $2',
            [bucket, objectPath]
        );
        if (!res.rows.length) {
            return new NextResponse('Not found', { status: 404 });
        }
        const row = res.rows[0];
        return new NextResponse(row.data, {
            status: 200,
            headers: {
                'Content-Type': row.content_type || 'application/octet-stream',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (err) {
        console.error('[storage/serve] error:', err);
        return new NextResponse('Storage error', { status: 500 });
    }
}

/**
 * Signed PUT from the admin media uploader.
 * PUT /api/storage/<bucket>/<path...>?token=<storage-upload JWT>
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ bucket: string; path: string[] }> }
) {
    const { bucket, path } = await params;
    const objectPath = (path || []).join('/');
    const token = request.nextUrl.searchParams.get('token') || '';
    const claims = token ? await verifyStorageUploadToken(token) : null;

    if (!claims || claims.bucket !== bucket || claims.path !== objectPath) {
        return NextResponse.json({ error: { message: 'Invalid or expired upload token' } }, { status: 401 });
    }
    if (!ALLOWED_BUCKETS.has(bucket) || !PATH_RE.test(objectPath) || objectPath.includes('..')) {
        return NextResponse.json({ error: { message: 'Invalid file path' } }, { status: 400 });
    }

    const buffer = Buffer.from(await request.arrayBuffer());
    if (!buffer.length) {
        return NextResponse.json({ error: { message: 'Missing file' } }, { status: 400 });
    }
    if (buffer.length > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: { message: 'File too large (max 50 MB)' } }, { status: 413 });
    }

    const contentType = request.headers.get('content-type') || 'application/octet-stream';

    try {
        await pool.query(
            `INSERT INTO public.storage_objects (bucket, path, content_type, size, data)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (bucket, path)
             DO UPDATE SET content_type = EXCLUDED.content_type, size = EXCLUDED.size, data = EXCLUDED.data`,
            [bucket, objectPath, contentType, buffer.length, buffer]
        );
        return NextResponse.json({ data: { path: objectPath }, error: null });
    } catch (err) {
        console.error('[storage/put] error:', err);
        return NextResponse.json({ error: { message: 'Upload failed' } }, { status: 500 });
    }
}
