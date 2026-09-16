import 'server-only';

/**
 * Privileged data-access client for server code (API routes, server
 * components, server actions). Executes SQL directly against PostgreSQL
 * through the query engine with no row-level restrictions — the
 * equivalent of the old service-role client, with the same interface:
 *
 *   supabaseAdmin.from('orders').select('*').eq('id', id).single()
 *   supabaseAdmin.rpc('mark_order_paid', { order_ref })
 *   supabaseAdmin.auth.getUser(token)
 */

import { executeQuery, executeRpc } from './db/engine';
import { getUserFromToken, adminCreateUser } from './db/auth-server';
import { pool } from './db/pool';
import type { DbResult, Filter, FilterOp, OrderSpec, QueryDescriptor } from './db/types';

class AdminQueryBuilder<TData = any[]> implements PromiseLike<DbResult<TData>> {
    private q: QueryDescriptor;

    constructor(table: string) {
        this.q = { table, action: 'select', filters: [], order: [] };
    }

    select(columns?: string, options?: { count?: 'exact'; head?: boolean }) {
        if (this.q.action === 'select' || !this.q.select) {
            this.q.select = columns || '*';
        }
        if (options?.count) this.q.count = options.count;
        if (options?.head) this.q.head = true;
        return this;
    }

    insert(values: any) {
        this.q.action = 'insert';
        this.q.values = values;
        this.q.select = undefined;
        return this;
    }

    upsert(values: any, options?: { onConflict?: string }) {
        this.q.action = 'upsert';
        this.q.values = values;
        this.q.onConflict = options?.onConflict;
        this.q.select = undefined;
        return this;
    }

    update(values: any) {
        this.q.action = 'update';
        this.q.values = values;
        this.q.select = undefined;
        return this;
    }

    delete() {
        this.q.action = 'delete';
        this.q.select = undefined;
        return this;
    }

    private addFilter(op: FilterOp, column: string, value: any) {
        this.q.filters.push({ op, column, value } as Filter);
        return this;
    }

    eq(column: string, value: any) { return this.addFilter('eq', column, value); }
    neq(column: string, value: any) { return this.addFilter('neq', column, value); }
    gt(column: string, value: any) { return this.addFilter('gt', column, value); }
    gte(column: string, value: any) { return this.addFilter('gte', column, value); }
    lt(column: string, value: any) { return this.addFilter('lt', column, value); }
    lte(column: string, value: any) { return this.addFilter('lte', column, value); }
    like(column: string, value: any) { return this.addFilter('like', column, value); }
    ilike(column: string, value: any) { return this.addFilter('ilike', column, value); }
    is(column: string, value: any) { return this.addFilter('is', column, value); }
    in(column: string, values: any[]) { return this.addFilter('in', column, values); }
    contains(column: string, value: any) { return this.addFilter('contains', column, value); }

    or(expression: string) {
        this.q.filters.push({ op: 'or', expression });
        return this;
    }

    not(column: string, op: FilterOp, value: any) {
        this.q.filters.push({ op: 'not', column, negatedOp: op, value });
        return this;
    }

    match(criteria: Record<string, any>) {
        this.q.filters.push({ op: 'match', value: criteria });
        return this;
    }

    filter(column: string, op: FilterOp, value: any) {
        return this.addFilter(op, column, value);
    }

    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) {
        if (options?.foreignTable) return this;
        const spec: OrderSpec = {
            column,
            ascending: options?.ascending !== false,
            nullsFirst: options?.nullsFirst,
        };
        this.q.order.push(spec);
        return this;
    }

    limit(count: number) {
        this.q.limit = count;
        return this;
    }

    range(from: number, to: number) {
        this.q.offset = from;
        this.q.limit = to - from + 1;
        return this;
    }

    single(): AdminQueryBuilder<any> {
        this.q.single = 'strict';
        return this as unknown as AdminQueryBuilder<any>;
    }

    maybeSingle(): AdminQueryBuilder<any> {
        this.q.single = 'maybe';
        return this as unknown as AdminQueryBuilder<any>;
    }

    then<TResult1 = DbResult<TData>, TResult2 = never>(
        onfulfilled?: ((value: DbResult<TData>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return executeQuery(this.q).then(onfulfilled, onrejected) as Promise<TResult1 | TResult2>;
    }
}

class AdminRpcCall implements PromiseLike<DbResult> {
    constructor(private fn: string, private args: Record<string, any>) {}

    then<TResult1 = DbResult, TResult2 = never>(
        onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return executeRpc(this.fn, this.args).then(onfulfilled, onrejected);
    }
}

class AdminAuth {
    /** Verify a bearer token and return the user (GoTrue getUser equivalent). */
    async getUser(token: string): Promise<{ data: { user: any | null }; error: any }> {
        if (!token) return { data: { user: null }, error: { message: 'Missing token' } };
        try {
            const user = await getUserFromToken(token);
            if (!user) return { data: { user: null }, error: { message: 'Invalid or expired token' } };
            return { data: { user }, error: null };
        } catch (err: any) {
            return { data: { user: null }, error: { message: err?.message || 'Auth error' } };
        }
    }

    admin = {
        createUser: async (input: {
            email: string;
            password: string;
            email_confirm?: boolean;
            user_metadata?: Record<string, any>;
        }): Promise<{ data: { user: any | null }; error: any }> => {
            const result = await adminCreateUser(input);
            if ('error' in result) return { data: { user: null }, error: { message: result.error } };
            return { data: { user: result.user }, error: null };
        },
    };
}

class AdminStorageBucket {
    constructor(private bucket: string) {}

    async upload(
        path: string,
        file: Buffer | Blob | Uint8Array,
        options?: { contentType?: string }
    ): Promise<{ data: { path: string } | null; error: any }> {
        try {
            let buffer: Buffer;
            if (Buffer.isBuffer(file)) buffer = file;
            else if (file instanceof Uint8Array) buffer = Buffer.from(file);
            else buffer = Buffer.from(await (file as Blob).arrayBuffer());

            await pool.query(
                `INSERT INTO public.storage_objects (bucket, path, content_type, size, data)
                 VALUES ($1, $2, $3, $4, $5)
                 ON CONFLICT (bucket, path)
                 DO UPDATE SET content_type = EXCLUDED.content_type, size = EXCLUDED.size, data = EXCLUDED.data`,
                [this.bucket, path, options?.contentType || 'application/octet-stream', buffer.length, buffer]
            );
            return { data: { path }, error: null };
        } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Upload failed' } };
        }
    }

    getPublicUrl(path: string): { data: { publicUrl: string } } {
        return { data: { publicUrl: `/api/storage/${this.bucket}/${path}` } };
    }
}

class AdminClient {
    auth = new AdminAuth();
    storage = {
        from: (bucket: string) => new AdminStorageBucket(bucket),
    };

    from(table: string): AdminQueryBuilder {
        return new AdminQueryBuilder(table);
    }

    rpc(fn: string, args: Record<string, any> = {}): AdminRpcCall {
        return new AdminRpcCall(fn, args);
    }
}

export const supabaseAdmin = new AdminClient();
