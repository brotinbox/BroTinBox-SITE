// Product photos for the protein box cards, one per main dish (menu_items.image_url).
// Each shows the 5-compartment tray with the sides that main is first served with in the 30-day rotation.
//   node scripts/build-box-images.mjs generate <dir> [code...]   Generate source PNGs into <dir> for review.
//   node scripts/build-box-images.mjs publish <dir>              Optimise, upload to R2, update menu-30day.json and Supabase.
// Object keys carry a content hash, so they can be cached forever and a re-publish never serves a stale image.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from 'dotenv';
import sharp from 'sharp';

config({ path: '.env.local', quiet: true });

const MENU_FILE = 'data/menu-30day.json';
const MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
const OUTPUT_WIDTH = 1200;
const WEBP_QUALITY = 80;

// What each dish looks like. Keys are menu_items codes.
const MAINS = {
  NVM1: 'grilled chicken breast pieces coated in a vivid green mint and coriander marinade with light char',
  NVM2: 'juicy golden seared chicken breast cubes, glistening, with mild spices and herbs',
  NVM3: 'a thick pan-grilled chicken breast steak, sliced, with grill marks and crushed black pepper',
  NVM4: 'soft pale shredded boiled chicken breast with black pepper and flecks of fresh herbs',
  NVM5: 'poached chicken breast pieces, mostly pale, lightly charred at the edges from a hot griddle',
  NVM6: 'one boneless tawa-grilled mackerel fillet with no head and no tail, silvery blue-grey striped skin showing and a reddish coastal spice rub, filling the compartment',
  VM1: 'tandoori paneer cubes in an orange-red hung curd marinade with charred edges',
  VM2: 'soft white paneer cubes tossed in a light green mint and coriander rub',
  VM3: 'sauteed paneer cubes with caramelised shallots, cumin seeds and sliced green chillies',
  VM4: 'firm tofu cubes with a smoky orange-red tandoori glaze and charred edges',
  VM5: 'pan-seared golden tofu cubes with fresh mint and cracked peppercorns',
  VM6: 'button mushrooms in a light creamy pale onion and herb sauce',
  VM7: 'crushed soya chunks tossed with diced capsicum, tomatoes and garam masala, reddish-brown',
};

const SIDES = {
  egg: 'two whole boiled eggs each cut in half, so exactly four egg halves with yellow yolks, filling the compartment',
  beetCurd: 'thick pink curd mixed with grated beetroot',
  mintCurd: 'thick white curd with crushed green mint',
  carrotCurd: 'thick white curd topped with julienned carrots and mustard seeds',
  potatoCurd: 'thick white curd with diced boiled potato and coriander',
  cucumberCurd: 'thick white curd with diced cucumber',
  cornCurd: 'thick white curd with sweet corn kernels',
  cornSalad: 'yellow sweet corn kernels with diced bell pepper and coriander',
  mixedSalad: 'shredded carrot, cucumber, cabbage and tomato',
  cabbageSalad: 'finely sliced purple and green cabbage with mustard seeds',
  cucumberSalad: 'neat overlapping cucumber slices with black pepper',
  coleslaw: 'shredded cabbage and carrot in a light white creamy dressing',
  broccoliSalad: 'steamed broccoli florets with toasted sesame seeds',
  blackChana: 'small dark brown boiled black chickpeas with curry leaves',
  horseGram: 'small brown sprouted horse gram with tiny sprouts',
  greenGram: 'green moong sprouts with lemon and cracked pepper',
  peanut: 'boiled peanuts, shelled, pale pinkish-brown',
  rajma: 'dark red boiled kidney beans',
  peas: 'bright green boiled peas',
  chapati: 'two soft folded whole wheat chapatis with light brown spots',
  masalaOats: 'savoury masala oats with diced beans and carrot, turmeric yellow',
  oatsUpma: 'oats upma with mustard seeds and curry leaves',
  oatsPongal: 'soft pale yellow oats and moong dal pongal with black pepper',
  oatsDosa: 'two folded crisp thin golden oats dosas',
};

// [protein side, salad, legume, carb] from the main's first day in the rotation.
const BOXES = {
  NVM1: ['egg', 'cornSalad', 'blackChana', 'chapati'],
  NVM2: ['egg', 'mixedSalad', 'horseGram', 'masalaOats'],
  NVM3: ['egg', 'cabbageSalad', 'greenGram', 'chapati'],
  NVM4: ['egg', 'cucumberSalad', 'peanut', 'oatsUpma'],
  NVM5: ['egg', 'coleslaw', 'rajma', 'oatsPongal'],
  NVM6: ['egg', 'broccoliSalad', 'peas', 'chapati'],
  VM1: ['beetCurd', 'cornSalad', 'blackChana', 'chapati'],
  VM2: ['potatoCurd', 'cucumberSalad', 'peanut', 'oatsUpma'],
  VM3: ['mintCurd', 'cucumberSalad', 'greenGram', 'oatsDosa'],
  VM4: ['cornCurd', 'broccoliSalad', 'peas', 'chapati'],
  VM5: ['carrotCurd', 'cabbageSalad', 'greenGram', 'chapati'],
  VM6: ['cucumberCurd', 'coleslaw', 'rajma', 'oatsPongal'],
  VM7: ['mintCurd', 'mixedSalad', 'horseGram', 'masalaOats'],
};

function promptFor(code) {
  const [proteinSide, salad, legume, carb] = BOXES[code].map((key) => SIDES[key]);
  return (
    'Realistic professional food photograph of one complete brushed stainless steel meal tray with five separate compartments, the tray only slightly wider than it is tall, about 6:5 in shape, shot straight from above with a real camera. ' +
    'Top row has two large compartments, bottom row has three smaller compartments. ' +
    `Top-left compartment: ${MAINS[code]}. Top-right compartment: ${salad}. ` +
    `Bottom-left compartment: ${carb}. Bottom-middle compartment: ${legume}. Bottom-right compartment: ${proteinSide}. ` +
    'Each food stays inside its own compartment, portions measured and tidy, home-cooked Indian food with natural texture and small imperfections. ' +
    // Cards crop to 16:10 and the detail view to a square, so the whole tray must sit inside the central square.
    'The entire tray with all four corners is visible and exactly centred in the frame, taking up about 86% of the image height and at most two-thirds of the image width, with wide empty stone surface on the left and right. ' +
    'Light warm-grey stone surface evenly lit by soft diffused overcast daylight, no patches of direct sunlight, gentle soft shadows, true-to-life colours, realistic reflections on the steel. ' +
    'No cutlery, no props, no hands, no garnish on the table, no text, no labels, no logo, no watermark.'
  );
}

function need(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set in .env.local`);
  return value;
}

async function generateOne(code, dir) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${need('OPENAI_API_KEY')}` },
    body: JSON.stringify({ model: MODEL, prompt: promptFor(code), n: 1, size: '1536x1024', quality: 'high' }),
  });
  if (!res.ok) throw new Error(`${code}: OpenAI ${res.status} ${await res.text()}`);
  const { data } = await res.json();
  await writeFile(path.join(dir, `${code}.png`), Buffer.from(data[0].b64_json, 'base64'));
  console.log('generated', code);
}

async function generate(dir, codes) {
  await mkdir(dir, { recursive: true });
  const results = await Promise.allSettled(codes.map((code) => generateOne(code, dir)));
  const failed = results.filter((r) => r.status === 'rejected');
  failed.forEach((r) => console.error(r.reason.message));
  if (failed.length) process.exitCode = 1;
}

/** Sets `image` on the catalog entry and on every copy of the dish inside the daily menus. */
function applyImages(node, urls) {
  if (Array.isArray(node)) return node.forEach((child) => applyImages(child, urls));
  if (!node || typeof node !== 'object') return;
  if (typeof node.id === 'string' && urls[node.id] && 'image' in node) node.image = urls[node.id];
  Object.values(node).forEach((child) => applyImages(child, urls));
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
  for (const code of Object.keys(MAINS)) {
    const body = await sharp(path.join(dir, `${code}.png`))
      .resize({ width: OUTPUT_WIDTH })
      .webp({ quality: WEBP_QUALITY, effort: 6 })
      .toBuffer();
    const hash = createHash('sha256').update(body).digest('hex').slice(0, 10);
    const key = `protein-boxes/${code.toLowerCase()}-${hash}.webp`;
    await s3.send(
      new PutObjectCommand({
        Bucket: need('CLOUDFLARE_R2_BUCKET_NAME'),
        Key: key,
        Body: body,
        ContentType: 'image/webp',
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
    urls[code] = `${publicUrl}/${key}`;
    console.log('uploaded', key, `${(body.length / 1024).toFixed(0)} KB`);
  }

  const menu = JSON.parse(await readFile(MENU_FILE, 'utf8'));
  applyImages(menu, urls);
  await writeFile(MENU_FILE, JSON.stringify(menu, null, 2));

  const supabase = need('NEXT_PUBLIC_SUPABASE_URL');
  const serviceKey = need('SUPABASE_SERVICE_ROLE_KEY');
  for (const [code, url] of Object.entries(urls)) {
    const res = await fetch(`${supabase}/rest/v1/menu_items?code=eq.${code}`, {
      method: 'PATCH',
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json', Prefer: 'return=representation' },
      body: JSON.stringify({ image_url: url }),
    });
    const rows = res.ok ? await res.json() : [];
    if (rows.length !== 1) throw new Error(`Supabase update for ${code} failed: ${res.status}, ${rows.length} rows`);
  }
  console.log('menu-30day.json and Supabase updated');
}

const [command, dir, ...codes] = process.argv.slice(2);
if (command === 'generate' && dir) await generate(dir, codes.length ? codes : Object.keys(MAINS));
else if (command === 'publish' && dir) await publish(dir);
else throw new Error('Usage: build-box-images.mjs generate|publish <dir> [code...]');
