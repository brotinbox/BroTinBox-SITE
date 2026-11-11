import Link from 'next/link';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getNextOperatingDay } from '@/lib/menu/next-operating-day';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, StatCard, fmtDate } from '@/components/admin/ui';
import { DatePicker, isIsoDate } from '@/components/admin/DatePicker';
import { PrintButton } from '@/components/admin/PrintButton';
import { liteFactor } from '@/lib/lite-box';

export const metadata = { title: 'Cook sheet' };

type Row = { slot: 'lunch' | 'dinner'; diet: 'veg' | 'non_veg'; box_size: 'regular' | 'lite'; total: number; egg_free: number; skip_legume: number; double_main: number; make_up: number };
type Item = { id: string; code: string; name: string; category: string; grams: number; cooked_state: string | null; metadata: { raw_qty_g?: number } | null };

const CATEGORY_ORDER = ['main', 'protein_side', 'legume', 'salad', 'carb'];

export default async function CookSheetPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireStaff('cooksheet.read');
  const sp = await searchParams;
  const supabase = await getSupabaseServer();

  let date = sp.date;
  if (!isIsoDate(date)) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    date = await getNextOperatingDay(today);
  }

  const combos = [
    ['non_veg', 'lunch'], ['veg', 'lunch'], ['non_veg', 'dinner'], ['veg', 'dinner'],
  ] as const;

  // The dish table is small, so it is read in the same batch instead of after the menus.
  const [sheet, addons, { data: itemData }, ...menus] = await Promise.all([
    supabase.rpc('cook_sheet', { p_date: date }),
    supabase.rpc('cook_sheet_addons', { p_date: date }),
    supabase.from('menu_items').select('id, code, name, category, grams, cooked_state, metadata'),
    ...combos.map(([diet, slot]) => supabase.rpc('get_menu_for_date', { p_date: date, p_diet: diet, p_slot: slot })),
  ]);

  const rows = (sheet.data ?? []) as Row[];
  const menuRows = menus.map((m) => (m.data as any[])?.[0]).filter(Boolean);
  const closed = menuRows.length > 0 && menuRows.every((m) => m.is_closed);

  const items = new Map((itemData as Item[] ?? []).map((i) => [i.id, i]));

  // Portions to cook per dish across all boxes that day. Lite boxes get main,
  // salad and carb (veg Lite also the curd cup), in smaller portions
  // (lib/lite-box.ts), so they are
  // counted separately and their weight is scaled.
  // liteEq: Lite portions in "full portions" (count × Lite share), so kg stay exact.
  const portions = new Map<string, { full: number; lite: number; liteEq: number }>();
  const add = (id: string | null, n: number, size: 'full' | 'lite', veg = false) => {
    if (!id || n <= 0) return;
    const p = portions.get(id) ?? { full: 0, lite: 0, liteEq: 0 };
    p[size] += n;
    if (size === 'lite') {
      const item = items.get(id);
      p.liteEq += n * (item ? liteFactor(item.category, item.grams, item.name, veg) : 0);
    }
    portions.set(id, p);
  };
  combos.forEach(([diet, slot], idx) => {
    const m = menuRows[idx];
    if (!m) return;
    for (const r of rows.filter((x) => x.diet === diet && x.slot === slot && x.total > 0)) {
      if (r.box_size === 'lite') {
        const veg = diet === 'veg';
        add(m.main_id, r.total + r.double_main, 'lite', veg);
        if (veg) add(m.protein_side_id, r.total, 'lite', veg); // veg Lite keeps the curd cup
        add(m.salad_id, r.total, 'lite', veg);
        add(m.carb_id, r.total, 'lite', veg);
        continue;
      }
      const eggs = items.get(m.protein_side_id)?.code === 'NVE';
      add(m.main_id, r.total + r.double_main, 'full');
      add(m.protein_side_id, eggs ? r.total - r.egg_free : r.total, 'full');
      add(m.legume_id, r.total - r.skip_legume + (eggs ? r.egg_free : 0), 'full');
      add(m.salad_id, r.total, 'full');
      add(m.carb_id, r.total, 'full');
    }
  });
  const dishRows = [...portions.entries()]
    .map(([id, p]) => {
      const item = items.get(id)!;
      // Weight in "full portions", so cooked and raw kg stay exact.
      return { item, full: p.full, lite: p.lite, fullEq: p.full + p.liteEq };
    })
    .filter((d) => d.item && d.full + d.lite > 0)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.item.category) - CATEGORY_ORDER.indexOf(b.item.category));
  const liteBoxes = rows.filter((r) => r.box_size === 'lite').reduce((s, r) => s + r.total, 0);

  const totalBoxes = rows.reduce((s, r) => s + r.total, 0);
  const sum = (slot: string) => rows.filter((r) => r.slot === slot).reduce((s, r) => s + r.total, 0);

  return (
    <>
      <PageHeader
        title={`Cook sheet · ${fmtDate(date)}`}
        description="Counts lock at 9:00 PM the night before. Egg-free boxes get an extra legume portion instead of eggs."
        actions={<><DatePicker action={adminHref('/cook-sheet')} date={date} /><PrintButton /></>}
      />

      {closed ? (
        <Card><EmptyState title="Kitchen closed" description="Sunday or a holiday closure. No cooking." /></Card>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <StatCard label="Total boxes" value={totalBoxes} />
            <StatCard label="Lunch" value={sum('lunch')} />
            <StatCard label="Dinner" value={sum('dinner')} />
            <StatCard label="Make-up meals" value={rows.reduce((s, r) => s + r.make_up, 0)} hint={liteBoxes ? `${liteBoxes} Lite box${liteBoxes > 1 ? 'es' : ''} today` : 'from skips / pauses / credits'} />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card title="Boxes by slot and diet" padded={false}>
              <DataTable
                rows={rows}
                rowKey={(r) => `${r.slot}-${r.diet}-${r.box_size}`}
                empty={<EmptyState title="No boxes for this day" />}
                columns={[
                  { header: 'Slot', cell: (r) => <span className="capitalize">{r.slot}</span> },
                  { header: 'Diet', cell: (r) => (r.diet === 'veg' ? 'Veg' : 'Non-veg') },
                  { header: 'Box', cell: (r) => (r.box_size === 'lite' ? <span className="font-bold text-accent">Lite</span> : 'Full') },
                  { header: 'Boxes', cell: (r) => <span className="font-black">{r.total}</span>, className: 'text-right' },
                  { header: 'Egg-free', cell: (r) => r.egg_free, className: 'text-right' },
                  { header: 'No legume', cell: (r) => r.skip_legume, className: 'text-right' },
                  { header: 'Double main', cell: (r) => r.double_main, className: 'text-right' },
                ]}
              />
            </Card>
            <Card title="Sides, dips & drinks" padded={false}>
              <DataTable
                rows={(addons.data ?? []) as { addon_id: string; name: string; type: string; qty: number }[]}
                rowKey={(r) => r.addon_id}
                empty={<EmptyState title="No add-ons ordered" />}
                columns={[
                  { header: 'Item', cell: (r) => r.name },
                  { header: 'Type', cell: (r) => <span className="text-xs text-gray-500">{r.type}</span> },
                  { header: 'Qty', cell: (r) => <span className="font-black">{r.qty}</span>, className: 'text-right' },
                ]}
              />
            </Card>
          </div>

          <Card title="What to cook" padded={false}>
            <DataTable
              rows={dishRows}
              rowKey={(r) => r.item.id}
              empty={<EmptyState title="Nothing to cook" description="No paid boxes for this date yet." />}
              columns={[
                { header: 'Dish', cell: (r) => (
                  <div>
                    <Link href={adminHref(`/cook-book/${r.item.id}?portions=${Math.round(r.fullEq * 10) / 10}`)} className="font-semibold text-primary hover:underline print:text-gray-900 print:no-underline">{r.item.name}</Link>
                    <p className="text-xs text-gray-500">{r.item.code} · {r.item.cooked_state} <span className="print:hidden">· recipe →</span></p>
                  </div>
                ) },
                { header: 'Portions', cell: (r) => (
                  <span><span className="font-black">{r.full + r.lite}</span>{r.lite > 0 && <span className="block text-xs text-gray-500">{r.full} full + {r.lite} Lite</span>}</span>
                ), className: 'text-right' },
                { header: 'Cooked total', cell: (r) => `${((r.item.grams * r.fullEq) / 1000).toFixed(2)} kg`, className: 'text-right' },
                { header: 'Raw to prep', cell: (r) => r.item.metadata?.raw_qty_g ? `${((r.item.metadata.raw_qty_g * r.fullEq) / 1000).toFixed(2)} kg` : '—', className: 'text-right' },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
