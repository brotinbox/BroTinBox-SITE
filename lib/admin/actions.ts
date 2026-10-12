import 'server-only';
import { refresh, revalidateTag } from 'next/cache';
import { assertStaff, type StaffContext } from '@/lib/auth/session';
import { rateLimit } from '@/lib/security/ratelimit';

export type ActionResult = { ok: boolean; message?: string };

export const ok = (message = 'Saved.'): ActionResult => ({ ok: true, message });
export const fail = (message: string): ActionResult => ({ ok: false, message });

/** Turns Postgres/Supabase errors into a short, safe message for staff. */
export function dbError(e: { message?: string; code?: string } | null | undefined): string {
  if (!e) return 'Something went wrong.';
  if (e.code === '42501') return 'You do not have permission to do that.';
  if (e.code === '23505') return 'That already exists (duplicate value).';
  if (e.code === '23503') return 'It is still used elsewhere, so it cannot be removed.';
  if (e.code === '23514' || e.code === '22P02') return 'One of the values is not valid.';
  // Raised by our own SQL functions (P0001 / raise exception): safe to show.
  if (e.message && e.message.length < 200 && !/relation|column|syntax/i.test(e.message)) return e.message;
  return 'Something went wrong. Please try again.';
}

/**
 * Wraps every admin mutation: permission check, per-user rate limit, error
 * handling, public-cache revalidation and a refresh of the current admin page.
 */
export async function staffAction(
  permission: string,
  run: (staff: StaffContext) => Promise<ActionResult | void>,
  opts: { tags?: string[] } = {}
): Promise<ActionResult> {
  let staff: StaffContext;
  try {
    staff = await assertStaff(permission);
  } catch {
    return fail('You do not have permission to do that.');
  }
  const rl = await rateLimit('adminMutation', staff.profile.id);
  if (!rl.success) return fail('Too many changes in a short time. Wait a minute and try again.');
  try {
    const result = await run(staff);
    // Public pages cache catalog data by tag; staff pages are dynamic and
    // simply re-render.
    opts.tags?.forEach((t) => revalidateTag(t, 'max'));
    refresh();
    return result ?? ok();
  } catch (e) {
    return fail(dbError(e as { message?: string; code?: string }));
  }
}
