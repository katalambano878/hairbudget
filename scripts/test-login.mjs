/** Debug helper: check a stored password hash directly against the database. */
import bcrypt from 'bcryptjs';
import pg from 'pg';

const email = process.argv[2] || 'admin@hairbudget.com';
const password = process.argv[3] || 'admin123';

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

const res = await client.query(
  `SELECT u.email, u.encrypted_password, u.email_confirmed_at, p.role
   FROM public.users u
   LEFT JOIN public.profiles p ON p.id = u.id
   WHERE lower(u.email) = lower($1)`,
  [email]
);

console.log('rows:', res.rows.length);
for (const row of res.rows) {
  const hash = row.encrypted_password || '';
  console.log('email:', row.email);
  console.log('role:', row.role);
  console.log('confirmed:', row.email_confirmed_at);
  console.log('hash prefix:', hash.slice(0, 7), 'len:', hash.length);
  console.log(`compare "${password}" =>`, await bcrypt.compare(password, hash));
}

await client.end();
