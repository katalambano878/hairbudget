/**
 * Apply SQL migrations from db/migrations to the PostgreSQL database.
 * Tracks applied migrations in the schema_migrations table so it is
 * safe to run repeatedly.
 *
 * Usage:
 *   node scripts/run-migration.mjs            # apply all pending migrations
 *   node scripts/run-migration.mjs <file.sql> # apply one specific file
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv, createDbClient } from './db-lib.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.join(__dirname, '..', 'db', 'migrations');

async function main() {
  const env = loadEnv();
  const client = createDbClient(env);
  await client.connect();

  await client.query(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations (
      name text PRIMARY KEY,
      applied_at timestamptz DEFAULT now()
    )
  `);

  const requested = process.argv[2];
  const files = requested
    ? [requested]
    : fs.readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();

  const appliedRes = await client.query('SELECT name FROM public.schema_migrations');
  const applied = new Set(appliedRes.rows.map((r) => r.name));

  let ran = 0;
  for (const file of files) {
    const name = path.basename(file);
    if (applied.has(name)) {
      console.log(`skip    ${name} (already applied)`);
      continue;
    }
    const fullPath = path.isAbsolute(file) ? file : path.join(MIGRATIONS_DIR, name);
    const sql = fs.readFileSync(fullPath, 'utf8');

    console.log(`apply   ${name} ...`);
    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO public.schema_migrations (name) VALUES ($1)', [name]);
      await client.query('COMMIT');
      ran++;
      console.log(`done    ${name}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`FAILED  ${name}: ${err.message}`);
      await client.end();
      process.exit(1);
    }
  }

  console.log(ran ? `\n${ran} migration(s) applied.` : '\nDatabase is up to date.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
