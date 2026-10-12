import { requireCustomer } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { logWeight } from '@/lib/customer/actions';
import { dateLabel } from '@/lib/customer/data';
import { todayIST } from '@/lib/menu/rotation';
import { AccountShell } from '@/components/account/AccountNav';
import { Btn, CustomerForm } from '@/components/account/forms';

export const metadata = { title: 'My progress', robots: { index: false } };
export const dynamic = 'force-dynamic';

export default async function ProgressPage() {
  const p = await requireCustomer('/progress');
  const supabase = await getSupabaseServer();
  const [{ data: logs }, { count: delivered }] = await Promise.all([
    supabase.from('progress_logs').select('log_date, weight_kg, note').eq('user_id', p.id).order('log_date', { ascending: false }).limit(60),
    supabase.from('deliveries').select('id', { count: 'exact', head: true }).eq('user_id', p.id).eq('status', 'delivered'),
  ]);
  const series = [...(logs ?? [])].reverse().filter((l) => l.weight_kg != null);
  const weights = series.map((l) => Number(l.weight_kg));
  const min = Math.min(...weights, Number(p.target_weight_kg ?? Infinity)) - 1;
  const max = Math.max(...weights, Number(p.target_weight_kg ?? -Infinity)) + 1;
  const first = weights[0];
  const last = weights[weights.length - 1];

  return (
    <AccountShell current="/progress" title="My progress" subtitle="Log your weight once or twice a week to see the trend.">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-[11px] text-gray-500">Latest</p><p className="font-heading font-black text-xl">{last ? `${last} kg` : '—'}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-[11px] text-gray-500">Change</p><p className="font-heading font-black text-xl">{first && last ? `${(last - first > 0 ? '+' : '')}${(last - first).toFixed(1)} kg` : '—'}</p></div>
          <div className="rounded-2xl border border-gray-200 bg-white p-4"><p className="text-[11px] text-gray-500">Meals delivered</p><p className="font-heading font-black text-xl">{delivered ?? 0}</p></div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <CustomerForm action={logWeight} className="flex flex-wrap items-end gap-2">
            <label className="text-xs"><span className="block font-bold text-gray-700 mb-1">Date</span><input type="date" name="log_date" defaultValue={todayIST()} max={todayIST()} required className="rounded-xl border border-gray-200 px-3 py-2" /></label>
            <label className="text-xs"><span className="block font-bold text-gray-700 mb-1">Weight (kg)</span><input type="number" name="weight_kg" step="0.1" min={25} max={300} required className="w-28 rounded-xl border border-gray-200 px-3 py-2" /></label>
            <label className="text-xs flex-1 min-w-40"><span className="block font-bold text-gray-700 mb-1">Note (optional)</span><input name="note" maxLength={200} className="w-full rounded-xl border border-gray-200 px-3 py-2" /></label>
            <Btn>Log</Btn>
          </CustomerForm>
        </section>

        {series.length > 1 && (
          <section className="rounded-2xl border border-gray-200 bg-white p-5">
            <h2 className="font-heading font-bold text-gray-900 mb-3">Weight trend{p.target_weight_kg ? ` · target ${p.target_weight_kg} kg` : ''}</h2>
            <div className="flex items-end gap-1 h-36" role="img" aria-label="Weight over time">
              {series.map((l) => (
                <div key={l.log_date} className="flex-1 flex flex-col justify-end group relative">
                  <div className="bg-ink/80 rounded-t" style={{ height: `${((Number(l.weight_kg) - min) / (max - min)) * 100}%` }} />
                  <span className="pointer-events-none absolute -top-7 left-1/2 -translate-x-1/2 hidden group-hover:block whitespace-nowrap bg-gray-900 text-white text-[10px] px-2 py-0.5 rounded">{dateLabel(l.log_date)} · {l.weight_kg} kg</span>
                </div>
              ))}
            </div>
          </section>
        )}

        <section className="rounded-2xl border border-gray-200 bg-white p-5">
          <h2 className="font-heading font-bold text-gray-900 mb-2">History</h2>
          {!logs?.length ? <p className="text-sm text-gray-500">No entries yet.</p> : (
            <ul className="divide-y divide-gray-100 text-sm">
              {logs.map((l) => (
                <li key={l.log_date} className="py-2 flex justify-between gap-3"><span className="text-gray-600">{dateLabel(l.log_date)}{l.note ? ` · ${l.note}` : ''}</span><span className="font-bold">{l.weight_kg} kg</span></li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </AccountShell>
  );
}
