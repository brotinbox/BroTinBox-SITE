/**
 * Mirror of public.has_permission() for showing/hiding UI. The database is the
 * real gate (RLS + function checks); this only decides what to render.
 */
export type AppRole = 'customer' | 'super_admin' | 'admin' | 'kitchen' | 'rider' | 'support';

export const STAFF_ROLES: AppRole[] = ['super_admin', 'admin', 'kitchen', 'rider', 'support'];

export const ROLE_LABELS: Record<AppRole, string> = {
  customer: 'Customer',
  super_admin: 'Super admin',
  admin: 'Admin',
  kitchen: 'Kitchen',
  rider: 'Rider',
  support: 'Support',
};

export function isSuperAdminPermission(p: string) {
  return p.split('.')[0] === 'staff' || ['settings.write', 'pricing.write', 'orders.refund', 'roles.manage'].includes(p);
}

export function can(role: AppRole, rolePermissions: string[], p: string): boolean {
  if (role === 'super_admin') return true;
  if (role === 'admin') return !isSuperAdminPermission(p);
  const resource = p.split('.')[0];
  return rolePermissions.includes(p) || rolePermissions.includes(`${resource}.*`);
}

export function isStaffRole(role: string | null | undefined): role is AppRole {
  return !!role && (STAFF_ROLES as string[]).includes(role);
}
