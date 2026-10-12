'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAddress } from '@/lib/checkout/actions';

const FIELDS = [
  ['recipientName', 'Full name', 80], ['phone', '10-digit mobile', 10], ['flat', 'Flat / house no.', 120],
  ['street', 'Street', 160], ['landmark', 'Landmark (optional)', 120], ['area', 'Area', 80],
  ['pincode', 'Pincode', 6], ['instructions', 'Delivery note (optional)', 300],
] as const;

export function AddAddressForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) {
    return <button onClick={() => setOpen(true)} className="text-xs font-bold text-[#124233]">+ Add address</button>;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await saveAddress({
      recipientName: v.recipientName ?? '', phone: (v.phone ?? '').replace(/\D/g, ''), flat: v.flat ?? '', street: v.street ?? '',
      landmark: v.landmark, area: v.area ?? '', pincode: v.pincode ?? '', instructions: v.instructions, makeDefault: v.makeDefault === 'on',
    });
    setBusy(false);
    if (!r.ok) { setMsg({ ok: false, text: r.error }); return; }
    setMsg({ ok: true, text: r.deliverable ? 'Address saved.' : 'Saved, but we don’t deliver to this pincode yet.' });
    setV({});
    setOpen(false);
    router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-2 pt-2">
      <div className="grid sm:grid-cols-2 gap-2">
        {FIELDS.map(([k, label, max]) => (
          <input key={k} placeholder={label} maxLength={max} value={v[k] ?? ''}
            inputMode={k === 'phone' || k === 'pincode' ? 'numeric' : undefined}
            onChange={(e) => setV({ ...v, [k]: k === 'phone' || k === 'pincode' ? e.target.value.replace(/\D/g, '') : e.target.value })}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm focus:bg-white focus:border-[#124233] focus:outline-none" />
        ))}
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-700">
        <input type="checkbox" checked={v.makeDefault === 'on'} onChange={(e) => setV({ ...v, makeDefault: e.target.checked ? 'on' : '' })} /> Make default
      </label>
      {msg && <p className={msg.ok ? 'text-xs font-semibold text-emerald-700' : 'text-xs font-semibold text-rose-700'}>{msg.text}</p>}
      <div className="flex gap-2">
        <button disabled={busy} className="px-4 py-2 rounded-xl bg-[#124233] text-white text-xs font-bold disabled:opacity-60">{busy ? 'Saving…' : 'Save address'}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl border border-gray-200 text-xs font-bold">Cancel</button>
      </div>
    </form>
  );
}
