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

const SAFE_PAIRS = [
  { target: 'Glue Gun', source: 'hot melt glue gun' },
  { target: 'Got2b Glue', source: 'Schwarzkopf Got2b Glued Water Resistant Spiking Glue' },
  { target: 'ORS Mousse Wrap', source: 'ORS Olive Oil Hold & Shine Wrap/Set Mousse' },
  { target: 'Olive Oil Edge Control', source: 'ORS Olive Oil Edge Control Hair Gel' },
  { target: 'Mannequin Foot', source: 'silicone mannequin foot' },
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id,name,created_at');
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
  for (const [k, list] of byNorm.entries()) {
    list.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    byNorm.set(k, list);
  }

  const imgsByPid = new Map();
  for (const img of images || []) {
    imgsByPid.set(img.product_id, [...(imgsByPid.get(img.product_id) || []), img]);
  }
  for (const [pid, list] of imgsByPid.entries()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    imgsByPid.set(pid, list);
  }

  const inserts = [];
  const logs = [];

  for (const pair of SAFE_PAIRS) {
    const tList = byNorm.get(normalizeName(pair.target)) || [];
    const sList = byNorm.get(normalizeName(pair.source)) || [];
    if (!tList.length || !sList.length) continue;

    const target = [...tList].reverse().find((p) => (imgsByPid.get(p.id) || []).length === 0);
    const source = sList.find((p) => (imgsByPid.get(p.id) || []).length > 0);
    if (!target || !source) continue;

    const sourceImages = imgsByPid.get(source.id) || [];
    if (!sourceImages.length) continue;

    for (const [idx, img] of sourceImages.entries()) {
      inserts.push({
        product_id: target.id,
        url: img.url,
        alt_text: img.alt_text || target.name || null,
        position: img.position ?? idx,
        width: img.width ?? null,
        height: img.height ?? null,
      });
    }

    logs.push({
      target: target.name,
      source: source.name,
      count: sourceImages.length,
    });
  }

  console.log(`Specific safe pairs matched: ${logs.length}`);
  for (const l of logs) {
    console.log(`- ${l.target} <= ${l.source} (${l.count} image(s))`);
  }
  console.log(`Image rows to insert: ${inserts.length}${dryRun ? ' (dry run)' : ''}`);

  if (dryRun || inserts.length === 0) return;
  const { error: insErr } = await supabase.from('product_images').insert(inserts);
  if (insErr) throw insErr;
  console.log(`Inserted ${inserts.length} image row(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

