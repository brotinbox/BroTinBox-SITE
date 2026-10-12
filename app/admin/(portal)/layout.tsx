import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { ADMIN_NAV } from '@/lib/admin/nav';
import { ROLE_LABELS } from '@/lib/auth/permissions';
import { AdminSidebar } from '@/components/admin/Sidebar';
import { staffLogout } from '../(auth)/login/actions';

export const dynamic = 'force-dynamic';

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();

  const groups = ADMIN_NAV
    .map((g) => ({ ...g, items: g.items.filter((i) => staff.can(i.permission)) }))
    .filter((g) => g.items.length > 0);

  return (
    <>
      <AdminSidebar
        base={adminHref()}
        groups={groups}
        userName={staff.profile.full_name || staff.profile.email || 'Staff'}
        roleLabel={ROLE_LABELS[staff.role]}
        logoutAction={staffLogout}
      />
      <main className="lg:pl-64">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">{children}</div>
      </main>
    </>
  );
}
