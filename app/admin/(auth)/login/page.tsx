import { redirect } from 'next/navigation';
import { ShieldCheck } from 'lucide-react';
import { getStaffContext } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { LoginForm } from './LoginForm';

export const metadata = { title: 'Sign in' };
export const dynamic = 'force-dynamic';

export default async function StaffLoginPage() {
  if (await getStaffContext()) redirect(adminHref('/'));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-[#0E3529] to-[#124233]">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-2xl p-7">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-[#0E3529] flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-lime-brand" />
          </div>
          <div>
            <h1 className="font-heading font-black text-lg text-gray-900 leading-tight">Staff console</h1>
            <p className="text-xs text-gray-500">Authorised staff only. All sign-ins are logged.</p>
          </div>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
