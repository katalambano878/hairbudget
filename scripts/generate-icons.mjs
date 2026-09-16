#!/usr/bin/env node
/**
 * Generate favicon, PWA, App Router, and social-share assets
 * from the transparent public/logo.png wordmark.
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

const CREAM = { r: 238, g: 229, b: 212, alpha: 1 };
const IVORY = { r: 255, g: 242, b: 203, alpha: 1 };
const FOREST = { r: 12, g: 69, b: 52 };
const TRANSPARENT = { r: 0, g: 0, b: 0, alpha: 0 };

if (!existsSync(SRC)) {
  console.error(`✗ Source logo not found at ${SRC}`);
  process.exit(1);
}

await mkdir(OUT_APP, { recursive: true });
await mkdir(OUT_PUBLIC, { recursive: true });

const trimmed = await sharp(SRC).trim({ threshold: 4 }).png().toBuffer();

async function buildSquareIcon(size, outPath, { padRatio = 0.86, bg = CREAM } = {}) {
  const target = Math.round(size * padRatio);
  const fitted = await sharp(trimmed)
    .resize({
      width: target,
      height: target,
      fit: 'contain',
      background: TRANSPARENT,
    })
    .toBuffer();

  await sharp({
    create: { width: size, height: size, channels: 4, background: bg },
  })
    .composite([{ input: fitted, gravity: 'center' }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`✓ ${path.relative(ROOT, outPath)}  (${size}×${size})`);
}

async function buildOgImage(outPath) {
  const W = 1200;
  const H = 630;
  const logoW = 880;
  const logoH = 260;
  const fittedLogo = await sharp(trimmed)
    .resize({ width: logoW, height: logoH, fit: 'inside', background: TRANSPARENT })
    .toBuffer();
  const meta = await sharp(fittedLogo).metadata();
  const left = Math.round((W - (meta.width || logoW)) / 2);
  const top = 130;

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
      <rect width="${W}" height="${H}" fill="#EEE5D4"/>
      <rect x="0" y="0" width="${W}" height="12" fill="rgb(${FOREST.r},${FOREST.g},${FOREST.b})"/>
      <rect x="0" y="${H - 12}" width="${W}" height="12" fill="rgb(${FOREST.r},${FOREST.g},${FOREST.b})"/>
      <text x="${W / 2}" y="${H - 86}"
        font-family="Georgia, 'Times New Roman', serif"
        font-style="italic"
        font-size="34"
        fill="rgb(${FOREST.r},${FOREST.g},${FOREST.b})"
        text-anchor="middle">
        <tspan>Confidence</tspan>
        <tspan dx="10">in</tspan>
        <tspan dx="10">every</tspan>
        <tspan dx="10">strand</tspan>
      </text>
      <text x="${W / 2}" y="${H - 46}"
        font-family="-apple-system, system-ui, Helvetica, Arial, sans-serif"
        font-size="16"
        letter-spacing="5"
        font-weight="700"
        fill="rgb(${FOREST.r},${FOREST.g},${FOREST.b})"
        text-anchor="middle">
        HAIRBUDGETGH.COM
      </text>
    </svg>
  `;

  await sharp(Buffer.from(svg))
    .composite([{ input: fittedLogo, top, left }])
    .png({ compressionLevel: 9 })
    .toFile(outPath);

  console.log(`✓ ${path.relative(ROOT, outPath)}  (${W}×${H})`);
}

console.log('Generating HairBudget icon set from public/logo.png …\n');

await buildSquareIcon(512, path.join(OUT_APP, 'icon.png'));
await buildSquareIcon(180, path.join(OUT_APP, 'apple-icon.png'));
await buildOgImage(path.join(OUT_APP, 'opengraph-image.png'));
await buildOgImage(path.join(OUT_APP, 'twitter-image.png'));

await buildSquareIcon(32, path.join(OUT_PUBLIC, 'favicon.ico'));
await buildSquareIcon(192, path.join(OUT_PUBLIC, 'icon-192.png'));
await buildSquareIcon(512, path.join(OUT_PUBLIC, 'icon-512.png'));
await buildSquareIcon(192, path.join(OUT_PUBLIC, 'icon-192-maskable.png'), { padRatio: 0.7, bg: CREAM });
await buildSquareIcon(512, path.join(OUT_PUBLIC, 'icon-512-maskable.png'), { padRatio: 0.7, bg: CREAM });
await buildSquareIcon(180, path.join(OUT_PUBLIC, 'apple-touch-icon.png'));
await buildOgImage(path.join(OUT_PUBLIC, 'og-image.png'));

console.log('\n✓ Done. All icons regenerated from logo.png');
