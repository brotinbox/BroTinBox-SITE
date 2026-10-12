import Image from 'next/image';
import type { FieldDef, ResourceDef } from '@/lib/admin/resources';
import { ActionForm, Checkbox, Field, Input, Select, SubmitButton, Textarea } from '@/components/admin/forms';
import { deleteResource, saveResource } from '@/app/admin/(portal)/[resource]/actions';

/** ISO timestamp → "YYYY-MM-DDTHH:mm" in IST for datetime-local inputs. */
function toIstLocal(v: string | null | undefined) {
  if (!v) return '';
  const d = new Date(new Date(v).getTime() + 5.5 * 3600_000);
  return d.toISOString().slice(0, 16);
}

function FieldInput({ f, value, disabled }: { f: FieldDef; value: any; disabled: boolean }) {
  const ro = disabled || f.readOnly;
  switch (f.type) {
    case 'boolean':
      return <Checkbox name={f.name} label={f.label} defaultChecked={value ?? (f.name === 'is_active' ? true : false)} disabled={ro} />;
    case 'textarea':
      return <Field label={f.label} hint={f.hint}><Textarea name={f.name} defaultValue={value ?? ''} maxLength={f.maxLength} required={f.required} readOnly={ro} /></Field>;
    case 'number':
      return <Field label={f.label} hint={f.hint}><Input type="number" name={f.name} defaultValue={value ?? ''} min={f.min} max={f.max} step={f.step ?? 'any'} required={f.required} readOnly={ro} /></Field>;
    case 'select':
      return <Field label={f.label} hint={f.hint}><Select name={f.name} defaultValue={value != null ? String(value) : f.options?.[0]?.value} options={f.options ?? []} disabled={ro} /></Field>;
    case 'tags':
      return <Field label={f.label} hint={f.hint}><Input name={f.name} defaultValue={(value ?? []).join(', ')} readOnly={ro} /></Field>;
    case 'lines':
      return <Field label={f.label} hint={f.hint}><Textarea name={f.name} defaultValue={(value ?? []).join('\n')} readOnly={ro} /></Field>;
    case 'datetime':
      return <Field label={`${f.label} (IST)`} hint={f.hint}><Input type="datetime-local" name={f.name} defaultValue={toIstLocal(value)} required={f.required} readOnly={ro} /></Field>;
    case 'image':
      return (
        <Field label={f.label} hint="JPG, PNG, WebP or AVIF, up to 5 MB">
          {value && <Image src={value} alt="" width={120} height={90} className="mb-2 rounded-lg object-cover" unoptimized={String(value).startsWith('/')} />}
          {!ro && <Input type="file" name={f.name} accept="image/jpeg,image/png,image/webp,image/avif" />}
        </Field>
      );
    default:
      return <Field label={f.label} hint={f.hint}><Input name={f.name} defaultValue={value ?? ''} maxLength={f.maxLength} required={f.required} readOnly={ro} /></Field>;
  }
}

export function ResourceForm({ res, row, canWrite, canDelete }: {
  res: ResourceDef; row: Record<string, any> | null; canWrite: boolean; canDelete: boolean;
}) {
  return (
    <div className="space-y-4">
      <ActionForm action={saveResource} className="space-y-4">
        <input type="hidden" name="__resource" value={res.key} />
        {row && <input type="hidden" name="__id" value={row.id} />}
        <div className="grid sm:grid-cols-2 gap-4">
          {res.fields.map((f) => (
            <div key={f.name} className={f.type === 'textarea' || f.type === 'lines' ? 'sm:col-span-2' : ''}>
              <FieldInput f={f} value={row?.[f.name]} disabled={!canWrite} />
            </div>
          ))}
        </div>
        {canWrite && <SubmitButton>{row ? 'Save changes' : `Create ${res.singular}`}</SubmitButton>}
      </ActionForm>
      {row && canDelete && (
        <ActionForm action={deleteResource} className="pt-4 border-t border-gray-100">
          <input type="hidden" name="__resource" value={res.key} />
          <input type="hidden" name="__id" value={row.id} />
          <SubmitButton variant="danger" confirm={`Delete this ${res.singular}? This cannot be undone.`}>Delete {res.singular}</SubmitButton>
        </ActionForm>
      )}
    </div>
  );
}
