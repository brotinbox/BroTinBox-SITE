'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { cleanText } from '@/lib/security/request';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';

const uuid = z.string().uuid();
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function addNote(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const customer = uuid.safeParse(fd.get('customer_id'));
  const body = cleanText(fd.get('body'), 5000);
  if (!customer.success || !body) return fail('Write a note first.');
  return staffAction('customers.notes', async (staff) => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('customer_notes').insert({ customer_id: customer.data, body, author_id: staff.profile.id });
    if (error) throw error;
    return ok('Note added.');
  });
}

export async function setTags(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const customer = uuid.safeParse(fd.get('customer_id'));
  if (!customer.success) return fail('Invalid customer.');
  const tags = Array.from(new Set(cleanText(fd.get('tags'), 400).split(',').map((t) => t.trim()).filter(Boolean)))
    .slice(0, 15).map((t) => t.slice(0, 40));
  return staffAction('customers.notes', async () => {
    const supabase = await getSupabaseServer();
    const { data: existing } = await supabase.from('customer_tags').select('tag').eq('customer_id', customer.data);
    const current = new Set((existing ?? []).map((t) => t.tag));
    const toAdd = tags.filter((t) => !current.has(t));
    const toRemove = [...current].filter((t) => !tags.includes(t));
    if (toAdd.length) {
      const { error } = await supabase.from('customer_tags').insert(toAdd.map((tag) => ({ customer_id: customer.data, tag })));
      if (error) throw error;
    }
    if (toRemove.length) {
      const { error } = await supabase.from('customer_tags').delete().eq('customer_id', customer.data).in('tag', toRemove);
      if (error) throw error;
    }
    return ok('Tags updated.');
  });
}

export async function setBlocked(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const customer = uuid.safeParse(fd.get('customer_id'));
  const blocked = fd.get('blocked') === 'true';
  if (!customer.success) return fail('Invalid customer.');
  return staffAction('customers.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.from('profiles').update({ is_blocked: blocked }).eq('id', customer.data);
    if (error) throw error;
    return ok(blocked ? 'Customer blocked. They can no longer sign in or order.' : 'Customer unblocked.');
  });
}

export async function staffSkipDelivery(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = uuid.safeParse(fd.get('delivery_id'));
  if (!id.success) return fail('Invalid meal.');
  const undo = fd.get('undo') === 'true';
  return staffAction('subscriptions.write', async () => {
    const supabase = await getSupabaseServer();
    const { data, error } = undo
      ? await supabase.rpc('unskip_delivery', { p_delivery: id.data })
      : await supabase.rpc('skip_delivery', { p_delivery: id.data });
    if (error) throw error;
    const d = data as { make_up_date?: string } | null;
    return ok(undo ? 'Meal restored.' : `Meal skipped. Make-up meal added on ${d?.make_up_date ?? 'the next free day'}.`);
  });
}

export async function staffPause(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const sub = uuid.safeParse(fd.get('subscription_id'));
  const from = isoDate.safeParse(fd.get('from'));
  const until = isoDate.safeParse(fd.get('until'));
  if (!sub.success || !from.success || !until.success) return fail('Choose both dates.');
  return staffAction('subscriptions.write', async () => {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.rpc('pause_subscription', { p_sub: sub.data, p_from: from.data, p_until: until.data });
    if (error) throw error;
    return ok(`Paused. ${(data as { paused_meals?: number })?.paused_meals ?? 0} meals moved to the end of the plan.`);
  });
}

export async function staffResume(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const sub = uuid.safeParse(fd.get('subscription_id'));
  if (!sub.success) return fail('Invalid subscription.');
  return staffAction('subscriptions.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('resume_subscription', { p_sub: sub.data });
    if (error) throw error;
    return ok('Subscription resumed.');
  });
}

export async function staffCancelSubscription(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const sub = uuid.safeParse(fd.get('subscription_id'));
  const reason = cleanText(fd.get('reason'), 500) || 'Cancelled by staff';
  if (!sub.success) return fail('Invalid subscription.');
  return staffAction('subscriptions.write', async () => {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase.rpc('cancel_subscription', { p_sub: sub.data, p_reason: reason });
    if (error) throw error;
    return ok(`Cancelled. ${(data as { meals_cancelled?: number })?.meals_cancelled ?? 0} future meals removed. Refund manually if needed.`);
  });
}

export async function staffAddCredit(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const sub = uuid.safeParse(fd.get('subscription_id'));
  const count = z.coerce.number().int().min(1).max(30).safeParse(fd.get('count'));
  const slot = z.enum(['lunch', 'dinner']).safeParse(fd.get('slot'));
  const reason = cleanText(fd.get('reason'), 300);
  if (!sub.success || !count.success || !slot.success) return fail('Check the number of meals and slot.');
  if (!reason) return fail('Give a reason (it is shown in the activity log).');
  return staffAction('subscriptions.write', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('admin_add_meal_credit', { p_sub: sub.data, p_count: count.data, p_slot: slot.data, p_reason: reason });
    if (error) throw error;
    return ok(`${count.data} meal(s) added to the end of the plan.`);
  });
}
