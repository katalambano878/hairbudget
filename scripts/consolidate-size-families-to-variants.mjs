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

function slugify(s) {
  return normalize(s).replace(/\s+/g, '-');
}

function toTitleCase(s) {
  return String(s || '')
    .split(' ')
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function getSizeTag(name, slug) {
  const t = `${normalize(name)} ${normalize(slug)}`;
  if (/\bsmall\b|\bsm\b/.test(t)) return 'Small';
  if (/\bmedium\b|\bmed\b/.test(t)) return 'Medium';
  if (/\bbig\b/.test(t)) return 'Big';
  if (/\blarge\b|\blg\b/.test(t)) return 'Large';
  if (/\bmini\b/.test(t)) return 'Mini';
  const m = t.match(/\b\d+(?:ml|g|kg|oz|pcs|pc|mm)\b/);
  if (m) return m[0].toUpperCase();
  return null;
}

function baseFromName(name) {
  return normalize(name)
    .replace(/\b(small|sm|medium|med|big|large|lg|mini)\b/g, ' ')
    .replace(/\b\d+(?:ml|g|kg|oz|pcs|pc|mm)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasValue(v) {
  return v != null && Number(v) > 0;
}

function pickPrimary(list, imageCountByPid) {
  return [...list].sort((a, b) => {
    const ai = imageCountByPid.get(a.id) || 0;
    const bi = imageCountByPid.get(b.id) || 0;
    const av = (hasValue(a.price) ? 1 : 0) + (hasValue(a.sale_price) ? 1 : 0) + (hasValue(a.quantity) ? 1 : 0);
    const bv = (hasValue(b.price) ? 1 : 0) + (hasValue(b.sale_price) ? 1 : 0) + (hasValue(b.quantity) ? 1 : 0);
    return bi - ai || bv - av;
  })[0];
}

async function main() {
  const apply = process.argv.includes('--apply');
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await sb
    .from('products')
    .select('id,name,slug,description,price,sale_price,quantity,status,category_id,featured,metadata')
    .neq('status', 'archived')
    .order('name');
  if (pErr) throw pErr;

  const { data: images, error: iErr } = await sb
    .from('product_images')
    .select('id,product_id,url,alt_text,position,width,height');
  if (iErr) throw iErr;

  const { data: variants, error: vErr } = await sb
    .from('product_variants')
    .select('id,product_id,name,option1,price,sale_price,quantity,image_url,metadata');
  if (vErr) throw vErr;

  const imgsByPid = new Map();
  for (const img of images || []) {
    imgsByPid.set(img.product_id, [...(imgsByPid.get(img.product_id) || []), img]);
  }
  for (const [pid, list] of imgsByPid.entries()) {
    list.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    imgsByPid.set(pid, list);
  }
  const imageCountByPid = new Map((products || []).map((p) => [p.id, (imgsByPid.get(p.id) || []).length]));
  const variantsByPid = new Map();
  for (const v of variants || []) variantsByPid.set(v.product_id, [...(variantsByPid.get(v.product_id) || []), v]);

  const byBase = new Map();
  for (const p of products || []) {
    const size = getSizeTag(p.name, p.slug);
    if (!size) continue;
    const base = baseFromName(p.name);
    if (!base) continue;
    const key = `${base}||${p.category_id || ''}`;
    byBase.set(key, [...(byBase.get(key) || []), { ...p, size }]);
  }

  const families = [];
  for (const [key, list] of byBase.entries()) {
    if (list.length < 2) continue;
    const uniqueSizes = new Set(list.map((x) => x.size));
    if (uniqueSizes.size < 2) continue;
    const [base, categoryId] = key.split('||');
    families.push({ base, categoryId, list });
  }

  const actions = [];
  for (const fam of families) {
    const primary = pickPrimary(fam.list, imageCountByPid);
    const parentName = toTitleCase(fam.base);
    const parentSlug = slugify(fam.base);

    const { data: existingParent, error: epErr } = await sb
      .from('products')
      .select('id,name,slug,category_id,price,sale_price,quantity,metadata,status')
      .eq('slug', parentSlug)
      .neq('status', 'archived')
      .maybeSingle();
    if (epErr) throw epErr;

    const memberIds = new Set(fam.list.map((x) => x.id));
    const parent = existingParent && !memberIds.has(existingParent.id) ? existingParent : null;

    const familyPriceValues = fam.list.map((x) => Number(x.price || 0)).filter((n) => n > 0);
    const familySaleValues = fam.list.map((x) => Number(x.sale_price || 0)).filter((n) => n > 0);
    const parentPrice = familyPriceValues.length ? Math.min(...familyPriceValues) : 0;
    const parentSale = familySaleValues.length ? Math.min(...familySaleValues) : null;

    actions.push({
      base: fam.base,
      category_id: fam.categoryId || null,
      parent_name: parent?.name || parentName,
      parent_slug: parent?.slug || parentSlug,
      parent_existing_id: parent?.id || null,
      primary_id: primary.id,
      members: fam.list.map((m) => ({
        id: m.id,
        name: m.name,
        slug: m.slug,
        size: m.size,
        price: m.price,
        sale_price: m.sale_price,
        quantity: m.quantity,
      })),
      computed_parent_price: parentPrice,
      computed_parent_sale_price: parentSale,
    });
  }

  const report = {
    apply,
    families_found: families.length,
    actions_planned: actions.length,
    actions,
    applied: [],
  };

  if (apply) {
    for (const action of actions) {
      let parentId = action.parent_existing_id;

      if (!parentId) {
        const { data: createdParent, error: cErr } = await sb
          .from('products')
          .insert({
            name: action.parent_name,
            slug: action.parent_slug,
            description: `Variant parent for ${action.parent_name}.`,
            price: action.computed_parent_price,
            sale_price: action.computed_parent_sale_price,
            quantity: 0,
            category_id: action.category_id,
            status: 'active',
            featured: false,
            options: [{ name: 'Size', values: [...new Set(action.members.map((m) => m.size))] }],
            metadata: { created_by: 'variant-consolidator', source: 'size-family' },
            moq: 1,
          })
          .select('id')
          .single();
        if (cErr) throw cErr;
        parentId = createdParent.id;
      } else {
        const { error: upErr } = await sb
          .from('products')
          .update({
            price: action.computed_parent_price,
            sale_price: action.computed_parent_sale_price,
            options: [{ name: 'Size', values: [...new Set(action.members.map((m) => m.size))] }],
          })
          .eq('id', parentId);
        if (upErr) throw upErr;
      }

      const { data: currentVariants, error: cvErr } = await sb
        .from('product_variants')
        .select('id,name,option1')
        .eq('product_id', parentId);
      if (cvErr) throw cvErr;
      const existingBySize = new Map((currentVariants || []).map((v) => [normalize(v.option1 || v.name), v]));

      let insertedVariants = 0;
      for (const m of action.members) {
        const firstImg = (imgsByPid.get(m.id) || [])[0];
        const sizeKey = normalize(m.size);
        if (existingBySize.has(sizeKey)) continue;
        const { error: ivErr } = await sb.from('product_variants').insert({
          product_id: parentId,
          name: `${action.parent_name} - ${m.size}`,
          option1: m.size,
          price: Number(m.price || 0),
          sale_price: m.sale_price == null ? null : Number(m.sale_price || 0),
          quantity: Number(m.quantity || 0),
          image_url: firstImg?.url || null,
          metadata: { source_product_id: m.id, source_slug: m.slug },
        });
        if (ivErr) throw ivErr;
        insertedVariants += 1;
      }

      const parentImages = imgsByPid.get(parentId) || [];
      const parentUrls = new Set(parentImages.map((x) => x.url));
      let pos = parentImages.length;
      let insertedImages = 0;
      for (const m of action.members) {
        for (const img of imgsByPid.get(m.id) || []) {
          if (parentUrls.has(img.url)) continue;
          parentUrls.add(img.url);
          const { error: piErr } = await sb.from('product_images').insert({
            product_id: parentId,
            url: img.url,
            alt_text: img.alt_text || action.parent_name,
            position: pos,
            width: img.width ?? null,
            height: img.height ?? null,
          });
          if (piErr) throw piErr;
          pos += 1;
          insertedImages += 1;
        }
      }

      let archivedMembers = 0;
      for (const m of action.members) {
        if (m.id === parentId) continue;
        const { error: aErr } = await sb
          .from('products')
          .update({
            status: 'archived',
            metadata: {
              merged_into_variant_parent_id: parentId,
              merged_into_variant_parent_slug: action.parent_slug,
              merged_at: new Date().toISOString(),
            },
          })
          .eq('id', m.id);
        if (aErr) throw aErr;
        archivedMembers += 1;
      }

      report.applied.push({
        parent_id: parentId,
        parent_slug: action.parent_slug,
        inserted_variants: insertedVariants,
        inserted_images: insertedImages,
        archived_members: archivedMembers,
      });
    }
  }

  const outPath = path.join(rootDir, 'data', 'size-family-consolidation-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Apply mode: ${apply}`);
  console.log(`Families found: ${families.length}`);
  console.log(`Actions planned: ${actions.length}`);
  if (apply) {
    const totals = report.applied.reduce(
      (acc, x) => {
        acc.variants += x.inserted_variants;
        acc.images += x.inserted_images;
        acc.archived += x.archived_members;
        return acc;
      },
      { variants: 0, images: 0, archived: 0 }
    );
    console.log(`Inserted variants: ${totals.variants}`);
    console.log(`Inserted images: ${totals.images}`);
    console.log(`Archived old size products: ${totals.archived}`);
  }
  console.log(`Report: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
