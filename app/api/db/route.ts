import { NextRequest, NextResponse } from 'next/server';
import { executeQuery, executeRpc } from '@/lib/db/engine';
import { authorizeQuery, authorizeRpc, type CallerRole } from '@/lib/db/rules';
import { verifyToken } from '@/lib/db/jwt';
import type { QueryDescriptor, RpcDescriptor } from '@/lib/db/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Data gateway for browser clients (lib/supabase.ts).
 * Accepts a JSON query descriptor, applies role-based authorization
 * (the equivalent of the old row-level security policies), compiles it
 * to parameterized SQL and returns a { data, error, count } envelope.
 */

async function resolveCaller(request: NextRequest): Promise<{ role: CallerRole; userId: string | null }> {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) return { role: 'anon', userId: null };

    const claims = await verifyToken(token);
    if (!claims || claims.type !== 'access') return { role: 'anon', userId: null };

    const role: CallerRole = claims.role === 'admin' || claims.role === 'staff' ? 'staff' : 'user';
    return { role, userId: claims.sub };
}

export async function POST(request: NextRequest) {
    let body: { query?: QueryDescriptor; rpc?: RpcDescriptor };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { data: null, error: { message: 'Invalid JSON body' }, count: null },
            { status: 400 }
        );
    }

    const { role, userId } = await resolveCaller(request);

    try {
        if (body.rpc) {
            authorizeRpc(body.rpc.fn, role);
            const result = await executeRpc(body.rpc.fn, body.rpc.args || {});
            return NextResponse.json(result, { status: result.error ? result.status : 200 });
        }

        if (!body.query || !body.query.table || !body.query.action) {
            return NextResponse.json(
                { data: null, error: { message: 'Missing query descriptor' }, count: null },
                { status: 400 }
            );
        }

        const plan = authorizeQuery(body.query, role, userId);

        // Normalize PostgREST-style aggregates that older cached admin clients still send.
        // product_variants(count) → product_variants(id); response reshaped to [{ count: N }].
        const countEmbeds: string[] = [];
        const query = { ...body.query };
        if (typeof query.select === 'string' && /\(\s*count\s*\)/i.test(query.select)) {
            query.select = query.select.replace(
                /([a-zA-Z_][a-zA-Z0-9_]*)\s*\(\s*count\s*\)/gi,
                (_m, table: string) => {
                    countEmbeds.push(table);
                    return `${table}(id)`;
                }
            );
        }

        const result = await executeQuery(query, { userId, constraints: plan.constraints });

        if (!result.error && countEmbeds.length && Array.isArray(result.data)) {
            result.data = result.data.map((row: Record<string, unknown>) => {
                let next = row;
                for (const table of countEmbeds) {
                    const embed = next[table];
                    if (Array.isArray(embed)) {
                        next = { ...next, [table]: [{ count: embed.length }] };
                    }
                }
                return next;
            });
        }

        // Always respond 200 and let the client shim surface `error`,
        // matching how supabase-js delivers PostgREST errors.
        return NextResponse.json(result);
    } catch (err: any) {
        return NextResponse.json(
            { data: null, error: { message: err?.message || 'Not allowed', code: '42501' }, count: null },
            { status: 200 }
        );
    }
}
