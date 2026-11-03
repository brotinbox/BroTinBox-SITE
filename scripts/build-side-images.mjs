// Product photos for the six side meals (data/sides.json).
//   node scripts/build-side-images.mjs generate <dir> [slug...]   Generate source PNGs into <dir> for review.
//   node scripts/build-side-images.mjs publish <dir>              Optimise, upload to R2, update sides.json and Supabase.
// Object keys carry a content hash, so they can be cached forever and a re-publish never serves a stale image.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import sharp from 'sharp';

config({ path: '.env.local', quiet: true });

const SIDES_FILE = 'data/sides.json';
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
// Cards render at about 470 CSS px wide; 1200 covers retina screens and next/image scales down from it.
const OUTPUT_WIDTH = 1200;
const WEBP_QUALITY = 80;

// Cards crop to a square on mobile and 16:11 on desktop, so the plate must sit inside the central square.
const STYLE =
  'Realistic professional food photograph, shot straight from above with a real camera. The whole round plate sits exactly in the centre of the frame with clear margin all around, taking up about 80% of the image height. ' +
  'Plain matte off-white stoneware plate on a light warm-grey stone surface, soft natural window light from the left, gentle soft shadows, true-to-life colours, natural food texture with small imperfections, home-style restaurant portion. ' +
  'No cutlery, no props, no hands, no garnish scattered on the table, no text, no logo, no watermark.';

const DISHES = {
  'grilled-chicken-with-salad':
    'Two herb-rubbed grilled chicken breast fillets, sliced, with visible char marks, beside a fresh salad of thinly shaved cucumber ribbons and mint leaves with mixed greens.',
  'chicken-salad':
    'A chicken salad: tender shredded pulled chicken breast tossed with julienned red and yellow bell peppers and thin radish slices, lightly glossy with lemon-pepper dressing, cracked black pepper visible.',
  'chicken-post-workout-meal':
    'A recovery meal in three neat sections: sliced char-grilled chicken breast, a soft mound of freshly steamed Indian red rice with slender, slightly sticky, naturally deep reddish-brown cooked grains, and thin fresh fruit slices of golden-orange ripe papaya with orange segments and a few pomegranate seeds.',
  'grilled-paneer-with-salad':
    'Thick rectangular slabs of Indian paneer cheese seared golden brown with grill marks, dusted with roasted cumin, beside a zesty slaw of shredded cabbage, carrot and cucumber.',
  'paneer-salad':
    'A paneer salad: irregular hand-cut soft milky-white cubes of fresh Indian malai paneer with a crumbly surface, tossed loosely with a few bits of freshly chopped coriander that fall naturally around them, on baby spinach and tender greens with halved cherry tomatoes, lightly glistening with oil.',
  'paneer-post-workout-meal':
    'A recovery meal in three neat sections: pan-browned cubes of Indian paneer with golden edges, roasted sweet potato wedges with caramelised skin, and juicy cubes of fresh orange muskmelon and green honeydew.',
};

function need(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env.local`);
  return value;
}

async function generateOne(slug, dir) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${need('OPENAI_API_KEY')}` },
    body: JSON.stringify({ model: MODEL, prompt: `${DISHES[slug]} ${STYLE}`, n: 1, size: '1536x1024', quality: 'high' }),
  });
  if (!res.ok) throw new Error(`${slug}: OpenAI ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  await writeFile(path.join(dir, `${slug}.png`), Buffer.from(data[0].b64_json, 'base64'));
  console.log('generated', slug);
}

async function generate(dir, slugs) {
  await mkdir(dir, { recursive: true });
  const results = await Promise.allSettled(slugs.map((slug) => generateOne(slug, dir)));
  const failed = results.filter((r) => r.status === 'rejected');
  failed.forEach((r) => console.error(r.reason.message));
  if (failed.length) process.exitCode = 1;
}

async function publish(dir) {
  const publicUrl = need('CLOUDFLARE_R2_PUBLIC_URL').replace(/\/$/, '');
  const s3 = new S3Client({
    region: 'auto',
    // Account origin only: an endpoint ending in /<bucket> makes the SDK prefix every key with the bucket name.
    endpoint: new URL(need('CLOUDFLARE_R2_ENDPOINT')).origin,
    credentials: { accessKeyId: need('CLOUDFLARE_R2_ACCESS_KEY_ID'), secretAccessKey: need('CLOUDFLARE_R2_SECRET_ACCESS_KEY') },
  });

  // Upload everything before changing any data, so a failed upload leaves the site untouched.
  const urls = {};
  for (const slug of Object.keys(DISHES)) {
    const body = await sharp(path.join(dir, `${slug}.png`))
      .resize({ width: OUTPUT_WIDTH })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer();
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 10);
    const key = `side-meals/${slug}-${hash}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: need('CLOUDFLARE_R2_BUCKET_NAME'),
        Key: key,
        Body: body,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    urls[slug] = `${publicUrl}/${key}`;
    console.log('uploaded', key, `${(body.length / 1024).toFixed(0)} KB`);
  }

  // Swap the URLs as text so the rest of the file keeps its formatting.
  let sidesText = await readFile(SIDES_FILE, 'utf8');
  for (const side of JSON.parse(sidesText)) {
    const pattern = new RegExp(`("slug": "${side.slug}"[\\s\\S]*?"image": ")[^"]*`);
    sidesText = sidesText.replace(pattern, (_, prefix) => prefix + urls[side.slug]);
  }
  await writeFile(SIDES_FILE, sidesText);

  const supabase = need('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = need('SUPABASE_SERVICE_ROLE_KEY');
  for (const [slug, url] of Object.entries(urls)) {
    const res = await fetch(`${supabase}/rest/v1/addons?slug=eq.${slug}&type=eq.side`, {
      method: 'PATCH',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ image_url: url }),
    });
    const rows = res.ok ? await res.json() : [];
    if (rows.length !== 1) throw new Error(`Supabase update for ${slug} failed: ${res.status}, ${rows.length} rows`);
  }
  console.log('sides.json and Supabase updated');
}

const [command, dir, ...slugs] = process.argv.slice(2);
if (command === 'generate' && dir) await generate(dir, slugs.length ? slugs : Object.keys(DISHES));
else if (command === 'publish' && dir) await publish(dir);
else throw new Error('Usage: build-side-images.mjs generate|publish <dir> [slug...]');
