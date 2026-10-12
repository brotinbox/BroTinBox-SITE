import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { adminHref } from '@/lib/admin/paths';
import { Card, EmptyState, PageHeader, StatusBadge, fmtDate } from '@/components/admin/ui';
import { DatePicker, isIsoDate } from '@/components/admin/DatePicker';
import { PrintButton } from '@/components/admin/PrintButton';
import { FilterBar } from '@/components/admin/FilterBar';
import { ActionForm, Select, SubmitButton } from '@/components/admin/forms';
import { bulkUpdate } from './actions';

export const metadata = { title: 'Deliveries' };

const STATUS_OPTIONS = [
  { value: '', label: 'Status: no change' },
  { value: 'preparing', label: 'Preparing' }, { value: 'packed', label: 'Packed' },
  { value: 'out_for_delivery', label: 'Out for delivery' }, { value: 'delivered', label: 'Delivered' }, { value: 'failed', label: 'Failed' },
];

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
    .select('id, slot, status, diet, is_egg_free, skip_legume, double_main, is_make_up, address_snapshot, rider_id, delivery_addons(qty, addons(name)), delivery_zones(area, tier)')
    .eq('delivery_date', date)
    .not('status', 'in', '(skipped,paused,cancelled,scheduled)')
    .order('slot');
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

  // Group by delivery area for route planning.
  const rows = (data ?? []) as any[];
  const byArea = new Map<string, any[]>();
  rows.forEach((r) => {
    const area = r.delivery_zones?.area || r.address_snapshot?.area || 'Unknown area';
    byArea.set(area, [...(byArea.get(area) ?? []), r]);
  });

  return (
    <>
      <PageHeader
        title={`Deliveries · ${fmtDate(date)}`}
        description="Meals appear here after the 9 PM lock. Grouped by area for routing."
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
              <SubmitButton>Apply</SubmitButton>
            </div>
          )}
          {[...byArea.entries()].map(([area, list]) => (
            <Card key={area} title={`${area} · ${list.length}`} padded={false}>
              <ul className="divide-y divide-gray-100">
                {list.map((r) => {
                  const a = r.address_snapshot ?? {};
                  return (
                    <li key={r.id} className="px-4 py-3 flex gap-3 items-start">
                      {canWrite && <input type="checkbox" name="ids" value={r.id} className="mt-1 w-4 h-4 print:hidden" aria-label="Select delivery" />}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{a.recipient_name} · <a href={`tel:${a.phone}`} className="text-primary">{a.phone}</a></p>
                        <p className="text-xs text-gray-600">{a.flat}, {a.street}{a.landmark ? `, ${a.landmark}` : ''}, {a.area} {a.pincode}</p>
                        {a.instructions && <p className="text-xs text-gray-500 italic">“{a.instructions}”</p>}
                        <p className="text-xs mt-1">
                          <span className="capitalize font-semibold">{r.slot}</span> · {r.diet === 'veg' ? 'Veg' : 'Non-veg'}
                          {r.is_egg_free && ' · egg-free'}{r.skip_legume && ' · no legume'}{r.double_main && ' · double main'}{r.is_make_up && ' · make-up'}
                          {(r.delivery_addons ?? []).length > 0 && ` · + ${(r.delivery_addons as any[]).map((x) => `${x.qty}× ${x.addons?.name}`).join(', ')}`}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <StatusBadge value={r.status} />
                        <p className="text-[11px] text-gray-500 mt-1">{r.rider_id ? riderName.get(r.rider_id) ?? 'Rider' : 'No rider'}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Card>
          ))}
        </ActionForm>
      )}
    </>
  );
}
