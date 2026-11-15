import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { getSupabaseServer } from '@/lib/supabase/server';
import { toRecipe, type Recipe } from '@/lib/recipes';

/**
 * Data for the cook book PDFs. Everything is read fresh on each download, so
 * an edit to a recipe, a dish name or a photo shows up in the next PDF.
 */

export const COOKBOOK_GROUPS = [
  ['main', 'Mains'],
  ['protein_side', 'Protein sides'],
  ['legume', 'Legumes & sprouts'],
  ['salad', 'Salads'],
  ['carb', 'Carbs'],
] as const;

export type PdfImage = { data: Buffer; format: 'jpg' | 'png' };

export type CookbookDish = {
  id: string;
  code: string;
  name: string;
  category: string;
  categoryLabel: string;
  isVeg: boolean;
  grams: number;
  cookedState: string | null;
  allergens: string[];
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  recipe: Recipe;
  ready: boolean;
  updatedAt: string | null;
  photo: PdfImage | null; // 4:3 crop for the recipe page
  thumb: PdfImage | null; // square crop for contents / cover
};

const DISH_COLUMNS = 'id, code, name, category, grams, cooked_state, allergens, calories, protein, carbs, fat, image_url, metadata, is_veg';

type DishRow = {
  id: string; code: string; name: string; category: string; grams: number; cooked_state: string | null;
  allergens: string[]; calories: number; protein: number; carbs: number; fat: number;
  image_url: string | null; metadata: unknown; is_veg: boolean;
};
type RecipeRow = Record<string, unknown> & { menu_item_id: string; updated_at?: string | null };

const labelFor = (cat: string) => COOKBOOK_GROUPS.find(([c]) => c === cat)?.[1] ?? 'Other';

/** Fetches a photo (absolute URL or a /public path) and returns its bytes, or null. */
async function fetchImageBytes(url: string, origin: string): Promise<Buffer | null> {
  try {
    if (url.startsWith('/') && !url.startsWith('//')) {
      const local = path.join(process.cwd(), 'public', path.normalize(url).replace(/^(\.\.[/\\])+/, ''));
      try {
        return await readFile(local);
      } catch {
        // Not bundled with the function (e.g. on Vercel): fetch it from the site instead.
      }
    }
    const abs = new URL(url, origin);
    if (abs.protocol !== 'https:' && abs.protocol !== 'http:') return null;
    const res = await fetch(abs, { signal: AbortSignal.timeout(8000), cache: 'no-store' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return buf.length > 0 && buf.length < 15_000_000 ? buf : null;
  } catch {
    return null;
  }
}

/**
 * react-pdf only draws JPEG/PNG, and dish photos may be WebP/AVIF. Convert
 * every photo to a fixed-size JPEG so each one fills its frame the same way.
 */
export async function loadPhotos(url: string | null, origin: string): Promise<{ photo: PdfImage | null; thumb: PdfImage | null }> {
  if (!url) return { photo: null, thumb: null };
  const bytes = await fetchImageBytes(url, origin);
  if (!bytes) return { photo: null, thumb: null };
  try {
    const base = sharp(bytes, { failOn: 'none' }).rotate().flatten({ background: '#ffffff' });
    const [photo, thumb] = await Promise.all([
      base.clone().resize(900, 675, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80, mozjpeg: true }).toBuffer(),
      base.clone().resize(240, 240, { fit: 'cover', position: 'attention' }).jpeg({ quality: 75, mozjpeg: true }).toBuffer(),
    ]);
    return { photo: { data: photo, format: 'jpg' }, thumb: { data: thumb, format: 'jpg' } };
  } catch {
    return { photo: null, thumb: null };
  }
}

/** Runs fn over items, at most `limit` at a time (keeps photo downloads polite). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out = new Array<R>(items.length);
  let next = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i]);
    }
  }));
  return out;
}

function toDish(d: DishRow, row: RecipeRow | undefined, photos: { photo: PdfImage | null; thumb: PdfImage | null }): CookbookDish {
  const recipe = row
    ? toRecipe(row as Partial<Record<keyof Recipe, unknown>>)
    : { ...toRecipe(null), notes: (d.metadata as { kitchen_notes?: string } | null)?.kitchen_notes ?? null };
  return {
    id: d.id, code: d.code, name: d.name, category: d.category, categoryLabel: labelFor(d.category),
    isVeg: d.is_veg, grams: d.grams, cookedState: d.cooked_state, allergens: d.allergens ?? [],
    calories: d.calories, protein: d.protein, carbs: d.carbs, fat: d.fat,
    recipe, ready: recipe.ingredients.length > 0 && recipe.steps.length > 0,
    updatedAt: (row?.updated_at as string | null | undefined) ?? null,
    ...photos,
  };
}

/** One dish (active or not, so an old recipe can still be printed). */
export async function loadCookbookDish(id: string, origin: string): Promise<CookbookDish | null> {
  const supabase = await getSupabaseServer();
  const [{ data: d }, { data: row }] = await Promise.all([
    supabase.from('menu_items').select(DISH_COLUMNS).eq('id', id).maybeSingle(),
    supabase.from('dish_recipes').select('*').eq('menu_item_id', id).maybeSingle(),
  ]);
  if (!d) return null;
  const photos = await loadPhotos(d.image_url, origin);
  return toDish(d as DishRow, (row ?? undefined) as RecipeRow | undefined, photos);
}

/** Every active dish, in cook book order (category, then code). */
export async function loadCookbook(origin: string): Promise<CookbookDish[]> {
  const supabase = await getSupabaseServer();
  const [{ data: items }, { data: recipes }] = await Promise.all([
    supabase.from('menu_items').select(DISH_COLUMNS).eq('is_active', true).order('code'),
    supabase.from('dish_recipes').select('*'),
  ]);
  const byDish = new Map(((recipes ?? []) as RecipeRow[]).map((r) => [r.menu_item_id, r]));
  const order = new Map<string, number>(COOKBOOK_GROUPS.map(([c], n) => [c, n]));
  const rows = ((items ?? []) as DishRow[])
    .filter((d) => order.has(d.category))
    .sort((a, b) => order.get(a.category)! - order.get(b.category)! || a.code.localeCompare(b.code));
  const photos = await mapLimit(rows, 6, (d) => loadPhotos(d.image_url, origin));
  return rows.map((d, n) => toDish(d, byDish.get(d.id), photos[n]));
}

let logoCache: PdfImage | null = null;
export async function loadLogo(): Promise<PdfImage | null> {
  if (logoCache) return logoCache;
  try {
    logoCache = { data: await readFile(path.join(process.cwd(), 'assets/brand/logo-pdf.png')), format: 'png' };
    return logoCache;
  } catch {
    return null;
  }
}
