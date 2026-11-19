import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseService } from '@/lib/supabase/admin';
import { getNextOperatingDay } from '@/lib/menu/next-operating-day';
import { toRecipe, type Ingredient as RecipeLine } from '@/lib/recipes';
import { COMBOS, countDishPortions, type DayMenu, type DishInfo, type SheetRow, type Spare } from '@/lib/stock/portions';
import { nameKey, recipeToBase, roundUpToBuy, type BaseUnit, type StockKind } from '@/lib/stock/units';

/**
 * Kitchen stock (migration 0053). Reads and writes go through the service
 * role; pages check stock.read and actions stock.write first.
 *
 *   on hand   = sum of stock.moves (bills +, 9 PM usage −, waste −, counts ±)
 *   usage     = cook-sheet portions × recipe per portion, linked to an
 *               ingredient through stock.aliases (recipe names stay free text)
 *   buy list  = fresh: tomorrow's need + 5 % − what is left
 *               pantry: buy packs when less than LOW_DAYS of cooking is left
 */

export const LOW_DAYS = 5;
export const BUY_BUFFER = 0.05;

const db = () => getSupabaseService() as unknown as SupabaseClient;
/** The private `stock` schema (migration 0053, service role only). */
const sdb = () => db().schema('stock');
export const stockDb = sdb;

export type StockIngredient = {
  id: string; name: string; kind: StockKind; unit: BaseUnit; category: string;
  pack_size: number | null; min_stock: number | null; price_per_unit: number | null; price_updated_at: string | null;
  low_flag_at: string | null; is_active: boolean; note: string | null;
};

export const todayIst = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
const istHour = () => Number(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));
export function addDays(d: string, n: number) {
  const x = new Date(`${d}T00:00:00Z`);
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
}
const n = (v: unknown) => (v === null || v === undefined ? null : Number(v));

/** Staff names for "by …" lines (profiles live in public, stock rows in stock). */
export async function profileNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((x): x is string => !!x))];
  if (!unique.length) return new Map();
  const { data } = await db().from('profiles').select('id, full_name').in('id', unique);
  return new Map((data ?? []).filter((p) => p.full_name).map((p) => [p.id as string, p.full_name as string]));
}

// ---------------------------------------------------------------------------
// Base data
// ---------------------------------------------------------------------------
export async function getIngredients(): Promise<StockIngredient[]> {
  const { data, error } = await sdb().from('ingredients').select('*').order('name');
  if (error) throw error;
  return (data ?? []).map((r) => ({
    ...r, pack_size: n(r.pack_size), min_stock: n(r.min_stock), price_per_unit: n(r.price_per_unit),
  })) as StockIngredient[];
}

/** alias key → ingredient id (null = not tracked, e.g. water). */
export async function getAliases(): Promise<Map<string, string | null>> {
  const { data, error } = await sdb().from('aliases').select('alias, ingredient_id');
  if (error) throw error;
  return new Map((data ?? []).map((a) => [a.alias as string, a.ingredient_id as string | null]));
}

export async function getOnHand(): Promise<Map<string, number>> {
  const { data, error } = await sdb().from('on_hand').select('ingredient_id, qty');
  if (error) throw error;
  return new Map((data ?? []).map((r) => [r.ingredient_id as string, Number(r.qty)]));
}

export async function getStartDate(): Promise<string | null> {
  const { data } = await sdb().from('settings').select('start_date').eq('id', 1).maybeSingle();
  return (data?.start_date as string | null) ?? null;
}

type DishRecipe = { id: string; name: string; code: string; lines: RecipeLine[]; verified: boolean; hasRecipe: boolean };

async function getDishes(): Promise<{ items: Map<string, DishInfo>; recipes: Map<string, DishRecipe> }> {
  const [{ data: items, error: e1 }, { data: recipes, error: e2 }] = await Promise.all([
    db().from('menu_items').select('id, code, name, category, grams'),
    db().from('dish_recipes').select('menu_item_id, ingredients, verified_at'),
  ]);
  if (e1) throw e1;
  if (e2) throw e2;
  const itemMap = new Map((items ?? []).map((i) => [i.id as string, { ...i, grams: Number(i.grams) } as DishInfo]));
  const byDish = new Map((recipes ?? []).map((r) => [r.menu_item_id as string, r]));
  const out = new Map<string, DishRecipe>();
  for (const it of itemMap.values()) {
    const r = byDish.get(it.id);
    const lines = r ? toRecipe(r as Record<string, unknown>).ingredients : [];
    out.set(it.id, { id: it.id, name: it.name, code: it.code, lines, verified: !!r?.verified_at, hasRecipe: lines.length > 0 });
  }
  return { items: itemMap, recipes: out };
}

// ---------------------------------------------------------------------------
// Portions per dish for a set of days (same counts as the cook sheet)
// ---------------------------------------------------------------------------
const COOKED_STATUSES = ['scheduled', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered'];

type DayPortions = { day: string; closed: boolean; boxes: number; portions: Map<string, number> };

async function deliveryRows(days: string[]): Promise<Map<string, SheetRow[]>> {
  const out = new Map<string, SheetRow[]>(days.map((d) => [d, []]));
  if (!days.length) return out;
  const sorted = [...days].sort();
  type D = { delivery_date: string; slot: SheetRow['slot']; diet: SheetRow['diet']; box_size: SheetRow['box_size']; is_egg_free: boolean; skip_legume: boolean; double_main: boolean; is_make_up: boolean };
  const all: D[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await db().from('deliveries')
      .select('delivery_date, slot, diet, box_size, is_egg_free, skip_legume, double_main, is_make_up')
      .gte('delivery_date', sorted[0]).lte('delivery_date', sorted[sorted.length - 1])
      .in('status', COOKED_STATUSES)
      .order('id').range(from, from + 999);
    if (error) throw error;
    all.push(...((data ?? []) as D[]));
    if (!data || data.length < 1000) break;
  }
  const groups = new Map<string, SheetRow>();
  for (const d of all) {
    if (!out.has(d.delivery_date)) continue;
    const k = `${d.delivery_date}|${d.slot}|${d.diet}|${d.box_size}`;
    const g = groups.get(k) ?? { slot: d.slot, diet: d.diet, box_size: d.box_size ?? 'regular', total: 0, egg_free: 0, skip_legume: 0, double_main: 0, make_up: 0 };
    g.total += 1;
    if (d.is_egg_free) g.egg_free += 1;
    if (d.skip_legume) g.skip_legume += 1;
    if (d.double_main) g.double_main += 1;
    if (d.is_make_up) g.make_up += 1;
    groups.set(k, g);
  }
  for (const [k, g] of groups) out.get(k.split('|')[0])!.push(g);
  return out;
}

async function portionsForDays(days: string[], items: Map<string, DishInfo>): Promise<Map<string, DayPortions>> {
  const rowsByDay = await deliveryRows(days);
  const results = await Promise.all(days.map(async (day) => {
    const [spareRes, ...menus] = await Promise.all([
      db().rpc('same_day_status', { p_date: day }),
      ...COMBOS.map(([diet, slot]) => db().rpc('get_menu_for_date', { p_date: day, p_diet: diet, p_slot: slot })),
    ]);
    const menuRows = menus.map((m) => ((m.data as DayMenu[] | null) ?? [])[0]);
    const closed = menuRows.every((m) => !m || m.is_closed);
    const spares = (spareRes.error ? [] : spareRes.data ?? []) as Spare[];
    const rows = rowsByDay.get(day) ?? [];
    const { portions } = countDishPortions(rows, menuRows, items, spares);
    const full = new Map([...portions].map(([id, p]) => [id, p.full + p.liteEq]));
    return { day, closed, boxes: rows.reduce((s, r) => s + r.total, 0), portions: full } satisfies DayPortions;
  }));
  return new Map(results.map((r) => [r.day, r]));
}

// ---------------------------------------------------------------------------
// Recipes → ingredient usage
// ---------------------------------------------------------------------------
export type UsageIssues = {
  unlinked: Map<string, Set<string>>;      // recipe name → dish names
  mismatched: Map<string, Set<string>>;    // "Green chilli (g vs pcs)" → dish names
  noRecipe: Set<string>;                   // dishes cooked with no ingredients written down
  unverified: Set<string>;                 // dishes not yet checked with mum
};
const emptyIssues = (): UsageIssues => ({ unlinked: new Map(), mismatched: new Map(), noRecipe: new Set(), unverified: new Set() });
const addTo = (m: Map<string, Set<string>>, k: string, v: string) => m.set(k, (m.get(k) ?? new Set()).add(v));

function usageFor(
  portions: Map<string, number>, recipes: Map<string, DishRecipe>, aliases: Map<string, string | null>,
  ingredients: Map<string, StockIngredient>, issues: UsageIssues,
): Map<string, number> {
  const usage = new Map<string, number>();
  for (const [dishId, count] of portions) {
    if (count <= 0) continue;
    const dish = recipes.get(dishId);
    if (!dish) continue;
    if (!dish.hasRecipe) issues.noRecipe.add(dish.name);
    if (!dish.verified) issues.unverified.add(dish.name);
    for (const line of dish.lines) {
      const key = nameKey(line.name);
      if (!aliases.has(key)) { addTo(issues.unlinked, line.name, dish.name); continue; }
      const ingId = aliases.get(key);
      if (!ingId) continue; // not tracked (water)
      const ing = ingredients.get(ingId);
      if (!ing) continue;
      const per = recipeToBase(line.qty, line.unit, ing.unit);
      if (per === null) { addTo(issues.mismatched, `${line.name} (${line.unit} in recipe, ${ing.unit} in stock)`, dish.name); continue; }
      usage.set(ingId, (usage.get(ingId) ?? 0) + per * count);
    }
  }
  return usage;
}

// ---------------------------------------------------------------------------
// 9 PM usage
// ---------------------------------------------------------------------------
/** Last cooking day whose 9 PM lock has happened: today, or tomorrow's run after 9 PM. */
export async function lockedThrough(): Promise<string> {
  const today = todayIst();
  return istHour() >= 21 ? getNextOperatingDay(today) : today;
}

/** Takes one day's usage off stock. Returns false when it was already posted. */
export async function postUsage(day: string, replace = false): Promise<{ posted: boolean; boxes: number; lines: number }> {
  const [{ items, recipes }, aliases, ingredients] = await Promise.all([getDishes(), getAliases(), getIngredients()]);
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const p = (await portionsForDays([day], items)).get(day)!;
  const usage = usageFor(p.portions, recipes, aliases, byId, emptyIssues());
  const lines = [...usage].filter(([, q]) => q > 0).map(([ingredient_id, qty]) => ({ ingredient_id, qty: Math.round(qty * 1000) / 1000 }));
  const { data, error } = await sdb().rpc('post_usage', { p_day: day, p_lines: lines, p_boxes: p.boxes, p_replace: replace });
  if (error) throw error;
  return { posted: !!data, boxes: p.boxes, lines: lines.length };
}

/**
 * Posts every locked day not posted yet (from the opening count, at most 14
 * days back). Run by the 21:05 cron and by every stock page, so a missed cron
 * fixes itself.
 */
export async function catchUpUsage(): Promise<string[]> {
  const start = await getStartDate();
  if (!start) return [];
  const until = await lockedThrough();
  let from = addDays(todayIst(), -14);
  if (start > from) from = start;
  if (from > until) return [];
  const { data, error } = await sdb().from('usage_days').select('day').gte('day', from).lte('day', until);
  if (error) throw error;
  const done = new Set((data ?? []).map((r) => r.day as string));
  const posted: string[] = [];
  for (let d = from; d <= until; d = addDays(d, 1)) {
    if (done.has(d)) continue;
    const r = await postUsage(d);
    if (r.posted) posted.push(d);
  }
  return posted;
}

// ---------------------------------------------------------------------------
// Buy list
// ---------------------------------------------------------------------------
export type BuyLine = {
  ing: StockIngredient;
  need: number;          // fresh: for the day; pantry: next LOW_DAYS cooking days
  avail: number;         // in the kitchen before the day's cooking
  buy: number;           // base units to buy (0 = nothing)
  packs: number | null;  // pantry: whole packs
  daysLeft: number | null;
  urgent: boolean;       // not enough even for the day itself
  flagged: boolean;      // "running low" tapped in the kitchen
};
export type BuyList = {
  day: string; boxes: number; closed: boolean; started: boolean; posted: boolean;
  coverDays: string[];
  fresh: BuyLine[]; pantry: BuyLine[]; pantryOk: BuyLine[];
  issues: UsageIssues;
};

export async function buildBuyList(day: string): Promise<BuyList> {
  const today = todayIst();
  const [{ items, recipes }, aliases, ingredients, onHand, start] = await Promise.all([
    getDishes(), getAliases(), getIngredients(), getOnHand(), getStartDate(),
  ]);
  const byId = new Map(ingredients.map((i) => [i.id, i]));

  // The day itself + the next cooking days, LOW_DAYS in all.
  const coverDays = [day];
  while (coverDays.length < LOW_DAYS) coverDays.push(await getNextOperatingDay(coverDays[coverDays.length - 1]));
  // Cooking days between today and the chosen day: their usage comes first.
  const before: string[] = [];
  for (let d = today; d < day; d = addDays(d, 1)) before.push(d);

  const allDays = [...new Set([...before, ...coverDays])];
  const [portions, usageDays, recent] = await Promise.all([
    portionsForDays(allDays, items),
    sdb().from('usage_days').select('day').in('day', allDays),
    sdb().from('usage_days').select('day, boxes, lines').gte('day', addDays(today, -14)).lt('day', today),
  ]);
  if (usageDays.error) throw usageDays.error;
  const posted = new Set((usageDays.data ?? []).map((r) => r.day as string));

  const issues = emptyIssues();
  const usageOf = new Map<string, Map<string, number>>();
  for (const d of allDays) {
    const p = portions.get(d)!;
    usageOf.set(d, usageFor(p.portions, recipes, aliases, byId, d === day ? issues : emptyIssues()));
  }
  // Posted usage is already off stock; add it back for days not cooked yet so
  // "avail" is what the kitchen has before the chosen day.
  const postedAhead = [...posted].filter((d) => d >= day);
  const { data: postedMoves, error: pmErr } = postedAhead.length
    ? await sdb().from('moves').select('ingredient_id, qty, move_date').eq('kind', 'usage').in('move_date', postedAhead)
    : { data: [], error: null };
  if (pmErr) throw pmErr;
  const addBack = new Map<string, number>();
  for (const m of postedMoves ?? []) addBack.set(m.ingredient_id, (addBack.get(m.ingredient_id) ?? 0) - Number(m.qty));

  // Average use per cooking day over the last two weeks: a floor for the
  // 5-day need, because future days fill up as people order.
  const avg = new Map<string, number>();
  const cookedDays = (recent.data ?? []).filter((r) => r.boxes > 0);
  for (const r of cookedDays) for (const l of (r.lines as { ingredient_id: string; qty: number }[]) ?? []) {
    avg.set(l.ingredient_id, (avg.get(l.ingredient_id) ?? 0) + Number(l.qty) / cookedDays.length);
  }

  const fresh: BuyLine[] = [];
  const pantry: BuyLine[] = [];
  const pantryOk: BuyLine[] = [];
  for (const ing of ingredients) {
    if (!ing.is_active) continue;
    // Days between today and the chosen day that are not posted yet still use stock first.
    const ahead = before.filter((d) => !posted.has(d) && (!start || d >= start))
      .reduce((s, d) => s + (usageOf.get(d)?.get(ing.id) ?? 0), 0);
    const avail = (onHand.get(ing.id) ?? 0) + (addBack.get(ing.id) ?? 0) - ahead;
    const dayNeed = usageOf.get(day)?.get(ing.id) ?? 0;
    const flagged = !!ing.low_flag_at;

    if (ing.kind === 'fresh') {
      if (dayNeed <= 0) continue;
      const short = dayNeed * (1 + BUY_BUFFER) - Math.max(avail, 0);
      fresh.push({ ing, need: dayNeed, avail, buy: roundUpToBuy(short, ing.unit), packs: null, daysLeft: null, urgent: false, flagged });
      continue;
    }

    const forecast = coverDays.reduce((s, d) => s + (usageOf.get(d)?.get(ing.id) ?? 0), 0);
    const daily = Math.max(forecast / LOW_DAYS, avg.get(ing.id) ?? 0);
    const need = Math.max(forecast, daily * LOW_DAYS);
    const target = need + (ing.min_stock ?? 0);
    const daysLeft = daily > 0 ? Math.max(avail, 0) / daily : null;
    const low = avail < target || flagged;
    let buy = 0;
    let packs: number | null = null;
    if (low) {
      const short = Math.max(target - avail, 0);
      if (ing.pack_size) {
        packs = Math.max(1, Math.ceil(short / ing.pack_size));
        buy = packs * ing.pack_size;
      } else {
        buy = roundUpToBuy(Math.max(short, 1), ing.unit);
      }
    }
    const line = { ing, need, avail, buy, packs, daysLeft, urgent: avail < dayNeed, flagged };
    if (low && (need > 0 || flagged || (ing.min_stock ?? 0) > 0)) pantry.push(line);
    else if (need > 0) pantryOk.push(line);
  }
  const order = (a: BuyLine, b: BuyLine) => a.ing.category.localeCompare(b.ing.category) || a.ing.name.localeCompare(b.ing.name);
  fresh.sort(order);
  pantry.sort((a, b) => Number(b.urgent) - Number(a.urgent) || (a.daysLeft ?? 99) - (b.daysLeft ?? 99));
  pantryOk.sort((a, b) => (a.daysLeft ?? 99) - (b.daysLeft ?? 99));

  const p = portions.get(day)!;
  return {
    day, boxes: p.boxes, closed: p.closed, started: !!start, posted: posted.has(day), coverDays,
    fresh, pantry, pantryOk, issues,
  };
}

/** Usage already taken off for days not cooked yet (count corrections leave it out). */
export async function pendingUsage(includeToday: boolean): Promise<Map<string, number>> {
  const today = todayIst();
  let q = sdb().from('moves').select('ingredient_id, qty').eq('kind', 'usage');
  q = includeToday ? q.gte('move_date', today) : q.gt('move_date', today);
  const { data, error } = await q;
  if (error) throw error;
  const out = new Map<string, number>();
  for (const m of data ?? []) out.set(m.ingredient_id, (out.get(m.ingredient_id) ?? 0) - Number(m.qty));
  return out;
}

/** Every distinct ingredient name used in recipes, with its dishes and link. */
export async function recipeNames(): Promise<{ name: string; key: string; dishes: string[]; ingredientId: string | null | undefined }[]> {
  const [{ recipes }, aliases] = await Promise.all([getDishes(), getAliases()]);
  const m = new Map<string, { name: string; dishes: Set<string> }>();
  for (const d of recipes.values()) for (const l of d.lines) {
    const k = nameKey(l.name);
    const e = m.get(k) ?? { name: l.name, dishes: new Set<string>() };
    e.dishes.add(d.code);
    m.set(k, e);
  }
  return [...m].map(([key, e]) => ({ name: e.name, key, dishes: [...e.dishes].sort(), ingredientId: aliases.has(key) ? aliases.get(key) : undefined }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
