/**
 * Shared types for the database query protocol.
 * Safe to import from both client and server code (no runtime deps).
 */

export type FilterOp =
    | 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte'
    | 'like' | 'ilike' | 'is' | 'in' | 'contains';

export interface Filter {
    op: FilterOp | 'or' | 'not' | 'match';
    column?: string;
    value?: any;
    /** for `or`: raw PostgREST-style expression `col.op.val,col.op.val` */
    expression?: string;
    /** for `not`: the negated operator */
    negatedOp?: FilterOp;
}

export interface OrderSpec {
    column: string;
    ascending: boolean;
    nullsFirst?: boolean;
}

export interface QueryDescriptor {
    table: string;
    action: 'select' | 'insert' | 'update' | 'upsert' | 'delete';
    select?: string;
    filters: Filter[];
    order: OrderSpec[];
    limit?: number;
    offset?: number;
    single?: 'strict' | 'maybe';
    count?: 'exact';
    head?: boolean;
    values?: any;
    onConflict?: string;
}

export interface RpcDescriptor {
    fn: string;
    args: Record<string, any>;
}

export interface DbResult<T = any> {
    data: T | null;
    error: { message: string; code?: string; details?: string; hint?: string } | null;
    count: number | null;
    status: number;
    statusText: string;
}
