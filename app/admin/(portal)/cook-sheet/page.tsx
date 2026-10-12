import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, DataTable, EmptyState, PageHeader, StatCard, fmtDate } from '@/components/admin/ui';
import { DatePicker, isIsoDate } from '@/components/admin/DatePicker';
import { PrintButton } from '@/components/admin/PrintButton';

export const metadata = { title: 'Cook sheet' };

type Row = { slot: 'lunch' | 'dinner'; diet: 'veg' | 'non_veg'; total: number; egg_free: number; skip_legume: number; double_main: number; make_up: number };
type Item = { id: string; code: string; name: string; category: string; grams: number; cooked_state: string | null; metadata: { raw_qty_g?: number } | null };

const CATEGORY_ORDER = ['main', 'protein_side', 'legume', 'salad', 'carb'];

export default async function CookSheetPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  await requireStaff('cooksheet.read');
  const sp = await searchParams;
  const supabase = await getSupabaseServer();

  let date = sp.date;
  if (!isIsoDate(date)) {
    const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
    const { data } = await supabase.rpc('next_operating_day', { after_date: today });
    date = (data as string) ?? today;
  }

  const combos = [
    ['non_veg', 'lunch'], ['veg', 'lunch'], ['non_veg', 'dinner'], ['veg', 'dinner'],
  ] as const;

  const [sheet, addons, ...menus] = await Promise.all([
    supabase.rpc('cook_sheet', { p_date: date }),
    supabase.rpc('cook_sheet_addons', { p_date: date }),
    ...combos.map(([diet, slot]) => supabase.rpc('get_menu_for_date', { p_date: date, p_diet: diet, p_slot: slot })),
  ]);

  const rows = (sheet.data ?? []) as Row[];
  const menuRows = menus.map((m) => (m.data as any[])?.[0]).filter(Boolean);
  const closed = menuRows.length > 0 && menuRows.every((m) => m.is_closed);

  const ids = Array.from(new Set(menuRows.flatMap((m) => [m.main_id, m.protein_side_id, m.salad_id, m.legume_id, m.carb_id]).filter(Boolean)));
  const { data: itemData } = ids.length
    ? await supabase.from('menu_items').select('id, code, name, category, grams, cooked_state, metadata').in('id', ids)
    : { data: [] as Item[] };
  const items = new Map((itemData as Item[] ?? []).map((i) => [i.id, i]));

  // Portions to cook per dish across all boxes that day.
  const portions = new Map<string, number>();
  combos.forEach(([diet, slot], idx) => {
    const m = menuRows[idx];
    const r = rows.find((x) => x.diet === diet && x.slot === slot);
    if (!m || !r || r.total === 0) return;
    const add = (id: string | null, n: number) => id && portions.set(id, (portions.get(id) ?? 0) + n);
    add(m.main_id, r.total + r.double_main);
    add(m.protein_side_id, items.get(m.protein_side_id)?.code === 'NVE' ? r.total - r.egg_free : r.total);
    add(m.legume_id, r.total - r.skip_legume + (items.get(m.protein_side_id)?.code === 'NVE' ? r.egg_free : 0));
    add(m.salad_id, r.total);
    add(m.carb_id, r.total);
  });
  const dishRows = [...portions.entries()]
    .map(([id, n]) => ({ item: items.get(id)!, n }))
    .filter((d) => d.item && d.n > 0)
    .sort((a, b) => CATEGORY_ORDER.indexOf(a.item.category) - CATEGORY_ORDER.indexOf(b.item.category));

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
            <StatCard label="Make-up meals" value={rows.reduce((s, r) => s + r.make_up, 0)} hint="from skips / pauses / credits" />
          </div>

          <div className="grid lg:grid-cols-2 gap-4 mb-4">
            <Card title="Boxes by slot and diet" padded={false}>
              <DataTable
                rows={rows}
                rowKey={(r) => `${r.slot}-${r.diet}`}
                empty={<EmptyState title="No boxes for this day" />}
                columns={[
                  { header: 'Slot', cell: (r) => <span className="capitalize">{r.slot}</span> },
                  { header: 'Diet', cell: (r) => (r.diet === 'veg' ? 'Veg' : 'Non-veg') },
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
                { header: 'Dish', cell: (r) => <div><p className="font-semibold">{r.item.name}</p><p className="text-xs text-gray-500">{r.item.code} · {r.item.cooked_state}</p></div> },
                { header: 'Portions', cell: (r) => <span className="font-black">{r.n}</span>, className: 'text-right' },
                { header: 'Cooked total', cell: (r) => `${((r.item.grams * r.n) / 1000).toFixed(2)} kg`, className: 'text-right' },
                { header: 'Raw to prep', cell: (r) => r.item.metadata?.raw_qty_g ? `${((r.item.metadata.raw_qty_g * r.n) / 1000).toFixed(2)} kg` : '—', className: 'text-right' },
              ]}
            />
          </Card>
        </>
      )}
    </>
  );
}
