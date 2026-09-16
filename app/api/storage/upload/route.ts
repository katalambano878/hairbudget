import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';
import { verifyToken } from '@/lib/db/jwt';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB (covers product videos)
const ALLOWED_BUCKETS = new Set(['products', 'avatars', 'blog', 'media', 'reviews']);
const PATH_RE = /^[a-zA-Z0-9._\/-]+$/;

/**
 * Admin file upload — stores objects in the storage_objects table.
 * multipart/form-data: bucket, path, file
 */
export async function POST(request: NextRequest) {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || '';
    const claims = token ? await verifyToken(token) : null;
    if (!claims || claims.type !== 'access' || !(claims.role === 'admin' || claims.role === 'staff')) {
        return NextResponse.json({ error: { message: 'Admin access required' } }, { status: 401 });
    }

    let form: FormData;
    try {
        form = await request.formData();
    } catch {
        return NextResponse.json({ error: { message: 'Expected multipart form data' } }, { status: 400 });
    }

    const bucket = String(form.get('bucket') || '');
    const path = String(form.get('path') || '');
    const file = form.get('file');

    if (!ALLOWED_BUCKETS.has(bucket)) {
        return NextResponse.json({ error: { message: `Unknown bucket: ${bucket}` } }, { status: 400 });
    }
    if (!path || !PATH_RE.test(path) || path.includes('..')) {
        return NextResponse.json({ error: { message: 'Invalid file path' } }, { status: 400 });
    }
    if (!(file instanceof Blob)) {
        return NextResponse.json({ error: { message: 'Missing file' } }, { status: 400 });
    }
    if (file.size > MAX_UPLOAD_BYTES) {
        return NextResponse.json({ error: { message: 'File too large (max 25 MB)' } }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const contentType = (form.get('contentType') as string) || file.type || 'application/octet-stream';

    try {
        await pool.query(
            `INSERT INTO public.storage_objects (bucket, path, content_type, size, data)
             VALUES ($1, $2, $3, $4, $5)
             ON CONFLICT (bucket, path)
             DO UPDATE SET content_type = EXCLUDED.content_type, size = EXCLUDED.size, data = EXCLUDED.data`,
            [bucket, path, contentType, buffer.length, buffer]
        );
        return NextResponse.json({
            data: { path, fullPath: `${bucket}/${path}` },
            error: null,
        });
    } catch (err: any) {
        console.error('[storage/upload] error:', err);
        return NextResponse.json({ error: { message: 'Upload failed' } }, { status: 500 });
    }
}
