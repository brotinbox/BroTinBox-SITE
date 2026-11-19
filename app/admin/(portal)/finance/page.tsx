import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { cn } from '@/lib/utils';
import { Card, DataTable, EmptyState, PageHeader, fmtDate, inr } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { ProfitBars, WaveChart } from '@/components/admin/finance/Charts';
import { Delta, KpiCard } from '@/components/admin/finance/Kpi';
import {
  ENTRY_CATEGORIES, GROUP_LABEL, categoryGroup, categoryLabel, chartPoints, dayRevenue, dayStandardCost, pctChange, totals,
  type Basis, type CostMode, type DayRow,
} from '@/lib/finance/shared';
import {
  FIRST_DAY, RANGES, addDays, getBoxCosts, getDaily, getFinanceSettings, listAddonCosts, listDishCosts, listEntries,
  recentCostChanges, resolveRange, todayIst,
} from '@/lib/finance/server';
import { addEntry, adjustDishCosts, deleteEntry, recostBoxes, saveAddonCost, saveDishCost, saveFinanceSettings } from './actions';

export const metadata = { title: 'Revenue & profit' };

type SP = { tab?: string; range?: string; from?: string; to?: string; basis?: string; cost?: string };

const TABS = [
  { value: 'overview', label: 'Overview' },
  { value: 'bills', label: 'Bills & adjustments' },
  { value: 'costs', label: 'Dish & add-on costs' },
  { value: 'settings', label: 'Settings' },
] as const;

export default async function FinancePage({ searchParams }: { searchParams: Promise<SP> }) {
  const staff = await requireStaff('finance.read');
  const canWrite = staff.can('finance.write');
  const sp = await searchParams;
  const tab = TABS.some((t) => t.value === sp.tab) ? sp.tab! : 'overview';
  const range = resolveRange(sp);
  const basis: Basis = sp.basis === 'cash' ? 'cash' : 'earned';
  const costMode: CostMode = sp.cost === 'bills' ? 'bills' : 'estimate';

  const base = adminHref('/finance');
  const href = (over: Partial<SP>) => {
    const q = new URLSearchParams();
    const merged: SP = { tab, range: range.key, basis, cost: costMode, ...(range.key === 'custom' ? { from: range.from, to: range.to } : {}), ...over };
    if (merged.range !== 'custom') { delete merged.from; delete merged.to; }
    if (merged.tab === 'overview') delete merged.tab;
    if (merged.range === '30d') delete merged.range;
    if (merged.basis === 'earned') delete merged.basis;
    if (merged.cost === 'estimate') delete merged.cost;
    Object.entries(merged).forEach(([k, v]) => v && q.set(k, v));
    const s = q.toString();
    return s ? `${base}?${s}` : base;
  };

  return (
    <>
      <PageHeader
        title="Revenue & profit"
        description="Money in, money out and what is left, from your orders, the boxes cooked and the bills you enter. Only super admins see this page."
        actions={canWrite && tab !== 'bills' ? <Link href={href({ tab: 'bills' })} className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover">+ Add a bill</Link> : undefined}
      />

      <nav className="flex gap-1.5 mb-5 max-md:overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-1 [scrollbar-width:none]">
        {TABS.map((t) => (
          <Link key={t.value} href={href({ tab: t.value })}
            className={cn('px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap shrink-0',
              tab === t.value ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900')}>
            {t.label}
          </Link>
        ))}
      </nav>

      {tab === 'overview' && <Overview range={range} basis={basis} costMode={costMode} href={href} />}
      {tab === 'bills' && <Bills range={range} href={href} canWrite={canWrite} />}
      {tab === 'costs' && <Costs canWrite={canWrite} />}
      {tab === 'settings' && <Settings canWrite={canWrite} />}
    </>
  );
}

type Range = ReturnType<typeof resolveRange>;
type Href = (over: Partial<SP>) => string;

function Chip({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link href={href} className={cn('px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap shrink-0 border',
      active ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-900')}>
      {children}
    </Link>
  );
}

/** Date range chips + custom dates (+ basis / cost toggles on the overview). */
function RangeBar({ range, href, toggles, basis, costMode }: { range: Range; href: Href; toggles?: boolean; basis?: Basis; costMode?: CostMode }) {
  return (
    <div className="flex flex-col xl:flex-row xl:items-center gap-3 mb-5">
      <div className="flex gap-1.5 max-md:overflow-x-auto max-md:-mx-4 max-md:px-4 max-md:pb-1 [scrollbar-width:none]">
        {RANGES.map((r) => <Chip key={r.value} href={href({ range: r.value })} active={range.key === r.value}>{r.label}</Chip>)}
      </div>
      {/* GET form: the action's own query is dropped by the browser, so the other choices ride along as hidden fields */}
      <form action={href({}).split('?')[0]} className="flex items-center gap-1.5 flex-wrap">
        {[...new URL(href({ range: 'custom' }), 'http://x').searchParams].filter(([k]) => !['from', 'to', 'range'].includes(k))
          .map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <input type="hidden" name="range" value="custom" />
        <input type="date" name="from" defaultValue={range.from} min={FIRST_DAY} max={todayIst()} aria-label="From"
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
        <span className="text-xs text-gray-400">to</span>
        <input type="date" name="to" defaultValue={range.to} min={FIRST_DAY} max={todayIst()} aria-label="To"
          className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs" />
        <button className="px-3 py-1.5 rounded-lg text-xs font-bold border border-gray-200 bg-white hover:border-gray-900">Show</button>
      </form>
      {toggles && (
        <div className="flex gap-3 xl:ml-auto flex-wrap">
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-bold" title="Earned = meals served. Cash = money received.">
            {(['earned', 'cash'] as const).map((b) => (
              <Link key={b} href={href({ basis: b })} className={cn('px-2.5 py-1 rounded-md', basis === b ? 'bg-gray-900 text-white' : 'text-gray-600')}>
                {b === 'earned' ? 'Earned' : 'Cash in'}
              </Link>
            ))}
          </div>
          <div className="flex rounded-lg border border-gray-200 bg-white p-0.5 text-xs font-bold" title="Recipe = cost of boxes cooked. Bills = what you bought.">
            {(['estimate', 'bills'] as const).map((m) => (
              <Link key={m} href={href({ cost: m })} className={cn('px-2.5 py-1 rounded-md', costMode === m ? 'bg-gray-900 text-white' : 'text-gray-600')}>
                {m === 'estimate' ? 'Recipe cost' : 'Bills'}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function NotSetUp({ error }: { error: string }) {
  return (
    <Card>
      <EmptyState
        title="Finance tables not set up yet"
        description={`Run supabase/migrations/20261118000049_finance.sql in Supabase, then add "finance" under Settings › API › Exposed schemas. (${error.slice(0, 120)})`}
      />
    </Card>
  );
}

/* ------------------------------------------------------------------------ */
/* Overview                                                                  */
/* ------------------------------------------------------------------------ */

async function Overview({ range, basis, costMode, href }: { range: Range; basis: Basis; costMode: CostMode; href: Href }) {
  const prevTo = addDays(range.from, -1);
  const prevFrom = addDays(range.from, -range.days);
  const [cur, prev, all, boxes, entries, settings] = await Promise.all([
    getDaily(range.from, range.to),
    prevTo >= FIRST_DAY ? getDaily(prevFrom < FIRST_DAY ? FIRST_DAY : prevFrom, prevTo) : Promise.resolve({ rows: [] as DayRow[], error: null }),
    getDaily(FIRST_DAY, todayIst()),
    getBoxCosts(range.from, range.to),
    listEntries(range.from, range.to),
    getFinanceSettings(),
  ]);
  if (cur.error) return <NotSetUp error={cur.error} />;

  const t = totals(cur.rows, basis);
  const p = prev.rows.length ? totals(prev.rows, basis) : null;
  const allT = totals(all.rows, 'cash');
  // Money received for meals not served yet (prepaid plans).
  const owed = Math.max(0, allT.cash - allT.earned);

  const cost = costMode === 'bills' ? t.costBills : t.costEstimate;
  const profit = costMode === 'bills' ? t.profitBills : t.profitEstimate;
  const prevCost = p ? (costMode === 'bills' ? p.costBills : p.costEstimate) : null;
  const prevProfit = p ? (costMode === 'bills' ? p.profitBills : p.profitEstimate) : null;
  const margin = t.revenue > 0 ? (profit / t.revenue) * 100 : null;
  const points = chartPoints(cur.rows, basis, costMode);
  const target = settings.target_food_cost_pct;
  const hasBills = t.procurement > 0;

  // Where the money went, for the chosen cost view.
  const spend: [string, number][] = costMode === 'estimate'
    ? [['Food & gas (recipes)', t.food], ['Packaging', t.packaging], ['Add-ons (juices, sides)', t.addons]]
    : Object.entries(entries.filter((e) => categoryGroup(e.category) === 'procurement')
        .reduce<Record<string, number>>((m, e) => ({ ...m, [categoryLabel(e.category)]: (m[categoryLabel(e.category)] ?? 0) + e.amount }), {}));
  const overheadByCat = entries.filter((e) => categoryGroup(e.category) === 'overhead')
    .reduce<Record<string, number>>((m, e) => ({ ...m, [categoryLabel(e.category)]: (m[categoryLabel(e.category)] ?? 0) + e.amount }), {});
  const breakdown = [...spend, ...Object.entries(overheadByCat), ['Cashfree fees', t.fees], ['Trainer commission', t.commissions]]
    .filter(([, v]) => (v as number) > 0)
    .sort((a, b) => (b[1] as number) - (a[1] as number)) as [string, number][];
  const maxSpend = Math.max(1, ...breakdown.map(([, v]) => v));

  // Bills vs recipe estimate, by week (Mon–Sun).
  const weeks = new Map<string, { expected: number; bills: number }>();
  for (const r of cur.rows) {
    const d = new Date(`${r.day}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
    const k = d.toISOString().slice(0, 10);
    const w = weeks.get(k) ?? { expected: 0, bills: 0 };
    w.expected += dayStandardCost(r);
    w.bills += r.procurement;
    weeks.set(k, w);
  }
  const weekRows = [...weeks.entries()].filter(([, w]) => w.expected > 0 || w.bills > 0);
  const maxWeek = Math.max(1, ...weekRows.flatMap(([, w]) => [w.expected, w.bills]));
  // Only weeks with food bills: a week without bills would look like a saving.
  const billedWeeks = weekRows.filter(([, w]) => w.bills > 0);
  const billedExpected = billedWeeks.reduce((x, [, w]) => x + w.expected, 0);
  const variance = Math.round(billedWeeks.reduce((x, [, w]) => x + w.bills - w.expected, 0));

  return (
    <>
      <RangeBar range={range} href={href} toggles basis={basis} costMode={costMode} />
      <p className="text-xs text-gray-500 -mt-3 mb-4">
        {fmtDate(range.from)} – {fmtDate(range.to)} · revenue is <strong>{basis === 'earned' ? 'earned (meals served)' : 'cash received'}</strong>,
        cost is <strong>{costMode === 'estimate' ? 'recipe cost of boxes cooked' : 'the bills you entered'}</strong>, both plus running costs, Cashfree fees and trainer commission.
      </p>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <KpiCard label="Revenue" value={t.revenue} delta={p && <Delta pct={pctChange(t.revenue, p.revenue)} />}
          spark={points.length > 1 ? points.map((x) => x.revenue) : undefined} />
        <KpiCard label="Total cost" value={cost} delta={prevCost != null && <Delta pct={pctChange(cost, prevCost)} goodWhen="down" />}
          spark={points.length > 1 ? points.map((x) => x.cost) : undefined} sparkColor="#EA580C" />
        <KpiCard label={profit >= 0 ? 'Profit' : 'Loss'} value={profit} tone={profit >= 0 ? 'good' : 'bad'}
          delta={prevProfit != null && <Delta pct={pctChange(profit, prevProfit)} />}
          spark={points.length > 1 ? points.map((x) => x.profit) : undefined} sparkColor={profit >= 0 ? '#059669' : '#E11D48'} />
        <KpiCard label="Profit margin" value={margin} format="pct" decimals={1} tone={margin == null ? 'default' : margin >= 20 ? 'good' : margin >= 0 ? 'warn' : 'bad'}
          hint="Share of revenue you keep." />
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        <KpiCard label="Food cost %" value={t.foodCostPct} format="pct" decimals={1}
          tone={t.foodCostPct == null ? 'default' : t.foodCostPct <= target ? 'good' : t.foodCostPct <= target + 5 ? 'warn' : 'bad'}
          hint={`Target ${target}% or less`} />
        <KpiCard label="Revenue / meal" value={t.revenuePerMeal} hint={t.costPerMeal != null ? `Cost / box ${inr(t.costPerMeal)}` : undefined} />
        <KpiCard label="Meals served" value={t.meals} format="int"
          delta={p && <Delta pct={pctChange(t.meals, p.meals)} />} hint={t.failed ? `${t.failed} failed` : undefined} />
        <KpiCard label="Prepaid, not served" value={owed} hint="Meals you still owe (all time)" />
        <KpiCard label="Break-even" value={t.breakEvenMealsPerDay} format="int"
          hint={t.breakEvenMealsPerDay == null ? 'Needs meals served and a margin' : 'meals a day cover running costs'} />
        <KpiCard label="Bills vs recipes" value={hasBills ? variance : null}
          tone={!hasBills ? 'default' : variance > billedExpected * 0.1 ? 'bad' : variance > 0 ? 'warn' : 'good'}
          hint={hasBills ? `${variance > 0 ? 'Spent more than recipes say' : 'Within the recipe cost'} (${billedWeeks.length} week${billedWeeks.length === 1 ? '' : 's'} with bills)` : 'Add food bills to compare'} />
      </div>

      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4 mb-4">
        <Card title="Revenue vs cost" className="lg:col-span-2">
          {points.every((x) => x.revenue === 0 && x.cost === 0)
            ? <EmptyState title="Nothing in this range yet" description="Pick a longer range, or wait for the first paid orders and bills." />
            : <WaveChart points={points} />}
        </Card>
        <Card title="Where the money went">
          {breakdown.length === 0 ? <EmptyState title="No costs yet" description={costMode === 'bills' ? 'Add bills, or switch to Recipe cost.' : 'Costs appear once boxes are cooked.'} /> : (
            <ul className="space-y-3">
              {breakdown.map(([label, v]) => (
                <li key={label}>
                  <div className="flex justify-between gap-3 text-xs mb-1">
                    <span className="text-gray-700 font-semibold">{label}</span>
                    <span className="text-gray-900 font-bold tabular-nums">{inr(Math.round(v))}</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${(v / maxSpend) * 100}%` }} />
                  </div>
                </li>
              ))}
              <li className="flex justify-between text-xs pt-2 border-t border-gray-100 font-bold">
                <span>Total</span><span className="tabular-nums">{inr(Math.round(cost))}</span>
              </li>
            </ul>
          )}
        </Card>
      </div>

      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4 mb-4">
        <Card title={points.length > 62 ? 'Profit per week' : 'Profit per day'} className="lg:col-span-2">
          <ProfitBars points={points} />
        </Card>
        <Card title="Bills vs recipe cost (food only)">
          {weekRows.length === 0 ? <EmptyState title="No food costs yet" /> : (
            <>
              <div className="flex gap-4 text-[11px] text-gray-500 mb-3">
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-ink-soft" />Recipe cost</span>
                <span className="flex items-center gap-1.5"><i className="w-2.5 h-2.5 rounded-sm bg-accent" />Bills</span>
              </div>
              <ul className="space-y-3">
                {weekRows.map(([k, w]) => {
                  const diff = w.bills - w.expected;
                  return (
                    <li key={k}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-600">Week of {fmtDate(k)}</span>
                        <span className={cn('font-bold tabular-nums', w.bills === 0 ? 'text-gray-400' : diff > 0 ? 'text-rose-700' : 'text-emerald-700')}>
                          {w.bills === 0 ? 'no bills' : `${diff > 0 ? '+' : '−'}${inr(Math.abs(Math.round(diff)))}`}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        <div className="h-1.5 rounded-full bg-ink-soft" style={{ width: `${(w.expected / maxWeek) * 100}%` }} title={`Recipe ${inr(Math.round(w.expected))}`} />
                        <div className="h-1.5 rounded-full bg-accent" style={{ width: `${(w.bills / maxWeek) * 100}%` }} title={`Bills ${inr(Math.round(w.bills))}`} />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="text-[11px] text-gray-500 mt-3">Red = you spent more than the recipes need (price rise, waste or stock for next week). Update dish costs if a price has really changed.</p>
            </>
          )}
        </Card>
      </div>

      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
        <Card title="Cost per box served" padded={false}>
          <DataTable
            rows={boxes.slice(0, 15)}
            rowKey={(r) => `${r.box}-${r.diet}-${r.box_size}`}
            empty={<EmptyState title="No boxes cooked in this range" />}
            columns={[
              { header: 'Box', cell: (r) => <span className="font-semibold text-gray-900">{r.box}</span> },
              { header: 'Type', cell: (r) => `${r.diet === 'veg' ? 'Veg' : 'Non-veg'}${r.box_size === 'lite' ? ' · Lite' : ''}` },
              { header: 'Boxes', cell: (r) => r.boxes, className: 'text-right' },
              { header: 'Avg cost', cell: (r) => inr(r.avg_cost), className: 'text-right' },
            ]}
          />
        </Card>
        <Card title="Day by day" padded={false}>
          <details>
            <summary className="cursor-pointer px-5 py-3 text-xs font-bold text-gray-700">Show the numbers behind the charts ({cur.rows.length} days)</summary>
            <DataTable
              rows={[...cur.rows].reverse().filter((r) => dayRevenue(r, basis) !== 0 || r.meals_served || r.procurement || r.overheads)}
              rowKey={(r) => r.day}
              empty={<EmptyState title="No activity" />}
              columns={[
                { header: 'Day', cell: (r) => fmtDate(r.day) },
                { header: 'Meals', cell: (r) => r.meals_served, className: 'text-right' },
                { header: 'Revenue', cell: (r) => inr(dayRevenue(r, basis)), className: 'text-right' },
                { header: 'Recipe cost', cell: (r) => inr(dayStandardCost(r)), className: 'text-right' },
                { header: 'Bills', cell: (r) => inr(r.procurement + r.overheads), className: 'text-right' },
              ]}
            />
          </details>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------------ */
/* Bills & adjustments                                                       */
/* ------------------------------------------------------------------------ */

async function Bills({ range, href, canWrite }: { range: Range; href: Href; canWrite: boolean }) {
  const entries = await listEntries(range.from, range.to);
  const byGroup = entries.reduce<Record<string, number>>((m, e) => {
    const g = categoryGroup(e.category);
    return { ...m, [g]: (m[g] ?? 0) + e.amount };
  }, {});
  const groups = ['procurement', 'overhead'] as const;
  const options = (g: string) => ENTRY_CATEGORIES.filter((c) => c.group === g).map((c) => ({ value: c.value, label: c.label }));

  return (
    <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-3 gap-4">
      {canWrite && (
        <Card title="Add a bill or adjustment" className="lg:col-span-1 self-start">
          <ActionForm action={addEntry} resetOnSuccess className="space-y-3">
            <Field label="Date"><Input type="date" name="entry_date" defaultValue={todayIst()} max={todayIst()} min={FIRST_DAY} required /></Field>
            <Field label="Type">
              <select name="category" required defaultValue="vegetables"
                className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary">
                <optgroup label="Food bought (compared with recipe cost)">{options('procurement').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
                <optgroup label="Running costs">{options('overhead').map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
                <optgroup label="Revenue corrections">{[...options('refund'), ...options('income')].map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</optgroup>
              </select>
            </Field>
            <Field label="Amount (₹)"><Input type="number" name="amount" inputMode="decimal" step="0.01" min="0.01" required placeholder="e.g. 1250" /></Field>
            <Field label="Shop / person" hint="Optional"><Input name="vendor" maxLength={80} placeholder="e.g. Ukkadam market" /></Field>
            <Field label="Note" hint="Optional: what it was for"><Input name="note" maxLength={300} placeholder="e.g. 5 kg chicken breast" /></Field>
            <SubmitButton className="w-full">Save</SubmitButton>
          </ActionForm>
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            Don’t enter Cashfree fees, trainer commission or Cashfree refunds: those are counted automatically. Mum’s cooking and your delivery time are not costs.
          </p>
        </Card>
      )}

      <div className={cn('space-y-4', canWrite ? 'lg:col-span-2' : 'lg:col-span-3')}>
        <RangeBar range={range} href={href} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[...groups, 'refund', 'income'].map((g) => (
            <div key={g} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{GROUP_LABEL[g as keyof typeof GROUP_LABEL]}</p>
              <p className="font-heading font-black text-xl mt-1 tabular-nums">{inr(byGroup[g] ?? 0)}</p>
            </div>
          ))}
        </div>
        <Card title={`Entries, ${fmtDate(range.from)} – ${fmtDate(range.to)}`} padded={false}>
          <DataTable
            rows={entries}
            rowKey={(r) => r.id}
            empty={<EmptyState title="No entries in this range" description="Add the first bill on the left." />}
            columns={[
              { header: 'Date', cell: (r) => <span className="whitespace-nowrap">{fmtDate(r.entry_date)}</span> },
              { header: 'Type', cell: (r) => (
                <span>
                  <span className="font-semibold text-gray-900">{categoryLabel(r.category)}</span>
                  <span className="block text-[11px] text-gray-500">{GROUP_LABEL[categoryGroup(r.category) as keyof typeof GROUP_LABEL]}</span>
                </span>
              ) },
              { header: 'Details', cell: (r) => <span className="text-gray-600">{[r.vendor, r.note].filter(Boolean).join(' · ') || '—'}</span> },
              { header: 'Amount', cell: (r) => (
                <span className={cn('font-bold tabular-nums', ['refund'].includes(r.category) ? 'text-rose-700' : r.category === 'other_income' ? 'text-emerald-700' : 'text-gray-900')}>
                  {r.category === 'other_income' ? '+' : r.category === 'refund' ? '−' : ''}{inr(r.amount)}
                </span>
              ), className: 'text-right' },
              ...(canWrite ? [{ header: '', cell: (r: (typeof entries)[number]) => r.stock_purchase_id ? (
                <Link href={adminHref('/stock/bills')} className="text-xs font-bold text-primary hover:underline whitespace-nowrap">Kitchen bill →</Link>
              ) : (
                <ActionForm action={deleteEntry}>
                  <input type="hidden" name="id" value={r.id} />
                  <SubmitButton variant="secondary" pendingText="…" confirm={{ title: 'Delete this entry?', message: `${categoryLabel(r.category)} · ${inr(r.amount)} on ${fmtDate(r.entry_date)}`, confirmLabel: 'Delete' }}>Delete</SubmitButton>
                </ActionForm>
              ), className: 'text-right' }] : []),
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Dish & add-on costs                                                       */
/* ------------------------------------------------------------------------ */

const CAT_LABEL: Record<string, string> = { main: 'Main', protein_side: 'Protein side', salad: 'Salad', legume: 'Legume', carb: 'Carb' };

async function Costs({ canWrite }: { canWrite: boolean }) {
  const [dishes, addons, changes] = await Promise.all([listDishCosts(), listAddonCosts(), recentCostChanges(15)]);
  const names = new Map(dishes.map((d) => [d.id, d.name]));
  const missing = dishes.filter((d) => d.cost == null);
  const missingAddons = addons.filter((a) => a.is_active && a.cost == null);
  const today = todayIst();

  return (
    <div className="space-y-4">
      {(missing.length > 0 || missingAddons.length > 0) && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <strong>Missing costs:</strong> {[...missing.map((d) => d.name), ...missingAddons.map((a) => a.name)].join(', ')}. Boxes and add-ons without a cost count as ₹0, so profit looks higher than it is.
        </div>
      )}

      {canWrite && (
        <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
          <Card title="Prices changed at the market?">
            <ActionForm action={adjustDishCosts} className="space-y-3">
              <p className="text-xs text-gray-600">Raise or lower a whole group at once, e.g. chicken went up 10 % → Non-veg mains +10.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dishes">
                  <Select name="scope" defaultValue="non_veg_main" options={[
                    { value: 'non_veg_main', label: 'Non-veg mains' }, { value: 'veg_main', label: 'Veg mains' },
                    { value: 'protein_side', label: 'Protein sides (eggs, curd)' }, { value: 'salad', label: 'Salads' },
                    { value: 'legume', label: 'Legumes' }, { value: 'carb', label: 'Carbs' }, { value: 'all', label: 'All dishes' },
                  ]} />
                </Field>
                <Field label="Change %" hint="Use − to lower"><Input type="number" name="pct" step="0.5" min={-50} max={100} required placeholder="10" /></Field>
              </div>
              <SubmitButton confirm={{ title: 'Change these dish costs?', message: 'Boxes locked from tonight use the new costs. Past boxes stay as they were unless you re-cost them below.', confirmLabel: 'Change costs' }}>Apply change</SubmitButton>
            </ActionForm>
          </Card>
          <Card title="Apply today’s costs to past boxes">
            <ActionForm action={recostBoxes} className="space-y-3">
              <p className="text-xs text-gray-600">Each box keeps the cost from the night it was locked. If a price change should also count for days already gone, re-cost them here.</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label="From"><Input type="date" name="from" min={FIRST_DAY} max={today} defaultValue={addDays(today, -6)} required /></Field>
                <Field label="To"><Input type="date" name="to" min={FIRST_DAY} max={today} defaultValue={today} required /></Field>
              </div>
              <SubmitButton variant="secondary" confirm={{ title: 'Re-cost these boxes?', message: 'Their food cost is worked out again with today’s dish costs. Profit for those days changes.', confirmLabel: 'Re-cost' }}>Re-cost boxes</SubmitButton>
            </ActionForm>
          </Card>
        </div>
      )}

      <Card title="Dish costs (one portion, full box)" padded={false}>
        <DataTable
          rows={dishes}
          rowKey={(r) => r.id}
          columns={[
            { header: 'Dish', cell: (r) => (
              <span>
                <span className="font-semibold text-gray-900">{r.name}</span>
                <span className="block text-[11px] text-gray-500">{r.code} · {CAT_LABEL[r.category] ?? r.category} · {r.grams} g{r.is_veg ? '' : ' · non-veg'}</span>
              </span>
            ) },
            { header: 'Ingredients + gas', cell: (r) => canWrite ? (
              <ActionForm action={saveDishCost} className="flex items-center gap-2 flex-wrap">
                <input type="hidden" name="id" value={r.id} />
                <label className="flex items-center gap-1 text-xs text-gray-500">₹<Input type="number" name="cost" step="0.01" min={0} max={5000} defaultValue={r.cost ?? ''} required className="w-24 py-1.5" aria-label={`${r.name} ingredient cost`} /></label>
                <label className="flex items-center gap-1 text-xs text-gray-500">gas ₹<Input type="number" name="gas" step="0.01" min={0} max={500} defaultValue={r.gas ?? 0} className="w-20 py-1.5" aria-label={`${r.name} gas cost`} /></label>
                <SubmitButton variant="secondary" pendingText="…">Save</SubmitButton>
              </ActionForm>
            ) : (r.cost == null ? <span className="text-amber-700 font-semibold">not set</span> : `${inr(r.cost)} + ${inr(r.gas)} gas`) },
            { header: 'Total', cell: (r) => r.cost == null ? <span className="text-amber-700 font-semibold">not set</span> : <span className="font-bold tabular-nums">{inr((r.cost ?? 0) + (r.gas ?? 0))}</span>, className: 'text-right' },
            { header: 'Changed', cell: (r) => <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.updated_at)}</span> },
          ]}
        />
      </Card>

      <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
        <Card title="Add-on costs (juices & sides)" padded={false}>
          <DataTable
            rows={addons}
            rowKey={(r) => r.id}
            columns={[
              { header: 'Add-on', cell: (r) => <span><span className={cn('font-semibold', r.is_active ? 'text-gray-900' : 'text-gray-400')}>{r.name}</span><span className="block text-[11px] text-gray-500">Sells at {inr(r.price)}{r.is_active ? '' : ' · hidden'}</span></span> },
              { header: 'Our cost', cell: (r) => canWrite ? (
                <ActionForm action={saveAddonCost} className="flex items-center gap-2">
                  <input type="hidden" name="id" value={r.id} />
                  <span className="text-xs text-gray-500">₹</span>
                  <Input type="number" name="cost" step="0.01" min={0} max={5000} defaultValue={r.cost ?? ''} required className="w-24 py-1.5" aria-label={`${r.name} cost`} />
                  <SubmitButton variant="secondary" pendingText="…">Save</SubmitButton>
                </ActionForm>
              ) : (r.cost == null ? 'not set' : inr(r.cost)) },
              { header: 'Margin', cell: (r) => r.cost == null ? '—' : <span className="font-bold tabular-nums">{inr(r.price - r.cost)}</span>, className: 'text-right' },
            ]}
          />
        </Card>
        <Card title="Recent dish cost changes" padded={false}>
          <DataTable
            rows={changes}
            rowKey={(r) => String(r.id)}
            empty={<EmptyState title="No changes yet" />}
            columns={[
              { header: 'When', cell: (r) => <span className="text-xs text-gray-500 whitespace-nowrap">{fmtDate(r.changed_at, true)}</span> },
              { header: 'Dish', cell: (r) => <span>{names.get(r.menu_item_id) ?? 'Removed dish'}{r.note && <span className="block text-[11px] text-gray-400">{r.note}</span>}</span> },
              { header: 'Cost', cell: (r) => <span className="tabular-nums">{inr(Number(r.cost_per_portion) + Number(r.gas_cost))}</span>, className: 'text-right' },
            ]}
          />
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/* Settings                                                                  */
/* ------------------------------------------------------------------------ */

async function Settings({ canWrite }: { canWrite: boolean }) {
  const s = await getFinanceSettings();
  return (
    <Card title="How costs are worked out" className="max-w-2xl">
      <ActionForm action={saveFinanceSettings} className="space-y-4">
        <Field label="Packaging per box (₹)" hint="Box, lid, spoon, bag, sticker. Added to every box cooked in the Recipe cost view.">
          <Input type="number" name="packaging_per_box" step="0.01" min={0} max={500} defaultValue={s.packaging_per_box} disabled={!canWrite} required />
        </Field>
        <Field label="Cashfree fee (%)" hint="Charged on every Cashfree payment. Check your Cashfree pricing (UPI, cards). Manual UPI payments have no fee.">
          <Input type="number" name="gateway_fee_pct" step="0.01" min={0} max={10} defaultValue={s.gateway_fee_pct} disabled={!canWrite} required />
        </Field>
        <Field label="Target food cost (%)" hint="Food + packaging as a share of revenue. Most kitchens aim for 30–35 %. Food cost % turns red above this.">
          <Input type="number" name="target_food_cost_pct" step="0.5" min={1} max={100} defaultValue={s.target_food_cost_pct} disabled={!canWrite} required />
        </Field>
        {canWrite && <SubmitButton>Save settings</SubmitButton>}
        {s.updated_at && <p className="text-[11px] text-gray-500">Last changed {fmtDate(s.updated_at, true)}.</p>}
      </ActionForm>
    </Card>
  );
}
