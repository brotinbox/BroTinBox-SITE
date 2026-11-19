import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { Card, PageHeader } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { cn } from '@/lib/utils';
import { setCapacity, setSpares } from './actions';

export const metadata = { title: 'Capacity' };

type Slot = 'lunch' | 'dinner';
type Seat = { day: string; slot: Slot; capacity: number; booked: number; held: number; seats_left: number };
type Diet = 'veg' | 'non_veg';
type Spare = { day: string; slot: Slot; diet: Diet; until_time: string; is_open: boolean; spares: number; used: number; held: number; spares_left: number };
const SLOTS: Slot[] = ['lunch', 'dinner'];
const DIETS: Diet[] = ['non_veg', 'veg'];
const dietLabel = (d: Diet) => (d === 'veg' ? 'Veg' : 'Non-veg');
const DAYS = 14;

function addDays(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

export default async function CapacityPage() {
  const staff = await requireStaff('deliveries.read');
  const canWrite = staff.can('menu.write');
  const supabase = await getSupabaseServer();

  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const to = addDays(today, DAYS);
  const [{ data: seatData, error }, { data: rules }, { data: closures }, { data: spareToday, error: spareErr }, { data: spareRules }] = await Promise.all([
    supabase.rpc('slot_availability', { p_from: today, p_to: to }),
    supabase.from('slot_capacity').select('slot, capacity_date, capacity'),
    supabase.from('kitchen_closures').select('closed_date, reason').gte('closed_date', today).lte('closed_date', to),
    supabase.rpc('same_day_status', {}),
    supabase.from('same_day_spares').select('slot, diet, spare_date, spares').order('spare_date'),
  ]);
  const spareRows = (spareToday ?? []) as Spare[];
  const spareDefault = (slot: Slot, diet: Diet) => spareRules?.find((r) => r.slot === slot && r.diet === diet && !r.spare_date)?.spares ?? 0;
  const spareChanges = (spareRules ?? []).filter((r) => r.spare_date && r.spare_date >= today);
  const seats = (seatData ?? []) as Seat[];
  const defaults = Object.fromEntries(SLOTS.map((s) => [s, rules?.find((r) => r.slot === s && !r.capacity_date)?.capacity ?? 10])) as Record<Slot, number>;
  const changed = new Set((rules ?? []).filter((r) => r.capacity_date).map((r) => `${r.capacity_date}:${r.slot}`));
  const closed = new Map((closures ?? []).map((c) => [c.closed_date, c.reason]));

  // Sundays are closed; closures are listed with their reason.
  const days = [...new Set(seats.map((s) => s.day))].filter((d) => new Date(`${d}T12:00:00Z`).getUTCDay() !== 0);
  const seat = (day: string, slot: Slot) => seats.find((s) => s.day === day && s.slot === slot);

  return (
    <>
      <PageHeader
        title="Capacity"
        description="How many boxes the kitchen cooks per lunch and dinner. Only one-off boxes (trial, future-day single box) stop when a slot is full; weekly and monthly plans can always book and may push a slot over. Same-day single boxes come from the spares on the right."
      />

      {error && <p className="mb-4 text-sm font-semibold text-rose-700">Could not load seats: {error.message}. Has migration 0037 been run?</p>}

      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4">
        <Card title={`Next ${DAYS} days`} className="lg:col-span-2" padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100">
                  <th className="px-4 py-2.5 max-sm:px-2.5">Day</th>
                  <th className="px-4 py-2.5 max-sm:px-2.5">Lunch</th>
                  <th className="px-4 py-2.5 max-sm:px-2.5">Dinner</th>
                </tr>
              </thead>
              <tbody>
                {days.map((day) => (
                  <tr key={day} className="border-b border-gray-50 last:border-0 align-top">
                    <td className="px-4 py-3 whitespace-nowrap max-sm:px-2.5 max-sm:whitespace-normal">
                      <p className="font-bold text-gray-900">{dayLabel(day)}</p>
                      {day === today && <p className="text-[11px] text-gray-500">Today</p>}
                      {closed.has(day) && <p className="text-[11px] font-semibold text-rose-700">Closed · {closed.get(day)}</p>}
                    </td>
                    {SLOTS.map((slot) => {
                      const s = seat(day, slot);
                      if (!s) return <td key={slot} className="px-4 py-3 text-gray-400 max-sm:px-2.5">–</td>;
                      return (
                        <td key={slot} className="px-4 py-3 max-sm:px-2.5">
                          <SeatCell s={s} isChanged={changed.has(`${day}:${slot}`)} canWrite={canWrite} />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="px-4 py-3 text-[11px] text-gray-500 border-t border-gray-100">
            Booked = boxes the kitchen will cook (all plans). &ldquo;Holding&rdquo; = unpaid trial orders from the last 15 minutes.
            Green: room for trials · Orange: 3 or fewer left · Red: full, trials closed.
          </p>
        </Card>

        <div className="space-y-4">
          <Card title="Every day">
            <div className="space-y-4">
              {SLOTS.map((slot) => (
                <ActionForm key={slot} action={setCapacity} className="flex items-end gap-2">
                  <input type="hidden" name="slot" value={slot} />
                  <fieldset disabled={!canWrite} className="flex-1">
                    <Field label={slot === 'lunch' ? 'Lunch boxes' : 'Dinner boxes'}>
                      <Input type="number" name="capacity" min={0} max={500} defaultValue={defaults[slot]} required />
                    </Field>
                  </fieldset>
                  {canWrite && <SubmitButton>Save</SubmitButton>}
                </ActionForm>
              ))}
              <p className="text-[11px] text-gray-500">Used for every day that has no change of its own.</p>
            </div>
          </Card>

          <Card title="Same-day spares · today">
            {spareErr ? (
              <p className="text-sm text-rose-700">Could not load spares: {spareErr.message}. Has migration 0052 been run?</p>
            ) : (
              <div className="space-y-2">
                {SLOTS.map((slot) => {
                  const list = spareRows.filter((r) => r.slot === slot);
                  return (
                    <div key={slot} className="rounded-xl border border-gray-100 p-2.5">
                      <p className="text-xs font-bold text-gray-900 capitalize">
                        {slot} <span className="font-normal normal-case text-gray-500">· orders until {list[0]?.until_time} · {list.some((r) => r.is_open) ? 'open now' : 'closed now'}</span>
                      </p>
                      <div className="mt-1 grid grid-cols-2 gap-2">
                        {DIETS.map((diet) => {
                          const r = list.find((x) => x.diet === diet);
                          if (!r) return null;
                          return (
                            <p key={diet} className={cn('text-xs rounded-lg px-2 py-1 border', r.spares_left > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-700')}>
                              <b>{dietLabel(diet)}</b>: {r.used} sold of {r.spares}{r.held > 0 ? ` · ${r.held} paying` : ''} · <b>{r.spares_left} left</b>
                            </p>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <p className="text-[11px] text-gray-500">Spares = extra boxes cooked on top of the 9 PM cook sheet, sold as same-day single boxes. Staff tatkal moves use them too. Cutoff times are in Settings.</p>
              </div>
            )}
          </Card>

          <Card title="Spares every day">
            <div className="space-y-3">
              {SLOTS.map((slot) => DIETS.map((diet) => (
                <ActionForm key={`${slot}-${diet}`} action={setSpares} className="flex items-end gap-2">
                  <input type="hidden" name="slot" value={slot} />
                  <input type="hidden" name="diet" value={diet} />
                  <fieldset disabled={!canWrite} className="flex-1">
                    <Field label={`${slot === 'lunch' ? 'Lunch' : 'Dinner'} · ${dietLabel(diet)}`}>
                      <Input type="number" name="spares" min={0} max={100} defaultValue={spareDefault(slot, diet)} required />
                    </Field>
                  </fieldset>
                  {canWrite && <SubmitButton>Save</SubmitButton>}
                </ActionForm>
              )))}
              <p className="text-[11px] text-gray-500">0 turns same-day off for that run and diet. Change these before 9 PM so the cook sheet shows the right number to prep.</p>
            </div>
          </Card>

          {canWrite && (
            <Card title="Spares for one day">
              <ActionForm action={setSpares} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date"><Input type="date" name="date" min={today} required /></Field>
                  <Field label="Slot">
                    <Select name="slot" options={[{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }]} />
                  </Field>
                  <Field label="Diet">
                    <Select name="diet" options={[{ value: 'non_veg', label: 'Non-veg' }, { value: 'veg', label: 'Veg' }]} />
                  </Field>
                  <Field label="Spare boxes" hint="Blank = every-day number.">
                    <Input type="number" name="spares" min={0} max={100} />
                  </Field>
                </div>
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
              {spareChanges.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-gray-700">
                  {spareChanges.map((r) => (
                    <li key={`${r.spare_date}-${r.slot}-${r.diet}`}>{dayLabel(r.spare_date!)} · {r.slot} · {dietLabel(r.diet as Diet)}: <b>{r.spares}</b></li>
                  ))}
                </ul>
              )}
            </Card>
          )}

          {canWrite && (
            <Card title="Change one day">
              <ActionForm action={setCapacity} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Date"><Input type="date" name="date" min={today} required /></Field>
                  <Field label="Slot">
                    <Select name="slot" options={[{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }]} />
                  </Field>
                </div>
                <Field label="Boxes" hint="Leave blank to go back to the everyday number.">
                  <Input type="number" name="capacity" min={0} max={500} />
                </Field>
                <SubmitButton>Save</SubmitButton>
              </ActionForm>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}

function SeatCell({ s, isChanged, canWrite }: { s: Seat; isChanged: boolean; canWrite: boolean }) {
  const used = s.booked + s.held;
  const tone = used > s.capacity ? 'over' : s.seats_left === 0 ? 'full' : s.seats_left <= 3 ? 'few' : 'ok';
  const styles = {
    ok: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    few: 'bg-orange-50 text-orange-800 border-orange-200',
    full: 'bg-rose-50 text-rose-700 border-rose-200',
    over: 'bg-rose-100 text-rose-800 border-rose-300',
  };
  const btn = 'w-7 h-7 rounded-lg border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 max-sm:flex-wrap max-sm:gap-1.5">
        <span className={cn('inline-flex items-baseline gap-0.5 rounded-lg border px-2 py-1 font-heading font-black tabular-nums', styles[tone])}>
          {s.booked}<span className="text-[11px] font-bold opacity-70">/{s.capacity}</span>
        </span>
        {canWrite && (
          <ActionForm action={setCapacity} className="flex items-center gap-1">
            <input type="hidden" name="slot" value={s.slot} />
            <input type="hidden" name="date" value={s.day} />
            <button type="submit" name="capacity" value={Math.max(0, s.capacity - 1)} disabled={s.capacity <= 0} className={btn} aria-label={`One fewer ${s.slot} box`}>−</button>
            <button type="submit" name="capacity" value={s.capacity + 1} className={btn} aria-label={`One more ${s.slot} box`}>+</button>
            {isChanged && (
              <button type="submit" name="capacity" value="" className="ml-1 text-[11px] font-semibold text-gray-500 underline" title="Back to the everyday number">reset</button>
            )}
          </ActionForm>
        )}
      </div>
      <p className="text-[11px] text-gray-500">
        {tone === 'over' ? `${used - s.capacity} over · trials closed` : tone === 'full' ? 'Full · trials closed' : `${s.seats_left} left for trials`}
        {s.held > 0 && ` · ${s.held} holding`}
        {isChanged && ' · changed'}
      </p>
    </div>
  );
}
