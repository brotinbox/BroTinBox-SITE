'use client';

import { useActionState, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import type { CustomerResult } from '@/lib/customer/actions';

export function CustomerForm({ action, children, className }: {
  action: (p: CustomerResult, fd: FormData) => Promise<CustomerResult>;
  children: ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className={className}>
      {children}
      {state?.message && (
        <p role="status" className={cn('mt-2 text-xs font-semibold', state.ok ? 'text-emerald-700' : 'text-rose-700')}>{state.message}</p>
      )}
    </form>
  );
}

export function Btn({ children, variant = 'primary', confirm, pendingText = '…', className }: {
  children: ReactNode; variant?: 'primary' | 'ghost' | 'danger'; confirm?: string; pendingText?: string; className?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: 'bg-[#124233] text-white hover:bg-[#0E3529]',
    ghost: 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50',
    danger: 'bg-white border border-rose-200 text-rose-700 hover:bg-rose-50',
  };
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => { if (confirm && !window.confirm(confirm)) e.preventDefault(); }}
      className={cn('inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-60', styles[variant], className)}
    >
      {pending ? pendingText : children}
    </button>
  );
}
