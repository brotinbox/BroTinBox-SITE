import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { getCurrentKitchenDay } from '@/lib/menu/next-operating-day';
import { cn } from '@/lib/utils';
import { Card, EmptyState, PageHeader, StatCard, fmtDate } from '@/components/admin/ui';
import { DatePicker, isIsoDate } from '@/components/admin/DatePicker';
import { PrintButton } from '@/components/admin/PrintButton';
import { StockNav, StockNotReady, isMissingTable } from '@/components/admin/stock/StockNav';
import { BUY_BUFFER, LOW_DAYS, buildBuyList, catchUpUsage, type BuyLine, type BuyList } from '@/lib/stock/server';
import { INPUT_UNITS, STOCK_CATEGORIES, categoryName, fmtPrice, fmtQty } from '@/lib/stock/units';

export const metadata = { title: 'Buy list' };

/**
 * What to buy for one cooking day: fresh items for that day (need + 5 % − what
 * is left) and stock items that would run out within 5 cooking days.
 */
export default async function BuyListPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const staff = await requireStaff('stock.read');
  const sp = await searchParams;
  const day = isIsoDate(sp.date) ? sp.date : await getCurrentKitchenDay();

  let list: BuyList;
  try {
    await catchUpUsage().catch((e) => { if (isMissingTable(e)) throw e; console.error('[stock] catch-up failed', e); });
    list = await buildBuyList(day);
  } catch (e) {
    if (isMissingTable(e)) return (<><PageHeader title="Buy list" /><StockNotReady /></>);
    throw e;
  }

  const canWrite = staff.can('stock.write');
  const toBuy = [...list.fresh.filter((l) => l.buy > 0), ...list.pantry];
  const issueCount = list.issues.unlinked.size + list.issues.mismatched.size + list.issues.noRecipe.size;
  const share = whatsappText(list);
  const prefill = encodeURIComponent(JSON.stringify(toBuy.map((l) => {
    const big = INPUT_UNITS[l.ing.unit][0];
    return { i: l.ing.id, q: Math.round((l.buy / big.factor) * 1000) / 1000, u: big.unit };
  })));

  return (
    <>
      <PageHeader
        title={`Buy list · ${fmtDate(day)}`}
        description={`Fresh items for this day’s cooking (+${BUY_BUFFER * 100}% for waste) and stock items with less than ${LOW_DAYS} cooking days left. Counts are final after the 9 PM lock.`}
        actions={<><DatePicker action={adminHref('/stock')} date={day} /><PrintButton /></>}
      />
      <StockNav active="/stock" />

      {!list.started && (
        <p className="mb-4 text-sm rounded-xl px-4 py-3 bg-amber-50 text-amber-900 border border-amber-200">
          <b>First, count what is in the kitchen.</b> Until the opening stock is saved, the list assumes the kitchen is empty.{' '}
          <Link href={adminHref('/stock/levels')} className="font-bold underline">Do the opening count →</Link>
        </p>
      )}

      {list.closed ? (
        <Card><EmptyState title="Kitchen closed" description="No cooking on this day. Pick another date." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="Boxes this day" value={list.boxes} hint={list.posted ? 'locked: taken off stock' : 'can still change until 9 PM'} />
            <StatCard label="Fresh to buy" value={list.fresh.filter((l) => l.buy > 0).length} />
            <StatCard label="Stock running low" value={list.pantry.length} tone={list.pantry.some((l) => l.urgent) ? 'bad' : 'default'} />
            <StatCard label="Recipe gaps" value={issueCount} hint={issueCount ? 'see below' : 'all linked'} tone={issueCount ? 'warn' : 'default'} />
          </div>

          <div className="flex gap-2 flex-wrap mb-4 print:hidden">
            {toBuy.length > 0 && (
              <a href={`https://wa.me/?text=${encodeURIComponent(share)}`} target="_blank" rel="noopener"
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700">Send on WhatsApp</a>
            )}
            {canWrite && toBuy.length > 0 && (
              <Link href={`${adminHref('/stock/bills')}?prefill=${prefill}`}
                className="inline-flex items-center px-3.5 py-2 rounded-xl text-xs font-bold bg-primary text-white hover:bg-primary-hover">Bought it: add the bill →</Link>
            )}
          </div>

          <div className="grid max-md:grid-cols-[minmax(0,1fr)] lg:grid-cols-2 gap-4">
            <Card title="Fresh: buy for this day" padded={false}>
              {list.fresh.length === 0 ? <EmptyState title="Nothing fresh needed" description="No boxes, or no recipes linked for this day yet." /> : (
                <GroupedLines lines={list.fresh} render={(l) => (
                  <Row key={l.ing.id} name={l.ing.name}
                    sub={`Need ${fmtQty(l.need, l.ing.unit)} · have ${fmtQty(Math.max(l.avail, 0), l.ing.unit)}`}
                    value={l.buy > 0 ? fmtQty(l.buy, l.ing.unit) : 'Enough'}
                    tone={l.buy > 0 ? 'buy' : 'ok'} />
                )} />
              )}
            </Card>

            <Card title={`Stock: running low (next ${LOW_DAYS} cooking days)`} padded={false}>
              {list.pantry.length === 0 ? <EmptyState title="Nothing running low" description={`Every stock item lasts at least ${LOW_DAYS} cooking days.`} /> : (
                <div className="divide-y divide-gray-100">
                  {list.pantry.map((l) => (
                    <Row key={l.ing.id} name={l.ing.name}
                      sub={pantrySub(l)}
                      value={l.packs ? `${l.packs} × ${fmtQty(l.ing.pack_size!, l.ing.unit)}` : fmtQty(l.buy, l.ing.unit)}
                      tone={l.urgent ? 'urgent' : 'buy'} />
                  ))}
                </div>
              )}
            </Card>
          </div>

          {list.pantryOk.length > 0 && (
            <details className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm">
              <summary className="cursor-pointer px-4 py-3 text-sm font-bold text-gray-800">Stock items that are fine ({list.pantryOk.length})</summary>
              <div className="divide-y divide-gray-100 border-t border-gray-100">
                {list.pantryOk.map((l) => (
                  <Row key={l.ing.id} name={l.ing.name} sub={pantrySub(l)} value={l.daysLeft !== null ? `~${Math.floor(l.daysLeft)} days` : 'OK'} tone="ok" />
                ))}
              </div>
            </details>
          )}

          <Issues list={list} />
        </>
      )}
    </>
  );
}

function pantrySub(l: BuyLine) {
  const left = l.daysLeft === null ? '' : ` · lasts ~${l.daysLeft < 1 ? 'less than 1 day' : `${Math.floor(l.daysLeft)} day${Math.floor(l.daysLeft) === 1 ? '' : 's'}`}`;
  const flag = l.flagged ? ' · marked running low' : '';
  const urgent = l.urgent ? ' · NOT ENOUGH FOR THIS DAY' : '';
  const price = l.ing.price_per_unit !== null ? ` · ${fmtPrice(l.ing.price_per_unit, l.ing.unit)}` : '';
  return `Have ${fmtQty(Math.max(l.avail, 0), l.ing.unit)}${left}${flag}${urgent}${price}`;
}

function GroupedLines({ lines, render }: { lines: BuyLine[]; render: (l: BuyLine) => React.ReactNode }) {
  return (
    <div>
      {STOCK_CATEGORIES.map((c) => {
        const rows = lines.filter((l) => l.ing.category === c.value);
        if (!rows.length) return null;
        return (
          <div key={c.value}>
            <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-gray-500">{c.label}</p>
            <div className="divide-y divide-gray-100">{rows.map(render)}</div>
          </div>
        );
      })}
    </div>
  );
}

function Row({ name, sub, value, tone }: { name: string; sub: string; value: string; tone: 'buy' | 'ok' | 'urgent' }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-gray-900">{name}</p>
        <p className={cn('text-[11px]', tone === 'urgent' ? 'text-rose-700 font-semibold' : 'text-gray-500')}>{sub}</p>
      </div>
      <span className={cn('shrink-0 font-heading font-black tabular-nums text-right',
        tone === 'ok' ? 'text-sm text-gray-400' : tone === 'urgent' ? 'text-base text-rose-700' : 'text-base text-gray-900')}>{value}</span>
    </div>
  );
}

function Issues({ list }: { list: BuyList }) {
  const { unlinked, mismatched, noRecipe, unverified } = list.issues;
  if (!unlinked.size && !mismatched.size && !noRecipe.size && !unverified.size) return null;
  const join = (s: Set<string>) => [...s].join(', ');
  return (
    <Card title="Why the list may be off" className="mt-4">
      <ul className="space-y-2 text-sm text-gray-700">
        {unlinked.size > 0 && (
          <li><b className="text-rose-700">Not counted ({unlinked.size}):</b> recipe ingredients not linked to a stock item:{' '}
            {[...unlinked].map(([n, d]) => `${n} (${join(d)})`).join('; ')}.{' '}
            <Link href={adminHref('/stock/ingredients')} className="font-bold text-primary underline">Link them →</Link></li>
        )}
        {mismatched.size > 0 && (
          <li><b className="text-rose-700">Unit doesn’t match ({mismatched.size}):</b> {[...mismatched].map(([n, d]) => `${n}: ${join(d)}`).join('; ')}. Fix the unit in the recipe.</li>
        )}
        {noRecipe.size > 0 && <li><b className="text-rose-700">No ingredients written:</b> {join(noRecipe)}.</li>}
        {unverified.size > 0 && (
          <li><b className="text-amber-700">Not checked with mum yet:</b> {join(unverified)}. Quantities for these may be off. Tick “Checked with mum” on the dish page once they’re right.</li>
        )}
      </ul>
    </Card>
  );
}

function whatsappText(list: BuyList) {
  const lines: string[] = [`🛒 BroTin Box buy list · ${fmtDate(list.day)} (${list.boxes} boxes)`];
  const fresh = list.fresh.filter((l) => l.buy > 0);
  for (const c of STOCK_CATEGORIES) {
    const rows = fresh.filter((l) => l.ing.category === c.value);
    if (!rows.length) continue;
    lines.push('', `*${categoryName(c.value)}*`, ...rows.map((l) => `• ${l.ing.name}: ${fmtQty(l.buy, l.ing.unit)}`));
  }
  if (list.pantry.length) {
    lines.push('', '*Stock running low*', ...list.pantry.map((l) =>
      `• ${l.ing.name}: ${l.packs ? `${l.packs} × ${fmtQty(l.ing.pack_size!, l.ing.unit)}` : fmtQty(l.buy, l.ing.unit)}${l.urgent ? ' ⚠️ needed this day' : ''}`));
  }
  return lines.join('\n');
}
