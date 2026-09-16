'use client';

/**
 * Data-access client for browser code.
 *
 * Exposes the same interface the app has always used —
 *   supabase.from('table').select(...).eq(...)
 *   supabase.auth.signInWithPassword(...)
 *   supabase.storage.from('bucket').upload(...)
 *   supabase.rpc('fn', args)
 * — but talks to our own PostgreSQL-backed API (/api/db, /api/auth/*,
 * /api/storage/*) instead of an external service.
 */

import type { DbResult, Filter, FilterOp, OrderSpec, QueryDescriptor } from './db/types';

const SESSION_KEY = 'hairbudget.auth.session';

/* ────────────────────────── session store ────────────────────────── */

export interface Session {
    access_token: string;
    refresh_token: string;
    token_type: string;
    expires_in: number;
    expires_at: number;
    user: any;
}

type AuthEvent =
    | 'INITIAL_SESSION'
    | 'SIGNED_IN'
    | 'SIGNED_OUT'
    | 'USER_UPDATED'
    | 'PASSWORD_RECOVERY'
    | 'TOKEN_REFRESHED';

type AuthListener = (event: AuthEvent, session: Session | null) => void;

const listeners = new Set<AuthListener>();

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

function readSession(): Session | null {
    if (!isBrowser()) return null;
    try {
        const raw = window.localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const session: Session = JSON.parse(raw);
        if (session.expires_at && session.expires_at * 1000 < Date.now()) {
            window.localStorage.removeItem(SESSION_KEY);
            return null;
        }
        return session;
    } catch {
        return null;
    }
}

function writeSession(session: Session | null): void {
    if (!isBrowser()) return;
    try {
        if (session) window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
        else window.localStorage.removeItem(SESSION_KEY);
    } catch {
        // storage may be unavailable (private mode); session stays in-memory only
    }
}

function emit(event: AuthEvent, session: Session | null): void {
    for (const listener of [...listeners]) {
        try {
            listener(event, session);
        } catch (err) {
            console.error('[auth] listener error:', err);
        }
    }
}

function accessToken(): string | null {
    return readSession()?.access_token ?? null;
}

/* ────────────────────────── query builder ────────────────────────── */

async function runQuery(descriptor: QueryDescriptor): Promise<DbResult> {
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        const token = accessToken();
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/db', {
            method: 'POST',
            headers,
            body: JSON.stringify({ query: descriptor }),
        });
        const body = await res.json();
        return {
            data: body.data ?? null,
            error: body.error ?? null,
            count: body.count ?? null,
            status: body.status ?? res.status,
            statusText: body.statusText ?? res.statusText,
        };
    } catch (err: any) {
        return {
            data: null,
            error: { message: err?.message || 'Network error' },
            count: null,
            status: 0,
            statusText: 'Network Error',
        };
    }
}

class QueryBuilder<TData = any[]> implements PromiseLike<DbResult<TData>> {
    private q: QueryDescriptor;

    constructor(table: string) {
        this.q = { table, action: 'select', filters: [], order: [] };
    }

    /* verbs */

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

    /* filters */

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

    /* modifiers */

    order(column: string, options?: { ascending?: boolean; nullsFirst?: boolean; foreignTable?: string }) {
        if (options?.foreignTable) return this; // embed ordering handled client-side
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

    single(): QueryBuilder<any> {
        this.q.single = 'strict';
        return this as unknown as QueryBuilder<any>;
    }

    maybeSingle(): QueryBuilder<any> {
        this.q.single = 'maybe';
        return this as unknown as QueryBuilder<any>;
    }

    /* thenable */

    then<TResult1 = DbResult<TData>, TResult2 = never>(
        onfulfilled?: ((value: DbResult<TData>) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return runQuery(this.q).then(onfulfilled, onrejected) as Promise<TResult1 | TResult2>;
    }
}

/* ────────────────────────── auth client ────────────────────────── */

async function authFetch(path: string, options: RequestInit = {}): Promise<{ body: any; ok: boolean }> {
    try {
        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(options.headers as Record<string, string> | undefined),
        };
        const token = accessToken();
        if (token && !headers['Authorization']) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch(path, { ...options, headers });
        const body = await res.json().catch(() => ({}));
        return { body, ok: res.ok };
    } catch (err: any) {
        return { body: { error: { message: err?.message || 'Network error' } }, ok: false };
    }
}

class AuthClient {
    constructor() {
        if (isBrowser()) {
            // Detect recovery/session tokens from URL hash or query
            // (email uses hash; SMS uses query — fragments often break in messengers).
            setTimeout(() => {
                void this.detectSessionInUrl();
            }, 0);
        }
    }

    /** Read access_token from hash or query and establish a session. */
    async detectSessionInUrl(): Promise<Session | null> {
        try {
            const hash = window.location.hash;
            const fromHash =
                hash && hash.includes('access_token=')
                    ? new URLSearchParams(hash.replace(/^#/, ''))
                    : null;
            const fromQuery = new URLSearchParams(window.location.search);
            const params =
                fromHash && fromHash.get('access_token')
                    ? fromHash
                    : fromQuery.get('access_token')
                      ? fromQuery
                      : null;
            if (!params) return null;

            const token = params.get('access_token');
            const type = params.get('type');
            if (!token) return null;

            const { body, ok } = await authFetch('/api/auth/user', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!ok || !body.user) return null;

            const session: Session = {
                access_token: token,
                refresh_token: token,
                token_type: 'bearer',
                expires_in: 3600,
                expires_at: Math.floor(Date.now() / 1000) + 3600,
                user: body.user,
            };
            writeSession(session);

            // Clean token from URL without reloading
            try {
                window.history.replaceState(null, '', window.location.pathname);
            } catch { /* noop */ }

            emit('SIGNED_IN', session);
            if (type === 'recovery') emit('PASSWORD_RECOVERY', session);
            return session;
        } catch (err) {
            console.error('[auth] session detection error:', err);
            return null;
        }
    }

    async getSession(): Promise<{ data: { session: Session | null }; error: null }> {
        return { data: { session: readSession() }, error: null };
    }

    async getUser(jwt?: string): Promise<{ data: { user: any | null }; error: any }> {
        const token = jwt || accessToken();
        if (!token) return { data: { user: null }, error: { message: 'No session' } };
        const { body, ok } = await authFetch('/api/auth/user', {
            method: 'GET',
            headers: { Authorization: `Bearer ${token}` },
        });
        if (!ok || !body.user) return { data: { user: null }, error: body.error || { message: 'Invalid token' } };
        return { data: { user: body.user }, error: null };
    }

    async signInWithPassword(credentials: { email: string; password: string }): Promise<{
        data: { user: any | null; session: Session | null };
        error: any;
    }> {
        const { body, ok } = await authFetch('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials),
        });
        if (!ok || body.error) {
            return { data: { user: null, session: null }, error: body.error || { message: 'Login failed' } };
        }
        writeSession(body.session);
        emit('SIGNED_IN', body.session);
        return { data: { user: body.user, session: body.session }, error: null };
    }

    async signUp(credentials: {
        email: string;
        password: string;
        options?: { data?: Record<string, any> };
    }): Promise<{ data: { user: any | null; session: Session | null }; error: any }> {
        const { body, ok } = await authFetch('/api/auth/signup', {
            method: 'POST',
            body: JSON.stringify({
                email: credentials.email,
                password: credentials.password,
                data: credentials.options?.data || {},
            }),
        });
        if (!ok || body.error) {
            return { data: { user: null, session: null }, error: body.error || { message: 'Signup failed' } };
        }
        writeSession(body.session);
        emit('SIGNED_IN', body.session);
        return { data: { user: body.user, session: body.session }, error: null };
    }

    async signOut(): Promise<{ error: null }> {
        await authFetch('/api/auth/logout', { method: 'POST' }).catch(() => null);
        writeSession(null);
        emit('SIGNED_OUT', null);
        return { error: null };
    }

    async updateUser(updates: {
        password?: string;
        email?: string;
        data?: Record<string, any>;
    }): Promise<{ data: { user: any | null }; error: any }> {
        const { body, ok } = await authFetch('/api/auth/user', {
            method: 'POST',
            body: JSON.stringify(updates),
        });
        if (!ok || body.error) {
            return { data: { user: null }, error: body.error || { message: 'Update failed' } };
        }
        const session = readSession();
        if (session) {
            writeSession({ ...session, user: body.user });
            emit('USER_UPDATED', { ...session, user: body.user });
        }
        return { data: { user: body.user }, error: null };
    }

    async resetPasswordForEmail(
        email: string,
        options?: { redirectTo?: string }
    ): Promise<{ data: {}; error: any }> {
        const { body, ok } = await authFetch('/api/auth/recover', {
            method: 'POST',
            body: JSON.stringify({ email, redirectTo: options?.redirectTo }),
        });
        if (!ok || body.error) return { data: {}, error: body.error || { message: 'Request failed' } };
        return { data: {}, error: null };
    }

    onAuthStateChange(callback: AuthListener): {
        data: { subscription: { unsubscribe: () => void } };
    } {
        listeners.add(callback);
        // Fire the initial session asynchronously like supabase-js does.
        setTimeout(() => {
            try {
                callback('INITIAL_SESSION', readSession());
            } catch { /* noop */ }
        }, 0);
        return {
            data: {
                subscription: {
                    unsubscribe: () => listeners.delete(callback),
                },
            },
        };
    }
}

/* ────────────────────────── storage client ────────────────────────── */

class StorageBucket {
    constructor(private bucket: string) {}

    async upload(
        path: string,
        file: File | Blob,
        options?: { contentType?: string; upsert?: boolean }
    ): Promise<{ data: { path: string } | null; error: any }> {
        try {
            const form = new FormData();
            form.append('bucket', this.bucket);
            form.append('path', path);
            form.append('file', file);
            if (options?.contentType) form.append('contentType', options.contentType);

            const headers: Record<string, string> = {};
            const token = accessToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const res = await fetch('/api/storage/upload', { method: 'POST', headers, body: form });
            const body = await res.json().catch(() => ({}));
            if (!res.ok || body.error) {
                return { data: null, error: body.error || { message: 'Upload failed' } };
            }
            return { data: { path: body.data.path }, error: null };
        } catch (err: any) {
            return { data: null, error: { message: err?.message || 'Upload failed' } };
        }
    }

    getPublicUrl(path: string): { data: { publicUrl: string } } {
        return { data: { publicUrl: `/api/storage/${this.bucket}/${path}` } };
    }
}

class StorageClient {
    from(bucket: string): StorageBucket {
        return new StorageBucket(bucket);
    }
}

/* ────────────────────────── rpc ────────────────────────── */

class RpcCall implements PromiseLike<DbResult> {
    constructor(private fn: string, private args: Record<string, any>) {}

    then<TResult1 = DbResult, TResult2 = never>(
        onfulfilled?: ((value: DbResult) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
    ): Promise<TResult1 | TResult2> {
        return this.execute().then(onfulfilled, onrejected);
    }

    private async execute(): Promise<DbResult> {
        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            const token = accessToken();
            if (token) headers['Authorization'] = `Bearer ${token}`;
            const res = await fetch('/api/db', {
                method: 'POST',
                headers,
                body: JSON.stringify({ rpc: { fn: this.fn, args: this.args } }),
            });
            const body = await res.json();
            return {
                data: body.data ?? null,
                error: body.error ?? null,
                count: body.count ?? null,
                status: body.status ?? res.status,
                statusText: body.statusText ?? res.statusText,
            };
        } catch (err: any) {
            return {
                data: null,
                error: { message: err?.message || 'Network error' },
                count: null,
                status: 0,
                statusText: 'Network Error',
            };
        }
    }
}

/* ────────────────────────── public client ────────────────────────── */

class DataClient {
    auth = new AuthClient();
    storage = new StorageClient();

    from(table: string): QueryBuilder {
        return new QueryBuilder(table);
    }

    rpc(fn: string, args: Record<string, any> = {}): RpcCall {
        return new RpcCall(fn, args);
    }
}

export const supabase = new DataClient();
