/**
 * Rotation swaps (migration 0048): "from date X, dish A becomes dish B".
 * Same rule as public.get_menu_for_date: apply every swap with
 * effective_from <= date in date order, then one-date overrides win.
 * Works on ids or codes, as long as swaps and parts use the same kind.
 */
export type MenuSwap = {
  effective_from: string;
  old_item_id: string;
  new_item_id: string;
  diet: string | null;
  slot: string | null;
  created_at?: string;
};

export function sortSwaps<T extends MenuSwap>(swaps: T[]): T[] {
  return [...swaps].sort((a, b) =>
    a.effective_from.localeCompare(b.effective_from) || (a.created_at ?? '').localeCompare(b.created_at ?? ''));
}

/** Returns the dish after swaps. `swaps` must already be sorted (sortSwaps). */
export function swapDish(id: string | null | undefined, swaps: MenuSwap[], date: string, diet: string, slot: string) {
  let cur = id ?? null;
  if (!cur) return cur;
  for (const s of swaps) {
    if (s.effective_from > date) break;
    if ((s.diet && s.diet !== diet) || (s.slot && s.slot !== slot)) continue;
    if (cur === s.old_item_id) cur = s.new_item_id;
  }
  return cur;
}
