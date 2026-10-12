import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { addDays, rotationDayNumber, todayIST, weekdayLabel } from '@/lib/menu/rotation';
import { ButtonLink, Card, EmptyState, PageHeader, fmtDate } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { addClosure, removeClosure, removeOverride, saveOverride } from './actions';

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
  const [rotation, overrides, closures, items] = await Promise.all([
    supabase.from('menu_rotation').select('day_number, diet, slot, main_id, protein_side_id, salad_id, legume_id, carb_id'),
    supabase.from('menu_overrides').select('*').gte('menu_date', start).lte('menu_date', end),
    supabase.from('kitchen_closures').select('*').gte('closed_date', todayIST()).order('closed_date'),
    supabase.from('menu_items').select('id, code, name, category, is_veg, is_active').order('code'),
  ]);

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
        const id = (o?.[key] as string | null) ?? (r?.[key] as string | undefined);
        return { key, id, name: id ? itemName.get(id) : undefined, changed: !!o?.[key] };
      }),
    };
  };

  const optionsFor = (key: string) => [
    { value: '', label: 'Keep rotation dish' },
    ...(items.data ?? []).filter((i) => i.category === CAT_FOR[key] && i.is_active).map((i) => ({ value: i.id, label: `${i.code} · ${i.name}` })),
  ];

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
                        <div key={`${slot}-${diet}`} className="rounded-xl border border-gray-100 bg-gray-50/60 p-3">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1.5 flex justify-between">
                            <span>{slot} · {label}</span>
                            {m.override && <span className="text-amber-700">changed</span>}
                          </p>
                          <ul className="text-xs space-y-0.5">
                            {m.parts.map((p) => (
                              <li key={p.key} className={p.changed ? 'text-amber-800 font-semibold' : 'text-gray-800'}>{p.name ?? '—'}</li>
                            ))}
                          </ul>
                          {m.override && canWrite && (
                            <ActionForm action={removeOverride} className="mt-2">
                              <input type="hidden" name="id" value={m.override.id} />
                              <SubmitButton variant="secondary" pendingText="…">Undo change</SubmitButton>
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
        <div className="grid lg:grid-cols-3 gap-4">
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
                <li key={c.id} className="flex items-center justify-between text-sm">
                  <span>{fmtDate(c.closed_date)} · {c.reason}</span>
                  <ActionForm action={removeClosure}>
                    <input type="hidden" name="id" value={c.id} />
                    <SubmitButton variant="secondary" pendingText="…" confirm="Remove this closure?">Remove</SubmitButton>
                  </ActionForm>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      )}
      <p className="mt-6 text-xs text-gray-500">
        To change the 30-day rotation itself, edit the menu workbook and re-run <code>scripts/seed/build_seed.py</code>, or ask a developer.{' '}
        <Link href={adminHref('/menu/dishes')} className="text-primary font-bold">Dish details and photos →</Link>
      </p>
    </>
  );
}
