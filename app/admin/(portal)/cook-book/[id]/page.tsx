import Image from 'next/image';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { ButtonLink, Card, PageHeader, fmtDate } from '@/components/admin/ui';
import { PrintButton } from '@/components/admin/PrintButton';
import { scaledQty, toRecipe } from '@/lib/recipes';

export const metadata = { title: 'Recipe' };

/**
 * Kitchen view of one recipe: big text for a phone on the counter, prints
 * cleanly. ?portions=N multiplies every quantity (the cook sheet links here
 * with the day's count).
 */
export default async function RecipePage({ params, searchParams }: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ portions?: string }>;
}) {
  const staff = await requireStaff('menu.read');
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const p = Number((await searchParams).portions);
  const portions = Number.isFinite(p) && p > 0 && p <= 1000 ? Math.round(p * 10) / 10 : 1;

  const supabase = await getSupabaseServer();
  const [{ data: d }, { data: row }] = await Promise.all([
    supabase.from('menu_items').select('id, code, name, category, grams, cooked_state, allergens, image_url, metadata').eq('id', id).maybeSingle(),
    supabase.from('dish_recipes').select('*').eq('menu_item_id', id).maybeSingle(),
  ]);
  if (!d) notFound();
  const r = row ? toRecipe(row) : { ...toRecipe(null), notes: (d.metadata as { kitchen_notes?: string } | null)?.kitchen_notes ?? null };
  const cookedKg = (d.grams * portions) / 1000;

  return (
    <>
      <PageHeader
        title={d.name}
        description={`${d.code} · ${d.cooked_state ?? `${d.grams} g`} per portion${d.allergens.length ? ` · Allergens: ${d.allergens.join(', ')}` : ''}`}
        actions={<>
          <ButtonLink href={adminHref('/cook-book')} variant="secondary">← Cook book</ButtonLink>
          {staff.can('menu.write') && <ButtonLink href={adminHref(`/menu/dishes/${d.id}`)} variant="secondary">Edit recipe</ButtonLink>}
          <PrintButton />
        </>}
      />

      <form method="get" className="mb-4 flex flex-wrap items-center gap-2 bg-white rounded-2xl border border-gray-200 shadow-sm p-3 print:hidden">
        <label htmlFor="portions" className="text-sm font-bold text-gray-900">Cooking for</label>
        <input id="portions" name="portions" type="number" min={1} max={1000} step="any" defaultValue={portions}
          className="w-24 rounded-xl border border-gray-200 px-3 py-2 text-lg font-black tabular-nums" />
        <span className="text-sm text-gray-600">portions</span>
        <button className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold">Update</button>
        <span className="text-sm text-gray-500 ml-auto">≈ {cookedKg.toFixed(2)} kg cooked</span>
      </form>
      <p className="hidden print:block mb-3 text-lg font-bold">For {portions} portions · ≈ {cookedKg.toFixed(2)} kg cooked</p>

      <div className="grid lg:grid-cols-5 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title={`Ingredients · ${portions} portion${portions === 1 ? '' : 's'}`}>
            {r.ingredients.length === 0 ? (
              <p className="text-sm text-gray-500">Not filled in yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {r.ingredients.map((i, n) => (
                  <li key={n} className="flex items-baseline justify-between gap-3 py-2.5">
                    <span className="text-base text-gray-900">
                      {i.name}
                      {i.note && <span className="block text-xs text-gray-500">{i.note}</span>}
                    </span>
                    <span className="text-lg font-black tabular-nums text-gray-900 whitespace-nowrap">{scaledQty(i, portions)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
          {(r.prep_minutes !== null || r.cook_minutes !== null || r.equipment) && (
            <Card>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {r.prep_minutes !== null && <div><dt className="text-[11px] font-bold uppercase text-gray-500">Prep</dt><dd className="text-lg font-black">{r.prep_minutes} min</dd></div>}
                {r.cook_minutes !== null && <div><dt className="text-[11px] font-bold uppercase text-gray-500">Cook</dt><dd className="text-lg font-black">{r.cook_minutes} min</dd></div>}
                {r.equipment && <div className="col-span-2"><dt className="text-[11px] font-bold uppercase text-gray-500">Equipment</dt><dd className="text-gray-900">{r.equipment}</dd></div>}
              </dl>
            </Card>
          )}
          {d.image_url && (
            <Card title="How it should look" className="print:hidden">
              <Image src={d.image_url} alt={d.name} width={400} height={300} className="w-full rounded-xl object-cover" unoptimized={d.image_url.startsWith('/')} />
            </Card>
          )}
        </div>

        <div className="lg:col-span-3 space-y-4">
          <Card title="Method">
            {r.steps.length === 0 ? (
              <p className="text-sm text-gray-500">Steps not written yet.{staff.can('menu.write') ? ' Add them from the dish page.' : ''}</p>
            ) : (
              <ol className="space-y-4">
                {r.steps.map((s, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="w-8 h-8 shrink-0 rounded-full bg-gray-900 text-white font-black inline-flex items-center justify-center">{n + 1}</span>
                    <p className="text-base leading-relaxed text-gray-900 whitespace-pre-line pt-1">{s}</p>
                  </li>
                ))}
              </ol>
            )}
          </Card>
          {r.tips && (
            <Card title="Tips & checks">
              <p className="text-base leading-relaxed text-gray-900 whitespace-pre-line">{r.tips}</p>
            </Card>
          )}
          {r.notes && (
            <Card title="Kitchen notes">
              <p className="text-sm leading-relaxed text-gray-700 whitespace-pre-line">{r.notes}</p>
            </Card>
          )}
          {row?.updated_at && <p className="text-[11px] text-gray-500">Recipe last updated {fmtDate(row.updated_at, true)}.</p>}
        </div>
      </div>
    </>
  );
}
