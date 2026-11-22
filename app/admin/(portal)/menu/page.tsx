import { cn } from '@/lib/utils';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { addDays, rotationDayNumber, todayIST, weekdayLabel } from '@/lib/menu/rotation';
import { ButtonLink, Card, EmptyState, PageHeader, fmtDate } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { addClosure, addSwap, removeClosure, removeOverride, removeSwap, saveOverride } from './actions';
import { sortSwaps, swapDish } from '@/lib/menu/swaps';

export const metadata = { title: 'Menu calendar' };

const SLOTS = ['lunch', 'dinner'] as const;
const DIETS = [['non_veg', 'Non-veg'], ['veg', 'Veg']] as const;
const PARTS = [['main_id', 'Main'], ['protein_side_id', 'Protein side'], ['legume_id', 'Legume'], ['salad_id', 'Salad'], ['carb_id', 'Carb']] as const;
const CAT_FOR: Record<string, string> = { main_id: 'main', protein_side_id: 'protein_side', legume_id: 'legume', salad_id: 'salad', carb_id: 'carb' };

export default async function MenuCalendarPage({ searchParams }: { searchParams: Promise<{ from?: string }> }) {
  const staff = await requireStaff('menu.read');
  const canWrite = staff.can('menu.write');
  const sp = await searchParams;
  const start = sp.from && /^\d{4}-\d{2}-\d{2}$/.test(sp.from) ? sp.from : todayIST();
  const days = Array.from({ length: 14 }, (_, i) => addDays(start, i));
  const end = days[days.length - 1];

  const supabase = await getSupabaseServer();
  const [rotation, overrides, closures, items, swapRows] = await Promise.all([
    supabase.from('menu_rotation').select('day_number, diet, slot, main_id, protein_side_id, salad_id, legume_id, carb_id'),
    supabase.from('menu_overrides').select('*').gte('menu_date', start).lte('menu_date', end),
    supabase.from('kitchen_closures').select('*').gte('closed_date', todayIST()).order('closed_date'),
    supabase.from('menu_items').select('id, code, name, category, is_veg, is_active').order('code'),
    supabase.from('menu_swaps').select('*').order('effective_from').order('created_at'),
  ]);
  // Before migration 0048 runs the table is missing: treat as no swaps.
  const swaps = swapRows.error ? [] : sortSwaps(swapRows.data ?? []);

  const itemName = new Map((items.data ?? []).map((i) => [i.id, i.name]));
  const rot = new Map((rotation.data ?? []).map((r) => [`${r.day_number}|${r.diet}|${r.slot}`, r]));
  const ovr = new Map((overrides.data ?? []).map((o) => [`${o.menu_date}|${o.diet}|${o.slot}`, o]));
  const closed = new Map((closures.data ?? []).map((c) => [c.closed_date, c]));

  const resolve = (date: string, diet: string, slot: string) => {
    const n = rotationDayNumber(date);
    if (n === null || closed.has(date)) return null;
    const r = rot.get(`${n}|${diet}|${slot}`);
    const o = ovr.get(`${date}|${diet}|${slot}`);
    return {
      n, override: o,
      parts: PARTS.map(([key]) => {
        const base = r?.[key] as string | undefined;
        const swapped = swapDish(base, swaps, date, diet, slot);
        const id = (o?.[key] as string | null) ?? swapped;
        return { key, id, name: id ? itemName.get(id) : undefined, changed: !!o?.[key], swapped: !o?.[key] && swapped !== (base ?? null) };
      }),
    };
  };

  /** The dish the rotation (after swaps) serves for this part, ignoring one-date changes. */
  const rotationBase = (date: string, diet: string, slot: string, key: string) => {
    const n = rotationDayNumber(date);
    const r = n === null ? undefined : rot.get(`${n}|${diet}|${slot}`);
    return swapDish(r?.[key as keyof typeof r] as string | undefined, swaps, date, diet, slot);
  };

  const optionsFor = (key: string, diet?: string, keepLabel = 'Keep rotation dish') => [
    { value: '', label: keepLabel },
    ...(items.data ?? [])
      .filter((i) => i.category === CAT_FOR[key] && i.is_active && (diet !== 'veg' || i.is_veg))
      .map((i) => ({ value: i.id, label: `${i.code} · ${i.name}` })),
  ];
  const today = todayIST();

  const CAT_LABEL: Record<string, string> = { main: 'Main', protein_side: 'Protein side', legume: 'Legume', salad: 'Salad', carb: 'Carb' };
  const dishOptions = (activeOnly: boolean) => (items.data ?? [])
    .filter((i) => !activeOnly || i.is_active)
    .map((i) => ({ value: i.id, label: `${CAT_LABEL[i.category] ?? i.category} · ${i.code} · ${i.name}${i.is_veg ? '' : ' (non-veg)'}` }));

  const base = adminHref('/menu');
  return (
    <>
      <PageHeader
        title="Menu calendar"
        description="The 30-day rotation from your menu workbook, with any one-off changes. Changes show on the website within a minute."
        actions={
          <>
            <ButtonLink href={`${base}?from=${addDays(start, -14)}`} variant="secondary">← Earlier</ButtonLink>
            <ButtonLink href={`${base}?from=${addDays(start, 14)}`} variant="secondary">Later →</ButtonLink>
            <ButtonLink href={adminHref('/menu/dishes')}>Edit dishes</ButtonLink>
          </>
        }
      />

      <div className="space-y-3 mb-8">
        {days.map((date) => {
          const n = rotationDayNumber(date);
          const closure = closed.get(date);
          return (
            <Card key={date} title={`${weekdayLabel(date)}${n ? ` · rotation day ${n}` : ''}`}>
              {n === null ? <p className="text-sm text-gray-500">Sunday · kitchen closed</p>
                : closure ? <p className="text-sm text-rose-700 font-semibold">Closed: {closure.reason}</p>
                : (
                  <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
                    {SLOTS.flatMap((slot) => DIETS.map(([diet, label]) => {
                      const m = resolve(date, diet, slot)!;
                      return (
                        <div key={`${slot}-${diet}`} className={cn('rounded-xl border p-3',
                          diet === 'veg' ? 'border-emerald-100 bg-emerald-50/50' : 'border-[#7B3F00]/15 bg-[#7B3F00]/[0.04]')}>
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex justify-between">
                            <span className="inline-flex items-center gap-1.5">
                              <span aria-hidden className={cn('w-1.5 h-1.5 rounded-full', diet === 'veg' ? 'bg-emerald-600' : 'bg-[#7B3F00]')} />
                              {slot} · {label}
                            </span>
                            {m.override && <span className="text-amber-700">changed</span>}
                          </p>
                          <ul className="text-xs space-y-0.5">
                            {m.parts.map((p) => (
                              <li key={p.key} className={p.changed ? 'text-amber-800 font-semibold' : p.swapped ? 'text-sky-800 font-semibold' : 'text-gray-800'}>
                                {p.name ?? '—'}{p.swapped && <span className="font-normal text-sky-700"> · swapped</span>}
                              </li>
                            ))}
                          </ul>
                          {canWrite && date >= today && (
                            <details className="mt-2 group">
                              <summary className="list-none cursor-pointer inline-flex items-center rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs font-bold text-gray-700 hover:border-primary hover:text-primary [&::-webkit-details-marker]:hidden">
                                <span className="group-open:hidden">Edit</span><span className="hidden group-open:inline">Close</span>
                              </summary>
                              <ActionForm action={saveOverride} className="mt-2 space-y-2">
                                <input type="hidden" name="menu_date" value={date} />
                                <input type="hidden" name="diet" value={diet} />
                                <input type="hidden" name="slot" value={slot} />
                                {m.parts.map((p, i) => {
                                  const [key, partLabel] = PARTS[i];
                                  const baseName = itemName.get(rotationBase(date, diet, slot, key) ?? '') ?? '—';
                                  return (
                                    <label key={key} className="block">
                                      <span className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-0.5">{partLabel}</span>
                                      <Select name={key} defaultValue={(m.override?.[key] as string | null) ?? ''}
                                        className="!py-1.5 !text-xs" options={optionsFor(key, diet, `Keep · ${baseName}`)} />
                                    </label>
                                  );
                                })}
                                <Input name="reason" maxLength={300} placeholder="Reason (internal)" defaultValue={m.override?.reason ?? ''} className="!py-1.5 !text-xs" />
                                <SubmitButton pendingText="Saving…">Save</SubmitButton>
                              </ActionForm>
                            </details>
                          )}
                          {m.override && canWrite && (
                            <ActionForm action={removeOverride} className="mt-2">
                              <input type="hidden" name="id" value={m.override.id} />
                              <SubmitButton variant="secondary" pendingText="…" confirm={{ eyebrow: 'Undo change', title: 'Undo this menu change?', message: 'The meal goes back to the 30-day menu’s dish.', confirmLabel: 'Undo change' }}>Undo change</SubmitButton>
                            </ActionForm>
                          )}
                        </div>
                      );
                    }))}
                  </div>
                )}
            </Card>
          );
        })}
      </div>

      {canWrite && (
        <Card title="Replace a dish from a date" className="mb-4">
          <p className="text-xs text-gray-500 mb-3">
            From the start date on, the new dish is served wherever the 30-day menu has the old one. The 30-day menu itself is not changed,
            so removing the swap brings the old dish back. One-date changes still win, and meals already locked for tomorrow keep the old dish.
          </p>
          <ActionForm action={addSwap} className="space-y-3" resetOnSuccess>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Take out"><Select name="old_item_id" required options={[{ value: '', label: 'Pick a dish…' }, ...dishOptions(false)]} /></Field>
              <Field label="Bring in" hint="Same group as the old dish"><Select name="new_item_id" required options={[{ value: '', label: 'Pick a dish…' }, ...dishOptions(true)]} /></Field>
            </div>
            <div className="grid sm:grid-cols-3 gap-3">
              <Field label="Starting"><Input type="date" name="effective_from" required min={todayIST()} defaultValue={addDays(todayIST(), 2)} /></Field>
              <Field label="Which boxes"><Select name="diet" options={[{ value: '', label: 'Veg and non-veg' }, { value: 'non_veg', label: 'Non-veg only' }, { value: 'veg', label: 'Veg only' }]} /></Field>
              <Field label="Which meals"><Select name="slot" options={[{ value: '', label: 'Lunch and dinner' }, { value: 'lunch', label: 'Lunch only' }, { value: 'dinner', label: 'Dinner only' }]} /></Field>
            </div>
            <Field label="Note (internal)"><Input name="note" maxLength={300} placeholder="e.g. customers asked for more sprouts" /></Field>
            <SubmitButton>Save swap</SubmitButton>
          </ActionForm>
          {swaps.length > 0 && (
            <ul className="mt-5 divide-y divide-gray-100 border-t border-gray-100">
              {swaps.map((sw) => (
                <li key={sw.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                  <span>
                    From <b>{fmtDate(sw.effective_from)}</b>: {itemName.get(sw.old_item_id) ?? '?'} → <b>{itemName.get(sw.new_item_id) ?? '?'}</b>
                    <span className="text-xs text-gray-500">
                      {' '}· {sw.diet ? (sw.diet === 'veg' ? 'veg' : 'non-veg') : 'both diets'} · {sw.slot ?? 'lunch and dinner'}{sw.note ? ` · ${sw.note}` : ''}
                    </span>
                  </span>
                  <ActionForm action={removeSwap}>
                    <input type="hidden" name="id" value={sw.id} />
                    <SubmitButton variant="secondary" pendingText="…" confirm={{ eyebrow: 'Remove swap', tone: 'danger', title: 'Remove this swap?', message: 'Meals not yet locked go back to the 30-day menu’s dish.', confirmLabel: 'Remove', cancelLabel: 'Keep it' }}>Remove</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {canWrite && (
        <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4">
          <Card title="Change a dish for one date" className="lg:col-span-2">
            <ActionForm action={saveOverride} className="space-y-3">
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Date"><Input type="date" name="menu_date" required min={todayIST()} /></Field>
                <Field label="Diet"><Select name="diet" options={[{ value: 'non_veg', label: 'Non-veg' }, { value: 'veg', label: 'Veg' }]} /></Field>
                <Field label="Slot"><Select name="slot" options={[{ value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }]} /></Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                {PARTS.map(([key, label]) => (
                  <Field key={key} label={label}><Select name={key} options={optionsFor(key)} /></Field>
                ))}
              </div>
              <Field label="Reason (internal)"><Input name="reason" maxLength={300} placeholder="e.g. mackerel unavailable" /></Field>
              <SubmitButton>Save change</SubmitButton>
            </ActionForm>
          </Card>

          <Card title="Holidays & closures">
            <ActionForm action={addClosure} className="space-y-3" resetOnSuccess>
              <Field label="Date"><Input type="date" name="closed_date" required min={todayIST()} /></Field>
              <Field label="Reason"><Input name="reason" required maxLength={200} placeholder="e.g. Pongal" /></Field>
              <SubmitButton variant="secondary">Add closure</SubmitButton>
            </ActionForm>
            <ul className="mt-4 space-y-2">
              {(closures.data ?? []).length === 0 && <EmptyState title="No upcoming closures" />}
              {(closures.data ?? []).map((c) => (
                <li key={c.id} className="flex items-center justify-between max-sm:gap-3 text-sm">
                  <span>{fmtDate(c.closed_date)} · {c.reason}</span>
                  <ActionForm action={removeClosure}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="secondary" pendingText="…" confirm={{ eyebrow: 'Remove closure', tone: 'danger', title: 'Remove this closure?', message: 'Customers can book meals for that day again.', confirmLabel: 'Remove', cancelLabel: 'Keep it' }}>Remove</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      <p className="mt-6 text-xs text-gray-500">
        To bring a new dish in for good, use “Replace a dish from a date” above.{' '}
        <Link href={adminHref('/menu/dishes')} className="text-primary font-bold">Dish details and photos →</Link>
      </p>
    </>
  );
}
