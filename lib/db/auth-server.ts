import bcrypt from 'bcryptjs';
import { pool } from './pool';
import { signToken, verifyToken, ACCESS_TOKEN_TTL_SECONDS } from './jwt';

/**
 * Server-side authentication built on the public.users table.
 * User and session objects follow the shapes the app already expects
 * (id, email, user_metadata, access_token, ...).
 */

export interface AuthUser {
    id: string;
    email: string | null;
    phone: string | null;
    email_confirmed_at: string | null;
    phone_confirmed_at: string | null;
    user_metadata: Record<string, any>;
    app_metadata: { provider: string };
    created_at: string;
    last_sign_in_at: string | null;
    role: string; // profile role: admin | staff | customer
}

export interface AuthSession {
    access_token: string;
    refresh_token: string;
    token_type: 'bearer';
    expires_in: number;
    expires_at: number;
    user: AuthUser;
}

function toAuthUser(row: any, profileRole?: string | null): AuthUser {
    return {
        id: row.id,
        email: row.email,
        phone: row.phone,
        email_confirmed_at: row.email_confirmed_at || null,
        phone_confirmed_at: row.phone_confirmed_at || null,
        user_metadata: row.raw_user_meta_data || {},
        app_metadata: { provider: 'email' },
        created_at: row.created_at,
        last_sign_in_at: row.last_sign_in_at,
        role: profileRole || 'customer',
    };
}

async function loadUserWithRole(userId: string): Promise<AuthUser | null> {
    const res = await pool.query(
        `SELECT u.*, p.role AS profile_role
         FROM public.users u
         LEFT JOIN public.profiles p ON p.id = u.id
         WHERE u.id = $1`,
        [userId]
    );
    if (!res.rows.length) return null;
    return toAuthUser(res.rows[0], res.rows[0].profile_role);
}

export async function hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
}

export async function createSession(user: AuthUser): Promise<AuthSession> {
    const access_token = await signToken(
        { sub: user.id, email: user.email || undefined, role: user.role, type: 'access' },
        ACCESS_TOKEN_TTL_SECONDS
    );
    const expires_at = Math.floor(Date.now() / 1000) + ACCESS_TOKEN_TTL_SECONDS;
    return {
        access_token,
        refresh_token: access_token,
        token_type: 'bearer',
        expires_in: ACCESS_TOKEN_TTL_SECONDS,
        expires_at,
        user,
    };
}

export async function signInWithPassword(email: string, password: string): Promise<
    { session: AuthSession; user: AuthUser } | { error: string }
> {
    const res = await pool.query(
        `SELECT u.*, p.role AS profile_role
         FROM public.users u
         LEFT JOIN public.profiles p ON p.id = u.id
         WHERE lower(u.email) = lower($1)`,
        [email]
    );
    if (!res.rows.length) return { error: 'Invalid login credentials' };
    const row = res.rows[0];
    const valid = await bcrypt.compare(password, row.encrypted_password || '');
    if (!valid) return { error: 'Invalid login credentials' };

    await pool.query('UPDATE public.users SET last_sign_in_at = now() WHERE id = $1', [row.id]);

    const user = toAuthUser(row, row.profile_role);
    const session = await createSession(user);
    return { session, user };
}

export async function signUp(
    email: string,
    password: string,
    metadata: Record<string, any> = {}
): Promise<{ session: AuthSession; user: AuthUser } | { error: string }> {
    if (!email || !password) return { error: 'Email and password are required' };
    if (password.length < 6) return { error: 'Password should be at least 6 characters' };

    const existing = await pool.query('SELECT id FROM public.users WHERE lower(email) = lower($1)', [email]);
    if (existing.rows.length) return { error: 'User already registered' };

    const hash = await hashPassword(password);
    const res = await pool.query(
        `INSERT INTO public.users (email, phone, encrypted_password, raw_user_meta_data)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [email.trim(), metadata.phone || null, hash, JSON.stringify(metadata || {})]
    );
    // The on_auth_user_created trigger creates the profile row.
    const user = toAuthUser(res.rows[0], 'customer');
    const session = await createSession(user);
    return { session, user };
}

/** Verify a bearer token and return the fresh user (Supabase getUser equivalent). */
export async function getUserFromToken(token: string): Promise<AuthUser | null> {
    const claims = await verifyToken(token);
    if (!claims) return null;
    return loadUserWithRole(claims.sub);
}

export async function updateUser(
    token: string,
    updates: { password?: string; email?: string; data?: Record<string, any> }
): Promise<{ user: AuthUser } | { error: string }> {
    const claims = await verifyToken(token);
    if (!claims) return { error: 'Invalid or expired token' };

    const sets: string[] = [];
    const params: any[] = [];
    const add = (v: any) => {
        params.push(v);
        return `$${params.length}`;
    };

    if (updates.password) {
        if (updates.password.length < 6) return { error: 'Password should be at least 6 characters' };
        sets.push(`encrypted_password = ${add(await hashPassword(updates.password))}`);
    }
    if (updates.email) {
        sets.push(`email = ${add(updates.email.trim())}`);
    }
    if (updates.data && typeof updates.data === 'object') {
        sets.push(`raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || ${add(JSON.stringify(updates.data))}::jsonb`);
    }
    if (!sets.length) {
        const user = await loadUserWithRole(claims.sub);
        return user ? { user } : { error: 'User not found' };
    }

    params.push(claims.sub);
    const res = await pool.query(
        `UPDATE public.users SET ${sets.join(', ')}, updated_at = now() WHERE id = $${params.length} RETURNING id`,
        params
    );
    if (!res.rows.length) return { error: 'User not found' };

    const user = await loadUserWithRole(claims.sub);
    return user ? { user } : { error: 'User not found' };
}

/** Admin-only: create a user directly (used by scripts / admin tooling). */
export async function adminCreateUser(input: {
    email: string;
    password: string;
    email_confirm?: boolean;
    user_metadata?: Record<string, any>;
}): Promise<{ user: AuthUser } | { error: string }> {
    const result = await signUp(input.email, input.password, input.user_metadata || {});
    if ('error' in result) return { error: result.error };
    return { user: result.user };
}
