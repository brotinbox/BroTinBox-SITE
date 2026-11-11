import Link from 'next/link';
import Image from 'next/image';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { Card, EmptyState, PageHeader } from '@/components/admin/ui';
import { toRecipe } from '@/lib/recipes';

export const metadata = { title: 'Cook book' };

const GROUPS = [['main', 'Mains'], ['protein_side', 'Protein sides (eggs / curd)'], ['legume', 'Legumes & sprouts'], ['salad', 'Salads'], ['carb', 'Carbs']] as const;

export default async function CookBookPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const staff = await requireStaff('menu.read');
  const q = ((await searchParams).q ?? '').trim().slice(0, 60).toLowerCase();
  const supabase = await getSupabaseServer();
  const [{ data: items }, { data: recipes }] = await Promise.all([
    supabase.from('menu_items').select('id, code, name, category, cooked_state, is_veg, image_url').eq('is_active', true).order('code'),
    supabase.from('dish_recipes').select('menu_item_id, ingredients, steps, prep_minutes, cook_minutes, notes'),
  ]);
  const byDish = new Map((recipes ?? []).map((r) => [r.menu_item_id, toRecipe(r)]));
  const shown = (items ?? []).filter((i) => !q || i.name.toLowerCase().includes(q) || i.code.toLowerCase().includes(q));

  return (
    <>
      <PageHeader
        title="Cook book"
        description={`How we cook every dish, so anyone in the kitchen gets the same box.${staff.can('menu.write') ? ' Edit a recipe from its dish page.' : ''}`}
        actions={
          <form method="get" className="flex gap-2">
            <input name="q" defaultValue={q} placeholder="Search dishes" aria-label="Search dishes"
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm w-48" />
            <button className="px-3 py-2 rounded-xl bg-gray-900 text-white text-xs font-bold">Search</button>
          </form>
        }
      />
      {shown.length === 0 && <Card><EmptyState title="No dishes match" description="Try another name or code." /></Card>}
      <div className="space-y-6">
        {GROUPS.map(([cat, label]) => {
          const list = shown.filter((i) => i.category === cat);
          if (!list.length) return null;
          return (
            <section key={cat}>
              <h2 className="font-heading font-bold text-sm text-gray-900 mb-2">{label}</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((i) => {
                  const r = byDish.get(i.id);
                  const ready = !!r && r.ingredients.length > 0 && r.steps.length > 0;
                  const mins = (r?.prep_minutes ?? 0) + (r?.cook_minutes ?? 0);
                  return (
                    <Link key={i.id} href={adminHref(`/cook-book/${i.id}`)}
                      className="flex gap-3 items-center bg-white rounded-2xl border border-gray-200 shadow-sm p-3 hover:border-gray-300">
                      {i.image_url
                        ? <Image src={i.image_url} alt="" width={56} height={56} className="w-14 h-14 rounded-xl object-cover shrink-0" unoptimized={i.image_url.startsWith('/')} />
                        : <div className="w-14 h-14 rounded-xl bg-gray-100 shrink-0" />}
                      <div className="min-w-0">
                        <p className="font-bold text-gray-900 truncate">{i.name}</p>
                        <p className="text-xs text-gray-500">{i.code} · {i.is_veg ? 'veg' : 'non-veg'}{mins > 0 ? ` · ${mins} min` : ''}</p>
                        <p className={`text-[11px] font-bold mt-0.5 ${ready ? 'text-emerald-700' : 'text-amber-700'}`}>
                          {ready ? `${r!.ingredients.length} ingredients · ${r!.steps.length} steps` : r?.notes ? 'Notes only, recipe to fill in' : 'No recipe yet'}
                        </p>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}
