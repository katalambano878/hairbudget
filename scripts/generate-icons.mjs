#!/usr/bin/env node
/**
 * Generate the full HairBudget icon + social-share asset set from
 * a single source: public/logo.png.
 *
 * Outputs:
 *   • App-router conventions (auto-wired by Next.js):
 *       app/icon.png            (favicon, 512×512)
 *       app/apple-icon.png      (180×180, iOS home screen)
 *       app/opengraph-image.png (1200×630, og:image)
 *       app/twitter-image.png   (1200×630, twitter:image)
 *
 *   • PWA + legacy paths in /public:
 *       public/favicon.ico              (32×32 PNG renamed)
 *       public/icon-192.png             (PWA, 192×192)
 *       public/icon-512.png             (PWA, 512×512)
 *       public/icon-192-maskable.png    (PWA maskable, 192×192)
 *       public/icon-512-maskable.png    (PWA maskable, 512×512)
 *       public/apple-touch-icon.png     (180×180)
 *       public/og-image.png             (1200×630)
 *
 * Run:  node scripts/generate-icons.mjs
 */

import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public', 'logo.png');
const OUT_APP = path.join(ROOT, 'app');
const OUT_PUBLIC = path.join(ROOT, 'public');

const BRAND = {
  white: { r: 252, g: 252, b: 252, alpha: 1 },
  blue:  { r: 12,  g: 69,  b: 52,  alpha: 1 },
  navy:  { r: 9,   g: 60,  b: 45,  alpha: 1 },
};

if (!existsSync(SRC)) {
  console.error(`✗ Source logo not found at ${SRC}`);
  process.exit(1);
}

await mkdir(OUT_APP, { recursive: true });
await mkdir(OUT_PUBLIC, { recursive: true });

/**
 * Build a square icon: white background, logo fitted with safe padding.
 * `padRatio` 0–1, where 0.85 means logo = 85% of the canvas.
 */
async function buildSquareIcon(size, outPath, { padRatio = 0.78, bg = BRAND.white } = {}) {
  const target = Math.round(size * padRatio);
  const fitted = await sharp(SRC)
    .resize({
      width: target,
      height: target,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`✓ ${path.relative(ROOT, outPath)}  (${size}×${size})`);
}

/**
 * Build a maskable PWA icon: brand background, logo with extra
 * safe-area padding so launchers can crop into circles/squircles.
 */
async function buildMaskableIcon(size, outPath) {
  await buildSquareIcon(size, outPath, { padRatio: 0.62, bg: BRAND.white });
}

/**
 * Build the social share image (1200×630).
 * White canvas, blue accent bar at the top, logo centered.
 */
async function buildOgImage(outPath) {
  const W = 1200;
  const H = 630;
  const logoTarget = Math.round(W * 0.5);

  const fittedLogo = await sharp(SRC)
    .resize({
      width: logoTarget,
      fit: 'inside',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .toBuffer();

  // SVG accents: top bar + a thin bottom rule + tagline text.
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect x="0" y="0" width="${W}" height="6" fill="rgb(12,69,52)"/>
      <rect x="0" y="${H - 1}" width="${W}" height="1" fill="rgba(218,204,169,0.4)"/>
      <text x="${W / 2}" y="${H - 70}"
        font-family="Georgia, 'Times New Roman', serif"
        font-style="italic"
        font-size="34"
        fill="rgb(12,69,52)"
        text-anchor="middle">
        Confidence in every strand
      </text>
      <text x="${W / 2}" y="${H - 30}"
        font-family="-apple-system, system-ui, Helvetica, Arial, sans-serif"
        font-size="14"
        letter-spacing="6"
        font-weight="900"
        fill="rgb(12,69,52)"
        text-anchor="middle">
        HAIRBUDGETGH.COM
      </text>
    </svg>
  `;
  const overlay = Buffer.from(svg);

  await sharp({
    create: {
      width: W,
      height: H,
      channels: 4,
      background: BRAND.white,
    },
  })
    .composite([
      { input: overlay, top: 0, left: 0 },
      { input: fittedLogo, gravity: 'center' },
    ])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`✓ ${path.relative(ROOT, outPath)}  (${W}×${H})`);
}

console.log('Generating HairBudget icon set from public/logo.png …\n');

// ── App router conventions (Next.js auto-wires these) ──
await buildSquareIcon(512, path.join(OUT_APP, 'icon.png'));
await buildSquareIcon(180, path.join(OUT_APP, 'apple-icon.png'));
await buildOgImage(path.join(OUT_APP, 'opengraph-image.png'));
await buildOgImage(path.join(OUT_APP, 'twitter-image.png'));

// ── Public path duplicates (for manifest.json + legacy <link>) ──
await buildSquareIcon(32,  path.join(OUT_PUBLIC, 'favicon.ico')); // PNG bytes; browsers accept
await buildSquareIcon(192, path.join(OUT_PUBLIC, 'icon-192.png'));
await buildSquareIcon(512, path.join(OUT_PUBLIC, 'icon-512.png'));
await buildMaskableIcon(192, path.join(OUT_PUBLIC, 'icon-192-maskable.png'));
await buildMaskableIcon(512, path.join(OUT_PUBLIC, 'icon-512-maskable.png'));
await buildSquareIcon(180, path.join(OUT_PUBLIC, 'apple-touch-icon.png'));
await buildOgImage(path.join(OUT_PUBLIC, 'og-image.png'));

console.log('\n✓ Done. All icons regenerated from logo.png');
