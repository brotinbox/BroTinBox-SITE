'use client';

import { useState, useTransition } from 'react';
import { ArrowDown, ArrowUp, Check, MapPin, Route } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BADGE } from '@/components/admin/ui';
import type { ActionResult } from '@/lib/admin/actions';
import { autoSortRun, moveStop, setDeliveryLocation, setDeliveryStatus } from '@/app/admin/(portal)/deliveries/actions';

/** Runs a server action and keeps its message (errors stay until the next try). */
function useAction() {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<ActionResult | null>(null);
  const run = (fn: () => Promise<ActionResult>) => start(async () => setMsg(await fn()));
  return { pending, msg, run, clear: () => setMsg(null) };
}

function Msg({ msg }: { msg: ActionResult | null }) {
  if (!msg?.message || (msg.ok && /^(Saved|Status saved|Order saved)\.$/.test(msg.message))) return null;
  return <p className={cn('text-[11px] font-semibold mt-1', msg.ok ? 'text-emerald-700' : 'text-rose-700')}>{msg.message}</p>;
}

const STATUS_LABELS: Record<string, string> = {
  locked: 'Locked', preparing: 'Preparing', packed: 'Packed',
  out_for_delivery: 'Out for delivery', delivered: 'Delivered', failed: 'Failed',
};

/** The status badge, as a tap-to-change dropdown. */
export function StatusPill({ id, status }: { id: string; status: string }) {
  const { pending, msg, run } = useAction();
  const [value, setValue] = useState(status);
  return (
    <div className="text-right">
      <label className="sr-only" htmlFor={`st-${id}`}>Delivery status</label>
      <select
        id={`st-${id}`}
        value={value}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          const prev = value;
          setValue(next);
          run(async () => {
            const r = await setDeliveryStatus(id, next);
            if (!r.ok) setValue(prev);
            return r;
          });
        }}
        className={cn('appearance-none cursor-pointer rounded-full border pl-3 pr-7 py-1 text-[11px] font-bold disabled:opacity-60',
          'bg-[length:12px] bg-no-repeat bg-[right_8px_center]',
          "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='3'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
          BADGE[value] ?? 'bg-gray-50 text-gray-700 border-gray-200')}
      >
        {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
      <Msg msg={msg} />
    </div>
  );
}

/** Big doorstep button. Hidden once delivered/failed (use the pill to correct). */
export function DeliveredButton({ id }: { id: string }) {
  const { pending, msg, run } = useAction();
  return (
    <span>
      <button type="button" disabled={pending} onClick={() => run(() => setDeliveryStatus(id, 'delivered'))}
        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold disabled:opacity-60">
        <Check className="w-3.5 h-3.5" /> {pending ? 'Saving…' : 'Mark delivered'}
      </button>
      <Msg msg={msg} />
    </span>
  );
}

export function StopMover({ id, date, slot, first, last }: { id: string; date: string; slot: string; first: boolean; last: boolean }) {
  const { pending, msg, run } = useAction();
  const btn = 'w-7 h-7 inline-flex items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-30';
  return (
    <div className="flex flex-col gap-1 print:hidden">
      <button type="button" aria-label="Move up" disabled={pending || first} onClick={() => run(() => moveStop(id, date, slot, 'up'))} className={btn}><ArrowUp className="w-3.5 h-3.5" /></button>
      <button type="button" aria-label="Move down" disabled={pending || last} onClick={() => run(() => moveStop(id, date, slot, 'down'))} className={btn}><ArrowDown className="w-3.5 h-3.5" /></button>
      <Msg msg={msg?.ok ? null : msg} />
    </div>
  );
}

/** Paste a WhatsApp / Google Maps location to pin the customer's address. */
export function LocationEditor({ id, hasPin }: { id: string; hasPin: boolean }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const { pending, msg, run, clear } = useAction();
  if (!open) {
    return (
      <span>
        <button type="button" onClick={() => { setOpen(true); clear(); }}
          className={cn('inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-bold',
            hasPin ? 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50' : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100')}>
          <MapPin className="w-3.5 h-3.5" /> {hasPin ? 'Edit pin' : 'Add location'}
        </button>
        <Msg msg={msg} />
      </span>
    );
  }
  return (
    <div className="w-full mt-2 flex flex-wrap gap-2 items-center">
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste WhatsApp location / Google Maps link"
        className="flex-1 min-w-[220px] rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs focus:outline-none focus:border-primary"
        onKeyDown={(e) => { if (e.key === 'Enter') e.preventDefault(); }}
      />
      <button type="button" disabled={pending || text.trim().length < 3}
        onClick={() => run(async () => {
          const r = await setDeliveryLocation(id, text);
          if (r.ok) { setOpen(false); setText(''); }
          return r;
        })}
        className="rounded-xl bg-primary text-white px-3 py-1.5 text-xs font-bold disabled:opacity-60">
        {pending ? 'Saving…' : 'Save pin'}
      </button>
      <button type="button" onClick={() => { setOpen(false); clear(); }} className="text-xs font-semibold text-gray-500">Cancel</button>
      <div className="w-full"><Msg msg={msg} /></div>
    </div>
  );
}

export function AutoSortButton({ date, slot }: { date: string; slot: string }) {
  const { pending, msg, run } = useAction();
  return (
    <span className="print:hidden">
      <button type="button" disabled={pending} onClick={() => run(() => autoSortRun(date, slot))}
        className="inline-flex items-center gap-1 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-gray-800 hover:bg-gray-50 disabled:opacity-60">
        <Route className="w-3.5 h-3.5" /> {pending ? 'Sorting…' : 'Auto-sort'}
      </button>
      <Msg msg={msg} />
    </span>
  );
}
