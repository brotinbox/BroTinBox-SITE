const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'lib', 'menu-engine.ts');
let code = fs.readFileSync(filePath, 'utf-8');

// 1. Replace catalog pools
const catalogPoolsReplacement = `// ==========================================
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
`;

// Replace from "// ==========================================\n// ITEM CATALOG POOLS" to end of CARBS
const poolStartMarker = '// ==========================================\n// ITEM CATALOG POOLS (BroTin Box Standard Portions)';
const poolEndMarker = 'export const PRICING = {';

const startIndex = code.indexOf(poolStartMarker);
const endIndex = code.indexOf(poolEndMarker);

if (startIndex === -1 || endIndex === -1) {
  console.error('Could not find markers for catalog pools', { startIndex, endIndex });
  process.exit(1);
}

// Find the pricing block header
const pricingHeader = '// ==========================================\n// PRICING MATRIX';
const pricingHeaderIndex = code.lastIndexOf(pricingHeader, endIndex);

code = code.substring(0, startIndex) + catalogPoolsReplacement + '\n' + code.substring(pricingHeaderIndex !== -1 ? pricingHeaderIndex : endIndex);

// 2. Update getOperatingDayInfo to include dayNumber30 and cycle
code = code.replace(
  `  return {
    isClosed: false,
    dayOfWeek: dayAbbrs[operatingDayInWeek],
    dayName: dayNames[operatingDayInWeek],
    operatingDayIndex,
    operatingDayInWeek,
    weekNumber: getISOWeekNumber(d),
    chickenDayCounter,
  };`,
  `  const dayNumber30 = (Math.abs(operatingDayIndex) % 30) + 1;
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
  };`
);

// 3. Update getMenuForDate implementation
const getMenuStart = 'export function getMenuForDate(dateInput: Date | string, diet: DietType = \'non-veg\'): DailyMenuResult {';
const getEarliestStart = 'export function getEarliestBookableDate(nowInput?: Date) {';

const getMenuIdx = code.indexOf(getMenuStart);
const getEarliestIdx = code.indexOf(getEarliestStart);

if (getMenuIdx === -1 || getEarliestIdx === -1) {
  console.error('Could not find markers for getMenuForDate', { getMenuIdx, getEarliestIdx });
  process.exit(1);
}

const newGetMenuForDateCode = `export function getMenuForDate(dateInput: Date | string, diet: DietType = 'non-veg'): DailyMenuResult {
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

`;

code = code.substring(0, getMenuIdx) + newGetMenuForDateCode + code.substring(getEarliestIdx);

fs.writeFileSync(filePath, code, 'utf-8');
console.log('Successfully updated lib/menu-engine.ts with 30-Day Master Menu engine');
