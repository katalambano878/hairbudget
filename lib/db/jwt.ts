import { SignJWT, jwtVerify } from 'jose';

/**
 * JWT session tokens (HS256 via `jose`, works in both Node and Edge runtimes).
 * Set AUTH_JWT_SECRET to a long random string in production.
 */

const SECRET = process.env.AUTH_JWT_SECRET || process.env.SUPABASE_JWT_SECRET || '';

if (!SECRET) {
    console.warn('[auth] AUTH_JWT_SECRET is not set — sessions will not work');
}

function key(): Uint8Array {
    return new TextEncoder().encode(SECRET || 'insecure-development-secret-change-me');
}

export interface TokenClaims {
    sub: string;
    email?: string;
    role?: string;
    type: 'access' | 'recovery';
}

export const ACCESS_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const RECOVERY_TOKEN_TTL_SECONDS = 60 * 60;        // 1 hour

export async function signToken(claims: TokenClaims, ttlSeconds: number): Promise<string> {
    return new SignJWT({ email: claims.email, role: claims.role, type: claims.type })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(claims.sub)
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
        .sign(key());
}

export async function signStorageUploadToken(bucket: string, path: string, ttlSeconds = 60 * 15): Promise<string> {
    return new SignJWT({ type: 'storage-upload', bucket, path })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(`storage:${bucket}/${path}`)
        .setIssuedAt()
        .setExpirationTime(Math.floor(Date.now() / 1000) + ttlSeconds)
        .sign(key());
}

export async function verifyStorageUploadToken(
    token: string
): Promise<{ bucket: string; path: string } | null> {
    try {
        const { payload } = await jwtVerify(token, key());
        if (payload.type !== 'storage-upload') return null;
        const bucket = typeof payload.bucket === 'string' ? payload.bucket : '';
        const path = typeof payload.path === 'string' ? payload.path : '';
        if (!bucket || !path) return null;
        return { bucket, path };
    } catch {
        return null;
    }
}

export async function verifyToken(token: string): Promise<(TokenClaims & { exp?: number }) | null> {
    try {
        const { payload } = await jwtVerify(token, key());
        if (!payload.sub) return null;
        return {
            sub: payload.sub,
            email: payload.email as string | undefined,
            role: payload.role as string | undefined,
            type: (payload.type as 'access' | 'recovery') || 'access',
            exp: payload.exp,
        };
    } catch {
        return null;
    }
}
