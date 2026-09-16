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

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id,name,slug,created_at')
    .order('created_at', { ascending: true })
    .order('id', { ascending: true });
  if (pErr) throw pErr;

  const { data: images, error: iErr } = await supabase
    .from('product_images')
    .select('id,product_id,url,alt_text,position,width,height');
  if (iErr) throw iErr;

  const byNorm = new Map();
  for (const p of products || []) {
    const key = normalizeName(p.name);
    byNorm.set(key, [...(byNorm.get(key) || []), p]);
  }

  const imgsByPid = new Map();
  for (const img of images || []) {
    imgsByPid.set(img.product_id, [...(imgsByPid.get(img.product_id) || []), img]);
  }
  for (const [pid, list] of imgsByPid.entries()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    imgsByPid.set(pid, list);
  }

  const duplicateGroups = [...byNorm.entries()].filter(([k, g]) => k && g.length > 1);
  const deleteIds = [];
  const cloneInserts = [];
  const logs = [];

  for (const [norm, group] of duplicateGroups) {
    const sorted = [...group].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
    const keep = sorted[sorted.length - 1]; // newest
    const old = sorted.slice(0, -1); // delete

    const keepUrls = new Set((imgsByPid.get(keep.id) || []).map((x) => x.url));
    let nextPosition = (imgsByPid.get(keep.id) || []).length;

    for (const o of old) {
      const oldImages = imgsByPid.get(o.id) || [];
      for (const img of oldImages) {
        if (keepUrls.has(img.url)) continue;
        keepUrls.add(img.url);
        cloneInserts.push({
          product_id: keep.id,
          url: img.url,
          alt_text: img.alt_text || keep.name || null,
          position: nextPosition,
          width: img.width ?? null,
          height: img.height ?? null,
        });
        nextPosition += 1;
      }
      deleteIds.push(o.id);
    }

    logs.push({
      normalized: norm,
      keep_name: keep.name,
      keep_slug: keep.slug,
      keep_id: keep.id,
      old_count: old.length,
      old_names: old.map((x) => x.name).join(' | '),
    });
  }

  console.log(`Duplicate groups: ${duplicateGroups.length}`);
  console.log(`Old products to delete: ${deleteIds.length}${dryRun ? ' (dry run)' : ''}`);
  console.log(`Extra images to preserve on kept products: ${cloneInserts.length}${dryRun ? ' (dry run)' : ''}`);
  for (const row of logs) {
    console.log(`- ${row.normalized}: keep "${row.keep_name}" (${row.keep_slug}), delete ${row.old_count}`);
  }

  if (dryRun) return;

  if (cloneInserts.length) {
    const batchSize = 200;
    for (let i = 0; i < cloneInserts.length; i += batchSize) {
      const { error } = await supabase
        .from('product_images')
        .insert(cloneInserts.slice(i, i + batchSize));
      if (error) throw error;
    }
  }

  if (deleteIds.length) {
    const { error: imgDelErr } = await supabase.from('product_images').delete().in('product_id', deleteIds);
    if (imgDelErr) throw imgDelErr;
    const { error: varDelErr } = await supabase.from('product_variants').delete().in('product_id', deleteIds);
    if (varDelErr) throw varDelErr;
    const { error: prodDelErr } = await supabase.from('products').delete().in('id', deleteIds);
    if (prodDelErr) throw prodDelErr;
  }

  console.log(`Deleted ${deleteIds.length} older duplicate product(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

