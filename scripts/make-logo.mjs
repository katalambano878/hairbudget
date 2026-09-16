import sharp from 'sharp';

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="420">
  <rect width="1400" height="420" fill="#0C4534"/>
  <text x="700" y="210" text-anchor="middle" fill="#FFF2CB" font-family="Georgia, 'Times New Roman', serif" font-size="92" letter-spacing="14">HAIRBUDGET</text>
  <line x1="380" y1="250" x2="1020" y2="250" stroke="#DACCA9" stroke-width="3"/>
  <text x="700" y="310" text-anchor="middle" fill="#DACCA9" font-family="Georgia, serif" font-style="italic" font-size="28" letter-spacing="6">CONFIDENCE IN EVERY STRAND</text>
</svg>`;

await sharp(Buffer.from(svg)).png().toFile('public/logo.png');
console.log('logo.png written');
