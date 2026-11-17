import Link from 'next/link';
import Image from 'next/image';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { ButtonLink, Card, DataTable, PageHeader, StatusBadge, inr } from '@/components/admin/ui';

export const metadata = { title: 'Dishes' };

const GROUPS = [['main', 'Mains'], ['protein_side', 'Protein sides (eggs / curd)'], ['legume', 'Legumes & sprouts'], ['salad', 'Salads'], ['carb', 'Carbs']] as const;

const GROUP_NOUN: Record<string, string> = { main: 'main', protein_side: 'protein side', legume: 'legume', salad: 'salad', carb: 'carb' };

export default async function DishesPage() {
  const staff = await requireStaff('menu.read');
  const supabase = await getSupabaseServer();
  const [{ data: items }, { data: costs }, { data: rotation }, swaps] = await Promise.all([
    supabase.from('menu_items').select('id, code, name, category, cooked_state, calories, protein, carbs, fat, allergens, is_veg, is_active, image_url').order('code'),
    supabase.from('menu_item_costs').select('menu_item_id, cost_per_portion, gas_cost'),
    supabase.from('menu_rotation').select('main_id, protein_side_id, salad_id, legume_id, carb_id'),
    supabase.from('menu_swaps').select('new_item_id'),
  ]);
  // Dishes the 30-day menu uses; the rest only appear through date changes.
  const inRotation = new Set([
    ...(rotation ?? []).flatMap((r) => [r.main_id, r.protein_side_id, r.salad_id, r.legume_id, r.carb_id]),
    ...(swaps.error ? [] : swaps.data ?? []).map((s) => s.new_item_id),
  ]);
  const cost = new Map((costs ?? []).map((c) => [c.menu_item_id, Number(c.cost_per_portion) + Number(c.gas_cost)]));

  return (
    <>
      <PageHeader
        title="Dishes"
        description="Every dish in the rotation with nutrition from your workbook. Upload real photos to replace the stock placeholders."
        actions={staff.can('menu.write') ? <ButtonLink href={adminHref('/menu/dishes/new')}>+ New dish</ButtonLink> : undefined}
      />
      <div className="space-y-4">
        {GROUPS.map(([cat, label]) => (
          <Card
            key={cat}
            title={label}
            padded={false}
            actions={staff.can('menu.write') ? <ButtonLink href={adminHref(`/menu/dishes/new?category=${cat}`)} variant="secondary">+ Add {GROUP_NOUN[cat]}</ButtonLink> : undefined}
          >
            <DataTable
              rows={(items ?? []).filter((i) => i.category === cat)}
              rowKey={(r) => r.id}
              columns={[
                { header: '', cell: (r) => r.image_url
                  ? <Image src={r.image_url} alt="" width={44} height={44} className="w-11 h-11 rounded-lg object-cover" unoptimized={r.image_url.startsWith('/')} />
                  : <div className="w-11 h-11 rounded-lg bg-gray-100" /> },
                { header: 'Dish', cell: (r) => (
                  <Link href={adminHref(`/menu/dishes/${r.id}`)} className="block">
                    <p className="font-bold text-primary">{r.name}</p>
                    <p className="text-xs text-gray-500">
                      {r.code} · {r.cooked_state} · {r.is_veg ? 'veg' : 'non-veg'}
                      {!inRotation.has(r.id) && <span className="ml-1.5 font-semibold text-amber-700">· not in 30-day menu</span>}
                    </p>
                  </Link>
                ) },
                { header: 'kcal', cell: (r) => r.calories, className: 'text-right' },
                { header: 'P / C / F (g)', cell: (r) => `${r.protein} / ${r.carbs} / ${r.fat}`, className: 'text-right whitespace-nowrap' },
                { header: 'Allergens', cell: (r) => <span className="text-xs">{r.allergens?.join(', ') || '—'}</span> },
                ...(staff.can('menu.write') ? [{ header: 'Cost', cell: (r: any) => cost.has(r.id) ? inr(cost.get(r.id)!.toFixed(2)) : '—', className: 'text-right' }] : []),
                { header: 'Status', cell: (r) => r.is_active ? <StatusBadge value="active" /> : <StatusBadge value="draft" label="hidden" /> },
              ]}
            />
          </Card>
        ))}
      </div>
    </>
  );
}
