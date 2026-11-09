// Writes public/grain.png: the same 160x160 noise tile the footer poster draws
// (mulberry32 seed 42, black/white pixels, alpha 0-45), pre-faded to STRENGTH because a
// CSS background image can't take its own opacity. Run: node scripts/make-grain.mjs
import sharp from 'sharp';

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const S = 160;
/** Same as the footer paper's grain layer (opacity .32). */
const STRENGTH = 0.32;
const data = Buffer.alloc(S * S * 4);
const r = rng(42);
for (let i = 0; i < data.length; i += 4) {
  const v = r() < 0.5 ? 0 : 255;
  data[i] = data[i + 1] = data[i + 2] = v;
  data[i + 3] = Math.round(Math.floor(r() * 46) * STRENGTH);
}
await sharp(data, { raw: { width: S, height: S, channels: 4 } }).png({ compressionLevel: 9 }).toFile('public/grain.png');
console.log('wrote public/grain.png');
