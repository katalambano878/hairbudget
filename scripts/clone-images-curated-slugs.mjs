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

// Curated from visual + name verification.
const CURATED = [
  { targetSlug: 'olive-sheen', sourceSlugStartsWith: 'ors-olive-oil-nourishing-sheen-spray' },
  { targetSlug: 'ors-olive-sheen-big', sourceSlugStartsWith: 'ors-olive-oil-nourishing-sheen-spray' },
  { targetSlug: 'ors-olive-sheen-small', sourceSlugStartsWith: 'ors-olive-oil-nourishing-sheen-spray' },

  { targetSlug: 'argan-mask', sourceSlugStartsWith: 'professional-argan-oil-nourishing-hair-mask' },

  { targetSlug: 'debonder', sourceSlugStartsWith: 'evobond-debonder-ad-1-a-10ml-liquid-adhesive-remover' },

  { targetSlug: 'silicon-mix-shampoo-big', sourceSlugStartsWith: 'silicon-mix-hydrating-shampoo' },
  { targetSlug: 'silicon-mix-shampoo-medium', sourceSlugStartsWith: 'silicon-mix-hydrating-shampoo' },
  { targetSlug: 'silicon-mix-shampoo-small', sourceSlugStartsWith: 'silicon-mix-hydrating-shampoo' },

  { targetSlug: 'pinkee-s-liquid-big', sourceSlugStartsWith: 'pinkee-s-pro-acrylic-liquid' },
  { targetSlug: 'pinkee-s-liquid-medium', sourceSlugStartsWith: 'pinkee-s-pro-acrylic-liquid' },
  { targetSlug: 'pinkee-s-liquid-small', sourceSlugStartsWith: 'pinkee-s-pro-acrylic-liquid' },

  { targetSlug: 'rechargeable-drill-1', sourceSlugStartsWith: 'professional-45000rpm-rechargeable-electric-nail-drill-machine-kit' },
  { targetSlug: 'rechargeable-drill-2', sourceSlugStartsWith: 'professional-45000rpm-rechargeable-electric-nail-drill-machine-kit' },
  { targetSlug: 'rechargeable-drill-3', sourceSlugStartsWith: 'professional-45000rpm-rechargeable-electric-nail-drill-machine-kit' },

  { targetSlug: 'acrylic-powder', sourceSlugStartsWith: 'ezflow-nail-systems-a-polymer-acrylic-powder' },
  { targetSlug: 'ibd-builder-gel', sourceSlugStartsWith: 'ibd-hard-gel-led-uv-builder-gel' },
  { targetSlug: 'mushering-top-base-coat', sourceSlugStartsWith: 'muscheering-top-coat-and-base-coat-uv-gel' },
  { targetSlug: 'rosaline-base-coat', sourceSlugStartsWith: 'rosalind-base-coat-nail-polish' },
  { targetSlug: 'rosaline-dehydrator-primer', sourceSlugStartsWith: 'rosalind-nail-dehydrator-and-nail-primer-set' },

  { targetSlug: '600pcs-soft-gel-tips', sourceSlugStartsWith: 'clear-medium-almond-shaped-soft-gel-nail-extension-tips' },
  { targetSlug: '240pcs-soft-gel-tips', sourceSlugStartsWith: 'clear-medium-almond-shaped-soft-gel-nail-extension-tips' },

  { targetSlug: '42pcs-very-good-gel', sourceSlugStartsWith: 'very-good-nail-international-color-gel' },
  { targetSlug: '44pcs-very-good-gel', sourceSlugStartsWith: 'very-good-nail-international-color-gel' },
  { targetSlug: '60pcs-very-good-gel-professional', sourceSlugStartsWith: 'very-good-nail-international-color-gel' },
  { targetSlug: '6pcs-very-good-gel-polish', sourceSlugStartsWith: 'nail-gel-polish-kit' },
  { targetSlug: '60pcs-very-good-purple', sourceSlugStartsWith: 'very-good-nail' },
  { targetSlug: 'beginners-set-with-gel-polish', sourceSlugStartsWith: 'nail-gel-polish-kit' },

  { targetSlug: 'acrylic-powder-nude-big', sourceSlugStartsWith: 'acrylic-powder' },
  { targetSlug: 'acrylic-powder-nude-small', sourceSlugStartsWith: 'acrylic-powder' },
  { targetSlug: 'acrylic-brush-set', sourceSlugStartsWith: '6-piece-acrylic-nail-art-brush' },
  { targetSlug: 'acrylic-nail-art', sourceSlugStartsWith: '6-piece-acrylic-nail-art-brush' },
  { targetSlug: 'foldable-arm-rest', sourceSlugStartsWith: 'foldable-pu-leather-and-stainless-steel-nail-arm-rest' },
  { targetSlug: 'gloves', sourceSlugStartsWith: 'disposable-nitrile-protective-gloves' },
  { targetSlug: 'olive-oil-conditioner', sourceSlugStartsWith: 'olive-oil-shampoo' },
  { targetSlug: 'apple-curl-keeper', sourceSlugStartsWith: 'curl-keeper-moisturizing-hair-lotion' },
  { targetSlug: 'pink-arm-rest', sourceSlugStartsWith: 'nail-manicure-arm-rest-cushion' },
  { targetSlug: 'kuuqa-anti-itch', sourceSlugStartsWith: 'kuura-cool-feel-anti-itch-spray' },
  { targetSlug: 'olive-bleach-powder', sourceSlugStartsWith: 'nutrition-olive-oil-hair-bleaching-powder' },
  { targetSlug: 'u-shape-arm-rest', sourceSlugStartsWith: 'foldable-arm-rest' },
  { targetSlug: 'wooden-arm-rest-short', sourceSlugStartsWith: 'foldable-arm-rest' },
  { targetSlug: 'wooden-arm-rest-long', sourceSlugStartsWith: 'pink-arm-rest' },
  { targetSlug: 'magic-base-coat', sourceSlugStartsWith: 'rosaline-base-coat' },
  { targetSlug: 'magic-top-coat', sourceSlugStartsWith: 'mushering-top-base-coat' },

  // Same item as vanity makeup organizer; Table Organizer listing had no images.
  { targetSlug: 'table-organizer', sourceSlugStartsWith: 'acrylic-6-compartment-vanity-makeup-organizer' },

  // BLUEQUE 80W unit is the same nail dust collector listing under a shorter name.
  { targetSlug: 'dust-collector', sourceSlugStartsWith: 'blueque-80w-bq-858-8' },

  // Same Solingen cuticle nippers; short "Nippers" listing had no images.
  { targetSlug: 'nippers', sourceSlugStartsWith: 'solingen-beauty-care-stainless-steel-cuticle-nipper' },

  // Same retail line as Keratin Nutrition Moisturizing Shampoo (image-gap report ~0.88).
  { targetSlug: 'keratin-shampoo', sourceSlugStartsWith: 'keratin-nutrition-moisturizing' },

  // Short "Blooming Gel" listing matches BORN PRETTY Blooming Gel photo.
  { targetSlug: 'blooming-gel', sourceSlugStartsWith: 'born-pretty-15ml-watercolor-nail-gel' },

  // Thorough pass: same SKU / line verified in DB (see scripts/thorough notes in git history).
  { targetSlug: 'adore-dye', sourceSlugStartsWith: 'adore-semi-permanent-hair-color' },
  { targetSlug: 'acetone-big', sourceSlugStartsWith: 'onyx-professional-100-pure-acetone-nail-polish-remover' },
  { targetSlug: 'acetone-small', sourceSlugStartsWith: 'onyx-professional-100-pure-acetone-nail-polish-remover' },
  { targetSlug: 'cuticle-remover', sourceSlugStartsWith: 'cuticle-removers-and-trimmers' },
  { targetSlug: 'dread-foam', sourceSlugStartsWith: 'dual-sided-barber-styling-sponge' },
  { targetSlug: '30pcs-cat-eye-gel', sourceSlugStartsWith: 'guangzhou-lanqinuo-cosmetics' },
  { targetSlug: 'nail-practice-hand', sourceSlugStartsWith: 'premier-soft-hand' },
  { targetSlug: 'keratin-mask', sourceSlugStartsWith: 'keratin-conditioner' },
  { targetSlug: 'wide-knife-comb', sourceSlugStartsWith: 'wide-tooth-rake-comb' },

  { targetSlug: 'magic-primer', sourceSlugStartsWith: 'magic-base-coat' },
  { targetSlug: '300g-beginners-set', sourceSlugStartsWith: 'beginners-set-with-gel-polish' },
  { targetSlug: 'beginners-set-with-case', sourceSlugStartsWith: 'beginners-set-with-gel-polish' },
  { targetSlug: 'push-bottle-dispenser', sourceSlugStartsWith: 'applicator-bottle' },

  { targetSlug: 'nails-wipe', sourceSlugStartsWith: 'non-woven-nail-wipes' },
  { targetSlug: 'ear-protective-frontal-band', sourceSlugStartsWith: 'oucheless-band' },
  { targetSlug: 'head-band-wig-cap', sourceSlugStartsWith: 'oucheless-band' },
  { targetSlug: 'chest-band', sourceSlugStartsWith: 'oucheless-band' },

  { targetSlug: 'bun-pretty-dehydrator-bonder', sourceSlugStartsWith: 'born-pretty-nail-prep-dehydrator' },
  { targetSlug: 'dotting-pen', sourceSlugStartsWith: '5-double-ended-nail-art-dotting-tools' },
  { targetSlug: 'resin-pallet', sourceSlugStartsWith: 'resin-nail-art-palette' },

  { targetSlug: '6pcs-blue-brush-set', sourceSlugStartsWith: 'acrylic-brush-set' },
  { targetSlug: '15pcs-brush-set', sourceSlugStartsWith: 'acrylic-brush-set' },
  { targetSlug: 'mannequin-brush-small', sourceSlugStartsWith: '6-piece-acrylic-nail-art-brush' },

  { targetSlug: 'glue-remover', sourceSlugStartsWith: 'evobond-debonder-ad-1-a-10ml-liquid-adhesive-remover' },
  { targetSlug: 'elastic-band', sourceSlugStartsWith: 'roll-of-uproll-black-sewing-elastic' },
  { targetSlug: 'pinky-shares', sourceSlugStartsWith: 'pinkee-s-pro-acrylic-liquid-3' },

  { targetSlug: 'french-bamboo-coffin-nail', sourceSlugStartsWith: 'clear-medium-almond-shaped-soft-gel-nail-extension-tips' },
  { targetSlug: 'normal-nail', sourceSlugStartsWith: 'clear-medium-almond-shaped-soft-gel-nail-extension-tips' },

  { targetSlug: 'eyelash-mannequin-big', sourceSlugStartsWith: 'canvas-block-head-mannequin' },
  { targetSlug: 'eyelash-mannequin-medium', sourceSlugStartsWith: 'canvas-block-head-mannequin' },
  { targetSlug: 'eyelash-mannequin-small', sourceSlugStartsWith: 'canvas-block-head-mannequin' },

  { targetSlug: 'trimmer-set', sourceSlugStartsWith: 'cuticle-removers-and-trimmers' },

  // User verified: same product photo.
  { targetSlug: 'nails-finger-spas', sourceSlugExact: 'nail-art-practice-finger' },
  { targetSlug: 'chrome', sourceSlugExact: 'jewelry-item-packaged' },
  { targetSlug: 'pearl-stand', sourceSlugExact: 'gndg-branded-magnetic-nail' },
  { targetSlug: 'nbi-wax-gel', sourceSlugExact: 'ikt-keratin-nutrition-styling-wax-stick' },
  { targetSlug: 'foaming-wax', sourceSlugExact: 'blank-silver-aluminum-aerosol' },
  { targetSlug: 'leodais-serum', sourceSlugExact: 'l-u-dais-2' },

  // NOTE: ~48 bad placeholder rules were removed after audit.
  // The products below still need REAL photos uploaded — no valid catalog twin exists.
  // See data/image-gap-candidates.csv for the full list.
];

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };

  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await supabase
    .from('products')
    .select('id,name,slug,created_at')
    .order('created_at', { ascending: true });
  if (pErr) throw pErr;

  const { data: images, error: iErr } = await supabase
    .from('product_images')
    .select('product_id,url,alt_text,position,width,height');
  if (iErr) throw iErr;

  const bySlug = new Map((products || []).map((p) => [p.slug, p]));
  const bySlugPrefix = new Map();
  for (const p of products || []) {
    for (const rule of CURATED) {
      if (rule.sourceSlugExact) continue;
      if (rule.sourceSlugStartsWith && p.slug.startsWith(rule.sourceSlugStartsWith)) {
        bySlugPrefix.set(rule.sourceSlugStartsWith, [...(bySlugPrefix.get(rule.sourceSlugStartsWith) || []), p]);
      }
    }
  }
  for (const [k, arr] of bySlugPrefix.entries()) {
    arr.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    bySlugPrefix.set(k, arr);
  }

  const imgsByPid = new Map();
  for (const img of images || []) {
    imgsByPid.set(img.product_id, [...(imgsByPid.get(img.product_id) || []), img]);
  }
  for (const [pid, arr] of imgsByPid.entries()) {
    arr.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    imgsByPid.set(pid, arr);
  }

  const inserts = [];
  const logs = [];

  for (const row of CURATED) {
    const target = bySlug.get(row.targetSlug);
    if (!target) continue;

    const targetHas = (imgsByPid.get(target.id) || []).length > 0;
    if (targetHas) continue;

    let source = null;
    if (row.sourceSlugExact) {
      const c = bySlug.get(row.sourceSlugExact);
      if (c && (imgsByPid.get(c.id) || []).length > 0) source = c;
    } else {
      const sourceCandidates = bySlugPrefix.get(row.sourceSlugStartsWith) || [];
      source = sourceCandidates.find((p) => (imgsByPid.get(p.id) || []).length > 0);
    }
    if (!source) continue;

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
      target: `${target.name} (${target.slug})`,
      source: `${source.name} (${source.slug})`,
      count: sourceImages.length,
    });
  }

  console.log(`Curated matches to apply: ${logs.length}${dryRun ? ' (dry run)' : ''}`);
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

