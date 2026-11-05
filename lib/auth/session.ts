import 'server-only';
import { cache } from 'react';
import { unstable_cache } from 'next/cache';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { getSupabaseService } from '@/lib/supabase/admin';
import { can, isStaffRole, type AppRole } from '@/lib/auth/permissions';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/**
 * Verified user. getClaims() checks the JWT signature against the project's
 * public signing keys (ES256), so it needs no round trip to Supabase Auth.
 * Never trust getSession() on the server. Blocked accounts are still caught
 * by the profile check below; data writes that need a live check call
 * auth.getUser() themselves.
 */
export const getSessionUser = cache(async (): Promise<{ id: string; email: string | null } | null> => {
  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.getClaims();
  const sub = data?.claims?.sub;
  if (error || !sub) return null;
  return { id: sub, email: (data.claims.email as string | undefined) ?? null };
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await getSupabaseServer();
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle();
  return data ?? null;
});

/** Customer pages: signed-in and not blocked, else to /login?next=… */
export async function requireCustomer(next: string) {
  const profile = await getCurrentProfile();
  if (!profile) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (profile.is_blocked) redirect('/login?error=blocked');
  return profile;
}

export type StaffContext = {
  profile: Profile;
  role: AppRole;
  permissions: string[];
  can: (p: string) => boolean;
};

export const getStaffContext = cache(async (): Promise<StaffContext | null> => {
  const profile = await getCurrentProfile();
  if (!profile || profile.is_blocked || !isStaffRole(profile.role)) return null;
  const role = profile.role as AppRole;
  const permissions = role !== 'super_admin' && role !== 'admin' ? await getRolePermissions(role) : [];
  return { profile, role, permissions, can: (p) => can(role, permissions, p) };
});

/**
 * Permissions per role change only through SQL, so they are cached for a few
 * minutes instead of read on every page. The role itself comes from the
 * caller's own (RLS-checked) profile, so the service client is safe here.
 */
const getRolePermissions = unstable_cache(
  async (role: string): Promise<string[]> => {
    const { data } = await getSupabaseService()
      .from('role_permissions')
      .select('permission')
      .eq('role', role as AppRole);
    return (data ?? []).map((r) => r.permission);
  },
  ['role-permissions'],
  { tags: ['role-permissions'], revalidate: 300 }
);

/**
 * Admin pages/actions. Non-staff get a 404 (the portal should not reveal
 * itself); staff without the permission get a 404 too.
 */
export async function requireStaff(permission?: string): Promise<StaffContext> {
  const staff = await getStaffContext();
  if (!staff) notFound();
  if (permission && !staff.can(permission)) notFound();
  return staff;
}

/** Same check for Server Actions: throws instead of rendering a 404. */
export async function assertStaff(permission?: string): Promise<StaffContext> {
  const staff = await getStaffContext();
  if (!staff || (permission && !staff.can(permission))) {
    throw new Error('Not allowed');
  }
  return staff;
}
