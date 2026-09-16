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

const categoryKeywordRules = [
  {
    slug: 'nail-essentials',
    keywords: [
      'nail', 'polygel', 'acrylic', 'gel', 'cuticle', 'rhinestone', 'chrome',
      'mannequin hand', 'mannequin foot', 'uv lamp', 'drill', 'dappen', 'nippers',
      'cutters', 'debonder', 'top coat', 'base coat', 'primer', 'cat eye', 'charms'
    ],
  },
  {
    slug: 'braid-extensions',
    keywords: [
      'ponytail', 'braid', 'extension', 'clip in', 'crochet', 'weave'
    ],
  },
  {
    slug: 'haircare-products',
    keywords: [
      'shampoo', 'conditioner', 'mask', 'mayo', 'mayonnaise', 'serum', 'anti itch',
      'oil', 'sheen', 'dye', 'bleach', 'remover', 'edge control', 'ultrabond'
    ],
  },
  {
    slug: 'styling-tools',
    keywords: [
      'wax', 'mousse', 'twist gel', 'got2b', 'glue', 'foam', 'spray', 'holding',
      'setting', 'styling'
    ],
  },
  {
    slug: 'hair-and-salon-tools',
    keywords: [
      'tripod', 'arm rest', 'bag', 'knife comb', 'comb', 'band', 'brush', 'desk lamp',
      'collector', 'organizer', 'bowl', 'stand'
    ],
  },
];

function detectExpectedSlugs(name) {
  const s = name.toLowerCase();
  const expected = [];
  for (const rule of categoryKeywordRules) {
    if (rule.keywords.some((k) => s.includes(k))) {
      expected.push(rule.slug);
    }
  }
  return expected;
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: catErr } = await supabase.from('categories').select('id,name,slug');
  if (catErr) throw catErr;
  const byId = new Map((categories || []).map((c) => [c.id, c]));

  const { data: products, error: prodErr } = await supabase
    .from('products')
    .select('id,name,slug,category_id,status')
    .order('name');
  if (prodErr) throw prodErr;

  const uncategorized = [];
  const noRuleMatch = [];
  const suspicious = [];
  const countByCategory = new Map();

  for (const p of products || []) {
    const cat = p.category_id ? byId.get(p.category_id) : null;
    const catSlug = cat?.slug || 'uncategorized';
    countByCategory.set(catSlug, (countByCategory.get(catSlug) || 0) + 1);

    if (!p.category_id) {
      uncategorized.push(p);
      continue;
    }

    const expectedSlugs = detectExpectedSlugs(p.name);
    if (expectedSlugs.length === 0) {
      noRuleMatch.push({ ...p, catSlug });
      continue;
    }
    if (!expectedSlugs.includes(catSlug)) {
      suspicious.push({ ...p, catSlug, expectedSlugs });
    }
  }

  console.log(`Total products: ${products?.length || 0}`);
  console.log('Counts by category:');
  for (const [slug, count] of [...countByCategory.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`- ${slug}: ${count}`);
  }

  console.log(`\nUncategorized: ${uncategorized.length}`);
  uncategorized.slice(0, 40).forEach((p) => console.log(`- ${p.name} (${p.slug})`));
  if (uncategorized.length > 40) {
    console.log(`...and ${uncategorized.length - 40} more`);
  }

  console.log(`\nPotentially miscategorized (keyword audit): ${suspicious.length}`);
  suspicious.slice(0, 120).forEach((p) => {
    console.log(`- ${p.name} | current=${p.catSlug} | expected~=${p.expectedSlugs.join(',')}`);
  });
  if (suspicious.length > 120) {
    console.log(`...and ${suspicious.length - 120} more`);
  }

  console.log(`\nNo keyword-rule match (manual review needed): ${noRuleMatch.length}`);
  noRuleMatch.slice(0, 80).forEach((p) => console.log(`- ${p.name} | current=${p.catSlug}`));
  if (noRuleMatch.length > 80) {
    console.log(`...and ${noRuleMatch.length - 80} more`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

