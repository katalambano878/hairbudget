import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(__dirname, '..');

function loadEnv() {
  const envPath = path.join(rootDir, '.env.local');
  const altPath = path.join(rootDir, '.env');
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

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function toSlugLike(s) {
  return normalize(s).replace(/\s+/g, '-');
}

function extractVariantTag(input) {
  const t = normalize(input);
  const tags = new Set();
  const rules = [
    ['big', /\bbig\b/],
    ['small', /\bsmall\b/],
    ['medium', /\bmedium\b|\bmed\b/],
    ['large', /\blarge\b/],
    ['mini', /\bmini\b/],
    ['single', /\bsingle\b/],
    ['set', /\bset\b/],
    ['short', /\bshort\b/],
    ['long', /\blong\b/],
  ];
  for (const [tag, re] of rules) {
    if (re.test(t)) tags.add(tag);
  }
  const unit = t.match(/\b\d+(?:ml|pcs|pc|g|kg|oz|mm)\b/g) || [];
  for (const u of unit) tags.add(u);
  return [...tags].sort().join('|');
}

function baseNameKey(name, slug) {
  let t = normalize(`${name || ''} ${slug || ''}`);
  t = t
    .replace(/\b(big|small|medium|med|large|mini|single|set|short|long)\b/g, ' ')
    .replace(/\b\d+(?:ml|pcs|pc|g|kg|oz|mm)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t;
}

function positive(v) {
  return v != null && Number(v) > 0;
}

function chooseKeeper(group, imageCountByPid, variantCountByPid) {
  function score(p) {
    const img = imageCountByPid.get(p.id) || 0;
    const hasBothPrice = positive(p.price) && positive(p.sale_price);
    const hasStock = positive(p.quantity);
    const vCount = variantCountByPid.get(p.id) || 0;
    return (
      img * 1000 +
      (hasBothPrice ? 200 : 0) +
      (hasStock ? 80 : 0) +
      vCount * 10 +
      new Date(p.created_at).getTime() / 1e13
    );
  }
  return [...group].sort((a, b) => score(b) - score(a))[0];
}

function variantSignature(v) {
  return JSON.stringify({
    name: normalize(v.name),
    sku: (v.sku || '').trim().toLowerCase(),
    o1: normalize(v.option1),
    o2: normalize(v.option2),
    o3: normalize(v.option3),
    p: Number(v.price || 0),
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await sb
    .from('products')
    .select('id,name,slug,price,sale_price,quantity,metadata,created_at,status,category_id')
    .order('created_at', { ascending: true });
  if (pErr) throw pErr;
  const activeProducts = (products || []).filter((p) => p.status !== 'archived');

  const { data: images, error: iErr } = await sb
    .from('product_images')
    .select('id,product_id,url,alt_text,position,width,height');
  if (iErr) throw iErr;

  const { data: variants, error: vErr } = await sb
    .from('product_variants')
    .select('id,product_id,name,sku,price,compare_at_price,cost_per_item,quantity,weight,option1,option2,option3,image_url,barcode,external_id,metadata');
  if (vErr) throw vErr;

  const imgsByPid = new Map();
  for (const img of images || []) {
    imgsByPid.set(img.product_id, [...(imgsByPid.get(img.product_id) || []), img]);
  }
  for (const [pid, list] of imgsByPid.entries()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    imgsByPid.set(pid, list);
  }

  const variantsByPid = new Map();
  for (const v of variants || []) {
    variantsByPid.set(v.product_id, [...(variantsByPid.get(v.product_id) || []), v]);
  }

  const imageCountByPid = new Map(activeProducts.map((p) => [p.id, (imgsByPid.get(p.id) || []).length]));
  const variantCountByPid = new Map(activeProducts.map((p) => [p.id, (variantsByPid.get(p.id) || []).length]));

  const byExactName = new Map();
  const byVariantAware = new Map();
  for (const p of activeProducts) {
    const exactKey = normalize(p.name);
    if (exactKey) byExactName.set(exactKey, [...(byExactName.get(exactKey) || []), p]);

    const base = baseNameKey(p.name, p.slug);
    const tag = extractVariantTag(`${p.name || ''} ${p.slug || ''}`);
    const variantKey = `${base}||${tag}||${p.category_id || ''}`;
    if (base) byVariantAware.set(variantKey, [...(byVariantAware.get(variantKey) || []), p]);
  }

  const groupMap = new Map();
  for (const [k, g] of byExactName.entries()) {
    if (g.length > 1) groupMap.set(`exact:${k}`, g);
  }
  for (const [k, g] of byVariantAware.entries()) {
    if (g.length > 1) {
      // Add only if they are not already all in an exact-name group.
      const allSameName = new Set(g.map((x) => normalize(x.name))).size === 1;
      if (!allSameName) groupMap.set(`variant:${k}`, g);
    }
  }

  const groupRows = [];
  const productSeen = new Set();

  let mergedGroups = 0;
  let mergedProducts = 0;
  let fieldPatches = 0;
  let copiedImages = 0;
  let movedVariants = 0;
  let archivedDuplicates = 0;

  for (const [groupKey, group] of groupMap.entries()) {
    const ids = group.map((x) => x.id);
    if (ids.some((id) => productSeen.has(id))) continue;
    for (const id of ids) productSeen.add(id);

    const keeper = chooseKeeper(group, imageCountByPid, variantCountByPid);
    const dupes = group.filter((x) => x.id !== keeper.id);

    if (!dupes.length) continue;

    const patch = {};
    if (!positive(keeper.quantity)) {
      const bestQty = Math.max(0, ...dupes.map((d) => Number(d.quantity || 0)));
      if (bestQty > 0) patch.quantity = bestQty;
    }
    if (!positive(keeper.price)) {
      const best = dupes.find((d) => positive(d.price));
      if (best) patch.price = Number(best.price);
    }
    if (!positive(keeper.sale_price)) {
      const best = dupes.find((d) => positive(d.sale_price));
      if (best) patch.sale_price = Number(best.sale_price);
    }
    if (positive(patch.price) && positive(patch.sale_price) && patch.sale_price > patch.price) {
      patch.sale_price = patch.price;
    }

    const keeperImages = imgsByPid.get(keeper.id) || [];
    const keepUrls = new Set(keeperImages.map((x) => x.url));
    let nextPosition = keeperImages.length;
    const imageInserts = [];
    for (const d of dupes) {
      for (const img of imgsByPid.get(d.id) || []) {
        if (keepUrls.has(img.url)) continue;
        keepUrls.add(img.url);
        imageInserts.push({
          product_id: keeper.id,
          url: img.url,
          alt_text: img.alt_text || keeper.name || null,
          position: nextPosition,
          width: img.width ?? null,
          height: img.height ?? null,
        });
        nextPosition += 1;
      }
    }

    const keeperVariants = variantsByPid.get(keeper.id) || [];
    const keepVariantSigs = new Set(keeperVariants.map(variantSignature));
    const variantInserts = [];
    for (const d of dupes) {
      for (const v of variantsByPid.get(d.id) || []) {
        const sig = variantSignature(v);
        if (keepVariantSigs.has(sig)) continue;
        keepVariantSigs.add(sig);
        variantInserts.push({
          product_id: keeper.id,
          name: v.name,
          sku: v.sku,
          price: v.price,
          compare_at_price: v.compare_at_price,
          cost_per_item: v.cost_per_item,
          quantity: v.quantity,
          weight: v.weight,
          option1: v.option1,
          option2: v.option2,
          option3: v.option3,
          image_url: v.image_url,
          barcode: v.barcode,
          external_id: v.external_id,
          metadata: v.metadata ?? {},
        });
      }
    }

    const archiveIds = dupes.map((d) => d.id);

    if (!dryRun) {
      if (Object.keys(patch).length) {
        const { error } = await sb.from('products').update(patch).eq('id', keeper.id);
        if (error) throw error;
      }

      if (imageInserts.length) {
        const { error } = await sb.from('product_images').insert(imageInserts);
        if (error) throw error;
      }

      if (variantInserts.length) {
        const { error } = await sb.from('product_variants').insert(variantInserts);
        if (error) throw error;
      }

      for (const d of dupes) {
        const mergedMeta = {
          ...(d.metadata || {}),
          merged_into_product_id: keeper.id,
          merged_into_slug: keeper.slug,
          merged_at: new Date().toISOString(),
        };
        const { error } = await sb
          .from('products')
          .update({
            status: 'archived',
            metadata: mergedMeta,
          })
          .eq('id', d.id);
        if (error) throw error;
      }
    }

    mergedGroups += 1;
    mergedProducts += dupes.length;
    fieldPatches += Object.keys(patch).length ? 1 : 0;
    copiedImages += imageInserts.length;
    movedVariants += variantInserts.length;
    archivedDuplicates += archiveIds.length;

    groupRows.push({
      group_key: groupKey,
      keeper_slug: keeper.slug,
      keeper_name: keeper.name,
      duplicates_archived: dupes.length,
      field_patch: JSON.stringify(patch),
      copied_images: imageInserts.length,
      moved_variants: variantInserts.length,
      duplicate_slugs: dupes.map((d) => d.slug).join(' | '),
    });
  }

  const report = {
    dry_run: dryRun,
    merged_groups: mergedGroups,
    merged_products_archived: mergedProducts,
    keeper_field_patches: fieldPatches,
    copied_images: copiedImages,
    moved_variants: movedVariants,
    archived_duplicates: archivedDuplicates,
    groups: groupRows,
  };

  const outPath = path.join(rootDir, 'data', 'duplicate-merge-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Dry run: ${dryRun}`);
  console.log(`Merged groups: ${mergedGroups}`);
  console.log(`Archived duplicate products: ${archivedDuplicates}`);
  console.log(`Keeper field patches: ${fieldPatches}`);
  console.log(`Copied images: ${copiedImages}`);
  console.log(`Moved variants: ${movedVariants}`);
  console.log(`Report: ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
