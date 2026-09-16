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

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');
}

async function main() {
  const env = { ...process.env, ...loadEnv() };
  const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: categories, error: catErr } = await supabase.from('categories').select('id,slug');
  if (catErr) throw catErr;
  const catBySlug = new Map((categories || []).map((c) => [String(c.slug), c.id]));

  // Values read from current handwritten photo.
  const existingMappings = [
    ['polymer-wig-block-mannequin-head-designed', 19],
    ['trimmer-set', 58], // kemei clipper 40 + 18
    ['plastic-bobbins', 19],
    ['metallic-bobbin', 68],
    ['organ-needles', 184],
    ['bottle-of-keratin-lace-tint-mousse', 5],
    ['industrial-sewing-machine-presser-foot', 228],
    ['rubbing-alcohol', 5],
    ['extreme-sewing-machine', 17],
    ['thread-clippers', 47],
    ['cutters', 30], // scissors
    ['bbl-professional-hot-pressing-comb', 10],
    ['baroel-32mm-ceramic-curling-tong', 25],
    ['hot-air-brush', 16],
    ['nova-curling-iron-set', 18],
    ['perfume-gift-set', 30],
    ['nippers', 18], // frontal scissors
    ['silicon-heat-mat', 17],
    ['nova-hand-dryer', 112],
  ];

  for (const [slug, qty] of existingMappings) {
    const { error } = await supabase.from('products').update({ quantity: qty }).eq('slug', slug);
    if (error) throw error;
    console.log(`UPDATED: ${slug} => ${qty}`);
  }

  const maybeNew = [
    { name: 'Trolley', slug: 'trolley', quantity: 5, category: 'hair-and-salon-tools' },
    { name: 'Braiding Rack', slug: 'braiding-rack', quantity: 84, category: 'hair-and-salon-tools' },
    { name: 'Cloud 9 Straightener', slug: 'cloud-9-straightener', quantity: 1, category: 'styling-tools' },
    { name: 'Dodo Curler', slug: 'dodo-curler', quantity: 3, category: 'styling-tools' },
    { name: 'Dryer Stand', slug: 'dryer-stand', quantity: 31, category: 'hair-and-salon-tools' },
    { name: 'Electric Steam Bag', slug: 'electric-steam-bag', quantity: 86, category: 'hair-and-salon-tools' },
  ];

  for (const item of maybeNew) {
    const slug = slugify(item.slug);
    const { data: existing, error: exErr } = await supabase
      .from('products')
      .select('id,name,slug,quantity')
      .eq('slug', slug)
      .maybeSingle();
    if (exErr) throw exErr;

    if (existing) {
      const { error: upErr } = await supabase.from('products').update({ quantity: item.quantity }).eq('id', existing.id);
      if (upErr) throw upErr;
      console.log(`UPDATED: ${existing.slug} => ${item.quantity}`);
      continue;
    }

    const { error: insErr } = await supabase.from('products').insert({
      name: item.name,
      slug,
      description: `${item.name} added from handwritten stock sheet.`,
      price: 0,
      quantity: item.quantity,
      category_id: catBySlug.get(item.category) || null,
      status: 'active',
      featured: false,
      tags: ['paper-import'],
      metadata: { source: 'handwritten-stock-sheet' },
      moq: 1,
    });
    if (insErr) throw insErr;
    console.log(`CREATED: ${item.name} (${slug}) => ${item.quantity}`);
  }

  console.log('Photo 2 stock sync complete.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
