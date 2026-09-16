import sharp from 'sharp';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'public', 'logo-source.png');
const OUT = path.join(ROOT, 'public', 'logo.png');
if (!existsSync(SRC)) {
  console.error('Missing public/logo-source.png');
  process.exit(1);
}
console.log('source', SRC);

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const isNeutral = max - min < 18;
  if (isNeutral && min > 238) {
    data[i + 3] = 0;
  } else if (isNeutral && min > 220) {
    data[i + 3] = Math.round(((238 - min) / 18) * 255);
  }
}

const rawOpts = { raw: { width: info.width, height: info.height, channels: 4 } };

await sharp(data, rawOpts).trim({ threshold: 8 }).png({ compressionLevel: 9 }).toFile(OUT);

const light = Buffer.from(data);
for (let i = 0; i < light.length; i += 4) {
  if (light[i + 3] < 12) continue;
  const r = light[i];
  const g = light[i + 1];
  const b = light[i + 2];
  const isGold = r > 170 && g > 140 && r - b > 40 && g - b > 20;
  if (!isGold) {
    light[i] = 238;
    light[i + 1] = 229;
    light[i + 2] = 212;
  }
}
const LIGHT = path.join(ROOT, 'public', 'logo-light.png');
await sharp(light, rawOpts).trim({ threshold: 8 }).png({ compressionLevel: 9 }).toFile(LIGHT);

const meta = await sharp(OUT).metadata();
const lightMeta = await sharp(LIGHT).metadata();
console.log(`logo.png ${meta.width}x${meta.height} hasAlpha=${meta.hasAlpha}`);
console.log(`logo-light.png ${lightMeta.width}x${lightMeta.height} hasAlpha=${lightMeta.hasAlpha}`);
