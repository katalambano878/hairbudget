import { pool } from './pool';
import { getColumns, resolveRelationship, tableExists, type ColumnInfo } from './introspect';
import type { DbResult, Filter, FilterOp, QueryDescriptor } from './types';

/**
 * PostgREST-style query engine over plain PostgreSQL.
 * Compiles a QueryDescriptor into a single parameterized SQL statement,
 * including embedded relations like `*, product_images(url, position)`.
 *
 * All identifiers are validated against the live schema, and all values
 * are passed as bind parameters — nothing from the descriptor is ever
 * interpolated into SQL directly.
 */

const IDENT_RE = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

class QueryError extends Error {
    code: string;
    constructor(message: string, code = 'DB000') {
        super(message);
        this.code = code;
    }
}

function quoteIdent(name: string): string {
    if (!IDENT_RE.test(name)) throw new QueryError(`Invalid identifier: ${name}`);
    return `"${name}"`;
}

/** Extra WHERE constraints injected by the authorization layer. */
export interface RowConstraint {
    /** SQL fragment; use {t} as the table alias placeholder and $UID for the caller's user id */
    sql: string;
}

export interface ExecOptions {
    userId?: string | null;
    constraints?: RowConstraint[];
}

interface Param {
    values: any[];
    add(v: any): string;
}

function makeParams(): Param {
    const values: any[] = [];
    return {
        values,
        add(v: any) {
            values.push(v);
            return `$${values.length}`;
        },
    };
}

/** Serialize a JS value appropriately for the destination column type. */
function serializeValue(value: any, col?: ColumnInfo): any {
    if (value === undefined) return null;
    if (value === null) return null;
    if (col && (col.dataType === 'json' || col.dataType === 'jsonb')) {
        return typeof value === 'string' ? value : JSON.stringify(value);
    }
    if (Array.isArray(value) && (!col || col.dataType === 'ARRAY')) {
        return value;
    }
    if (typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        return JSON.stringify(value);
    }
    return value;
}

/* ─────────────── select-string parsing ─────────────── */

interface SelectField {
    kind: 'column' | 'star' | 'embed';
    name: string;         // column name or embed table
    alias?: string;
    inner?: string;       // embed's inner select list
}

/** Split by commas at depth 0 (respecting parentheses). */
function splitTopLevel(s: string): string[] {
    const parts: string[] = [];
    let depth = 0;
    let cur = '';
    for (const ch of s) {
        if (ch === '(') depth++;
        if (ch === ')') depth--;
        if (ch === ',' && depth === 0) {
            parts.push(cur.trim());
            cur = '';
        } else {
            cur += ch;
        }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
}

function parseSelect(select: string): SelectField[] {
    const fields: SelectField[] = [];
    for (const token of splitTopLevel(select)) {
        if (!token) continue;
        if (token === '*') {
            fields.push({ kind: 'star', name: '*' });
            continue;
        }
        const embedMatch = token.match(/^(?:([a-zA-Z_][a-zA-Z0-9_]*):)?([a-zA-Z_][a-zA-Z0-9_]*)(?:!\w+)?\s*\(([\s\S]*)\)$/);
        if (embedMatch) {
            fields.push({
                kind: 'embed',
                name: embedMatch[2],
                alias: embedMatch[1] || undefined,
                inner: embedMatch[3].trim() || '*',
            });
            continue;
        }
        // alias:column
        const aliasMatch = token.match(/^([a-zA-Z_][a-zA-Z0-9_]*):([a-zA-Z_][a-zA-Z0-9_]*)$/);
        if (aliasMatch) {
            fields.push({ kind: 'column', name: aliasMatch[2], alias: aliasMatch[1] });
            continue;
        }
        if (IDENT_RE.test(token)) {
            fields.push({ kind: 'column', name: token });
            continue;
        }
        throw new QueryError(`Unsupported select token: ${token}`);
    }
    return fields.length ? fields : [{ kind: 'star', name: '*' }];
}

/* ─────────────── filter compilation ─────────────── */

async function compileSimpleFilter(
    table: string,
    alias: string,
    op: FilterOp,
    column: string,
    value: any,
    params: Param,
    negate = false
): Promise<string> {
    const cols = await getColumns(table);
    const col = cols.get(column);
    if (!col) throw new QueryError(`Unknown column ${table}.${column}`);
    const ident = `${alias}.${quoteIdent(column)}`;

    // Comparing a uuid column against a non-uuid value would abort the whole
    // query in Postgres; treat it as a non-match instead (e.g. or(slug.eq.X,id.eq.X)).
    const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
    if (col.udtName === 'uuid' && (op === 'eq' || op === 'neq') && typeof value === 'string' && !UUID_RE.test(value)) {
        const expr = op === 'eq' ? 'FALSE' : 'TRUE';
        return negate ? `NOT (${expr})` : expr;
    }
    if (col.udtName === 'uuid' && op === 'in') {
        const arr = (Array.isArray(value) ? value : String(value).split(',')).filter(
            (v: any) => typeof v === 'string' && UUID_RE.test(v)
        );
        const expr = arr.length ? `${ident} = ANY(${params.add(arr)})` : 'FALSE';
        return negate ? `NOT (${expr})` : expr;
    }

    let expr: string;
    switch (op) {
        case 'eq': expr = `${ident} = ${params.add(serializeValue(value, col))}`; break;
        case 'neq': expr = `${ident} <> ${params.add(serializeValue(value, col))}`; break;
        case 'gt': expr = `${ident} > ${params.add(serializeValue(value, col))}`; break;
        case 'gte': expr = `${ident} >= ${params.add(serializeValue(value, col))}`; break;
        case 'lt': expr = `${ident} < ${params.add(serializeValue(value, col))}`; break;
        case 'lte': expr = `${ident} <= ${params.add(serializeValue(value, col))}`; break;
        case 'like': expr = `${ident}::text LIKE ${params.add(String(value))}`; break;
        case 'ilike': expr = `${ident}::text ILIKE ${params.add(String(value))}`; break;
        case 'is':
            if (value === null || value === 'null') expr = `${ident} IS NULL`;
            else if (value === true || value === 'true') expr = `${ident} IS TRUE`;
            else if (value === false || value === 'false') expr = `${ident} IS FALSE`;
            else throw new QueryError(`Unsupported IS value: ${value}`);
            break;
        case 'in': {
            const arr = Array.isArray(value) ? value : String(value).split(',');
            expr = `${ident} = ANY(${params.add(arr)})`;
            break;
        }
        case 'contains': {
            if (col.dataType === 'ARRAY') {
                expr = `${ident} @> ${params.add(Array.isArray(value) ? value : [value])}`;
            } else {
                expr = `${ident} @> ${params.add(typeof value === 'string' ? value : JSON.stringify(value))}::jsonb`;
            }
            break;
        }
        default:
            throw new QueryError(`Unsupported operator: ${op}`);
    }
    return negate ? `NOT (${expr})` : expr;
}

/** Parse a PostgREST `or` expression: `col.op.value,col.op.value` */
async function compileOrExpression(
    table: string,
    alias: string,
    expression: string,
    params: Param
): Promise<string> {
    const branches: string[] = [];
    for (const part of splitTopLevel(expression)) {
        const m = part.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in)\.([\s\S]*)$/);
        if (!m) throw new QueryError(`Unsupported or() expression: ${part}`);
        const [, column, op, rawVal] = m;
        let value: any = rawVal;
        if (op === 'is') value = rawVal === 'null' ? null : rawVal;
        if (op === 'in') value = rawVal.replace(/^\(|\)$/g, '').split(',');
        branches.push(await compileSimpleFilter(table, alias, op as FilterOp, column, value, params));
    }
    return `(${branches.join(' OR ')})`;
}

async function compileFilters(
    table: string,
    alias: string,
    filters: Filter[],
    params: Param,
    opts: ExecOptions
): Promise<string[]> {
    const clauses: string[] = [];
    for (const f of filters) {
        if (f.op === 'or') {
            clauses.push(await compileOrExpression(table, alias, f.expression || '', params));
        } else if (f.op === 'match') {
            for (const [col, val] of Object.entries(f.value || {})) {
                clauses.push(await compileSimpleFilter(table, alias, 'eq', col, val, params));
            }
        } else if (f.op === 'not') {
            clauses.push(
                await compileSimpleFilter(table, alias, f.negatedOp || 'eq', f.column!, f.value, params, true)
            );
        } else {
            clauses.push(await compileSimpleFilter(table, alias, f.op, f.column!, f.value, params));
        }
    }
    for (const c of opts.constraints || []) {
        let sql = c.sql.split('{t}').join(alias);
        if (sql.includes('$UID')) {
            sql = sql.split('$UID').join(params.add(opts.userId ?? null));
        }
        clauses.push(`(${sql})`);
    }
    return clauses;
}

/* ─────────────── select-list compilation ─────────────── */

async function compileSelectList(
    table: string,
    alias: string,
    select: string,
    params: Param
): Promise<string> {
    const fields = parseSelect(select);
    const parts: string[] = [];
    const cols = await getColumns(table);

    for (const f of fields) {
        if (f.kind === 'star') {
            parts.push(`${alias}.*`);
        } else if (f.kind === 'column') {
            if (!cols.has(f.name)) throw new QueryError(`Unknown column ${table}.${f.name}`);
            parts.push(
                f.alias
                    ? `${alias}.${quoteIdent(f.name)} AS ${quoteIdent(f.alias)}`
                    : `${alias}.${quoteIdent(f.name)}`
            );
        } else {
            // embedded relation
            const embedTable = f.name;
            if (!(await tableExists(embedTable))) {
                throw new QueryError(`Unknown embedded table: ${embedTable}`);
            }
            const rel = await resolveRelationship(table, embedTable);
            if (!rel) throw new QueryError(`No relationship between ${table} and ${embedTable}`);

            const subAlias = `_e_${embedTable}`;
            const outName = quoteIdent(f.alias || embedTable);
            const innerTrimmed = (f.inner || '*').trim();

            // PostgREST-style aggregate: product_variants(count) → [{ count: N }]
            if (/^count$/i.test(innerTrimmed)) {
                if (rel.type === 'many-to-one') {
                    parts.push(
                        `(SELECT json_build_array(json_build_object('count', CASE WHEN EXISTS (` +
                        `SELECT 1 FROM ${quoteIdent(embedTable)} ${subAlias} ` +
                        `WHERE ${subAlias}.${quoteIdent(rel.foreignColumn)} = ${alias}.${quoteIdent(rel.baseColumn)}` +
                        `) THEN 1 ELSE 0 END))) AS ${outName}`
                    );
                } else {
                    parts.push(
                        `(SELECT json_build_array(json_build_object('count', COUNT(*))) FROM ${quoteIdent(embedTable)} ${subAlias} ` +
                        `WHERE ${subAlias}.${quoteIdent(rel.childColumn)} = ${alias}.${quoteIdent(rel.baseColumn)}) ` +
                        `AS ${outName}`
                    );
                }
                continue;
            }

            const innerList = await compileSelectList(embedTable, subAlias, f.inner || '*', params);

            if (rel.type === 'many-to-one') {
                parts.push(
                    `(SELECT row_to_json(_sub) FROM (SELECT ${innerList} FROM ${quoteIdent(embedTable)} ${subAlias} ` +
                    `WHERE ${subAlias}.${quoteIdent(rel.foreignColumn)} = ${alias}.${quoteIdent(rel.baseColumn)} LIMIT 1) _sub) ` +
                    `AS ${outName}`
                );
            } else {
                parts.push(
                    `(SELECT COALESCE(json_agg(row_to_json(_sub)), '[]'::json) FROM (SELECT ${innerList} FROM ${quoteIdent(embedTable)} ${subAlias} ` +
                    `WHERE ${subAlias}.${quoteIdent(rel.childColumn)} = ${alias}.${quoteIdent(rel.baseColumn)}) _sub) ` +
                    `AS ${outName}`
                );
            }
        }
    }
    return parts.join(', ');
}

/* ─────────────── write payload compilation ─────────────── */

async function compileInsertColumns(table: string, rows: any[]): Promise<string[]> {
    const cols = await getColumns(table);
    const colSet = new Set<string>();
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            if (!cols.has(key)) throw new QueryError(`Unknown column ${table}.${key}`);
            colSet.add(key);
        }
    }
    if (colSet.size === 0) throw new QueryError('Empty insert payload');
    return [...colSet];
}

/* ─────────────── main executor ─────────────── */

function ok(data: any, count: number | null = null, status = 200): DbResult {
    return { data, error: null, count, status, statusText: 'OK' };
}

function fail(message: string, code = 'DB000', status = 400): DbResult {
    return { data: null, error: { message, code }, count: null, status, statusText: 'Error' };
}

export async function executeQuery(input: QueryDescriptor, opts: ExecOptions = {}): Promise<DbResult> {
    try {
        // Descriptors arrive over HTTP; normalize optional fields so a
        // hand-crafted request without `filters` can't crash the executor.
        const q: QueryDescriptor = { ...input, filters: input.filters || [] };
        if (!(await tableExists(q.table))) return fail(`Unknown table: ${q.table}`, 'DB404', 404);
        const alias = quoteIdent(q.table);
        const params = makeParams();

        let rows: any[] = [];
        let count: number | null = null;

        if (q.action === 'select') {
            const where = await compileFilters(q.table, alias, q.filters, params, opts);
            const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';

            if (q.count === 'exact') {
                const countRes = await pool.query(
                    `SELECT COUNT(*)::int AS n FROM ${alias}${whereSql}`,
                    params.values
                );
                count = countRes.rows[0]?.n ?? 0;
            }

            if (!q.head) {
                const selectList = await compileSelectList(q.table, alias, q.select || '*', params);
                let sql = `SELECT ${selectList} FROM ${alias}${whereSql}`;
                const orderParts: string[] = [];
                for (const o of q.order || []) {
                    const cols = await getColumns(q.table);
                    if (!cols.has(o.column)) throw new QueryError(`Unknown order column: ${o.column}`);
                    let part = `${alias}.${quoteIdent(o.column)} ${o.ascending ? 'ASC' : 'DESC'}`;
                    if (o.nullsFirst === true) part += ' NULLS FIRST';
                    if (o.nullsFirst === false) part += ' NULLS LAST';
                    orderParts.push(part);
                }
                if (orderParts.length) sql += ` ORDER BY ${orderParts.join(', ')}`;
                if (typeof q.limit === 'number') sql += ` LIMIT ${Math.max(0, Math.floor(q.limit))}`;
                if (typeof q.offset === 'number') sql += ` OFFSET ${Math.max(0, Math.floor(q.offset))}`;
                const res = await pool.query(sql, params.values);
                rows = res.rows;
            }
        } else if (q.action === 'insert' || q.action === 'upsert') {
            const payload = (Array.isArray(q.values) ? q.values : [q.values]).filter(
                (row) => row && typeof row === 'object'
            );
            if (!payload.length) return fail('Empty insert payload');
            const insertCols = await compileInsertColumns(q.table, payload);
            const colInfos = await getColumns(q.table);

            const valueRows: string[] = [];
            for (const row of payload) {
                const placeholders = insertCols.map((c) => {
                    if (!(c in row)) return 'DEFAULT';
                    return params.add(serializeValue(row[c], colInfos.get(c)));
                });
                valueRows.push(`(${placeholders.join(', ')})`);
            }

            let sql = `INSERT INTO ${alias} (${insertCols.map(quoteIdent).join(', ')}) VALUES ${valueRows.join(', ')}`;
            if (q.action === 'upsert') {
                const conflictCols = (q.onConflict ? q.onConflict.split(',') : ['id']).map((c) => c.trim());
                for (const c of conflictCols) {
                    if (!colInfos.has(c)) throw new QueryError(`Unknown conflict column: ${c}`);
                }
                const updates = insertCols
                    .filter((c) => !conflictCols.includes(c))
                    .map((c) => `${quoteIdent(c)} = EXCLUDED.${quoteIdent(c)}`);
                sql += updates.length
                    ? ` ON CONFLICT (${conflictCols.map(quoteIdent).join(', ')}) DO UPDATE SET ${updates.join(', ')}`
                    : ` ON CONFLICT (${conflictCols.map(quoteIdent).join(', ')}) DO NOTHING`;
            }
            sql += ' RETURNING *';
            const res = await pool.query(sql, params.values);
            rows = q.select ? res.rows : [];
            if (!q.select) {
                // supabase-js returns null data for a bare insert/upsert
                return finalize(q, null, res.rowCount ?? 0, true);
            }
        } else if (q.action === 'update') {
            if (!q.filters.length && !(opts.constraints || []).length) {
                return fail('Refusing to update without any filters', 'DB400');
            }
            const colInfos = await getColumns(q.table);
            const sets: string[] = [];
            for (const [key, val] of Object.entries(q.values || {})) {
                const col = colInfos.get(key);
                if (!col) throw new QueryError(`Unknown column ${q.table}.${key}`);
                sets.push(`${quoteIdent(key)} = ${params.add(serializeValue(val, col))}`);
            }
            if (!sets.length) return fail('Empty update payload');
            const where = await compileFilters(q.table, alias, q.filters, params, opts);
            const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
            const sql = `UPDATE ${alias} SET ${sets.join(', ')}${whereSql} RETURNING *`;
            const res = await pool.query(sql, params.values);
            rows = res.rows;
            if (!q.select) return finalize(q, null, res.rowCount ?? 0, true);
        } else if (q.action === 'delete') {
            if (!q.filters.length && !(opts.constraints || []).length) {
                return fail('Refusing to delete without any filters', 'DB400');
            }
            const where = await compileFilters(q.table, alias, q.filters, params, opts);
            const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
            const sql = `DELETE FROM ${alias}${whereSql} RETURNING *`;
            const res = await pool.query(sql, params.values);
            rows = res.rows;
            if (!q.select) return finalize(q, null, res.rowCount ?? 0, true);
        } else {
            return fail(`Unsupported action: ${(q as any).action}`);
        }

        return finalize(q, rows, count, false);
    } catch (err: any) {
        const message = err?.message || 'Database error';
        const code = err instanceof QueryError ? err.code : err?.code || 'DB500';
        return fail(message, code, err instanceof QueryError ? 400 : 500);
    }
}

function finalize(q: QueryDescriptor, rows: any[] | null, count: number | null, bareWrite: boolean): DbResult {
    if (bareWrite) return ok(null, count);
    const data = rows ?? [];
    if (q.single === 'strict') {
        if (data.length !== 1) {
            return {
                data: null,
                error: {
                    message: `JSON object requested, multiple (or no) rows returned: got ${data.length} rows`,
                    code: 'PGRST116',
                },
                count,
                status: 406,
                statusText: 'Not Acceptable',
            };
        }
        return ok(data[0], count);
    }
    if (q.single === 'maybe') {
        if (data.length > 1) {
            return {
                data: null,
                error: { message: 'JSON object requested, multiple rows returned', code: 'PGRST116' },
                count,
                status: 406,
                statusText: 'Not Acceptable',
            };
        }
        return ok(data[0] ?? null, count);
    }
    if (q.head) return ok(null, count);
    return ok(data, count);
}

/* ─────────────── RPC (stored function) executor ─────────────── */

export async function executeRpc(fn: string, args: Record<string, any> = {}): Promise<DbResult> {
    try {
        if (!IDENT_RE.test(fn)) return fail(`Invalid function name: ${fn}`);
        const params = makeParams();
        const argList = Object.entries(args || {})
            .map(([k, v]) => {
                if (!IDENT_RE.test(k)) throw new QueryError(`Invalid argument name: ${k}`);
                const serialized =
                    v !== null && typeof v === 'object' && !Array.isArray(v) && !(v instanceof Date)
                        ? JSON.stringify(v)
                        : v;
                return `${quoteIdent(k)} => ${params.add(serialized)}`;
            })
            .join(', ');
        const sql = `SELECT * FROM public.${quoteIdent(fn)}(${argList})`;
        const res = await pool.query(sql, params.values);
        // Scalar-returning functions come back as a single row with a single
        // column named after the function; set-returning functions come back
        // as regular rows (PostgREST returns the former unwrapped).
        let data: any;
        if (res.rows.length === 1 && res.fields.length === 1 && res.fields[0].name === fn) {
            data = res.rows[0][fn];
        } else if (res.rows.length === 0 && res.fields.length === 1 && res.fields[0].name === fn) {
            data = null;
        } else {
            data = res.rows;
        }
        return ok(data);
    } catch (err: any) {
        return fail(err?.message || 'RPC error', err?.code || 'DB500', 500);
    }
}
