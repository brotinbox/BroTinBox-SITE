import { Navigation, Phone } from 'lucide-react';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { adminHref } from '@/lib/admin/paths';
import { Card, EmptyState, PageHeader, StatusBadge, fmtDate } from '@/components/admin/ui';
import { DatePicker, isIsoDate } from '@/components/admin/DatePicker';
import { PrintButton } from '@/components/admin/PrintButton';
import { FilterBar } from '@/components/admin/FilterBar';
import { ActionForm, Select, SubmitButton } from '@/components/admin/forms';
import { AutoSortButton, DeliveredButton, LocationEditor, StatusPill, StopMover } from '@/components/admin/DeliveryControls';
import { BRAND } from '@/config/brand';
import { directionsUrl, distanceKm, routeUrls } from '@/lib/deliveries/geo';
import { RUN_EXCLUDED, withRoute } from '@/lib/deliveries/route';
import { bulkUpdate } from './actions';

export const metadata = { title: 'Deliveries' };

const STATUS_OPTIONS = [
  { value: '', label: 'Status: no change' },
  { value: 'preparing', label: 'Preparing' }, { value: 'packed', label: 'Packed' },
  { value: 'out_for_delivery', label: 'Out for delivery' }, { value: 'delivered', label: 'Delivered' }, { value: 'failed', label: 'Failed' },
];

const addressText = (a: any) =>
  [a.flat, a.street, a.landmark, a.area, a.city || 'Coimbatore', a.pincode].filter(Boolean).join(', ');

export default async function DeliveriesPage({ searchParams }: { searchParams: Promise<{ date?: string; slot?: string }> }) {
  const staff = await requireStaff('deliveries.read');
  const sp = await searchParams;
  const supabase = await getSupabaseServer();
  const slot = sp.slot === 'dinner' ? 'dinner' : sp.slot === 'lunch' ? 'lunch' : '';

  let date = sp.date;
  if (!isIsoDate(date)) {
    date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  }

  let query = supabase
    .from('deliveries')
    .select('id, slot, status, diet, is_egg_free, skip_legume, double_main, is_make_up, box_size, address_id, address_snapshot, rider_id, stop_no, delivery_addons(qty, addons(name)), delivery_zones(area, tier)' as '*')
    .eq('delivery_date', date)
    .not('status', 'in', RUN_EXCLUDED);
  if (slot) query = query.eq('slot', slot);
  const [{ data }, scheduled] = await Promise.all([
    query,
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('delivery_date', date).eq('status', 'scheduled'),
  ]);

  const canWrite = staff.can('deliveries.write');
  const { data: riders } = canWrite
    ? await getSupabaseService().from('profiles').select('id, full_name, email').eq('role', 'rider').eq('is_blocked', false)
    : { data: [] };
  const riderName = new Map((riders ?? []).map((r) => [r.id, r.full_name || r.email]));

  // One run per slot, in stop order (saved, else remembered from the last run).
  const rows = await withRoute((data ?? []) as any[], date);
  const runs = (['lunch', 'dinner'] as const)
    .map((s) => ({ slot: s, list: rows.filter((r) => r.slot === s) }))
    .filter((r) => r.list.length > 0);
  const kitchen = BRAND.kitchenLocation;

  return (
    <>
      <PageHeader
        title={`Deliveries · ${fmtDate(date)}`}
        description="Meals appear here after the 9 PM lock. Set the stop order, then follow the route."
        actions={<><DatePicker action={adminHref('/deliveries')} date={date} extra={{ slot }} /><PrintButton /></>}
      />
      <FilterBar action={adminHref('/deliveries')} param="slot" current={slot} extra={{ date }}
        tabs={[{ value: '', label: 'All slots' }, { value: 'lunch', label: 'Lunch' }, { value: 'dinner', label: 'Dinner' }]} />

      {(scheduled.count ?? 0) > 0 && (
        <p className="mb-4 text-xs font-semibold text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
          {scheduled.count} meals for this date are not locked yet (they lock automatically at 9 PM the night before).
        </p>
      )}

      {rows.length === 0 ? (
        <Card><EmptyState title="No deliveries" description="Nothing locked for this date and slot." /></Card>
      ) : (
        <ActionForm action={bulkUpdate} className="space-y-4">
          {canWrite && (
            <div className="sticky top-14 lg:top-0 z-10 bg-gray-50/95 backdrop-blur py-2 flex flex-wrap items-center gap-2 print:hidden">
              <span className="text-xs font-bold text-gray-600">Selected:</span>
              <Select name="status" options={STATUS_OPTIONS} className="w-48" />
              <Select name="rider_id" className="w-48" options={[{ value: '', label: 'Rider: no change' }, ...(riders ?? []).map((r) => ({ value: r.id, label: r.full_name || r.email || 'Rider' }))]} />
              <SubmitButton confirm={{ eyebrow: 'Bulk update', title: 'Apply to all selected deliveries?', message: 'The status and rider change for every ticked delivery.', confirmLabel: 'Apply' }}>Apply</SubmitButton>
            </div>
          )}
          {runs.map(({ slot: s, list }) => {
            const routes = routeUrls(kitchen, list.map((r) => r.pin ?? addressText(r.address_snapshot ?? {})));
            const done = list.filter((r) => r.status === 'delivered').length;
            return (
              <Card
                key={s}
                title={`${s === 'lunch' ? 'Lunch' : 'Dinner'} run · ${list.length} stop${list.length === 1 ? '' : 's'} · ${done} delivered`}
                padded={false}
                actions={
                  <div className="flex flex-wrap gap-2 justify-end print:hidden">
                    {canWrite && list.length > 1 && <AutoSortButton date={date} slot={s} />}
                    {routes.map((u, i) => (
                      <a key={u} href={u} target="_blank" rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 rounded-xl bg-primary text-white px-3 py-1.5 text-xs font-bold hover:bg-primary-hover">
                        <Navigation className="w-3.5 h-3.5" /> {routes.length > 1 ? `Route part ${i + 1}` : 'Open full route'}
                      </a>
                    ))}
                  </div>
                }
              >
                <ul className="divide-y divide-gray-100">
                  {list.map((r, i) => {
                    const a = r.address_snapshot ?? {};
                    const area = r.delivery_zones?.area || a.area;
                    const nav = directionsUrl(r.pin ?? addressText(a));
                    const finished = r.status === 'delivered' || r.status === 'failed';
                    return (
                      <li key={r.id} className={`px-4 py-3 flex gap-3 items-start ${r.status === 'delivered' ? 'bg-emerald-50/40' : ''}`}>
                        <div className="flex flex-col items-center gap-1.5 shrink-0">
                          <span className="w-7 h-7 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center">{i + 1}</span>
                          {canWrite && list.length > 1 && <StopMover id={r.id} date={date} slot={s} first={i === 0} last={i === list.length - 1} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm">{a.recipient_name} · <a href={`tel:${a.phone}`} className="text-primary">{a.phone}</a></p>
                          <p className="text-xs text-gray-600">{addressText(a)}</p>
                          {a.instructions && <p className="text-xs text-gray-500 italic">“{a.instructions}”</p>}
                          <p className="text-xs mt-1">
                            {area && <span className="inline-block mr-1 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-700">{area}</span>}
                            {r.diet === 'veg' ? 'Veg' : 'Non-veg'}
                            {r.box_size === 'lite' && <b className="text-accent"> · LITE</b>}{r.is_egg_free && ' · egg-free'}{r.skip_legume && ' · no legume'}{r.double_main && ' · double main'}{r.is_make_up && ' · make-up'}
                            {(r.delivery_addons ?? []).length > 0 && ` · + ${(r.delivery_addons as any[]).map((x) => `${x.qty}× ${x.addons?.name}`).join(', ')}`}
                          </p>
                          <div className="flex flex-wrap items-start gap-2 mt-2 print:hidden">
                            <a href={nav} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50">
                              <Navigation className="w-3.5 h-3.5" /> Navigate
                              {r.pin && <span className="font-normal text-gray-500">· ~{distanceKm(kitchen, r.pin).toFixed(1)} km</span>}
                            </a>
                            <a href={`tel:${a.phone}`} className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50">
                              <Phone className="w-3.5 h-3.5" /> Call
                            </a>
                            {canWrite && r.address_id && <LocationEditor id={r.id} hasPin={!!r.pin} />}
                            {canWrite && !finished && <DeliveredButton id={r.id} />}
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1.5">
                          {canWrite ? <StatusPill key={r.status} id={r.id} status={r.status} /> : <StatusBadge value={r.status} />}
                          <p className="text-[11px] text-gray-500">{r.rider_id ? riderName.get(r.rider_id) ?? 'Rider' : 'No rider'}</p>
                          {canWrite && <input type="checkbox" name="ids" value={r.id} className="w-4 h-4 print:hidden" aria-label="Select delivery" />}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </ActionForm>
      )}
    </>
  );
}
