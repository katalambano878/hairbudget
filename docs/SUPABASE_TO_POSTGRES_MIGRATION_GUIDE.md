# HairBudget — Supabase → plain Postgres

**Shape:** same as **NAD4U** — keep `supabase.from()` / `supabase.auth` in the UI, but those calls hit local Next.js routes that talk to Postgres (`pg`).

**Staging is live** at `https://hairbudget-staging.169-58-8-203.sslip.io` (Coolify app `hairbudget-staging`). A production `hairbudget-app` + `hairbudget.com` DNS still needs the Coolify owner.

## What changed in the app

| Piece | Role |
|-------|------|
| `lib/supabase.ts` | Browser shim → `POST /api/db`, `/api/auth/*`, `/api/storage/*` |
| `lib/supabase-admin.ts` | Server shim → `lib/db/engine` + `pg` pool |
| `lib/db/*` | Pool, query compiler, JWT, auth, RLS-style rules |
| `app/api/db` | Authorized data gateway |
| `app/api/auth/[action]` | Login, signup, recover, user |
| `app/api/storage/*` | Upload / public file read |
| `middleware.ts` | Admin cookie `sb-access-token` verified with `AUTH_JWT_SECRET` |
| `db/migrations/` | Store schema + HairBudget seed |

Runtime `@supabase/*` imports are gone. One-off files under `scripts/` may still mention the old SDK; use `DATABASE_URL` + `pg` for new scripts.

## Env mapping

| Old (Supabase) | New |
|----------------|-----|
| `NEXT_PUBLIC_SUPABASE_URL` | `NEXT_PUBLIC_APP_URL` (site origin) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | remove |
| `SUPABASE_SERVICE_ROLE_KEY` | remove |
| *(implicit JWT)* | `AUTH_JWT_SECRET` |
| hosted Postgres | `DATABASE_URL` |

Coolify env (when the app exists):

| Variable | Where |
|----------|--------|
| `DATABASE_URL` | PgBouncer URL from `sudo fleet db provision hairbudget` |
| `DIRECT_URL` | Direct `fleet-postgres` URL for migrations |
| `AUTH_JWT_SECRET` | Long random string |
| `NEXT_PUBLIC_APP_URL` | Public site URL |
| `NEXT_PUBLIC_USE_PLAIN_PG` | `true` |

Password lives on the VPS at `/data/fleet/secrets/store_hairbudget.env` (`STORE_PASS`). Do not commit it.

## Database

- **Name:** `store_hairbudget`
- **Host (in Coolify network):** `fleet-pgbouncer:6432` (app) / `fleet-postgres:5432` (migrations)
- Apply schema from the repo:

```bash
# On a machine that can reach fleet-postgres (VPS or SSH), with DIRECT_URL set:
npm run db:migrate
```

Or copy `db/migrations/*.sql` onto the VPS and apply in filename order as `store_hairbudget`.

## Local

1. Copy `.env.example` → `.env.local`
2. Set `AUTH_JWT_SECRET` and a `DATABASE_URL` that reaches `store_hairbudget` (SSH tunnel or VPS-side `npm run dev`)
3. `npm install`
4. `npm run db:migrate` (once, using `DIRECT_URL` / `DATABASE_URL`)
5. Optional admin: `npm run create-admin -- you@email.com 'your-password'`

## Verify

```sql
SELECT current_database();           -- store_hairbudget
SELECT count(*) FROM public.users;
SELECT count(*) FROM public.site_settings;
SELECT key, value->>'site_name' FROM public.site_settings WHERE key = 'site_identity';
```

App checks (2026-09-16 staging):

- `GET /` and `/shop` return 200
- `/admin/login` returns 200
- Admin email: `info@hairbudgetgh.com` (password on VPS in `/data/fleet/secrets/store_hairbudget.env`)
- No `@supabase/supabase-js` in `app/`, `lib/`, `components/`, `context/`, `middleware.ts`

## Limits

A production hostname (`hairbudget.com`) still needs the Coolify owner for DNS + a `hairbudget-app` clone. Redeploy staging with `sudo fleet deploy hairbudget-staging`.
