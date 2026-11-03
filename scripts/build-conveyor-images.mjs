// Cuts the tray photos in public/daily-trial out of their cream background and centres each
// on a transparent square canvas, the format the home page conveyor belt needs.
// Run: node scripts/build-conveyor-images.mjs
import path from 'node:path';
import sharp from 'sharp';

const SOURCES = ['lemon-herb', 'butter-garlic-chicken', 'peri-peri', 'chetinad', 'tandoori', 'spicy-fish'];
const RADIUS = 0.135; // Corner radius of the steel tray, as a share of its width.
const DARK = 205; // A row or column belongs to the tray once enough of its pixels are darker than this.

/** Bounding box of the steel tray: the background is light, the tray rim and food are not. */
async function trayBox(file) {
  const { data, info } = await sharp(file).greyscale().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const dense = (count, length) => count > length * 0.45;
  const rows = [];
  const cols = [];
  for (let y = 0; y < h; y++) {
    let c = 0;
    for (let x = 0; x < w; x++) if (data[y * w + x] < DARK) c++;
    if (dense(c, w)) rows.push(y);
  }
  for (let x = 0; x < w; x++) {
    let c = 0;
    for (let y = 0; y < h; y++) if (data[y * w + x] < DARK) c++;
    if (dense(c, h)) cols.push(x);
  }
  return { left: cols[0], top: rows[0], width: cols.at(-1) - cols[0] + 1, height: rows.at(-1) - rows[0] + 1 };
}

for (const name of SOURCES) {
  const file = path.join('public/daily-trial', `${name}.png`);
  const box = await trayBox(file);
  const { width, height } = box;
  const r = Math.round(width * RADIUS);
  const mask = Buffer.from(`<svg width="${width}" height="${height}"><rect width="${width}" height="${height}" rx="${r}" ry="${r}"/></svg>`);
  const tray = await sharp(file).ensureAlpha().extract(box).composite([{ input: mask, blend: 'dest-in' }]).png().toBuffer();
  const side = Math.max(width, height);
  await sharp({ create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite([{ input: tray, left: Math.round((side - width) / 2), top: Math.round((side - height) / 2) }])
    .webp({ quality: 88, alphaQuality: 100 })
    .toFile(path.join('public/conveyor', `${name}.webp`));
  console.log(name, `${width}x${height} -> ${side}x${side}`);
}
