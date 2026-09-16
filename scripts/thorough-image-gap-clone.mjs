/**
 * Thorough pass: clone images for no-image products using (in order):
 * 1) Slug size variants: same base slug after stripping -big|-small|-mini|-medium|-large
 * 2) Name base match: same normalized name after stripping size words
 * 3) Text score (report-image-gaps formula) with threshold + margin vs 2nd best
 *
 * Usage:
 *   node scripts/thorough-image-gap-clone.mjs --dry-run
 *   node scripts/thorough-image-gap-clone.mjs --min-score=0.78 --min-margin=0.06
 */
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

const SIZE_WORDS = /\b(big|small|mini|medium|large|xl|sm|lg)\b/gi;

function nameBase(name) {
  return normalizeName(name).replace(SIZE_WORDS, ' ').replace(/\s+/g, ' ').trim();
}

const SIZE_SUFFIX = /^(.+)-(big|small|mini|medium|large)$/i;

function slugBase(slug) {
  const m = (slug || '').match(SIZE_SUFFIX);
  return m ? m[1] : slug;
}

function tokenize(name) {
  const stop = new Set([
    'the', 'and', 'with', 'for', 'of', 'in', 'a', 'an', 'to', 'by', 'new',
    'professional', 'brand', 'set', 'kit', 'piece', 'pcs', 'pc',
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

function textScore(target, source) {
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

function parseArgs() {
  const dryRun = process.argv.includes('--dry-run');
  const minScoreArg = process.argv.find((x) => x.startsWith('--min-score='));
  const minMarginArg = process.argv.find((x) => x.startsWith('--min-margin='));
  const minScore = minScoreArg ? Number(minScoreArg.split('=')[1]) : 0.78;
  const minMargin = minMarginArg ? Number(minMarginArg.split('=')[1]) : 0.06;
  return { dryRun, minScore, minMargin };
}

async function main() {
  const { dryRun, minScore, minMargin } = parseArgs();
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const [{ data: products, error: pErr }, { data: images, error: iErr }] = await Promise.all([
    supabase.from('products').select('id,name,slug,price,category_id,created_at').order('created_at', { ascending: true }),
    supabase.from('product_images').select('product_id,url,alt_text,position,width,height'),
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

  const bySlug = new Map((products || []).map((p) => [p.slug, p]));
  const withoutImages = (products || []).filter((p) => (imgsByPid.get(p.id) || []).length === 0);
  const withImages = (products || []).filter((p) => (imgsByPid.get(p.id) || []).length > 0);

  const nameBaseToWithImages = new Map();
  for (const p of withImages) {
    const b = nameBase(p.name);
    if (!b) continue;
    if (!nameBaseToWithImages.has(b)) nameBaseToWithImages.set(b, []);
    nameBaseToWithImages.get(b).push(p);
  }

  const jobs = [];
  const seenTarget = new Set();

  function addJob(target, source, reason) {
    if (seenTarget.has(target.id)) return;
    const srcImgs = imgsByPid.get(source.id) || [];
    if (!srcImgs.length) return;
    seenTarget.add(target.id);
    const clones = srcImgs.map((img, idx) => ({
      product_id: target.id,
      url: img.url,
      alt_text: img.alt_text || target.name || null,
      position: img.position ?? idx,
      width: img.width ?? null,
      height: img.height ?? null,
    }));
    jobs.push({ target, source, reason, clones });
  }

  // --- 1) Slug size variant: base slug exact match with images ---
  for (const t of withoutImages) {
    const base = slugBase(t.slug);
    if (base === t.slug) continue;
    const exact = bySlug.get(base);
    if (exact && (imgsByPid.get(exact.id) || []).length > 0) {
      addJob(t, exact, `slug-base:${base}`);
    }
  }

  // --- 1b) Slug variant: another sized sibling has images (e.g. foo-big has img, foo-small does not) ---
  for (const t of withoutImages) {
    if (seenTarget.has(t.id)) continue;
    const base = slugBase(t.slug);
    if (base === t.slug) continue;
    const siblings = (products || []).filter(
      (p) => p.id !== t.id && slugBase(p.slug) === base && (imgsByPid.get(p.id) || []).length > 0
    );
    siblings.sort(
      (a, b) =>
        (imgsByPid.get(b.id) || []).length - (imgsByPid.get(a.id) || []).length ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    if (siblings[0]) addJob(t, siblings[0], `slug-sibling:${base}`);
  }

  // --- 2) Name base: one normalized "line" has imaged products ---
  for (const t of withoutImages) {
    if (seenTarget.has(t.id)) continue;
    const b = nameBase(t.name);
    if (!b || b.length < 4) continue;
    const candidates = nameBaseToWithImages.get(b) || [];
    const sources = candidates.filter((s) => s.id !== t.id);
    if (!sources.length) continue;
    sources.sort(
      (a, b) =>
        (imgsByPid.get(b.id) || []).length - (imgsByPid.get(a.id) || []).length ||
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    addJob(t, sources[0], `name-base:${b.slice(0, 40)}`);
  }

  // --- 3) Text score (skip targets already covered) ---
  for (const t of withoutImages) {
    if (seenTarget.has(t.id)) continue;
    const scored = [];
    for (const s of withImages) {
      if (s.id === t.id) continue;
      const sc = textScore(t, s);
      if (sc < minScore) continue;
      scored.push({ s, sc });
    }
    scored.sort((a, b) => b.sc - a.sc);
    if (!scored.length) continue;
    const best = scored[0];
    const second = scored[1];
    const margin = second ? best.sc - second.sc : 1;
    if (margin < minMargin) continue;
    // Reject known-bad families (machine vs accessory)
    const tn = normalizeName(t.name);
    const sn = normalizeName(best.s.name);
    if (tn.includes('sewing machine') && sn.includes('presser')) continue;
    if (tn.includes('practice hand') && sn.includes('practice finger')) continue;
    if (tn.includes('modeling gel') && sn.includes('gel polish') && !sn.includes('modeling')) continue;

    addJob(t, best.s, `text:${best.sc.toFixed(3)}`);
  }

  const allClones = jobs.flatMap((j) => j.clones);

  console.log(`No-image products: ${withoutImages.length}`);
  console.log(`Thorough jobs: ${jobs.length} (minScore=${minScore}, minMargin=${minMargin})${dryRun ? ' DRY-RUN' : ''}`);
  for (const j of jobs) {
    console.log(
      `- [${j.reason}] ${j.target.name} (${j.target.slug}) <= ${j.source.name} (${j.source.slug}) | ${j.clones.length} img`
    );
  }
  console.log(`Total rows to insert: ${allClones.length}`);

  if (dryRun || allClones.length === 0) return;

  const batchSize = 200;
  for (let i = 0; i < allClones.length; i += batchSize) {
    const chunk = allClones.slice(i, i + batchSize);
    const { error } = await supabase.from('product_images').insert(chunk);
    if (error) throw error;
  }
  console.log(`Inserted ${allClones.length} row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
