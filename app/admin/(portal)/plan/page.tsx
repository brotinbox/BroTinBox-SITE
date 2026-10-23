import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, EmptyState, PageHeader, StatCard, StatusBadge, fmtDate } from '@/components/admin/ui';
import { DatePicker, isIsoDate } from '@/components/admin/DatePicker';
import { PrintButton } from '@/components/admin/PrintButton';

export const metadata = { title: 'Day plan' };

type Slot = 'lunch' | 'dinner';
type Diet = 'veg' | 'non_veg';
type MenuRow = { is_closed: boolean; name: string | null; main_id: string | null; protein_side_id: string | null; salad_id: string | null; legume_id: string | null; carb_id: string | null };

const RUNS: { slot: Slot; title: string }[] = [
  { slot: 'lunch', title: 'Morning run · Lunch' },
  { slot: 'dinner', title: 'Evening run · Dinner' },
];
const ACTIVE = ['scheduled', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered', 'failed'] as const;

/**
 * One page for the whole day: what each customer gets in each box, split into
 * the morning (lunch) and evening (dinner) runs, grouped by area. Unlike
 * Deliveries it includes meals not yet locked, so tomorrow can be planned early.
 */
export default async function DayPlanPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const staff = await requireStaff('deliveries.read');
  const sp = await searchParams;
  const supabase = await getSupabaseServer();

  let date = sp.date;
  if (!isIsoDate(date)) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const { data } = await supabase.rpc('next_operating_day', { after_date: today });
    date = (data as string) ?? today;
  }

  const combos = [['non_veg', 'lunch'], ['veg', 'lunch'], ['non_veg', 'dinner'], ['veg', 'dinner']] as const;
  const [{ data: deliveryData }, offCount, pending, ...menus] = await Promise.all([
    supabase
      .from('deliveries')
      .select('id, slot, status, diet, is_egg_free, skip_legume, double_main, is_make_up, address_snapshot, delivery_addons(qty, addons(name)), delivery_zones(area)')
      .eq('delivery_date', date)
      .in('status', ACTIVE),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('delivery_date', date).in('status', ['skipped', 'paused']),
    staff.can('orders.read')
      ? supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['created', 'pending_payment'])
      : Promise.resolve({ count: 0 }),
    ...combos.map(([diet, slot]) => supabase.rpc('get_menu_for_date', { p_date: date, p_diet: diet, p_slot: slot })),
  ]);

  const menuFor = new Map<string, MenuRow>();
  combos.forEach(([diet, slot], i) => {
    const m = (menus[i].data as MenuRow[] | null)?.[0];
    if (m) menuFor.set(`${diet}-${slot}`, m);
  });
  const closed = menuFor.size > 0 && [...menuFor.values()].every((m) => m.is_closed);

  const ids = Array.from(new Set([...menuFor.values()].flatMap((m) => [m.main_id, m.protein_side_id, m.salad_id, m.legume_id, m.carb_id]).filter(Boolean))) as string[];
  const { data: itemData } = ids.length
    ? await supabase.from('menu_items').select('id, code, name').in('id', ids)
    : { data: [] as { id: string; code: string; name: string }[] };
  const items = new Map((itemData ?? []).map((i) => [i.id, i]));
  const name = (id: string | null) => (id ? items.get(id)?.name : undefined);

  // Box contents, mirroring the cook sheet rules (egg-free → extra legume instead of eggs).
  const boxFor = (r: any): string[] => {
    const m = menuFor.get(`${r.diet}-${r.slot}`);
    if (!m) return [];
    const eggSide = items.get(m.protein_side_id ?? '')?.code === 'NVE';
    const out: string[] = [];
    if (m.main_id) out.push(`${r.double_main ? '2× ' : ''}${name(m.main_id)}`);
    if (m.protein_side_id && !(eggSide && r.is_egg_free)) out.push(name(m.protein_side_id)!);
    if (m.legume_id && !r.skip_legume) out.push(`${eggSide && r.is_egg_free ? '2× ' : ''}${name(m.legume_id)}`);
    if (m.salad_id) out.push(name(m.salad_id)!);
    if (m.carb_id) out.push(name(m.carb_id)!);
    return out.filter(Boolean);
  };

  const rows = (deliveryData ?? []) as any[];
  const unlocked = rows.filter((r) => r.status === 'scheduled').length;

  return (
    <>
      <PageHeader
        title={`Day plan · ${fmtDate(date)}`}
        description="Who gets what, run by run. Meals marked “not locked” can still be skipped until 9 PM the night before."
        actions={<><DatePicker action={adminHref('/plan')} date={date} /><PrintButton /></>}
      />

      {closed ? (
        <Card><EmptyState title="Kitchen closed" description="Sunday or a holiday closure. No cooking or deliveries." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Morning boxes (lunch)" value={rows.filter((r) => r.slot === 'lunch').length} />
            <StatCard label="Evening boxes (dinner)" value={rows.filter((r) => r.slot === 'dinner').length} />
            <StatCard label="Not locked yet" value={unlocked} hint={`${offCount.count ?? 0} skipped or paused`} tone={unlocked > 0 ? 'warn' : 'default'} />
            <StatCard label="Payments to confirm" value={pending.count ?? 0} hint="Orders waiting for payment"
              tone={(pending.count ?? 0) > 0 ? 'warn' : 'default'} />
          </div>

          <div className="flex flex-wrap gap-2 mb-6 text-xs font-bold print:hidden">
            <Link href={adminHref(`/cook-sheet?date=${date}`)} className="px-3 py-2 rounded-xl bg-white border border-gray-200">Cook sheet (kg to prep) →</Link>
            <Link href={adminHref(`/deliveries?date=${date}`)} className="px-3 py-2 rounded-xl bg-white border border-gray-200">Deliveries &amp; riders →</Link>
            {staff.can('orders.read') && (
              <Link href={adminHref('/orders?status=pending_payment')} className="px-3 py-2 rounded-xl bg-white border border-gray-200">Confirm payments →</Link>
            )}
          </div>

          <Card title="Menu for the day" className="mb-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
              {combos.map(([diet, slot]) => {
                const m = menuFor.get(`${diet}-${slot}`);
                return (
                  <div key={`${diet}-${slot}`}>
                    <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">
                      <span className="capitalize">{slot}</span> · {diet === 'veg' ? 'Veg' : 'Non-veg'}
                    </p>
                    {m && !m.is_closed ? (
                      <ul className="text-gray-800 space-y-0.5">
                        {[m.main_id, m.protein_side_id, m.legume_id, m.salad_id, m.carb_id].map((id) => id && <li key={id}>{name(id)}</li>)}
                      </ul>
                    ) : <p className="text-gray-400">No menu set</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          {RUNS.map(({ slot, title }) => {
            const list = rows.filter((r) => r.slot === slot);
            const byArea = new Map<string, any[]>();
            list.forEach((r) => {
              const area = r.delivery_zones?.area || r.address_snapshot?.area || 'Unknown area';
              byArea.set(area, [...(byArea.get(area) ?? []), r]);
            });
            return (
              <section key={slot} className="mb-8 break-inside-avoid">
                <h2 className="font-heading font-black text-lg mb-3">{title} · {list.length} boxes</h2>
                {list.length === 0 ? (
                  <Card><EmptyState title="No boxes in this run" /></Card>
                ) : (
                  <div className="space-y-4">
                    {[...byArea.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([area, group]) => (
                      <Card key={area} title={`${area} · ${group.length}`} padded={false}>
                        <ul className="divide-y divide-gray-100">
                          {group.map((r) => {
                            const a = r.address_snapshot ?? {};
                            const addons = (r.delivery_addons ?? []) as { qty: number; addons: { name: string } | null }[];
                            return (
                              <li key={r.id} className="px-4 py-3 flex gap-3 items-start">
                                <div className="flex-1 min-w-0">
                                  <p className="font-semibold text-sm">
                                    {a.recipient_name || 'Customer'} · <a href={`tel:${a.phone}`} className="text-primary">{a.phone}</a>
                                    <span className="ml-2 text-xs font-bold">{r.diet === 'veg' ? 'VEG' : 'NON-VEG'}</span>
                                  </p>
                                  <p className="text-xs text-gray-600">{a.flat}, {a.street}{a.landmark ? `, ${a.landmark}` : ''}, {a.area} {a.pincode}</p>
                                  <p className="text-xs mt-1 text-gray-900">{boxFor(r).join(' · ') || 'Menu not set'}</p>
                                  {(addons.length > 0 || r.is_make_up || r.is_egg_free || r.skip_legume) && (
                                    <p className="text-xs text-gray-500 mt-0.5">
                                      {[r.is_egg_free && 'egg-free', r.skip_legume && 'no legume', r.is_make_up && 'make-up meal',
                                        ...addons.map((x) => `+ ${x.qty}× ${x.addons?.name}`)].filter(Boolean).join(' · ')}
                                    </p>
                                  )}
                                  {a.instructions && <p className="text-xs text-gray-500 italic">“{a.instructions}”</p>}
                                </div>
                                <div className="shrink-0 text-right">
                                  {r.status === 'scheduled' ? <StatusBadge value="scheduled" label="not locked" /> : <StatusBadge value={r.status} />}
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </>
      )}
    </>
  );
}
