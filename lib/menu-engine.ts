import overridesData from '@/data/overrides.json';
import menu30DayData from '@/data/menu-30day.json';

export type DietType = 'non-veg' | 'veg';
export type Allergen = 'Peanut' | 'Gluten' | 'Dairy' | 'Egg' | 'Soy' | 'Fish';

export interface PortionMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  weightG: number;
}

export interface MenuItem {
  id: string;
  name: string;
  category: 'main' | 'protein-side' | 'salad' | 'legume' | 'carb';
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  allergens: Allergen[];
  description: string;
  image: string;
}

export interface BoxMeal {
  slot: 'lunch' | 'dinner';
  items: {
    main: MenuItem;
    proteinSide: MenuItem;
    salad: MenuItem;
    legume: MenuItem;
    carb: MenuItem;
  };
  itemArray: MenuItem[];
  totals: PortionMacros;
  allergens: Allergen[];
  hasPeanut: boolean;
}

export interface DailyMenuResult {
  date: string; // YYYY-MM-DD
  dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
  dayName: string;
  operatingDayIndex: number;
  dayNumber30?: number;
  cycle?: number;
  isClosed: boolean;
  closedReason?: string;
  diet: DietType;
  dietTag: string;
  lunch: BoxMeal;
  dinner: BoxMeal;
  costs?: { procurement: number; gas: number };
  labVerifiedNote: string;
}


// ==========================================
// LIVE DATA (database): dishes, rotation, per-date overrides, closures.
// Loaded in the browser by <MenuDataSync /> from Supabase; when present it
// replaces the bundled JSON so admin changes appear on every menu view.
// ==========================================

type SlotKey = 'lunch' | 'dinner';
type PartCodes = { main?: string | null; proteinSide?: string | null; salad?: string | null; legume?: string | null; carb?: string | null };
export type LiveMenuData = {
  items: Map<string, MenuItem>;                 // by code (NVM1, CD2…)
  rotation: Map<string, Required<PartCodes>>;   // `${day}|${diet}|${slot}`
  overrides: Map<string, PartCodes>;            // `${date}|${diet}|${slot}`
  closures: Map<string, string>;                // date → reason
};

let liveMenu: LiveMenuData | null = null;
let liveVersion = 0;
const liveListeners = new Set<() => void>();

export function setLiveMenuData(data: LiveMenuData, opts: { silent?: boolean } = {}) {
  liveMenu = data;
  liveVersion += 1;
  if (!opts.silent) notifyLiveMenu();
}
/** Tell subscribed components the live menu changed (call outside render). */
export function notifyLiveMenu() {
  liveListeners.forEach((l) => l());
}
export function subscribeLiveMenu(listener: () => void) {
  liveListeners.add(listener);
  return () => { liveListeners.delete(listener); };
}
export function getLiveMenuVersion() {
  return liveVersion;
}

// ==========================================
// 30-DAY CATALOG & ROTATION CONSTANTS
// ==========================================

export const MENU_30_DAYS = (menu30DayData as any).days;
export const CATALOG_30_DAYS = (menu30DayData as any).catalog;

export const CHICKEN_MAINS: MenuItem[] = Object.values(CATALOG_30_DAYS.mains).filter(
  (m: any) => m.id.startsWith('NVM') && m.id !== 'NVM6'
) as MenuItem[];

export const FISH_MAIN: MenuItem = CATALOG_30_DAYS.mains['NVM6'] as MenuItem;

export const VEG_MAINS: MenuItem[] = Object.values(CATALOG_30_DAYS.mains).filter(
  (m: any) => m.id.startsWith('VM')
) as MenuItem[];

export const PROTEIN_SIDES: Record<DietType, MenuItem> = {
  'non-veg': CATALOG_30_DAYS.proteinSides['NVE'] as MenuItem,
  'veg': CATALOG_30_DAYS.proteinSides['CD2'] as MenuItem, // Mint mixed curd default
};

export const CURD_SIDES: MenuItem[] = Object.values(CATALOG_30_DAYS.proteinSides).filter(
  (c: any) => c.id.startsWith('CD')
) as MenuItem[];

export const SALADS: MenuItem[] = Object.values(CATALOG_30_DAYS.salads) as MenuItem[];
export const LEGUMES: MenuItem[] = Object.values(CATALOG_30_DAYS.legumes) as MenuItem[];
export const CARBS: MenuItem[] = Object.values(CATALOG_30_DAYS.carbs) as MenuItem[];

// ==========================================
// PRICING MATRIX: fallback only. Live prices come from the database
// (pricing_rules, editable in admin) via usePricing(); the server always
// charges the database price. Defaults match the menu workbook › Settings.
// ==========================================

export const PRICING = {
  trial: {
    'non-veg': 309,
    'veg': 279,
  },
  weekly: {
    'non-veg': 289,
    'veg': 259,
  },
  monthly: {
    'non-veg': 279,
    'veg': 249,
  },
  secondMealDiscount: 10, // second meal per day is -₹10
};

// ==========================================
// DATE & OPERATING DAY CALCULATION
// ==========================================

// Anchor date: Monday, Jan 5, 2026 (epoch = week 0, day 0)
const ANCHOR_EPOCH = new Date(Date.UTC(2026, 0, 5, 0, 0, 0));

export function parseDate(d: Date | string): Date {
  if (typeof d === 'string') {
    const parts = d.split('T')[0].split('-');
    if (parts.length === 3) {
      return new Date(Date.UTC(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10), 12, 0, 0));
    }
  }
  return new Date(d);
}

export function formatDateToYMD(d: Date): string {
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getISOWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

/**
 * Calculates the Mon-Sat operating day index since anchor epoch.
 * Sunday returns null since it is not an operating day.
 */
export function getOperatingDayInfo(targetDate: Date) {
  const d = new Date(Date.UTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), 12, 0, 0));
  const dayOfWeekNumber = d.getUTCDay(); // 0 = Sun, 1 = Mon ... 6 = Sat

  if (dayOfWeekNumber === 0) {
    return {
      isClosed: true,
      dayOfWeek: 'Sun' as const,
      dayName: 'Sunday',
      operatingDayIndex: -1,
      operatingDayInWeek: -1,
      weekNumber: getISOWeekNumber(d),
      chickenDayCounter: -1,
    };
  }

  // Operating days are Mon (1) to Sat (6) -> map to 0 to 5
  const operatingDayInWeek = dayOfWeekNumber - 1; // 0..5

  // Total weeks difference from anchor
  const diffDays = Math.floor((d.getTime() - ANCHOR_EPOCH.getTime()) / 86400000);
  const diffWeeks = Math.floor(diffDays / 7);
  const operatingDayIndex = (diffWeeks * 6) + operatingDayInWeek;

  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayAbbrs: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Non-Wed chicken counter: Mon=0, Tue=1, Thu=2, Fri=3, Sat=4. (Wed is fish)
  let chickenDayCounter = 0;
  if (operatingDayInWeek === 0) chickenDayCounter = 0; // Mon
  else if (operatingDayInWeek === 1) chickenDayCounter = 1; // Tue
  else if (operatingDayInWeek === 2) chickenDayCounter = -1; // Wed (Fish)
  else if (operatingDayInWeek === 3) chickenDayCounter = 2; // Thu
  else if (operatingDayInWeek === 4) chickenDayCounter = 3; // Fri
  else if (operatingDayInWeek === 5) chickenDayCounter = 4; // Sat

  const dayNumber30 = (Math.abs(operatingDayIndex) % 30) + 1;
  const cycle = Math.floor((dayNumber30 - 1) / 6) + 1;

  return {
    isClosed: false,
    dayOfWeek: dayAbbrs[operatingDayInWeek],
    dayName: dayNames[operatingDayInWeek],
    operatingDayIndex,
    operatingDayInWeek,
    dayNumber30,
    cycle,
    weekNumber: getISOWeekNumber(d),
    chickenDayCounter,
  };
}

// ==========================================
// PURE FUNCTION: getMenuForDate(date, diet)
// ==========================================

export function getMenuForDate(dateInput: Date | string, diet: DietType = 'non-veg'): DailyMenuResult {
  const dateObj = parseDate(dateInput);
  const dateStr = formatDateToYMD(dateObj);
  const opInfo = getOperatingDayInfo(dateObj);

  const labVerifiedNote = 'All macros are calibrated to the BroTin Box 30-Day Master Menu. Digital kitchen weighed. Lab verification certificate pending batch release.';

  if (opInfo.isClosed) {
    // Sunday default empty meal fallback
    const emptyMeal: BoxMeal = {
      slot: 'lunch',
      items: {
        main: CHICKEN_MAINS[0],
        proteinSide: PROTEIN_SIDES[diet],
        salad: SALADS[0],
        legume: LEGUMES[0],
        carb: CARBS[0],
      },
      itemArray: [CHICKEN_MAINS[0], PROTEIN_SIDES[diet], SALADS[0], LEGUMES[0], CARBS[0]],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0, weightG: 0 },
      allergens: [],
      hasPeanut: false,
    };

    return {
      date: dateStr,
      dayOfWeek: 'Sun',
      dayName: 'Sunday',
      operatingDayIndex: -1,
      dayNumber30: -1,
      cycle: -1,
      isClosed: true,
      closedReason: 'BroTin Box Kitchen is closed on Sundays for deep sanitisation. Delivery operates Monday to Saturday.',
      diet,
      dietTag: diet === 'non-veg' ? 'High-Protein Non-Veg' : 'High-Protein Veg',
      lunch: emptyMeal,
      dinner: { ...emptyMeal, slot: 'dinner' },
      labVerifiedNote,
    };
  }

  const dayNumber30 = (opInfo as any).dayNumber30 || (Math.abs(opInfo.operatingDayIndex) % 30) + 1;

  if (liveMenu) {
    const live = liveMenu;
    const dbDiet = diet === 'veg' ? 'veg' : 'non_veg';
    const closure = live.closures.get(dateStr);
    const build = (slot: SlotKey) => {
      const base = live.rotation.get(`${dayNumber30}|${dbDiet}|${slot}`);
      const ovr = live.overrides.get(`${dateStr}|${dbDiet}|${slot}`);
      const pick = (k: keyof PartCodes) => live.items.get((ovr?.[k] ?? base?.[k]) as string);
      const items = { main: pick('main'), proteinSide: pick('proteinSide'), salad: pick('salad'), legume: pick('legume'), carb: pick('carb') };
      if (!items.main || !items.proteinSide || !items.salad || !items.legume || !items.carb) return null;
      const itemArray = [items.main, items.proteinSide, items.salad, items.legume, items.carb];
      const allergens = Array.from(new Set(itemArray.flatMap((it) => it.allergens ?? []))) as Allergen[];
      const meal: BoxMeal = {
        slot,
        items: items as BoxMeal['items'],
        itemArray,
        totals: {
          calories: Math.round(itemArray.reduce((a, it) => a + (it.calories || 0), 0)),
          protein: Math.round(itemArray.reduce((a, it) => a + (it.protein || 0), 0) * 10) / 10,
          carbs: Math.round(itemArray.reduce((a, it) => a + (it.carbs || 0), 0) * 10) / 10,
          fat: Math.round(itemArray.reduce((a, it) => a + (it.fat || 0), 0) * 10) / 10,
          fiber: Math.round(itemArray.reduce((a, it) => a + (it.fiber || 0), 0) * 10) / 10,
          weightG: itemArray.reduce((a, it) => a + (it.grams || 0), 0),
        },
        allergens,
        hasPeanut: allergens.includes('Peanut'),
      };
      return meal;
    };
    const lunchLive = build('lunch');
    const dinnerLive = build('dinner');
    if (closure && lunchLive) {
      return {
        date: dateStr, dayOfWeek: opInfo.dayOfWeek, dayName: opInfo.dayName, operatingDayIndex: opInfo.operatingDayIndex,
        dayNumber30, cycle: Math.floor((dayNumber30 - 1) / 6) + 1, isClosed: true, closedReason: `Kitchen closed: ${closure}`,
        diet, dietTag: diet === 'non-veg' ? 'High-Protein Non-Veg' : 'High-Protein Veg',
        lunch: { ...lunchLive, totals: { calories: 0, protein: 0, carbs: 0, fat: 0, weightG: 0 } },
        dinner: { ...(dinnerLive ?? lunchLive), slot: 'dinner', totals: { calories: 0, protein: 0, carbs: 0, fat: 0, weightG: 0 } },
        labVerifiedNote,
      };
    }
    if (lunchLive && dinnerLive) {
      return {
        date: dateStr, dayOfWeek: opInfo.dayOfWeek, dayName: opInfo.dayName, operatingDayIndex: opInfo.operatingDayIndex,
        dayNumber30, cycle: Math.floor((dayNumber30 - 1) / 6) + 1, isClosed: false,
        diet, dietTag: diet === 'non-veg' ? 'High-Protein Non-Veg' : 'High-Protein Veg',
        lunch: lunchLive, dinner: dinnerLive, labVerifiedNote,
      };
    }
    // Incomplete live data for this day: fall through to the bundled menu.
  }

  const dayEntry = (menu30DayData as any).days.find((d: any) => d.day === dayNumber30) || (menu30DayData as any).days[0];
  const dayBox = diet === 'non-veg' ? dayEntry.nonVeg : dayEntry.veg;

  let lunchItems = {
    main: dayBox.items.main as MenuItem,
    proteinSide: dayBox.items.proteinSide as MenuItem,
    salad: dayBox.items.salad as MenuItem,
    legume: dayBox.items.legume as MenuItem,
    carb: dayBox.items.carb as MenuItem,
  };

  // Dinner Box (2-meal plans)
  // Rotates salad (+2), legume (+3), carb (+3) for varied lunch vs dinner
  const saladIdx = SALADS.findIndex((s) => s.id === dayBox.items.salad.id);
  const legumeIdx = LEGUMES.findIndex((l) => l.id === dayBox.items.legume.id);
  const carbIdx = CARBS.findIndex((c) => c.id === dayBox.items.carb.id);

  const dinnerSaladIdx = saladIdx >= 0 ? (saladIdx + 2) % SALADS.length : 0;
  const dinnerLegumeIdx = legumeIdx >= 0 ? (legumeIdx + 3) % LEGUMES.length : 0;
  const dinnerCarbIdx = carbIdx >= 0 ? (carbIdx + 3) % CARBS.length : 0;

  let dinnerItems = {
    main: dayBox.items.main as MenuItem,
    proteinSide: dayBox.items.proteinSide as MenuItem,
    salad: SALADS[dinnerSaladIdx],
    legume: LEGUMES[dinnerLegumeIdx],
    carb: CARBS[dinnerCarbIdx],
  };

  // Check Admin Overrides map from /data/overrides.json
  const overrides = (overridesData as any)?.overrides || {};
  if (overrides[dateStr]) {
    const override = overrides[dateStr];
    const allMains = [...CHICKEN_MAINS, FISH_MAIN, ...VEG_MAINS];
    if (override.lunchMainId) {
      const match = allMains.find((m) => m.id === override.lunchMainId);
      if (match) lunchItems.main = match;
    }
    if (override.lunchSaladId) {
      const match = SALADS.find((s) => s.id === override.lunchSaladId);
      if (match) lunchItems.salad = match;
    }
    if (override.lunchLegumeId) {
      const match = LEGUMES.find((l) => l.id === override.lunchLegumeId);
      if (match) lunchItems.legume = match;
    }
    if (override.lunchCarbId) {
      const match = CARBS.find((c) => c.id === override.lunchCarbId);
      if (match) lunchItems.carb = match;
    }

    if (override.dinnerMainId) {
      const match = allMains.find((m) => m.id === override.dinnerMainId);
      if (match) dinnerItems.main = match;
    }
    if (override.dinnerSaladId) {
      const match = SALADS.find((s) => s.id === override.dinnerSaladId);
      if (match) dinnerItems.salad = match;
    }
    if (override.dinnerLegumeId) {
      const match = LEGUMES.find((l) => l.id === override.dinnerLegumeId);
      if (match) dinnerItems.legume = match;
    }
    if (override.dinnerCarbId) {
      const match = CARBS.find((c) => c.id === override.dinnerCarbId);
      if (match) dinnerItems.carb = match;
    }
  }

  // Calculate totals and allergens helper
  const computeMeal = (slot: 'lunch' | 'dinner', items: typeof lunchItems): BoxMeal => {
    const itemArray = [items.main, items.proteinSide, items.salad, items.legume, items.carb];
    
    // For standard unoverridden lunch, ground in exact official 30-day sheet totals
    const isStandardLunch = slot === 'lunch' && !overrides[dateStr];
    const totals: PortionMacros = isStandardLunch && dayBox.totals ? {
      calories: dayBox.totals.calories,
      protein: dayBox.totals.protein,
      carbs: dayBox.totals.carbs,
      fat: dayBox.totals.fat,
      weightG: dayBox.totals.weightG,
    } : {
      calories: Math.round(itemArray.reduce((acc, it) => acc + (it.calories || 0), 0)),
      protein: Math.round(itemArray.reduce((acc, it) => acc + (it.protein || 0), 0) * 10) / 10,
      carbs: Math.round(itemArray.reduce((acc, it) => acc + (it.carbs || 0), 0) * 10) / 10,
      fat: Math.round(itemArray.reduce((acc, it) => acc + (it.fat || 0), 0) * 10) / 10,
      fiber: Math.round(itemArray.reduce((acc, it) => acc + (it.fiber || 0), 0) * 10) / 10,
      weightG: itemArray.reduce((acc, it) => acc + (it.grams || 0), 0),
    };

    const allergenSet = new Set<Allergen>();
    itemArray.forEach((it) => {
      if (it.allergens) {
        it.allergens.forEach((a) => allergenSet.add(a));
      }
    });

    const allergens = Array.from(allergenSet);
    const hasPeanut = allergens.includes('Peanut');

    return {
      slot,
      items,
      itemArray,
      totals,
      allergens,
      hasPeanut,
    };
  };

  const lunch = computeMeal('lunch', lunchItems);
  const dinner = computeMeal('dinner', dinnerItems);

  return {
    date: dateStr,
    dayOfWeek: opInfo.dayOfWeek,
    dayName: opInfo.dayName,
    operatingDayIndex: opInfo.operatingDayIndex,
    dayNumber30,
    cycle: dayEntry.cycle,
    isClosed: false,
    diet,
    dietTag: diet === 'non-veg' ? 'High-Protein Non-Veg' : 'High-Protein Veg',
    lunch,
    dinner,
    costs: dayBox.costs,
    labVerifiedNote,
  };
}

/**
 * Direct lookup for any of the 30 days in the master rotation (1..30)
 */
export function get30DayMenuByDayNumber(dayNumber: number, diet: DietType = 'non-veg') {
  const normDay = ((Math.abs(dayNumber) - 1) % 30) + 1;
  const dayEntry = (menu30DayData as any).days.find((d: any) => d.day === normDay) || (menu30DayData as any).days[0];
  return diet === 'non-veg' ? dayEntry.nonVeg : dayEntry.veg;
}

export function getEarliestBookableDate(nowInput?: Date) {
  // Cutoff is 9:00 PM (21:00) IST previous night
  const now = nowInput || new Date();
  
  // Convert now to local IST representation or work in local time
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const isPast9PM = currentHour > 21 || (currentHour === 21 && currentMinutes >= 0);

  // If before 9PM, tomorrow is the candidate date.
  // If at/after 9PM, day after tomorrow is candidate date.
  const candidate = new Date(now);
  if (isPast9PM) {
    candidate.setDate(candidate.getDate() + 2);
  } else {
    candidate.setDate(candidate.getDate() + 1);
  }

  // If candidate is Sunday, skip to Monday!
  if (candidate.getDay() === 0) {
    candidate.setDate(candidate.getDate() + 1);
  }

  const dateStr = formatDateToYMD(candidate);

  // Compute cutoff time for this bookable date:
  // Cutoff is 9:00 PM on the day immediately preceding the bookable date.
  const cutoffTime = new Date(candidate);
  cutoffTime.setDate(cutoffTime.getDate() - 1);
  cutoffTime.setHours(21, 0, 0, 0);

  // Check if candidate date is tomorrow
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = formatDateToYMD(tomorrow) === dateStr;

  return {
    date: candidate,
    dateStr,
    isTomorrow,
    isCutoffPassed: isPast9PM,
    cutoffTime,
    formatted: candidate.toLocaleDateString('en-IN', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }),
  };
}

export function getNextBookableDays(count = 6, startFromDate?: Date) {
  const earliest = getEarliestBookableDate(startFromDate);
  const days: Array<{
    date: Date;
    dateStr: string;
    dayOfWeek: string;
    dayName: string;
    formatted: string;
    isEarliest: boolean;
  }> = [];

  let cursor = new Date(earliest.date);
  while (days.length < count) {
    if (cursor.getDay() !== 0) {
      // Mon-Sat
      const dateStr = formatDateToYMD(cursor);
      days.push({
        date: new Date(cursor),
        dateStr,
        dayOfWeek: cursor.toLocaleDateString('en-IN', { weekday: 'short' }),
        dayName: cursor.toLocaleDateString('en-IN', { weekday: 'long' }),
        formatted: cursor.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        isEarliest: days.length === 0,
      });
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}

// Next week Mon-Sat days generator
export function getNextWeekOperatingDays(baseDate?: Date) {
  const now = baseDate || new Date();
  // Find upcoming Monday
  const day = now.getDay(); // 0 is Sunday, 1 is Monday ...
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  
  const monday = new Date(now);
  monday.setDate(now.getDate() + daysUntilMonday);

  const days: Array<{
    date: Date;
    dateStr: string;
    dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
    dayName: string;
    formatted: string;
  }> = [];

  const dayAbbrs: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 6; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    days.push({
      date: cur,
      dateStr: formatDateToYMD(cur),
      dayOfWeek: dayAbbrs[i],
      dayName: cur.toLocaleDateString('en-IN', { weekday: 'long' }),
      formatted: cur.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
    });
  }

  return days;
}

// Monthly operating days generator (24 operating days = 4 weeks of Mon-Sat)
export function getMonthlyOperatingDays(baseDate?: Date) {
  const now = baseDate || new Date();
  const day = now.getDay();
  const daysUntilMonday = day === 0 ? 1 : (8 - day);
  
  const startMonday = new Date(now);
  startMonday.setDate(now.getDate() + daysUntilMonday);

  const days: Array<{
    date: Date;
    dateStr: string;
    dayOfWeek: 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat';
    dayName: string;
    formatted: string;
    weekNumber: number;
    weekIndex: number; // 0..3
  }> = [];

  const dayAbbrs: Array<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat'> = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  let cursor = new Date(startMonday);
  let weekIndex = 0;
  let dayInWeekCount = 0;

  while (days.length < 24) {
    if (cursor.getDay() !== 0) {
      days.push({
        date: new Date(cursor),
        dateStr: formatDateToYMD(cursor),
        dayOfWeek: dayAbbrs[dayInWeekCount],
        dayName: cursor.toLocaleDateString('en-IN', { weekday: 'long' }),
        formatted: cursor.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        weekNumber: getISOWeekNumber(cursor),
        weekIndex,
      });
      dayInWeekCount++;
      if (dayInWeekCount === 6) {
        dayInWeekCount = 0;
        weekIndex++;
      }
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return days;
}
