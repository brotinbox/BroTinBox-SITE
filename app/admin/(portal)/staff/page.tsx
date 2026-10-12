import { requireStaff } from '@/lib/auth/session';
import { getSupabaseServer } from '@/lib/supabase/server';
import { ROLE_LABELS, type AppRole } from '@/lib/auth/permissions';
import { Card, DataTable, PageHeader, StatusBadge, fmtDate } from '@/components/admin/ui';
import { ActionForm, Field, Input, Select, SubmitButton } from '@/components/admin/forms';
import { assignRole, changeRole } from './actions';

export const metadata = { title: 'Staff & roles' };

const ROLE_OPTIONS = (['super_admin', 'admin', 'kitchen', 'support', 'rider'] as AppRole[]).map((r) => ({ value: r, label: ROLE_LABELS[r] }));

const ROLE_HELP: [AppRole, string][] = [
  ['super_admin', 'Everything, including staff accounts, prices, refunds and site settings.'],
  ['admin', 'Daily operations: customers, orders (mark paid), subscriptions, menu, catalog, blog, coupons, zones.'],
  ['kitchen', 'Cook sheet, deliveries (status and riders), menu (read only).'],
  ['support', 'Customers (read + notes), orders and subscriptions (pause/skip on behalf), enquiries, reviews.'],
  ['rider', 'Reserved for the rider app (assigned deliveries only).'],
];

export default async function StaffPage() {
  const me = await requireStaff('staff.manage');
  const supabase = await getSupabaseServer();
  const { data: staff } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, last_seen_at, is_blocked')
    .neq('role', 'customer')
    .order('role');

  return (
    <>
      <PageHeader title="Staff & roles" description="Who can use this console and what they can do." />
      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          <Card title="Staff" padded={false}>
            <DataTable
              rows={(staff ?? []) as any[]}
              rowKey={(r) => r.id}
              columns={[
                { header: 'Person', cell: (r) => <div><p className="font-semibold">{r.full_name || '—'}{r.id === me.profile.id && <span className="ml-1 text-xs text-gray-500">(you)</span>}</p><p className="text-xs text-gray-500">{r.email}</p></div> },
                { header: 'Role', cell: (r) => <StatusBadge value={r.role} label={ROLE_LABELS[r.role as AppRole]} /> },
                { header: 'Last sign-in', cell: (r) => <span className="text-xs">{fmtDate(r.last_seen_at, true)}</span> },
                { header: 'Change', cell: (r) => r.id === me.profile.id ? <span className="text-xs text-gray-400">—</span> : (
                  <ActionForm action={changeRole} className="flex gap-2 items-center">
                    <input type="hidden" name="user_id" value={r.id} />
                    <Select name="role" defaultValue={r.role} options={[...ROLE_OPTIONS, { value: 'customer', label: 'Remove staff access' }]} className="w-44" />
                    <SubmitButton variant="secondary" pendingText="…">Save</SubmitButton>
                  </ActionForm>
                ) },
              ]}
            />
          </Card>
          <Card title="Add a staff member">
            <ol className="text-sm text-gray-700 list-decimal ml-5 space-y-1 mb-4">
              <li>In Supabase → Authentication → Users, click <b>Add user</b>, enter their email and a strong password (12+ characters), and tick <b>Auto confirm</b>.</li>
              <li>Enter the same email below and choose their role.</li>
              <li>Share this console&apos;s address and their password privately (not over a group chat).</li>
            </ol>
            <ActionForm action={assignRole} className="grid sm:grid-cols-3 gap-3 items-end" resetOnSuccess>
              <Field label="Email"><Input name="email" type="email" required maxLength={254} /></Field>
              <Field label="Role"><Select name="role" defaultValue="admin" options={ROLE_OPTIONS} /></Field>
              <SubmitButton>Give access</SubmitButton>
            </ActionForm>
          </Card>
        </div>
        <Card title="What each role can do">
          <ul className="space-y-3 text-sm">
            {ROLE_HELP.map(([r, text]) => (
              <li key={r}><StatusBadge value={r} label={ROLE_LABELS[r]} /><p className="text-gray-600 mt-1">{text}</p></li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
