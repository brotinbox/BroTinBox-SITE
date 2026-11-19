import { requireStaff } from '@/lib/auth/session';
import { Card, EmptyState, PageHeader, fmtDate, inr } from '@/components/admin/ui';
import { ActionForm, SubmitButton } from '@/components/admin/forms';
import { BillForm, type BillPrefill } from '@/components/admin/stock/BillForm';
import { StockNav, StockNotReady, isMissingTable } from '@/components/admin/stock/StockNav';
import { addDays, getIngredients, profileNames, stockDb, todayIst, type StockIngredient } from '@/lib/stock/server';
import { fmtQty } from '@/lib/stock/units';
import { addPurchase, deletePurchase } from '../actions';

export const metadata = { title: 'Kitchen bills' };

type Bill = {
  id: string; purchase_date: string; vendor: string | null; note: string | null; total: number; created_by: string | null;
  extras: { label: string; amount: number }[];
  moves: { ingredient_id: string; qty: number; amount: number | null }[];
};

/** Itemised bills: stock goes up, prices update, Revenue & profit gets the money. */
export default async function StockBillsPage({ searchParams }: { searchParams: Promise<{ prefill?: string }> }) {
  const staff = await requireStaff('stock.read');
  const canWrite = staff.can('stock.write');
  const isAdmin = staff.role === 'admin' || staff.role === 'super_admin';
  const sp = await searchParams;

  let ingredients: StockIngredient[];
  let bills: Bill[];
  let names: Map<string, string>;
  try {
    ingredients = await getIngredients();
    const { data, error } = await stockDb().from('purchases')
      .select('id, purchase_date, vendor, note, total, created_by, extras, moves(ingredient_id, qty, amount)')
      .gte('purchase_date', addDays(todayIst(), -45))
      .order('purchase_date', { ascending: false }).order('created_at', { ascending: false }).limit(60);
    if (error) throw error;
    bills = (data ?? []) as unknown as Bill[];
    names = await profileNames(bills.map((b) => b.created_by));
  } catch (e) {
    if (isMissingTable(e)) return (<><PageHeader title="Kitchen bills" /><StockNotReady /></>);
    throw e;
  }
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const prefill = parsePrefill(sp.prefill, byId);
  const active = ingredients.filter((i) => i.is_active);

  return (
    <>
      <PageHeader
        title="Kitchen bills"
        description="Type what was bought each day. Stock goes up, the price per kg is remembered for food cost, and the total shows on Revenue & profit, so there's no need to enter it there too."
      />
      <StockNav active="/stock/bills" />
      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-5 gap-4">
        {canWrite && (
          <Card title="Add a bill" className="lg:col-span-3 self-start">
            {prefill.length > 0 && <p className="mb-3 text-xs rounded-lg px-3 py-2 bg-blue-50 text-blue-900">Filled in from the buy list. Change the quantities to what you actually bought and add the amounts.</p>}
            <BillForm
              ingredients={active.map((i) => ({ id: i.id, name: i.name, unit: i.unit, category: i.category, price_per_unit: i.price_per_unit }))}
              today={todayIst()} minDate={addDays(todayIst(), -60)} prefill={prefill} action={addPurchase} />
          </Card>
        )}
        <div className={canWrite ? 'lg:col-span-2 space-y-3' : 'lg:col-span-5 space-y-3'}>
          <h2 className="font-heading font-bold text-sm text-gray-900">Last 45 days</h2>
          {bills.length === 0 && <Card><EmptyState title="No bills yet" description="Bills you add appear here." /></Card>}
          {bills.map((b) => (
            <div key={b.id} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-gray-900">{fmtDate(b.purchase_date)}{b.vendor ? ` · ${b.vendor}` : ''}</p>
                  <p className="text-[11px] text-gray-500">{b.created_by && names.get(b.created_by) ? `by ${names.get(b.created_by)}` : ''}{b.note ? ` · ${b.note}` : ''}</p>
                </div>
                <p className="font-heading font-black tabular-nums">{inr(b.total)}</p>
              </div>
              <ul className="mt-2 text-xs text-gray-700 space-y-0.5">
                {b.moves.map((m, idx) => {
                  const ing = byId.get(m.ingredient_id);
                  return (
                    <li key={idx} className="flex justify-between gap-2">
                      <span>{ing?.name ?? 'Item'} · {ing ? fmtQty(Number(m.qty), ing.unit) : Number(m.qty)}</span>
                      <span className="tabular-nums text-gray-500">{m.amount ? inr(m.amount) : '—'}</span>
                    </li>
                  );
                })}
                {(b.extras ?? []).map((x, idx) => (
                  <li key={`x${idx}`} className="flex justify-between gap-2 text-gray-500"><span>{x.label} (not stock)</span><span className="tabular-nums">{inr(x.amount)}</span></li>
                ))}
              </ul>
              {canWrite && (b.created_by === staff.profile.id || isAdmin) && (
                <ActionForm action={deletePurchase} className="mt-2 text-right">
                  <input type="hidden" name="id" value={b.id} />
                  <SubmitButton variant="secondary" pendingText="…" confirm={{ title: 'Delete this bill?', message: 'Its items come off stock and its amount comes off Revenue & profit.', confirmLabel: 'Delete' }}>Delete</SubmitButton>
                </ActionForm>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

/** ?prefill= from the buy list: [{ i: ingredient id, q: qty, u: unit }]. */
function parsePrefill(raw: string | undefined, byId: Map<string, StockIngredient>): BillPrefill[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as { i: string; q: number; u: string }[];
    if (!Array.isArray(arr)) return [];
    return arr.slice(0, 80)
      .filter((x) => byId.has(x.i) && Number.isFinite(x.q) && x.q > 0)
      .map((x) => ({ ingredient_id: x.i, qty: x.q, unit: String(x.u).slice(0, 5) }));
  } catch {
    return [];
  }
}
