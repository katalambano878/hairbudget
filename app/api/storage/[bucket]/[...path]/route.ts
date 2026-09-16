import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db/pool';

export const runtime = 'nodejs';

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
