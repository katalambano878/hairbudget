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

function scoreMatch(target, source) {
  const ta = tokenize(target.name);
  const sb = tokenize(source.name);
  if (ta.length === 0 || sb.length === 0) return 0;

  const jac = jaccard(ta, sb);
  const ov = overlapMin(ta, sb);
  const shared = Math.round(ov * Math.min(new Set(ta).size, new Set(sb).size));

  let score = ov * 0.7 + jac * 0.2;

  if (target.category_id && source.category_id && target.category_id === source.category_id) {
    score += 0.08;
  }

  const tPrice = Number(target.price || 0);
  const sPrice = Number(source.price || 0);
  if (tPrice > 0 && sPrice > 0) {
    const diff = Math.abs(tPrice - sPrice);
    if (diff <= 10) score += 0.05;
    const rel = diff / Math.max(tPrice, sPrice);
    if (rel <= 0.15) score += 0.04;
  }

  if (shared < 2) score -= 0.2;
  return score;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const useFuzzy = process.argv.includes('--fuzzy');
  const ignoreAge = process.argv.includes('--ignore-age');
  const recentDaysArg = process.argv.find((x) => x.startsWith('--recent-days='));
  const recentDays = recentDaysArg ? Number(recentDaysArg.split('=')[1]) : 30;
  const minScoreArg = process.argv.find((x) => x.startsWith('--min-score='));
  const minScore = minScoreArg ? Number(minScoreArg.split('=')[1]) : 0.86;
  const marginArg = process.argv.find((x) => x.startsWith('--min-margin='));
  const minMargin = marginArg ? Number(marginArg.split('=')[1]) : 0.12;
  const env = { ...process.env, ...loadEnv() };

  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id,name,created_at,category_id,price')
    .order('created_at', { ascending: true });
  if (pErr) throw pErr;

  const { data: images, error: iErr } = await supabase
    .from('product_images')
    .select('id,product_id,url,alt_text,position,width,height');
  if (iErr) throw iErr;

  const imagesByProduct = new Map();
  for (const img of images || []) {
    imagesByProduct.set(img.product_id, [...(imagesByProduct.get(img.product_id) || []), img]);
  }
  for (const [pid, imgs] of imagesByProduct.entries()) {
    imgs.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    imagesByProduct.set(pid, imgs);
  }

  const groups = new Map();
  for (const p of products || []) {
    const key = normalizeName(p.name);
    groups.set(key, [...(groups.get(key) || []), p]);
  }

  const cloneJobs = [];
  const jobSummary = [];
  const targetIdsCovered = new Set();

  for (const [key, group] of groups.entries()) {
    if (!key || group.length < 2) continue;

    const enriched = group.map((p) => ({
      ...p,
      imageCount: (imagesByProduct.get(p.id) || []).length,
    }));

    const sourceCandidates = enriched
      .filter((p) => p.imageCount > 0)
      .sort((a, b) => b.imageCount - a.imageCount || new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (!sourceCandidates.length) continue;
    const source = sourceCandidates[0];
    const sourceImages = imagesByProduct.get(source.id) || [];

    const targets = enriched
      .filter((p) => p.id !== source.id && p.imageCount === 0)
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    if (!targets.length) continue;

    for (const t of targets) {
      const clones = sourceImages.map((img, idx) => ({
        product_id: t.id,
        url: img.url,
        alt_text: img.alt_text || t.name || null,
        position: img.position ?? idx,
        width: img.width ?? null,
        height: img.height ?? null,
      }));
      cloneJobs.push(...clones);
      targetIdsCovered.add(t.id);
      jobSummary.push({
        normalized_name: key,
        source_name: source.name,
        source_id: source.id,
        source_image_count: sourceImages.length,
        target_name: t.name,
        target_id: t.id,
        mode: 'exact-name',
      });
    }
  }

  if (useFuzzy) {
    const now = Date.now();
    const cutoff = now - recentDays * 24 * 60 * 60 * 1000;

    const targets = (products || []).filter((p) => {
      const imgCount = (imagesByProduct.get(p.id) || []).length;
      const created = new Date(p.created_at).getTime();
      return imgCount === 0 && created >= cutoff && !targetIdsCovered.has(p.id);
    });

    const sources = (products || []).filter((p) => (imagesByProduct.get(p.id) || []).length > 0);

    for (const t of targets) {
      const candidates = [];
      for (const s of sources) {
        if (s.id === t.id) continue;
        if (!ignoreAge) {
          const sCreated = new Date(s.created_at).getTime();
          const tCreated = new Date(t.created_at).getTime();
          if (sCreated > tCreated) continue; // prefer older source
        }

        const score = scoreMatch(t, s);
        if (score > 0.55) {
          candidates.push({ s, score });
        }
      }

      candidates.sort((a, b) => b.score - a.score);
      if (!candidates.length) continue;

      const best = candidates[0];
      const second = candidates[1];
      const margin = second ? best.score - second.score : 1;

      // Conservative acceptance.
      if (best.score < minScore || margin < minMargin) continue;

      const srcImages = imagesByProduct.get(best.s.id) || [];
      if (!srcImages.length) continue;

      const clones = srcImages.map((img, idx) => ({
        product_id: t.id,
        url: img.url,
        alt_text: img.alt_text || t.name || null,
        position: img.position ?? idx,
        width: img.width ?? null,
        height: img.height ?? null,
      }));

      cloneJobs.push(...clones);
      targetIdsCovered.add(t.id);
      jobSummary.push({
        normalized_name: normalizeName(t.name),
        source_name: best.s.name,
        source_id: best.s.id,
        source_image_count: srcImages.length,
        target_name: t.name,
        target_id: t.id,
        mode: `fuzzy:${best.score.toFixed(3)}`,
      });
    }
  }

  console.log(`Products: ${products?.length || 0}`);
  console.log(`Image rows existing: ${images?.length || 0}`);
  console.log(`Fuzzy mode: ${useFuzzy ? `ON (recent-days=${recentDays}, min-score=${minScore}, min-margin=${minMargin}, ignore-age=${ignoreAge})` : 'OFF'}`);
  console.log(`Duplicate groups with reusable images: ${new Set(jobSummary.map((x) => x.normalized_name)).size}`);
  console.log(`Targets to receive cloned images: ${jobSummary.length}`);
  console.log(`Image rows to insert: ${cloneJobs.length}${dryRun ? ' (dry run)' : ''}`);

  for (const row of jobSummary) {
    console.log(
      `- [${row.mode}] ${row.target_name} <= ${row.source_name} (${row.source_image_count} image(s))`
    );
  }

  if (dryRun || cloneJobs.length === 0) return;

  const batchSize = 200;
  for (let i = 0; i < cloneJobs.length; i += batchSize) {
    const chunk = cloneJobs.slice(i, i + batchSize);
    const { error } = await supabase.from('product_images').insert(chunk);
    if (error) throw error;
  }

  console.log(`Inserted ${cloneJobs.length} cloned image row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

