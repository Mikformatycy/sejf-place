// Renders the cover icons from the SVG sources in assets/covers/src/<id>.svg (1024x1024:
// a full-bleed gradient <rect> followed by the white glyph).
// Output:
//   assets/covers/<id>.png              1024px full icon (cover picker, app icon, iOS)
//   assets/covers/<id>-fg.png / -bg.png 1024px adaptive icon layers (glyph / gradient)
//   assets/covers/android/mipmap-*/     legacy icon + adaptive layers per density
//   assets/covers/ios/                  60pt @2x/@3x alternate icons
// Usage: npm run icons
import { Buffer } from 'node:buffer';
import { mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'assets', 'covers');
const src = join(out, 'src');

// The gradient background is the one full-size rect; everything else is the glyph.
const BACKGROUND = /<rect width="1024" height="1024"[^>]*>(<\/rect>)?/;

function layers(svg) {
  const bg = svg.match(BACKGROUND)?.[0];
  if (!bg) throw new Error('Expected a full-size background <rect width="1024" height="1024">');
  const defs = svg.match(/<defs>[\s\S]*?<\/defs>/)?.[0] ?? '';
  const open = svg.match(/<svg[^>]*>/)[0];
  return {
    full: svg,
    background: `${open}${defs}${bg}</svg>`,
    foreground: svg.replace(BACKGROUND, ''),
  };
}

const DENSITIES = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };

async function png(svgText, size, file) {
  mkdirSync(dirname(file), { recursive: true });
  await sharp(Buffer.from(svgText), { density: 300 }).resize(size, size).png().toFile(file);
}

for (const file of readdirSync(src).filter((f) => f.endsWith('.svg'))) {
  const id = file.replace(/\.svg$/, '');
  const { full, background, foreground } = layers(readFileSync(join(src, file), 'utf8'));
  await png(full, 1024, join(out, `${id}.png`));
  await png(foreground, 1024, join(out, `${id}-fg.png`));
  await png(background, 1024, join(out, `${id}-bg.png`));
  for (const [d, scale] of Object.entries(DENSITIES)) {
    const dir = join(out, 'android', `mipmap-${d}`);
    await png(full, Math.round(48 * scale), join(dir, `ic_cover_${id}.png`));
    // Adaptive icon layers are 108dp; the launcher shows the middle 72dp.
    await png(foreground, Math.round(108 * scale), join(dir, `ic_cover_${id}_fg.png`));
    await png(background, Math.round(108 * scale), join(dir, `ic_cover_${id}_bg.png`));
  }
  await png(full, 120, join(out, 'ios', `Cover-${id}@2x.png`));
  await png(full, 180, join(out, 'ios', `Cover-${id}@3x.png`));
  console.log('icon', id);
}
console.log('Icons written to', out);
