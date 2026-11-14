'use client';

import { useActionState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { BadgeCheck, Loader2 } from 'lucide-react';
import { applyAsPartner } from '@/lib/partners/actions';
import { cn } from '@/lib/utils';
import { BRAND } from '@/config/brand';

const field = 'w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm text-gray-900 focus:bg-white focus:border-ink focus:outline-none';

function Label({ children, optional }: { children: React.ReactNode; optional?: boolean }) {
  return (
    <span className="block text-xs font-bold text-gray-700 mb-1">
      {children} {optional && <span className="font-normal text-gray-400">(optional)</span>}
    </span>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="w-full h-12 rounded-xl bg-accent hover:bg-accent-bright text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60">
      {pending && <Loader2 className="w-4 h-4 animate-spin" />} {pending ? 'Sending…' : 'Send application'}
    </button>
  );
}

export function PartnerApplyForm({ phone, defaults, areas }: {
  phone: string;
  defaults: { fullName: string; email: string };
  areas: { value: string; label: string }[];
}) {
  const router = useRouter();
  const [state, action] = useActionState(applyAsPartner, null);
  useEffect(() => { if (state?.ok) router.replace('/partner'); }, [state, router]);

  return (
    <form action={action} className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <Label>Full name</Label>
          <input name="fullName" required minLength={2} maxLength={80} defaultValue={defaults.fullName} autoComplete="name" className={field} />
        </label>
        <div>
          <Label>Mobile</Label>
          <p className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-sm text-gray-700">
            <BadgeCheck className="w-4 h-4 text-emerald-600" /> {phone.replace(/^\+91/, '+91 ')}
          </p>
        </div>
        <label className="block">
          <Label>Email</Label>
          <input name="email" type="email" required maxLength={120} defaultValue={defaults.email} autoComplete="email" className={field} />
        </label>
      </div>

      <div className="border-t border-gray-100 pt-4 grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <Label>Gym name</Label>
          <input name="gymName" required minLength={2} maxLength={100} placeholder="Where you train clients" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <Label>Gym area</Label>
          <select name="zone" required defaultValue="" className={field}>
            <option value="" disabled>Pick the area</option>
            {areas.map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}
          </select>
          <span className="block text-[11px] text-gray-500 mt-1">Not listed? We don&apos;t deliver there yet. Message us and we&apos;ll keep you posted.</span>
        </label>
        <label className="block sm:col-span-2">
          <Label optional>Gym Google Maps link</Label>
          <input name="mapsUrl" type="url" maxLength={300} placeholder="https://maps.app.goo.gl/…" className={field} />
        </label>
        <label className="block sm:col-span-2">
          <Label optional>Instagram handle</Label>
          <input name="instagram" maxLength={31} placeholder="@yourhandle" className={field} />
          <span className="block text-[11px] text-gray-500 mt-1">Helps us check your application faster.</span>
        </label>
      </div>

      <div className="border-t border-gray-100 pt-4 grid gap-4 grid-cols-2">
        <label className="block">
          <Label>Years training clients</Label>
          <input name="years" type="number" inputMode="numeric" required min={0} max={60} className={field} />
        </label>
        <label className="block">
          <Label>Active clients (roughly)</Label>
          <input name="clients" type="number" inputMode="numeric" required min={0} max={2000} className={field} />
        </label>
        <label className="block col-span-2">
          <Label optional>How will you share {BRAND.name}?</Label>
          <input name="pitch" maxLength={200} placeholder="e.g. with my PT clients after sessions, gym WhatsApp group" className={field} />
        </label>
      </div>

      <label className="flex items-start gap-2.5 text-sm text-gray-700 border-t border-gray-100 pt-4">
        <input type="checkbox" name="terms" required className="mt-0.5 w-4 h-4 accent-accent" />
        <span>I agree to the <Link href="/partner-terms" target="_blank" className="font-bold text-ink underline underline-offset-2">Partner Terms</Link>.</span>
      </label>

      {state?.message && !state.ok && (
        <p role="alert" className={cn('text-xs font-semibold rounded-lg px-3 py-2 bg-rose-50 text-rose-700')}>{state.message}</p>
      )}
      <Submit />
      <p className="text-[11px] text-gray-500 text-center">We&apos;ll ask for your UPI ID only after you&apos;re approved.</p>
    </form>
  );
}
