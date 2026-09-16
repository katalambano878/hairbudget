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
    fs.readFileSync(p, 'utf-8').split('\n')
      .filter((l) => /^[A-Z_]+=/.test(l.trim()))
      .map((l) => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')]; })
  );
}

function slugify(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '');
}

// ─── MASTER DATA: slug → { price, sale_price, quantity } ───
// Transcribed from ALL handwritten photos (price set + stock set).
// Where a field is null we leave the existing DB value untouched.
const MASTER = {
  // ═══════════ PRICE SET Photo 1 — Haircare price+discount+stock ═══════════
  'kuuqa-anti-itch':                          { price: 35, sale_price: 30, quantity: 56 },
  'leodais-serum':                            { price: 25, sale_price: 20, quantity: 39 },
  'nbi-wax-gel':                              { price: 25, sale_price: 20, quantity: 41 },
  'foaming-wax':                              { price: 28, sale_price: 22, quantity: 82 },
  'stainless-steel-pinking':                  { price: 50, sale_price: 45, quantity: 80 },
  'head-band-wig-cap':                        { price: 25, sale_price: 20, quantity: 128 },
  'glue-gun':                                 { price: 35, sale_price: 30, quantity: 68 },
  'glue-sticks':                              { price: 6, sale_price: 6, quantity: 212 },
  'drawstring-ponytail':                      { price: 7, sale_price: 6, quantity: 476 },
  'ponytail-wrap':                            { price: 6, sale_price: 5, quantity: 275 },
  'ear-protective-frontal-band':              { price: 20, sale_price: 18, quantity: 96 },
  'ghost-bond':                               { price: 25, sale_price: 20, quantity: 3 },
  'glue-remover':                             { price: 20, sale_price: 17, quantity: 11 },
  'apple-curl-keeper':                        { price: 18, sale_price: 15, quantity: 185 },
  'olive-sheen':                              { price: 25, sale_price: 20, quantity: 37 },
  'ikt-brand-hair-styling-wax':               { price: 25, sale_price: 20, quantity: 107 },
  'got2b-glue':                               { price: 90, sale_price: 85, quantity: 32 },
  'kuura-beauty-avocado-batana-blend-moisturizing-conditioner': { price: 95, sale_price: 89, quantity: 7 },
  'kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo': { price: 95, sale_price: 89, quantity: 11 },
  'elastic-band':                             { price: 55, sale_price: 45, quantity: 65 },
  'argan-mask':                               { price: 55, sale_price: 45, quantity: 5 },
  'keratin-mask':                             { price: 55, sale_price: 45, quantity: 17 },
  'keratin-shampoo':                          { price: 60, sale_price: 50, quantity: 64 },
  'keratin-conditioner':                      { price: 60, sale_price: 50, quantity: 58 },
  'magnetic-band':                            { price: 35, sale_price: 29, quantity: 46 },
  'spiral-rods':                              { price: 22, sale_price: 18, quantity: 92 },

  // ═══════════ PRICE SET Photo 2 — Hair tools ═══════════
  'titanium-straightener':                    { price: 250, sale_price: 220, quantity: 191 },
  'cloud-9-straightener':                     { price: 160, sale_price: 130, quantity: 1 },
  'bbl-professional-hot-pressing-comb':       { price: 350, sale_price: 350, quantity: 10 },
  'electric-hair-straightening-hot-comb':     { price: 140, sale_price: 115, quantity: 181 },
  'baroel-32mm-ceramic-curling-tong':         { price: 170, sale_price: 130, quantity: 25 },
  'hot-air-brush':                            { price: 130, sale_price: 99, quantity: 16 },
  'perfume-gift-set':                         { price: 130, sale_price: 110, quantity: 30 },
  'silicon-heat-mat':                         { price: 35, sale_price: 25, quantity: 17 },
  'oucheless-band':                           { price: 15, sale_price: 15, quantity: 24 },
  'nova-hand-dryer':                          { price: 180, sale_price: 110, quantity: 112 },
  'canvas-block-head-mannequin':              { price: 180, sale_price: 115, quantity: 49 },
  'derma-roller':                             { price: 40, sale_price: 35, quantity: 84 },
  'electric-steam-bag':                       { price: 120, sale_price: 99, quantity: 86 },
  '10-pieces-comb-set':                       { price: 25, sale_price: 19, quantity: 65 },
  'detangling-brush':                         { price: 20, sale_price: 15, quantity: 4 },
  'akendy-brand-lace-tint-mousse':            { price: 30, sale_price: 25, quantity: 215 },
  'polymer-wig-block-mannequin-head-designed':{ price: 200, sale_price: 170, quantity: 38 },
  'hangers':                                  { price: 18, sale_price: 15, quantity: 71 },
  'sharpie-marker-set':                       { price: 18, sale_price: 15, quantity: 1704 },
  'applicator-bottle':                        { price: 15, sale_price: 10, quantity: 131 },
  'extreme-sewing-machine':                   { price: 1250, sale_price: 1150, quantity: 17 },
  'dryer-stand':                              { price: null, sale_price: null, quantity: 31 },

  // ═══════════ PRICE SET Photo 3 — Nails ═══════════
  '42pcs-very-good-gel':                      { price: 600, sale_price: 550, quantity: 22 },
  '44pcs-very-good-gel':                      { price: 650, sale_price: 599, quantity: 1 },
  '6pcs-very-good-gel-polish':                { price: 750, sale_price: 700, quantity: 19 },
  '60pcs-very-good-gel-professional':         { price: 650, sale_price: 600, quantity: 10 },
  '60pcs-very-good-purple':                   { price: 750, sale_price: 700, quantity: 24 },
  '48pcs-uom-gel':                            { price: 899, sale_price: 850, quantity: 4 },
  '30pcs-cat-eye-gel':                        { price: 580, sale_price: 540, quantity: 2 },
  '6pcs-modeling-gel':                        { price: 100, sale_price: 80, quantity: 28 },
  '300g-beginners-set':                       { price: 350, sale_price: 330, quantity: 105 },
  'beginners-set-with-case':                  { price: 350, sale_price: 310, quantity: 43 },
  'beginners-set-with-gel-polish':            { price: 399, sale_price: 350, quantity: 17 },
  '2-in-1-uv-lamp':                          { price: 220, sale_price: 180, quantity: 6 },
  'single-hand-uv-lamp':                     { price: 130, sale_price: 99, quantity: 9 },
  'rechargeable-drill-1':                    { price: 320, sale_price: 280, quantity: 17 },
  'rechargeable-drill-2':                    { price: 350, sale_price: 320, quantity: 20 },
  'rechargeable-drill-3':                    { price: 390, sale_price: 350, quantity: 11 },
  'portable-electric-drill':                 { price: 300, sale_price: 270, quantity: 48 },
  'mannequin-hand':                          { price: 60, sale_price: 50, quantity: 34 },
  'silicone-mannequin-foot':                 { price: 60, sale_price: 50, quantity: 47 },
  'acrylic-nail-art':                        { price: 99, sale_price: 89, quantity: 28 },
  'dust-brush':                              { price: 25, sale_price: 20, quantity: 177 },
  'acrylic-powder':                          { price: 55, sale_price: 48, quantity: 167 },
  'acrylic-powder-nude-big':                 { price: 75, sale_price: 69, quantity: 21 },
  'acrylic-powder-nude-small':               { price: 45, sale_price: 40, quantity: 24 },
  'acrylic-brush-set':                       { price: 95, sale_price: 80, quantity: 29 },
  'misscheering-dipping-powder-kit':         { price: 95, sale_price: 95, quantity: 13 },
  'dxebiz-brand-professional-acrylic-system-kit': { price: null, sale_price: null, quantity: 28 },

  // ═══════════ PRICE SET Photo 4 — Mixed ═══════════
  'rubbing-alcohol':                         { price: 45, sale_price: 39, quantity: 5 },
  'organ-needles':                           { price: 20, sale_price: 15, quantity: 184 },
  'thread-clippers':                         { price: 7, sale_price: 7, quantity: 47 },
  'control-clips':                           { price: 20, sale_price: 17, quantity: 222 },
  'metallic-bobbin':                         { price: 48, sale_price: 39, quantity: 68 },
  'plastic-bobbins':                         { price: 45, sale_price: 35, quantity: 19 },
  'razor-comb':                              { price: 7, sale_price: 5, quantity: 209 },
  'long-neck-mannequin':                     { price: 180, sale_price: 110, quantity: 13 },
  'kelo-rollers':                            { price: 55, sale_price: 45, quantity: 29 },
  'snap-on-rollers':                         { price: 18, sale_price: 15, quantity: 125 },
  'envy-gel-big':                            { price: 75, sale_price: 65, quantity: 37 },
  'envy-gel-small':                          { price: 40, sale_price: 35, quantity: 83 },
  'kuura-mousse':                            { price: 55, sale_price: 50, quantity: 82 },
  'kuura-fro-shampoo':                       { price: 65, sale_price: 60, quantity: 28 },
  'kuura-fro-conditioner':                   { price: null, sale_price: null, quantity: 26 },
  'kuura-honey-papaya-no-breakage-hair':     { price: 70, sale_price: 65, quantity: 17 },
  'silicone-hair-scalp-massager-and-shampoo-brush': { price: 15, sale_price: 10, quantity: 24 },
  'minkin-avocado-hair-styling-gel':         { price: 40, sale_price: 35, quantity: 132 },
  'oligei-heat-resistant-gloves':            { price: 20, sale_price: 20, quantity: 52 },
  'vitale-olive-oil-hair-polisher-2':        { price: 25, sale_price: 20, quantity: 58 },
  'hair-bonnet':                             { price: 25, sale_price: 20, quantity: 21 },
  'flexi-rods':                              { price: 20, sale_price: 15, quantity: 124 },
  'kuura-supergro-hair-oil':                 { price: 50, sale_price: 45, quantity: 85 },
  'home-services-bag-big':                   { price: 350, sale_price: 299, quantity: 20 },

  // ═══════════ PRICE SET Photo 5 — More nails/tools ═══════════
  'jaon-quality-nail-hand-pillow':           { price: 250, sale_price: 220, quantity: null },
  'mannequin-brush-small':                   { price: 5, sale_price: 5, quantity: 64 },
  'manicure-brush-big':                      { price: 7, sale_price: 7, quantity: 78 },
  'desk-lamp':                               { price: 150, sale_price: 130, quantity: null },
  'home-services-bag-small':                 { price: 150, sale_price: 130, quantity: null },
  'pedicure-knife':                          { price: 35, sale_price: 30, quantity: 36 },
  '600pcs-ultrabond':                        { price: 65, sale_price: 55, quantity: 5 },
  '240pcs-soft-gel-tips':                    { price: 45, sale_price: 39, quantity: 13 },
  'normal-nail':                             { price: 45, sale_price: 39, quantity: 71 },
  'polygel-set':                             { price: 220, sale_price: 199, quantity: 24 },
  'polygel-single':                          { price: 35, sale_price: 30, quantity: 172 },

  // ═══════════ PRICE SET Photo 6 — More nails ═══════════
  'acetone-big':                             { price: 95, sale_price: 85, quantity: null },
  'acetone-small':                           { price: 60, sale_price: 50, quantity: null },
  'magic-primer':                            { price: 20, sale_price: 20, quantity: null },
  'magic-top-coat':                          { price: 20, sale_price: 20, quantity: null },
  'magic-base-coat':                         { price: 20, sale_price: 20, quantity: null },
  'muscheering-top-coat-and-base-coat-uv-gel': { price: 35, sale_price: 30, quantity: 101 },
  'ibd-builder-gel':                         { price: 60, sale_price: 50, quantity: 20 },
  'buffer-set':                              { price: 40, sale_price: 35, quantity: null },
  'buffer-single':                           { price: 15, sale_price: 15, quantity: null },
  'rosaline-base-coat':                      { price: 35, sale_price: 35, quantity: 19 },
  'flowers-charms':                          { price: 18, sale_price: 15, quantity: 43 },
  'nails-stones':                            { price: 45, sale_price: 40, quantity: 84 },
  'nails-charms':                            { price: 35, sale_price: 30, quantity: 165 },
  'chrome':                                  { price: 20, sale_price: 20, quantity: 60 },
  'nail-glue':                               { price: 10, sale_price: 10, quantity: 346 },
  'rhinestone-glue':                         { price: 40, sale_price: 35, quantity: 175 },
  'spider-gel':                              { price: 25, sale_price: 25, quantity: 34 },
  'debonder':                                { price: 20, sale_price: 20, quantity: 5 },
  'nails-finger-spas':                       { price: 40, sale_price: 40, quantity: 14 },
  'cutters':                                 { price: 25, sale_price: 20, quantity: 25 },
  'nippers':                                 { price: 45, sale_price: 40, quantity: 85 },
  'dissolving-finger-bowl':                  { price: 10, sale_price: 10, quantity: 17 },
  'foldable-arm-rest':                       { price: 150, sale_price: 125, quantity: 16 },
  'btc-cuticle-softner':                     { price: 20, sale_price: 20, quantity: 30 },

  // ═══════════ PRICE SET Photo 7 — More nails/tools ═══════════
  '3pcs-liner-brush':                        { price: 15, sale_price: 15, quantity: 24 },
  '6pcs-blue-brush-set':                     { price: 38, sale_price: 30, quantity: 40 },
  '15pcs-brush-set':                         { price: 25, sale_price: 20, quantity: 85 },
  '3d-silicon-brush':                        { price: 25, sale_price: 20, quantity: 76 },
  'rainbow-brush-set':                       { price: 40, sale_price: 35, quantity: 58 },
  'dotting-pen':                             { price: 30, sale_price: 25, quantity: 85 },
  'rhinestone-picker':                       { price: 60, sale_price: 10, quantity: 111 },
  'dissolving-bowl':                         { price: 18, sale_price: 15, quantity: null },
  'non-woven-nail-wipes':                    { price: 25, sale_price: 20, quantity: null },
  'high-quality-dust-brush':                 { price: 38, sale_price: 35, quantity: 48 },
  'gndg-branded-magnetic-nail':              { price: 25, sale_price: 20, quantity: 60 },
  'cat-eye-magnet':                          { price: 45, sale_price: 40, quantity: 78 },
  'rosaline-dehydrator-primer':              { price: 70, sale_price: 60, quantity: 36 },
  'stainless-steel-pallet':                  { price: 30, sale_price: 25, quantity: null },
  'resin-pallet':                            { price: 25, sale_price: 20, quantity: 59 },
  'trimmer-set':                             { price: 15, sale_price: 15, quantity: 176 },
  'cuticle-remover':                         { price: 50, sale_price: 40, quantity: 24 },
  'blooming-gel':                            { price: 40, sale_price: 35, quantity: 33 },
  'born-pretty-nail-prep-dehydrator':        { price: 70, sale_price: 60, quantity: 41 },
  'stainless-dappen-dish':                   { price: 100, sale_price: 80, quantity: 38 },
  'gloves':                                  { price: 75, sale_price: 65, quantity: 20 },
  'nail-practice-hand':                      { price: 140, sale_price: 115, quantity: 75 },
  'dust-collector':                          { price: 250, sale_price: 220, quantity: 15 },
  'wooden-arm-rest-short':                   { price: 150, sale_price: 120, quantity: 15 },
  'wooden-arm-rest-long':                    { price: 180, sale_price: 140, quantity: 51 },

  // ═══════════ STOCK SET — extra items from stock-only sheets ═══════════
  'blue-acrylic-brush':                      { price: null, sale_price: null, quantity: 39 },
  'pink-liner-brush':                        { price: null, sale_price: null, quantity: 25 },
  'magik-branded-soak-off-uv-gel-polish-kit':{ price: null, sale_price: null, quantity: 6 },
  'muscheering-brush-cleaner':               { price: null, sale_price: null, quantity: 14 },
  'born-pretty-functional-gel-polish':       { price: null, sale_price: null, quantity: 16 },
  'nail-art-practice-finger':                { price: null, sale_price: null, quantity: 66 },
  'ombre-brush':                             { price: null, sale_price: null, quantity: 2 },
  'synthetic-bristle-gel-sculpting-brush':    { price: null, sale_price: null, quantity: 25 },
  'diamond-gel':                             { price: null, sale_price: null, quantity: 12 },
  'generic-purple-plastic-soak-off-nail-polish-remover': { price: null, sale_price: null, quantity: 2 },

  // ═══════════ STOCK SET — additional items from stock photos A-F ═══════════
  'trolley':                                 { price: null, sale_price: null, quantity: 5 },
  'braiding-rack':                           { price: null, sale_price: null, quantity: 84 },
  'ebin-adhesive-big':                       { price: null, sale_price: null, quantity: 55 },
  'ebin-adhesive-small':                     { price: null, sale_price: null, quantity: 39 },
  'ebin-adhesive-sports-small':              { price: null, sale_price: null, quantity: 12 },
  'ebin-adhesive-sports-medium':             { price: null, sale_price: null, quantity: 31 },
  'ebin-adhesive-sports-big':                { price: null, sale_price: null, quantity: 1 },
  'ebin-new-york-wonder-lace-bond-lace-melt-spray-3': { price: null, sale_price: null, quantity: 106 },
  'ebin-melting-spray-sport':                { price: null, sale_price: null, quantity: 94 },
  'ebin-melting-spray-colored':              { price: null, sale_price: null, quantity: 22 },
  'kuura-conditioner-long':                  { price: null, sale_price: null, quantity: 6 },
  'adore-dye':                               { price: null, sale_price: null, quantity: 229 },
  '10pcs-relaxer-set':                       { price: null, sale_price: null, quantity: 9 },
  '15pcs-relaxer-set':                       { price: null, sale_price: null, quantity: 6 },
  '6pcs-relaxer-set':                        { price: null, sale_price: null, quantity: 14 },
  'olive-oil-shampoo':                       { price: null, sale_price: null, quantity: 40 },
  'ors-mayonnaise-big':                      { price: null, sale_price: null, quantity: 45 },
  'ors-mayonnaise-small':                    { price: null, sale_price: null, quantity: 54 },
  'ors-mousse-wrap':                         { price: null, sale_price: null, quantity: 40 },
  'ors-olive-sheen-big':                     { price: null, sale_price: null, quantity: 41 },
  'ors-twist-gel':                           { price: null, sale_price: null, quantity: 50 },
  'dread-foam':                              { price: null, sale_price: null, quantity: 57 },
  'keratin-melting-spray':                   { price: null, sale_price: null, quantity: 76 },
  'bonding-glue-big':                        { price: null, sale_price: null, quantity: 84 },
  'bonding-glue-small':                      { price: null, sale_price: null, quantity: 4 },
  'sabalon':                                 { price: null, sale_price: null, quantity: 17 },
  'wide-tooth-rake-comb':                    { price: null, sale_price: null, quantity: 198 },
  'olive-oil-edge-control':                  { price: null, sale_price: null, quantity: 601 },
  'disposable-frontal-wrap':                 { price: null, sale_price: null, quantity: 93 },
  'luxury-protein-morocco-plant-oil':        { price: null, sale_price: null, quantity: 47 },
  'blend-moikuura-avocado-sturizing-detangling-conditioner': { price: null, sale_price: null, quantity: 167 },
  'packaging-net-medium':                    { price: null, sale_price: null, quantity: 70 },
  'packaging-net-large':                     { price: null, sale_price: null, quantity: 62 },
  'mannequin-head':                          { price: null, sale_price: null, quantity: 10 },
  'tripod-stand-mini':                       { price: null, sale_price: null, quantity: 10 },
  'xhc-argan-oil-hydrating-hair-mask':       { price: null, sale_price: null, quantity: 14 },
  'professional-argan-oil-nourishing-hair-mask': { price: null, sale_price: null, quantity: 17 },
  'parting-ring':                            { price: null, sale_price: null, quantity: 39 },
  'butterfly-clips':                         { price: null, sale_price: null, quantity: 20 },
  '3-in-1-tripod':                           { price: null, sale_price: null, quantity: 91 },
  'tripod-stand':                            { price: null, sale_price: null, quantity: 91 },
  'tresseme-shampoo-small':                  { price: null, sale_price: null, quantity: 26 },
  'tresseme-conditioner-small':              { price: null, sale_price: null, quantity: 30 },
  'tresseme-shampoo-big':                    { price: null, sale_price: null, quantity: 3 },
  'kuura-honey-and-papaya-leave-in-conditioner': { price: null, sale_price: null, quantity: 34 },
  'eyelash-mannequin-big':                   { price: null, sale_price: null, quantity: 13 },
  'pinkee-s-liquid-big':                     { price: 150, sale_price: 120, quantity: 55 },
  'pinkee-s-liquid-medium':                  { price: 95, sale_price: 80, quantity: 57 },
  'pinkee-s-liquid-small':                   { price: 60, sale_price: 50, quantity: 39 },
  'dodo-curler':                             { price: null, sale_price: null, quantity: 3 },
  'edge-melt':                               { price: null, sale_price: null, quantity: null },
};

// Map old archived variant slugs to their parent slug + size tag
const VARIANT_SLUG_TO_PARENT = {
  'electric-hair-straightening-hot-comb': null, // renamed/archived, handle separately
  'perfume-gift-set': null,
  '42pcs-very-good-gel': ['very-good-gel', '42pcs'],
  '44pcs-very-good-gel': ['very-good-gel', '44pcs'],
  '300g-beginners-set': null, // standalone
  'acrylic-powder-nude-small': ['acrylic-powder-nude', 'Small'],
  'envy-gel-big': ['envy-gel', 'Big'],
  'envy-gel-small': ['envy-gel', 'Small'],
  'kuura-fro-shampoo': null,
  'kuura-fro-conditioner': null,
  'home-services-bag-small': ['home-services-bag', 'Small'],
  '240pcs-soft-gel-tips': ['soft-gel-tips', '240pcs'],
  'acetone-small': ['acetone', 'Small'],
  'non-woven-nail-wipes': null,
  'ebin-adhesive-big': ['ebin-adhesive', 'Big'],
  'ebin-adhesive-small': ['ebin-adhesive', 'Small'],
  'ebin-adhesive-sports-small': ['ebin-adhesive-sports', 'Small'],
  'ebin-adhesive-sports-medium': ['ebin-adhesive-sports', 'Medium'],
  'ebin-adhesive-sports-big': ['ebin-adhesive-sports', 'Big'],
  '10pcs-relaxer-set': ['relaxer-set', '10pcs'],
  '15pcs-relaxer-set': ['relaxer-set', '15pcs'],
  '6pcs-relaxer-set': ['relaxer-set', '6pcs'],
  'ors-mayonnaise-big': ['ors-mayonnaise', 'Big'],
  'ors-mayonnaise-small': ['ors-mayonnaise', 'Small'],
  'ors-olive-sheen-big': ['ors-olive-sheen', 'Big'],
  'bonding-glue-big': ['bonding-glue', 'Big'],
  'bonding-glue-small': ['bonding-glue', 'Small'],
  'packaging-net-medium': ['packaging-net', 'Medium'],
  'packaging-net-large': ['packaging-net', 'Large'],
  'tresseme-shampoo-small': ['tresseme-shampoo', 'Small'],
  'tresseme-shampoo-big': ['tresseme-shampoo', 'Big'],
  'eyelash-mannequin-big': ['eyelash-mannequin', 'Big'],
  'pinkee-s-liquid-big': ['pinkee-s-liquid', 'Big'],
  'pinkee-s-liquid-medium': ['pinkee-s-liquid', 'Medium'],
  'pinkee-s-liquid-small': ['pinkee-s-liquid', 'Small'],
};

// Slug aliases for products that were renamed or exist under different slugs
const SLUG_ALIASES = {
  'electric-hair-straightening-hot-comb': 'ceramic-hot-comb',
  'perfume-gift-set': 'lavera-4-in-1-men-s-perfume-set',
  '300g-beginners-set': 'beginners-set-with-case',
  'kuura-fro-shampoo': 'kuura-beauty-avocado-batana-blend-moisturizing-detangling-shampoo',
  'kuura-fro-conditioner': 'kuura-beauty-avocado-batana-blend-moisturizing-conditioner',
  'non-woven-nail-wipes': null,
  'ebin-adhesive-big': null,
  'ebin-adhesive-small': null,
  'ebin-adhesive-sports-small': null,
  'ebin-adhesive-sports-medium': null,
  'ebin-adhesive-sports-big': null,
  'ors-mayonnaise-big': null,
  'ors-mayonnaise-small': null,
  'ors-olive-sheen-big': 'ors-olive-sheen',
};

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const env = { ...process.env, ...loadEnv() };
  const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: products, error: pErr } = await sb
    .from('products')
    .select('id,name,slug,price,sale_price,quantity,status')
    .neq('status', 'archived')
    .order('name');
  if (pErr) throw pErr;

  const { data: allVariants, error: vErr } = await sb
    .from('product_variants')
    .select('id,product_id,name,option1,price,sale_price,quantity');
  if (vErr) throw vErr;

  const bySlug = new Map((products || []).map((p) => [p.slug, p]));
  const variantsByParentId = new Map();
  for (const v of allVariants || []) {
    variantsByParentId.set(v.product_id, [...(variantsByParentId.get(v.product_id) || []), v]);
  }

  let updated = 0;
  let skipped = 0;
  let notFound = 0;
  let variantUpdated = 0;
  const changes = [];
  const missing = [];

  for (const [slug, expected] of Object.entries(MASTER)) {
    let p = bySlug.get(slug);

    // Try alias if not found
    if (!p && SLUG_ALIASES[slug]) {
      p = bySlug.get(SLUG_ALIASES[slug]);
    }

    // Try variant parent update
    if (!p && VARIANT_SLUG_TO_PARENT[slug]) {
      const [parentSlug, sizeTag] = VARIANT_SLUG_TO_PARENT[slug];
      const parent = bySlug.get(parentSlug);
      if (parent) {
        const variants = variantsByParentId.get(parent.id) || [];
        const normTag = sizeTag.toLowerCase();
        const variant = variants.find((v) =>
          (v.option1 || '').toLowerCase() === normTag ||
          (v.name || '').toLowerCase().includes(normTag)
        );
        if (variant) {
          const vPatch = {};
          if (expected.price != null && expected.price > 0) vPatch.price = expected.price;
          if (expected.sale_price != null && expected.sale_price > 0) vPatch.sale_price = expected.sale_price;
          if (expected.quantity != null && expected.quantity >= 0) vPatch.quantity = expected.quantity;
          if (Object.keys(vPatch).length && !dryRun) {
            const { error } = await sb.from('product_variants').update(vPatch).eq('id', variant.id);
            if (error) throw error;
          }
          if (Object.keys(vPatch).length) {
            variantUpdated += 1;
            changes.push({ slug, variant_of: parentSlug, size: sizeTag, ...vPatch });
          }
          continue;
        }
      }
      notFound += 1;
      missing.push(slug);
      continue;
    }

    if (!p) {
      notFound += 1;
      missing.push(slug);
      continue;
    }

    const patch = {};
    if (expected.price != null && expected.price > 0) patch.price = expected.price;
    if (expected.sale_price != null && expected.sale_price > 0) patch.sale_price = expected.sale_price;
    if (expected.quantity != null && expected.quantity >= 0) patch.quantity = expected.quantity;

    if (!Object.keys(patch).length) { skipped += 1; continue; }

    if (!dryRun) {
      const { error } = await sb.from('products').update(patch).eq('id', p.id);
      if (error) throw error;
    }

    updated += 1;
    changes.push({ slug, name: p.name, ...patch });
  }

  const { data: afterProducts, error: aErr } = await sb
    .from('products')
    .select('name,slug,quantity,price,sale_price,status')
    .neq('status', 'archived')
    .order('name');
  if (aErr) throw aErr;

  const noPrice = (afterProducts || []).filter((p) => !p.price || Number(p.price) <= 0);
  const noSale = (afterProducts || []).filter((p) => p.sale_price == null || Number(p.sale_price) <= 0);
  const noStock = (afterProducts || []).filter((p) => p.quantity == null || Number(p.quantity) <= 0);
  const lowStock = (afterProducts || []).filter((p) => Number(p.quantity) > 0 && Number(p.quantity) <= 5);

  const report = {
    dry_run: dryRun,
    total_active: (afterProducts || []).length,
    updated,
    skipped,
    not_found_in_db: notFound,
    not_found_slugs: missing,
    after_no_price: noPrice.length,
    after_no_sale: noSale.length,
    after_no_stock: noStock.length,
    after_low_stock: lowStock.length,
    no_price_list: noPrice.map((p) => `${p.slug} (${p.name})`),
    no_stock_list: noStock.map((p) => `${p.slug} (${p.name}) qty=${p.quantity}`),
    low_stock_list: lowStock.map((p) => `${p.slug} (${p.name}) qty=${p.quantity}`),
    changes,
  };

  const outPath = path.join(rootDir, 'data', 'master-sync-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(`Dry run: ${dryRun}`);
  console.log(`Total active products: ${(afterProducts || []).length}`);
  console.log(`Updated: ${updated}`);
  console.log(`Skipped (no patch): ${skipped}`);
  console.log(`Slugs not found in DB: ${notFound}`);
  if (missing.length) console.log(`  Missing: ${missing.join(', ')}`);
  console.log(`--- After sync ---`);
  console.log(`No price: ${noPrice.length}`);
  console.log(`No sale_price: ${noSale.length}`);
  console.log(`No stock (qty=0): ${noStock.length}`);
  console.log(`Low stock (qty 1-5): ${lowStock.length}`);
  console.log(`Report: ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
