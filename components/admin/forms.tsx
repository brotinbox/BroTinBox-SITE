'use client';

import { useActionState, useEffect, useRef, type ReactNode } from 'react';
import { useFormStatus } from 'react-dom';
import { cn } from '@/lib/utils';
import type { ActionResult } from '@/lib/admin/actions';

export function SubmitButton({ children, pendingText = 'Saving…', variant = 'primary', className, confirm }: {
  children: ReactNode; pendingText?: string; variant?: 'primary' | 'secondary' | 'danger'; className?: string; confirm?: string;
}) {
  const { pending } = useFormStatus();
  const styles = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <button
      type="submit"
      disabled={pending}
      onClick={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
      className={cn('inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-60', styles[variant], className)}
    >
      {pending ? pendingText : children}
    </button>
  );
}

/**
 * Form bound to a server action returning ActionResult. Shows the result
 * message inline and optionally resets on success.
 */
export function ActionForm({ action, children, className, resetOnSuccess = false }: {
  action: (prev: ActionResult | null, formData: FormData) => Promise<ActionResult>;
  children: ReactNode; className?: string; resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok && resetOnSuccess) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className}>
      {children}
      {state?.message && (
        <p role="status" className={cn('mt-3 text-xs font-semibold rounded-lg px-3 py-2',
          state.ok ? 'bg-emerald-50 text-emerald-800' : 'bg-rose-50 text-rose-700')}>
          {state.message}
        </p>
      )}
    </form>
  );
}

const fieldBase = 'w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/15';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-wider text-gray-600 mb-1">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-gray-500 mt-1">{hint}</span>}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={cn(fieldBase, props.className)} />;
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} className={cn(fieldBase, 'min-h-24', props.className)} />;
}

export function Select({ options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { options: { value: string; label: string }[] }) {
  return (
    <select {...props} className={cn(fieldBase, props.className)}>
      {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export function Checkbox({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="inline-flex items-center gap-2 text-sm text-gray-800">
      <input type="checkbox" {...props} className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary/30" />
      <span>{label}</span>
    </label>
  );
}
