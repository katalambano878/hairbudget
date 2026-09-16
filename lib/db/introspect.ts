import { pool } from './pool';

/**
 * Lightweight schema introspection with in-memory caching.
 * Used by the query engine to:
 *  - validate identifiers (tables/columns) so SQL is always safe to build
 *  - resolve foreign-key relationships for embedded selects (PostgREST-style)
 *  - know which columns are json/jsonb so values get serialized correctly
 */

export interface ColumnInfo {
    name: string;
    dataType: string; // information_schema data_type, e.g. 'jsonb', 'ARRAY', 'uuid'
    udtName: string;  // e.g. '_text' for text[]
}

export interface ForeignKey {
    table: string;        // referencing table
    column: string;       // referencing column
    foreignTable: string; // referenced table
    foreignColumn: string;
}

interface SchemaCache {
    columns: Map<string, Map<string, ColumnInfo>>;
    foreignKeys: ForeignKey[];
    loadedAt: number;
}

let cache: SchemaCache | null = null;
let loading: Promise<SchemaCache> | null = null;

const CACHE_TTL_MS = 5 * 60 * 1000;

async function loadSchema(): Promise<SchemaCache> {
    const colsRes = await pool.query(`
        SELECT table_name, column_name, data_type, udt_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
    `);

    const fksRes = await pool.query(`
        SELECT
            tc.table_name AS table,
            kcu.column_name AS column,
            ccu.table_name AS foreign_table,
            ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage ccu
            ON tc.constraint_name = ccu.constraint_name AND tc.table_schema = ccu.table_schema
        WHERE tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
    `);

    const columns = new Map<string, Map<string, ColumnInfo>>();
    for (const row of colsRes.rows) {
        let tableCols = columns.get(row.table_name);
        if (!tableCols) {
            tableCols = new Map();
            columns.set(row.table_name, tableCols);
        }
        tableCols.set(row.column_name, {
            name: row.column_name,
            dataType: row.data_type,
            udtName: row.udt_name,
        });
    }

    const foreignKeys: ForeignKey[] = fksRes.rows.map((r: any) => ({
        table: r.table,
        column: r.column,
        foreignTable: r.foreign_table,
        foreignColumn: r.foreign_column,
    }));

    return { columns, foreignKeys, loadedAt: Date.now() };
}

export async function getSchema(): Promise<SchemaCache> {
    if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache;
    if (!loading) {
        loading = loadSchema()
            .then((s) => {
                cache = s;
                return s;
            })
            .finally(() => {
                loading = null;
            });
    }
    return loading;
}

export async function tableExists(table: string): Promise<boolean> {
    const schema = await getSchema();
    return schema.columns.has(table);
}

export async function getColumns(table: string): Promise<Map<string, ColumnInfo>> {
    const schema = await getSchema();
    const cols = schema.columns.get(table);
    if (!cols) throw new Error(`Unknown table: ${table}`);
    return cols;
}

/**
 * Resolve how `embedTable` relates to `baseTable`.
 * Returns null if no FK path exists between the two tables.
 */
export async function resolveRelationship(baseTable: string, embedTable: string): Promise<
    | { type: 'many-to-one'; baseColumn: string; foreignColumn: string }
    | { type: 'one-to-many'; childColumn: string; baseColumn: string }
    | null
> {
    const schema = await getSchema();
    // base has FK -> embed (e.g. products.category_id -> categories.id)
    const toOne = schema.foreignKeys.find(
        (fk) => fk.table === baseTable && fk.foreignTable === embedTable
    );
    if (toOne) {
        return { type: 'many-to-one', baseColumn: toOne.column, foreignColumn: toOne.foreignColumn };
    }
    // embed has FK -> base (e.g. product_images.product_id -> products.id)
    const toMany = schema.foreignKeys.find(
        (fk) => fk.table === embedTable && fk.foreignTable === baseTable
    );
    if (toMany) {
        return { type: 'one-to-many', childColumn: toMany.column, baseColumn: toMany.foreignColumn };
    }
    return null;
}
