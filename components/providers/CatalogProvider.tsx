'use client';

import { createContext, useContext, useEffect, useRef, useSyncExternalStore, type ReactNode } from 'react';
import {
  PRICING, getLiveMenuVersion, notifyLiveMenu, setLiveMenuData, subscribeLiveMenu,
  type Allergen, type LiveMenuData, type MenuItem,
} from '@/lib/menu-engine';
import bundledFaqs from '@/data/faqs.json';

/**
 * Receives the cached catalog from the server (site layout) and makes it
 * available to client components without any browser → Supabase requests:
 *  - menu: loaded into lib/menu-engine before children render, so even the
 *    server-rendered HTML shows the live menu;
 *  - prices and FAQs: via context (usePricing / useFaqs).
 */
export type CatalogMenu = {
  items: { id: string; code: string; name: string; category: string; grams: number; calories: number; protein: number; carbs: number; fat: number; fiber: number; allergens: string[]; description: string | null; image_url: string | null }[];
  rotation: { day_number: number; diet: string; slot: string; main_id: string; protein_side_id: string; salad_id: string; legume_id: string; carb_id: string }[];
  overrides: { menu_date: string; diet: string; slot: string; main_id: string | null; protein_side_id: string | null; salad_id: string | null; legume_id: string | null; carb_id: string | null }[];
  closures: { closed_date: string; reason: string }[];
  version: string;
};
export type Faq = { id: string; question: string; answer: string };
type Catalog = { pricing: typeof PRICING; faqs: Faq[] };

const CATEGORY: Record<string, MenuItem['category']> = {
  main: 'main', protein_side: 'protein-side', salad: 'salad', legume: 'legume', carb: 'carb',
};

function toLiveMenu(m: CatalogMenu): LiveMenuData {
  const code = new Map(m.items.map((i) => [i.id, i.code]));
  const c = (id: string | null) => (id ? code.get(id) ?? null : null);
  return {
    items: new Map(m.items.map((i) => [i.code, {
      id: i.code, name: i.name, category: CATEGORY[i.category] ?? 'main', grams: i.grams,
      calories: i.calories, protein: i.protein, carbs: i.carbs, fat: i.fat, fiber: i.fiber,
      allergens: i.allergens as Allergen[], description: i.description ?? '', image: i.image_url ?? '',
    } satisfies MenuItem])),
    rotation: new Map(m.rotation.map((r) => [`${r.day_number}|${r.diet}|${r.slot}`, {
      main: c(r.main_id)!, proteinSide: c(r.protein_side_id)!, salad: c(r.salad_id)!, legume: c(r.legume_id)!, carb: c(r.carb_id)!,
    }])),
    overrides: new Map(m.overrides.map((o) => [`${o.menu_date}|${o.diet}|${o.slot}`, {
      main: c(o.main_id), proteinSide: c(o.protein_side_id), salad: c(o.salad_id), legume: c(o.legume_id), carb: c(o.carb_id),
    }])),
    closures: new Map(m.closures.map((x) => [x.closed_date, x.reason])),
  };
}

// The newest snapshot applied in this JS runtime (server process or browser tab).
let appliedVersion = '';

const CatalogContext = createContext<Catalog>({ pricing: PRICING, faqs: bundledFaqs as Faq[] });

export function CatalogProvider({ menu, pricing, faqs, children }: {
  menu: CatalogMenu | null;
  pricing: typeof PRICING;
  faqs: Faq[];
  children: ReactNode;
}) {
  // Apply synchronously during render (not in an effect) so the first paint
  // already uses the live menu. Only newer snapshots replace older ones.
  if (menu && menu.version > appliedVersion) {
    appliedVersion = menu.version;
    setLiveMenuData(toLiveMenu(menu), { silent: true });
  }
  // After a refreshed snapshot arrives (e.g. router.refresh), re-render subscribers.
  useEffect(() => { notifyLiveMenu(); }, [menu?.version]);
  const value = useRef<Catalog>({ pricing, faqs: faqs.length ? faqs : (bundledFaqs as Faq[]) });
  value.current = { pricing, faqs: faqs.length ? faqs : (bundledFaqs as Faq[]) };
  return <CatalogContext.Provider value={value.current}>{children}</CatalogContext.Provider>;
}

/** Live prices (same source the server charges from). */
export function usePricing() {
  return useContext(CatalogContext).pricing;
}

/** Active FAQs from the database (admin › FAQs). */
export function useFaqs(): Faq[] {
  return useContext(CatalogContext).faqs;
}

/** Re-render when the live menu changes; add to useMemo deps that call getMenuForDate. */
export function useMenuVersion() {
  return useSyncExternalStore(subscribeLiveMenu, getLiveMenuVersion, getLiveMenuVersion);
}
