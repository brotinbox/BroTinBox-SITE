import Image from 'next/image';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { adminHref } from '@/lib/admin/paths';
import { ButtonLink, Card, PageHeader } from '@/components/admin/ui';
import { ActionForm, Checkbox, Field, Input, SubmitButton, Textarea } from '@/components/admin/forms';
import { saveDish } from '../../actions';

export const metadata = { title: 'Edit dish' };

export default async function DishEditPage({ params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff('menu.read');
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();

  const supabase = await getSupabaseServer();
  const [{ data: d }, { data: c }] = await Promise.all([
    supabase.from('menu_items').select('*').eq('id', id).maybeSingle(),
    supabase.from('menu_item_costs').select('*').eq('menu_item_id', id).maybeSingle(),
  ]);
  if (!d) notFound();
  const canWrite = staff.can('menu.write');
  const notes = (d.metadata as { kitchen_notes?: string } | null)?.kitchen_notes;

  return (
    <>
      <PageHeader title={d.name} description={`${d.code} · ${d.category.replace('_', ' ')}`} actions={<ButtonLink href={adminHref('/menu/dishes')} variant="secondary">← All dishes</ButtonLink>} />
      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Details" className="lg:col-span-2">
          <ActionForm action={saveDish} className="space-y-4">
            <input type="hidden" name="id" value={d.id} />
            <fieldset disabled={!canWrite} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Name"><Input name="name" defaultValue={d.name} required maxLength={120} /></Field>
                <Field label="Portion description"><Input name="cooked_state" defaultValue={d.cooked_state ?? ''} maxLength={120} /></Field>
              </div>
              <Field label="Customer description"><Textarea name="description" defaultValue={d.description ?? ''} maxLength={600} /></Field>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                <Field label="Grams"><Input type="number" name="grams" defaultValue={d.grams} min={1} max={2000} required /></Field>
                <Field label="kcal"><Input type="number" step="0.1" name="calories" defaultValue={Number(d.calories)} min={0} required /></Field>
                <Field label="Protein"><Input type="number" step="0.1" name="protein" defaultValue={Number(d.protein)} min={0} required /></Field>
                <Field label="Carbs"><Input type="number" step="0.1" name="carbs" defaultValue={Number(d.carbs)} min={0} required /></Field>
                <Field label="Fat"><Input type="number" step="0.1" name="fat" defaultValue={Number(d.fat)} min={0} required /></Field>
                <Field label="Fibre"><Input type="number" step="0.1" name="fiber" defaultValue={Number(d.fiber)} min={0} required /></Field>
              </div>
              <Field label="Allergens" hint="Comma separated, e.g. Dairy, Gluten, Peanut">
                <Input name="allergens" defaultValue={d.allergens.join(', ')} maxLength={200} />
              </Field>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Ingredient cost per portion (₹)"><Input type="number" step="0.01" name="cost_per_portion" defaultValue={c ? Number(c.cost_per_portion) : ''} min={0} /></Field>
                <Field label="Gas cost per portion (₹)"><Input type="number" step="0.001" name="gas_cost" defaultValue={c ? Number(c.gas_cost) : ''} min={0} /></Field>
              </div>
              <Field label="Photo" hint="JPG, PNG, WebP or AVIF, up to 5 MB. Replaces the current photo.">
                <Input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" />
              </Field>
              <Checkbox name="is_active" label="Active (used in menus and shown on the website)" defaultChecked={d.is_active} />
            </fieldset>
            {canWrite && <SubmitButton>Save dish</SubmitButton>}
          </ActionForm>
        </Card>
        <div className="space-y-4">
          <Card title="Photo">
            {d.image_url
              ? <Image src={d.image_url} alt={d.name} width={400} height={300} className="w-full rounded-xl object-cover" unoptimized={d.image_url.startsWith('/')} />
              : <p className="text-sm text-gray-500">No photo yet.</p>}
          </Card>
          {notes && <Card title="Kitchen notes (from workbook)"><p className="text-sm text-gray-700">{notes}</p></Card>}
        </div>
      </div>
    </>
  );
}
