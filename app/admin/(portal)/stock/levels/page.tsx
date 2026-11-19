import { requireStaff } from '@/lib/auth/session';
import { cn } from '@/lib/utils';
import { Card, DataTable, EmptyState, PageHeader, fmtDate } from '@/components/admin/ui';
import { ActionForm, Field, Input, SubmitButton } from '@/components/admin/forms';
import { CountForm } from '@/components/admin/stock/CountForm';
import { StockNav, StockNotReady, isMissingTable } from '@/components/admin/stock/StockNav';
import {
  addDays, catchUpUsage, getIngredients, getOnHand, getStartDate, profileNames, stockDb, todayIst, type StockIngredient,
} from '@/lib/stock/server';
import { STOCK_CATEGORIES, fmtPrice, fmtQty } from '@/lib/stock/units';
import { addWaste, repostUsage, saveCount, toggleLow } from '../actions';

export const metadata = { title: 'Stock & count' };

type Move = { id: number; ingredient_id: string; move_date: string; kind: string; qty: number; note: string | null; created_at: string; created_by: string | null };
type UsageDay = { day: string; boxes: number; posted_at: string; lines: unknown[] };

const KIND_LABEL: Record<string, string> = { purchase: 'Bought', usage: 'Cooked (9 PM)', waste: 'Wasted', count: 'Count', adjust: 'Adjusted' };

export default async function StockLevelsPage({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const staff = await requireStaff('stock.read');
  const canWrite = staff.can('stock.write');
  const isAdmin = staff.role === 'admin' || staff.role === 'super_admin';
  const show = (await searchParams).show === 'fresh' ? 'fresh' : 'pantry';

  let ingredients: StockIngredient[];
  let onHand: Map<string, number>;
  let start: string | null;
  let moves: Move[];
  let names: Map<string, string>;
  let usageDays: UsageDay[];
  try {
    await catchUpUsage().catch((e) => { if (isMissingTable(e)) throw e; console.error('[stock] catch-up failed', e); });
    [ingredients, onHand, start] = await Promise.all([getIngredients(), getOnHand(), getStartDate()]);
    const [m, u] = await Promise.all([
      stockDb().from('moves').select('id, ingredient_id, move_date, kind, qty, note, created_at, created_by')
        .neq('kind', 'usage').neq('kind', 'purchase').order('created_at', { ascending: false }).limit(30),
      stockDb().from('usage_days').select('day, boxes, posted_at, lines').gte('day', addDays(todayIst(), -10)).order('day', { ascending: false }),
    ]);
    if (m.error) throw m.error;
    if (u.error) throw u.error;
    moves = (m.data ?? []) as unknown as Move[];
    names = await profileNames(moves.map((x) => x.created_by));
    usageDays = (u.data ?? []) as UsageDay[];
  } catch (e) {
    if (isMissingTable(e)) return (<><PageHeader title="Stock & count" /><StockNotReady /></>);
    throw e;
  }

  const active = ingredients.filter((i) => i.is_active);
  const byId = new Map(ingredients.map((i) => [i.id, i]));
  const opening = !start;
  const hour = Number(new Date().toLocaleString('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }));
  const listed = active.filter((i) => i.kind === show);
  const value = active.reduce((s, i) => s + Math.max(onHand.get(i.id) ?? 0, 0) * (i.price_per_unit ?? 0), 0);

  return (
    <>
      <PageHeader
        title="Stock & count"
        description={opening
          ? 'Start here: count everything in the kitchen once. After that, bills add to stock and each day’s cooking is taken off at 9 PM the night before.'
          : `Tracking since ${fmtDate(start)}. Bills add, 9 PM cooking takes off, a weekly count corrects the drift. Stock value about ₹${Math.round(value).toLocaleString('en-IN')}.`}
      />
      <StockNav active="/stock/levels" />

      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3 space-y-4">
          {!opening && (
            <Card title="In the kitchen now" padded={false}
              actions={<div className="flex gap-1.5">
                {(['pantry', 'fresh'] as const).map((s) => (
                  <a key={s} href={`?show=${s}`} className={cn('px-3 py-1.5 rounded-full text-xs font-bold border', show === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200')}>
                    {s === 'pantry' ? 'Stock items' : 'Fresh'}
                  </a>
                ))}
              </div>}>
              {STOCK_CATEGORIES.map((c) => {
                const rows = listed.filter((i) => i.category === c.value);
                if (!rows.length) return null;
                return (
                  <div key={c.value}>
                    <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">{c.label}</p>
                    <div className="divide-y divide-gray-100">
                      {rows.map((i) => {
                        const q = onHand.get(i.id) ?? 0;
                        return (
                          <div key={i.id} className="flex items-center justify-between gap-3 px-4 py-2">
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-gray-900">{i.name}{i.low_flag_at && <span className="ml-1.5 text-[10px] font-bold uppercase text-rose-700">running low</span>}</p>
                              <p className="text-[11px] text-gray-500">{fmtPrice(i.price_per_unit, i.unit)}{i.pack_size ? ` · pack ${fmtQty(i.pack_size, i.unit)}` : ''}</p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={cn('font-heading font-black tabular-nums', q < 0 ? 'text-rose-700' : 'text-gray-900')}>{fmtQty(q, i.unit)}</span>
                              {canWrite && (
                                <ActionForm action={toggleLow}>
                                  <input type="hidden" name="id" value={i.id} />
                                  <input type="hidden" name="on" value={i.low_flag_at ? '0' : '1'} />
                                  <SubmitButton variant="secondary" pendingText="…">{i.low_flag_at ? 'Undo low' : 'Running low'}</SubmitButton>
                                </ActionForm>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              <p className="px-4 py-3 text-[11px] text-gray-500 border-t border-gray-100">
                A minus number means more was cooked than was bought or counted: a bill is missing, or the recipe uses less than written. The next count fixes it.
              </p>
            </Card>
          )}

          {canWrite && (
            <Card title={opening ? 'Opening stock count' : 'Count the stock'}>
              <p className="text-xs text-gray-600 mb-3">
                {opening
                  ? 'Weigh or estimate what is in the kitchen now: masala packets, oil, rice, oats, dals, and any fresh items left. Skip what you don’t have.'
                  : 'Once a week (Sunday is easiest), count the stock items and type what is there. Only rows you fill in change.'}
              </p>
              <CountForm
                opening={opening}
                defaultCooked={hour >= 19 || hour < 6}
                items={active.map((i) => ({ id: i.id, name: i.name, unit: i.unit, kind: i.kind, category: i.category, onHand: onHand.get(i.id) ?? 0 }))}
                action={saveCount}
              />
            </Card>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          {canWrite && !opening && (
            <Card title="Thrown away / spoiled">
              <ActionForm action={addWaste} resetOnSuccess className="space-y-3">
                <Field label="Item">
                  <select name="ingredient_id" required className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                    <option value="">Pick…</option>
                    {STOCK_CATEGORIES.map((c) => (
                      <optgroup key={c.value} label={c.label}>
                        {active.filter((i) => i.category === c.value).map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </Field>
                <div className="grid grid-cols-[1fr_6rem] gap-2">
                  <Field label="How much"><Input type="number" name="qty" step="any" min="0" inputMode="decimal" required /></Field>
                  <Field label="Unit">
                    <select name="unit" className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm">
                      {['kg', 'g', 'L', 'ml', 'pcs'].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </Field>
                </div>
                <Field label="Why" hint="Optional"><Input name="note" maxLength={200} placeholder="e.g. tomatoes went bad" /></Field>
                <SubmitButton className="w-full">Save</SubmitButton>
              </ActionForm>
            </Card>
          )}

          <Card title="9 PM cooking taken off" padded={false}>
            <DataTable
              rows={usageDays}
              rowKey={(r) => r.day}
              empty={<EmptyState title={opening ? 'Starts after the opening count' : 'Nothing yet'} />}
              columns={[
                { header: 'Cooking day', cell: (r) => fmtDate(r.day) },
                { header: 'Boxes', cell: (r) => r.boxes, className: 'text-right' },
                { header: 'Items', cell: (r) => (r.lines ?? []).length, className: 'text-right' },
                ...(isAdmin ? [{ header: '', cell: (r: UsageDay) => (
                  <ActionForm action={repostUsage}>
                    <input type="hidden" name="day" value={r.day} />
                    <SubmitButton variant="secondary" pendingText="…" confirm={{ title: `Recalculate ${fmtDate(r.day)}?`, message: 'Use this after fixing a recipe or a link: that day’s usage is worked out again from the current recipes.', confirmLabel: 'Recalculate' }}>Recalculate</SubmitButton>
                  </ActionForm>
                ), className: 'text-right' }] : []),
              ]}
            />
          </Card>

          <Card title="Recent counts & waste" padded={false}>
            <DataTable
              rows={moves}
              rowKey={(r) => String(r.id)}
              empty={<EmptyState title="None yet" />}
              columns={[
                { header: 'When', cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.move_date)}</span> },
                { header: 'Item', cell: (r) => {
                  const i = byId.get(r.ingredient_id);
                  return <span>{i?.name ?? '—'}<span className="block text-[11px] text-gray-500">{KIND_LABEL[r.kind] ?? r.kind}{r.note ? ` · ${r.note}` : ''}{r.created_by && names.get(r.created_by) ? ` · ${names.get(r.created_by)}` : ''}</span></span>;
                } },
                { header: 'Change', cell: (r) => {
                  const i = byId.get(r.ingredient_id);
                  const q = Number(r.qty);
                  return <span className={cn('tabular-nums font-semibold', q < 0 ? 'text-rose-700' : 'text-emerald-700')}>{q > 0 ? '+' : ''}{i ? fmtQty(q, i.unit) : q}</span>;
                }, className: 'text-right' },
              ]}
            />
          </Card>
        </div>
      </div>
    </>
  );
}
