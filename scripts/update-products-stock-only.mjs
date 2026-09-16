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

function parseCsvLine(line) {
  const out = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      out.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  out.push(cur);
  return out;
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

function parseFile(fp) {
  const lines = fs.readFileSync(fp, 'utf-8').split(/\r?\n/).filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const idx = Object.fromEntries(headers.map((h, i) => [h.trim(), i]));
  const rows = [];
  for (const line of lines.slice(1)) {
    const c = parseCsvLine(line);
    const name = (c[idx.name] || '').trim();
    const slugCol = idx.slug !== undefined ? (c[idx.slug] || '').trim() : '';
    const stock = Number((c[idx.stock] || '').trim());
    if (!Number.isFinite(stock)) continue;
    if (!name && !slugCol) continue;
    rows.push({ name, slug: slugCol || null, stock });
  }
  return rows;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const fp = path.join(process.cwd(), 'data', 'stock-updates.csv');
  if (!fs.existsSync(fp)) throw new Error('Missing data/stock-updates.csv');

  const rows = parseFile(fp);
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error } = await supabase.from('products').select('id,name,slug,quantity');
  if (error) throw error;

  const byNorm = new Map();
  for (const p of products || []) {
    const n = normalizeName(p.name);
    byNorm.set(n, [...(byNorm.get(n) || []), p]);
  }

  const alias = {
    'wig fix stick': ['wig-fix-stick', 'wig-fix-stick-1', 'wig-fix-stick-2'],
    'nbi wax gel': ['nbi-wax-gel'],
    'eunera conditioner big': [
      'eunera-conditioner-big',
      'eunera-conditioner',
      'ewura-conditioner-big',
      'ewura-conditioner',
    ],
    'eunera shampoo big': ['eunera-shampoo-big', 'eunera-shampoo', 'ewura-shampoo-big', 'ewura-shampoo'],
    'lodais': ['leodais-serum'],
    'lodais serum': ['leodais-serum'],
    'kuura goo': ['kuura-supergro-hair-oil'],
    'kuura treatment': ['kuura-honey-papaya-no-breakage-hair'],
    'got 2 b glued': ['got2b-glue'],
    'got2b glued': ['got2b-glue'],
    'ikt gel': ['ikt-brand-hair-styling-wax'],
    'vital polisher': ['vitale-olive-oil-hair-polisher-2'],
    'avocado gel': ['minkin-avocado-hair-styling-gel'],
    'human hair mannequin': ['long-neck-mannequin'],
    'c needles': ['organ-needles'],
    'c needels': ['organ-needles'],
    'mettalic bobbins': ['metallic-bobbin'],
    'presser footer': ['industrial-sewing-machine-presser-foot'],
    'barrel curler': ['baroel-32mm-ceramic-curling-tong'],
    'cloud 9 straightner': ['titanium-straightener'],
    'ors conditioner': ['korres-pure-greek-olive-3-in-1-nourishing-oil'],
    'color revitalize': ['tresemm-rich-moisture-conditioner'],
    'bonding glue big': ['pinkee-s-liquid-big'],
    'bonding glue small': ['pinkee-s-liquid-small'],
    'ebin adhesive small': ['pinkee-s-liquid-small'],
    'ebin adhesive medium': ['pinkee-s-liquid-medium'],
    'ebin adhesive big': ['pinkee-s-liquid-big'],
    'ebin adhesive sports small': ['lace-bond-adhesive-spray'],
    'ebin melting spray big': ['ebin-new-york-wonder-lace-bond-lace-melt-spray-3'],
    'ebin melting spray small': ['ebin-new-york-wonder-lace-bond-lace-melt-spray-3'],
    'ebin melting spray sports': ['ebin-melting-spray-sport'],
    'colored ebin melting spray': ['ebin-melting-spray-colored'],
    'curl keeper': ['apple-curl-keeper'],
    'foaming wax': ['foaming-wax'],
    'wax stick': ['nbi-wax-gel'],
    'ors shampoo': ['olive-oil-shampoo'],
    'mayonnaise big': ['ors-mayonnaise-big'],
    'ors mousse': ['ors-mousse-wrap'],
    'lock twist': ['ors-twist-gel'],
    'lock and twist': ['ors-twist-gel'],
    'hot comb': ['electric-hair-straightening-hot-comb'],
    'lace tint mousse': ['akendy-brand-lace-tint-mousse'],
    'comb set': ['10-pieces-comb-set'],
    'control clips pack': ['control-clips'],
    'pinking shears': ['stainless-steel-pinking'],
    'protective ear frontal': ['ear-protective-frontal-band'],
    'headband wigcap': ['head-band-wig-cap'],
    'scalp massage comb': ['silicone-hair-scalp-massager-and-shampoo-brush'],
    'heat gloves': ['oligei-heat-resistant-gloves'],
    'satin bonnet': ['hair-bonnet'],
    'kuura leave in conditioner': ['kuura-honey-and-papaya-leave-in-conditioner'],
    'kuura conditioner big': ['kuura-beauty-avocado-batana-blend-moisturizing-conditioner'],
    'kuura shampoo big': ['kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo'],
    'kuura shampoo small': ['j'],
    'kuura for conditioner': ['kuura-beauty-moisture-seal-conditioner'],
    'kuura for shampoo': ['j'],
    'luxury protein conditioner': ['blend-moikuura-avocado-sturizing-detangling-conditioner'],
    '600pcs gel tips': ['600pcs-ultrabond'],
    'normal stick on nails': ['normal-nail'],
    '3d diamond nails': ['3d-silicon-brush'],
    'beginner nail set in case': ['beginners-set-with-case'],
    'wooden arm rest short legs': ['wooden-arm-rest-short'],
    'kemei clipper': ['trimmer-set'],
    'perfume set': ['perfume-gift-set'],
    'nova dryer': ['nova-hand-dryer'],
    'ors shea bag': ['ors-olive-sheen-big'],
    'scissors': ['cutters'],
    'frontal scissors': ['nippers'],
    'argan heat protectant': ['professional-argan-oil-nourishing-hair-mask'],
    'disposable frontal wrap': ['ponytail-wrap'],
  };
  const bySlug = new Map();
  for (const p of products || []) {
    bySlug.set((p.slug || '').toLowerCase(), p);
  }

  const missing = [];
  const ambiguous = [];
  const updates = [];

  for (const r of rows) {
    if (r.slug) {
      const p = bySlug.get(String(r.slug).toLowerCase());
      if (p) {
        updates.push({ id: p.id, slug: p.slug, name: p.name, stock: r.stock });
        continue;
      }
      missing.push(`${r.name || r.slug} (slug:${r.slug})`);
      continue;
    }
    const norm = normalizeName(r.name);
    let cands = byNorm.get(norm) || [];
    if (!cands.length && alias[norm]) {
      for (const s of alias[norm]) {
        const p = bySlug.get(String(s).toLowerCase());
        if (p) {
          cands = [p];
          break;
        }
      }
    }
    if (!cands.length) {
      missing.push(r.name);
      continue;
    }
    if (cands.length > 1) {
      ambiguous.push({ name: r.name, cands: cands.map((p) => `${p.name} (${p.slug})`) });
      continue;
    }
    updates.push({ id: cands[0].id, slug: cands[0].slug, name: cands[0].name, stock: r.stock });
  }

  const byId = new Map();
  for (const u of updates) {
    byId.set(u.id, u);
  }
  const deduped = [...byId.values()];

  console.log(`Stock rows: ${rows.length}`);
  console.log(`Matched: ${deduped.length} unique products (${updates.length} rows before dedupe)${dryRun ? ' (dry run)' : ''}`);
  console.log(`Missing: ${missing.length}`);
  console.log(`Ambiguous: ${ambiguous.length}`);

  for (const u of deduped) {
    console.log(`- ${u.name} (${u.slug}) => qty=${u.stock}`);
  }

  if (missing.length) {
    console.log('\nMissing names:');
    for (const m of missing) console.log(`- ${m}`);
  }

  if (ambiguous.length) {
    console.log('\nAmbiguous names:');
    for (const a of ambiguous) console.log(`- ${a.name} => ${a.cands.join(' | ')}`);
  }

  if (dryRun) return;

  for (const u of deduped) {
    const { error: upErr } = await supabase.from('products').update({ quantity: u.stock }).eq('id', u.id);
    if (upErr) throw upErr;
  }

  console.log(`Updated ${deduped.length} products.`); 
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

