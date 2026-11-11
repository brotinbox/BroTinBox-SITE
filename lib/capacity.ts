import 'server-only';
import { getSupabaseService } from '@/lib/supabase/admin';

/**
 * Slot capacity (migration 0037). Every lunch/dinner box on a date takes a
 * seat; only the trial box is refused when a slot is full. Weekly and monthly
 * plans always go through and can push a slot over capacity.
 */

export type Slot = 'lunch' | 'dinner';
export type SlotSeats = { day: string; slot: Slot; capacity: number; booked: number; held: number; seats_left: number };

/** Customers see "N left" from this many seats down; above it, just "available". */
export const FEW_SEATS = 3;

export async function getSlotSeats(from: string, to: string): Promise<SlotSeats[]> {
  const { data, error } = await getSupabaseService().rpc('slot_availability', { p_from: from, p_to: to });
  if (error) throw error;
  return (data ?? []) as SlotSeats[];
}

/** Slots that have no seat left on a date, of the ones asked for. */
export async function fullSlots(date: string, slots: Slot[]): Promise<Slot[]> {
  const rows = await getSlotSeats(date, date);
  return slots.filter((s) => (rows.find((r) => r.slot === s)?.seats_left ?? 1) <= 0);
}

const longDate = (iso: string) =>
  new Date(`${iso}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

export function slotFullMessage(date: string, slots: Slot[]): string {
  const what = slots.length === 2 ? 'Lunch and dinner are' : `${slots[0] === 'dinner' ? 'Dinner' : 'Lunch'} is`;
  return `${what} fully booked on ${longDate(date)}. Please pick another time or day.`;
}
