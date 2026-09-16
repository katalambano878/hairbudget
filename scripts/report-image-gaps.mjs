import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env.local');
  const altPath = path.join(__dirname, '..', '.env');
  const p = fs.existsSync(envPath) ? envPath : fs.existsSync(altPath) ? altPath : null;
  if (!p) return {};
  return Object.fromEntries(
    fs
      .readFileSync(p, 'utf-8')
      .split('\n')
      .filter((l) => /^[A-Z_]+=/.test(l.trim()))
      .map((l) => {
        const eq = l.indexOf('=');
        const key = l.slice(0, eq).trim();
        let val = l.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        return [key, val];
      })
  );
}

function normalizeName(s) {
  return (s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(name) {
  const stop = new Set([
    'the', 'and', 'with', 'for', 'of', 'in', 'a', 'an', 'to', 'by', 'new',
    'professional', 'brand', 'set', 'kit', 'piece', 'pcs', 'pc'
  ]);
  return normalizeName(name)
    .split(' ')
    .map((t) => t.trim())
    .filter((t) => t.length > 1 && !stop.has(t));
}

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const uni = new Set([...sa, ...sb]).size;
  return uni ? inter / uni : 0;
}

function overlapMin(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  for (const x of sa) if (sb.has(x)) inter += 1;
  const minLen = Math.min(sa.size, sb.size) || 1;
  return inter / minLen;
}

function score(target, source) {
  const ta = tokenize(target.name);
  const sb = tokenize(source.name);
  if (!ta.length || !sb.length) return 0;
  const ov = overlapMin(ta, sb);
  const jac = jaccard(ta, sb);
  let sc = ov * 0.7 + jac * 0.2;
  if (target.category_id && source.category_id && target.category_id === source.category_id) {
    sc += 0.08;
  }
  const tp = Number(target.price || 0);
  const sp = Number(source.price || 0);
  if (tp > 0 && sp > 0) {
    const diff = Math.abs(tp - sp);
    if (diff <= 10) sc += 0.05;
    const rel = diff / Math.max(tp, sp);
    if (rel <= 0.15) sc += 0.04;
  }
  return sc;
}

function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: products, error: pErr }, { data: images, error: iErr }] = await Promise.all([
    supabase.from('products').select('id,name,slug,price,category_id,created_at').order('created_at', { ascending: true }),
    supabase.from('product_images').select('product_id,url,position'),
  ]);
  if (pErr) throw pErr;
  if (iErr) throw iErr;

  const imgsByPid = new Map();
  for (const img of images || []) {
    imgsByPid.set(img.product_id, [...(imgsByPid.get(img.product_id) || []), img]);
  }
  for (const [pid, list] of imgsByPid.entries()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    imgsByPid.set(pid, list);
  }

  const withoutImages = (products || []).filter((p) => (imgsByPid.get(p.id) || []).length === 0);
  const withImages = (products || []).filter((p) => (imgsByPid.get(p.id) || []).length > 0);

  const rows = [];
  for (const t of withoutImages) {
    const candidates = [];
    for (const s of withImages) {
      if (s.id === t.id) continue;
      const sc = score(t, s);
      // Slightly below 0.6 surfaces more twins for manual review; too low adds junk (unrelated token overlap).
      if (sc < 0.55) continue;
      candidates.push({ s, sc });
    }
    candidates.sort((a, b) => b.sc - a.sc);
    const top = candidates.slice(0, 3);
    rows.push({
      target_id: t.id,
      target_name: t.name,
      target_slug: t.slug,
      target_price: t.price,
      candidate1_name: top[0]?.s.name || '',
      candidate1_slug: top[0]?.s.slug || '',
      candidate1_score: top[0]?.sc?.toFixed(3) || '',
      candidate1_image: top[0] ? (imgsByPid.get(top[0].s.id)?.[0]?.url || '') : '',
      candidate2_name: top[1]?.s.name || '',
      candidate2_slug: top[1]?.s.slug || '',
      candidate2_score: top[1]?.sc?.toFixed(3) || '',
      candidate2_image: top[1] ? (imgsByPid.get(top[1].s.id)?.[0]?.url || '') : '',
      candidate3_name: top[2]?.s.name || '',
      candidate3_slug: top[2]?.s.slug || '',
      candidate3_score: top[2]?.sc?.toFixed(3) || '',
      candidate3_image: top[2] ? (imgsByPid.get(top[2].s.id)?.[0]?.url || '') : '',
    });
  }

  const out = path.join(process.cwd(), 'data', 'image-gap-candidates.csv');
  const headers = Object.keys(rows[0] || {
    target_id: '', target_name: '', target_slug: '', target_price: '',
    candidate1_name: '', candidate1_slug: '', candidate1_score: '', candidate1_image: '',
    candidate2_name: '', candidate2_slug: '', candidate2_score: '', candidate2_image: '',
    candidate3_name: '', candidate3_slug: '', candidate3_score: '', candidate3_image: '',
  });
  const lines = [headers.join(',')];
  for (const r of rows) lines.push(headers.map((h) => csvEscape(r[h])).join(','));
  fs.writeFileSync(out, `${lines.join('\n')}\n`, 'utf-8');

  const withCandidate = rows.filter((r) => r.candidate1_name).length;
  console.log(`Products without images: ${withoutImages.length}`);
  console.log(`Products with >=1 candidate match: ${withCandidate}`);
  console.log(`Wrote: ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

