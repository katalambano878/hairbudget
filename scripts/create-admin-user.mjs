/**
 * Create an admin user (or promote an existing user to admin).
 *
 * Usage:
 *   node scripts/create-admin-user.mjs <email> <password>
 * Or set env vars and run:
 *   CREATE_ADMIN_EMAIL=admin@example.com CREATE_ADMIN_PASSWORD=yourpassword node scripts/create-admin-user.mjs
 */
import bcrypt from 'bcryptjs';
import { loadEnv, createDbClient } from './db-lib.mjs';

const env = loadEnv();
const email = process.argv[2] || env.CREATE_ADMIN_EMAIL;
const password = process.argv[3] || env.CREATE_ADMIN_PASSWORD;

if (!email || !password) {
  console.error('Usage: node scripts/create-admin-user.mjs <email> <password>');
  console.error('   Or set CREATE_ADMIN_EMAIL and CREATE_ADMIN_PASSWORD in .env.local');
  process.exit(1);
}

async function main() {
  const client = createDbClient(env);
  await client.connect();

  try {
    const existing = await client.query('SELECT id FROM public.users WHERE lower(email) = lower($1)', [email]);

    let userId;
    if (existing.rows.length) {
      userId = existing.rows[0].id;
      console.log('User already exists. Updating password and promoting to admin...');
      const hash = await bcrypt.hash(password, 10);
      await client.query('UPDATE public.users SET encrypted_password = $1, updated_at = now() WHERE id = $2', [
        hash,
        userId,
      ]);
    } else {
      const hash = await bcrypt.hash(password, 10);
      const res = await client.query(
        `INSERT INTO public.users (email, encrypted_password, raw_user_meta_data, email_confirmed_at)
         VALUES ($1, $2, '{}'::jsonb, now()) RETURNING id`,
        [email, hash]
      );
      userId = res.rows[0].id;
    }

    // The signup trigger creates the profile; make sure the role is admin.
    await client.query(
      `INSERT INTO public.profiles (id, email, role) VALUES ($1, $2, 'admin')
       ON CONFLICT (id) DO UPDATE SET role = 'admin', email = EXCLUDED.email`,
      [userId, email]
    );

    console.log('Admin user ready.');
    console.log('  Email:', email);
    console.log('  Login at: /admin/login');
  } finally {
    await client.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
