import 'server-only';
import { cache } from 'react';
import { notFound, redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase/server';
import { can, isStaffRole, type AppRole } from '@/lib/auth/permissions';
import type { Database } from '@/types/database';

export type Profile = Database['public']['Tables']['profiles']['Row'];

/** Verified user (getUser() checks the JWT with Supabase; never trust getSession() on the server). */
export const getSessionUser = cache(async () => {
  const supabase = await getSupabaseServer();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
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
  let permissions: string[] = [];
  if (role !== 'super_admin' && role !== 'admin') {
    const supabase = await getSupabaseServer();
    const { data } = await supabase.from('role_permissions').select('permission').eq('role', profile.role);
    permissions = (data ?? []).map((r) => r.permission);
  }
  return { profile, role, permissions, can: (p) => can(role, permissions, p) };
});

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
