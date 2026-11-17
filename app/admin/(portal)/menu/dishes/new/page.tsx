import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { ButtonLink, Card, PageHeader } from '@/components/admin/ui';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/admin/forms';
import { createDish } from '../../actions';

export const metadata = { title: 'New dish' };

const CATEGORIES = [
  { value: 'main', label: 'Main' },
  { value: 'protein_side', label: 'Protein side (eggs / curd)' },
  { value: 'legume', label: 'Legume / sprout' },
  { value: 'salad', label: 'Salad' },
  { value: 'carb', label: 'Carb' },
];

export default async function NewDishPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  await requireStaff('menu.write');
  const asked = (await searchParams).category;
  const category = CATEGORIES.some((c) => c.value === asked) ? asked! : 'main';
  const title = `New ${CATEGORIES.find((c) => c.value === category)!.label.toLowerCase()}`;

  return (
    <>
      <PageHeader
        title={title}
        description="Adds the dish to your library. It does not change the 30-day menu: customers only see it once you put it on a date from the menu calendar."
        actions={<ButtonLink href={adminHref('/menu/dishes')} variant="secondary">← All dishes</ButtonLink>}
      />
      <Card title="Details">
        <ActionForm action={createDish} className="space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Category"><Select name="category" options={CATEGORIES} defaultValue={category} required /></Field>
            <Field label="Diet" hint="Codes: VM/NVM mains, CD sides, LG legumes, SL salads, CB carbs">
              <Select name="diet" options={[{ value: 'veg', label: 'Veg' }, { value: 'non_veg', label: 'Non-veg' }]} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Name"><Input name="name" required maxLength={120} placeholder="e.g. Pepper chicken" /></Field>
            <Field label="Portion description"><Input name="cooked_state" maxLength={120} placeholder="e.g. 100 g boiled" /></Field>
          </div>
          <Field label="Customer description"><Textarea name="description" maxLength={600} /></Field>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <Field label="Grams"><Input type="number" name="grams" min={1} max={2000} required /></Field>
            <Field label="kcal"><Input type="number" step="0.1" name="calories" min={0} required /></Field>
            <Field label="Protein"><Input type="number" step="0.1" name="protein" min={0} required /></Field>
            <Field label="Carbs"><Input type="number" step="0.1" name="carbs" min={0} required /></Field>
            <Field label="Fat"><Input type="number" step="0.1" name="fat" min={0} required /></Field>
            <Field label="Fibre"><Input type="number" step="0.1" name="fiber" min={0} defaultValue={0} required /></Field>
          </div>
          <Field label="Allergens" hint="Comma separated, e.g. Dairy, Gluten, Peanut">
            <Input name="allergens" maxLength={200} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="Ingredient cost per portion (₹)"><Input type="number" step="0.01" name="cost_per_portion" min={0} /></Field>
            <Field label="Gas cost per portion (₹)"><Input type="number" step="0.001" name="gas_cost" min={0} /></Field>
          </div>
          <Field label="Photo" hint="JPG, PNG, WebP or AVIF, up to 5 MB.">
            <Input type="file" name="image" accept="image/jpeg,image/png,image/webp,image/avif" />
          </Field>
          <Checkbox name="contains_egg" label="Contains egg" />
          <Checkbox name="is_active" label="Active (can be picked on the menu calendar)" defaultChecked />
          <SubmitButton pendingText="Adding…">Add dish</SubmitButton>
        </ActionForm>
      </Card>
    </>
  );
}
