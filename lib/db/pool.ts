import { Pool, types } from 'pg';

// Return numeric/bigint columns as JS numbers (like PostgREST JSON output)
// instead of node-postgres's default strings — the app does arithmetic on
// prices and totals directly.
types.setTypeParser(1700, (v: string) => parseFloat(v)); // numeric
types.setTypeParser(20, (v: string) => parseInt(v, 10)); // int8/bigint

/**
 * Shared PostgreSQL connection pool (server-side only).
 * Configure with DATABASE_URL, e.g.
 *   postgres://user:password@host:5432/dbname
 * Set DATABASE_SSL=true for managed databases that require TLS.
 */

const connectionString = process.env.DATABASE_URL || '';

if (!connectionString) {
    console.warn('[db] DATABASE_URL is not set — database queries will fail');
}

declare global {
    // eslint-disable-next-line no-var
    var __hairbudgetPgPool: Pool | undefined;
}

function createPool(): Pool {
    const pool = new Pool({
        connectionString: connectionString || undefined,
        max: Number(process.env.DATABASE_POOL_MAX || 10),
        idleTimeoutMillis: 30_000,
        connectionTimeoutMillis: 10_000,
        ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    });
    pool.on('error', (err) => {
        console.error('[db] idle client error:', err.message);
    });
    return pool;
}

// Reuse the pool across hot reloads in development.
export const pool: Pool = global.__hairbudgetPgPool ?? createPool();
if (process.env.NODE_ENV !== 'production') {
    global.__hairbudgetPgPool = pool;
}

export async function query(text: string, params: any[] = []) {
    return pool.query(text, params);
}
