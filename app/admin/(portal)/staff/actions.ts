'use server';

import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase/server';
import { fail, ok, staffAction, type ActionResult } from '@/lib/admin/actions';

const ROLES = ['super_admin', 'admin', 'kitchen', 'support', 'rider', 'customer'] as const;

export async function assignRole(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const email = z.string().trim().toLowerCase().email().max(254).safeParse(fd.get('email'));
  const role = z.enum(ROLES).safeParse(fd.get('role'));
  if (!email.success || !role.success) return fail('Enter a valid email and role.');
  return staffAction('staff.manage', async () => {
    const supabase = await getSupabaseServer();
    // Match the confirmed login email (auth.users), not the editable profile copy.
    const { data: userId, error: findError } = await supabase.rpc('staff_user_by_email', { p_email: email.data });
    if (findError) throw findError;
    if (!userId) return fail('No confirmed account with that email. Create it first in Supabase → Authentication → Users (or have them sign in once).');
    const { error } = await supabase.rpc('set_staff_role', { p_user: userId, p_role: role.data });
    if (error) throw error;
    return ok(`${email.data} is now ${role.data.replace('_', ' ')}.`);
  });
}

export async function changeRole(_p: ActionResult | null, fd: FormData): Promise<ActionResult> {
  const id = z.string().uuid().safeParse(fd.get('user_id'));
  const role = z.enum(ROLES).safeParse(fd.get('role'));
  if (!id.success || !role.success) return fail('Invalid request.');
  return staffAction('staff.manage', async () => {
    const supabase = await getSupabaseServer();
    const { error } = await supabase.rpc('set_staff_role', { p_user: id.data, p_role: role.data });
    if (error) throw error;
    return ok(role.data === 'customer' ? 'Staff access removed.' : 'Role updated.');
  });
}
