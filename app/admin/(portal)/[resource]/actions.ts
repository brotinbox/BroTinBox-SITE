'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { getResource, type FieldDef } from '@/lib/admin/resources';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';
import { uploadImage } from '@/lib/admin/upload';
import { adminHref } from '@/lib/admin/paths';

class ValidationError extends Error {}

/** IST datetime-local ("2026-10-12T09:30") → ISO timestamp. */
function istToIso(v: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) throw new ValidationError('Invalid date/time.');
  return new Date(`${v}:00+05:30`).toISOString();
}

function parseField(f: FieldDef, fd: FormData): unknown {
  const raw = fd.get(f.name);
  const str = typeof raw === 'string' ? raw : '';
  const empty = str.trim() === '';
  if (f.required && empty && f.type !== 'boolean' && f.type !== 'image') throw new ValidationError(`${f.label} is required.`);

  switch (f.type) {
    case 'boolean':
      return raw === 'on';
    case 'number': {
      if (empty) return null;
      const n = Number(str);
      if (!Number.isFinite(n) || (f.min !== undefined && n < f.min) || (f.max !== undefined && n > f.max)) {
        throw new ValidationError(`${f.label} must be between ${f.min ?? '-∞'} and ${f.max ?? '∞'}.`);
      }
      return n;
    }
    case 'select': {
      if (empty) return null;
      if (!f.options?.some((o) => o.value === str)) throw new ValidationError(`Choose a valid ${f.label.toLowerCase()}.`);
      return /^\d+$/.test(str) ? Number(str) : str;
    }
    case 'tags':
      return cleanText(str, 1000).split(',').map((t) => t.trim().slice(0, 60)).filter(Boolean).slice(0, 30);
    case 'lines':
      return cleanText(str, 5000).split('\n').map((t) => t.trim().slice(0, 200)).filter(Boolean).slice(0, 30);
    case 'datetime':
      return empty ? null : istToIso(str);
    case 'upper':
      return empty ? null : cleanText(str, f.maxLength ?? 100).toUpperCase();
    case 'text':
    case 'textarea':
    default:
      return empty ? null : cleanText(str, f.maxLength ?? (f.type === 'textarea' ? 5000 : 300));
  }
}

export async function saveResource(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = getResource(String(fd.get('__resource') ?? ''));
  if (!res) return fail('Unknown section.');
  const idRaw = String(fd.get('__id') ?? '');
  const id = idRaw ? z.string().uuid().safeParse(idRaw) : null;
  if (id && !id.success) return fail('Invalid record.');
  if (!id && !res.creatable) return fail('New records cannot be created here.');

  let newId: string | null = null;
  const result = await staffAction(res.writePermission, async () => {
    const supabase = await getSupabaseServer();
    const row: Record<string, unknown> = {};
    try {
      for (const f of res.fields) {
        if (f.readOnly) continue;
        if (f.type === 'image') {
          const file = fd.get(f.name);
          if (file instanceof File && file.size > 0 && res.imageBucket) {
            row[f.name] = await uploadImage(supabase, res.imageBucket, file, res.key);
          }
          continue;
        }
        row[f.name] = parseField(f, fd);
      }
    } catch (e) {
      if (e instanceof ValidationError) return fail(e.message);
      throw e;
    }

    // Empty values: on create, let DB defaults apply; on edit, clear text,
    // dates and nullable numbers, but leave other numbers unchanged.
    for (const f of res.fields) {
      if (row[f.name] !== null) continue;
      if (!id || (f.type === 'number' && !f.nullable)) delete row[f.name];
    }

    const table = supabase.from(res.table) as any;
    if (id) {
      const { error } = await table.update(row).eq('id', id.data);
      if (error) throw error;
      return ok(`${res.singular[0].toUpperCase()}${res.singular.slice(1)} saved.`);
    }
    const { data, error } = await table.insert(row).select('id').single();
    if (error) throw error;
    newId = data.id;
    return ok('Created.');
  }, { tags: res.revalidate });

  if (newId) redirect(adminHref(`/${res.key}/${newId}`));
  return result;
}

export async function deleteResource(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const res = getResource(String(fd.get('__resource') ?? ''));
  const id = z.string().uuid().safeParse(fd.get('__id'));
  if (!res || !res.deletePermission || !id.success) return fail('Cannot delete this.');
  let done = false;
  const result = await staffAction(res.deletePermission, async () => {
    const supabase = await getSupabaseServer();
    const { error } = await (supabase.from(res.table) as any).delete().eq('id', id.data);
    if (error) throw error;
    done = true;
    return ok('Deleted.');
  }, { tags: res.revalidate });
  if (done) redirect(adminHref(`/${res.key}`));
  return result;
}
