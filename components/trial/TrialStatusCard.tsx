'use client';

import Link from 'next/link';
import { ArrowRight, Gift, Clock } from 'lucide-react';
import type { MyTrialStatus } from '@/lib/checkout/trial';
import { usePricing, useRegularTrialPrice } from '@/components/providers/CatalogProvider';
import { guaranteedDiscountPercent } from '@/lib/pricing';
import { BRAND } from '@/config/brand';

const todayIST = () => new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
const dayLabel = (d: string) =>
  new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' });

/**
 * Shown once the customer's one trial box is booked or used:
 *  pending → finish paying (or book a different day)
 *  used, box still to come → "your trial box is coming on …" + plans
 *  used, box delivered / past → "how was it?" + Weekly / Monthly with savings
 * Returns null while the trial is still available.
 */
export function TrialStatusCard({ status, onRebook, className = '' }: {
  status: MyTrialStatus;
  onRebook?: () => void;
  className?: string;
}) {
  const pricing = usePricing();
  const regular = useRegularTrialPrice();
  if (status.state === 'available') return null;

  if (status.state === 'pending') {
    return (
      <section className={`rounded-3xl border border-amber-200 bg-amber-50 p-5 sm:p-6 ${className}`}>
        <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-800"><Clock className="w-3.5 h-3.5" /> Almost there</p>
        <h2 className="font-heading font-black text-lg sm:text-xl text-ink mt-1">Your trial box is saved. Just pay to confirm it.</h2>
        <p className="text-xs text-gray-700 mt-1">
          Want a different day instead? Pick a new one and we&apos;ll swap it for you.
        </p>
        <div className="flex flex-wrap gap-2 mt-4">
          <Link href={`/checkout/pay/${status.orderId}`} className="px-4 py-2.5 rounded-xl bg-ink text-white text-sm font-bold">Finish payment</Link>
          {onRebook && (
            <button type="button" onClick={onRebook} className="px-4 py-2.5 rounded-xl border border-ink/20 bg-white text-sm font-bold text-ink">Book a different day</button>
          )}
        </div>
      </section>
    );
  }

  const weeklySave = guaranteedDiscountPercent(pricing, regular, 'weekly');
  const monthlySave = guaranteedDiscountPercent(pricing, regular, 'monthly');
  const coming = status.ownAccount && !status.delivered && !!status.boxDate && status.boxDate >= todayIST();

  const heading = coming
    ? `Your trial box arrives ${dayLabel(status.boxDate!)} 🍱`
    : status.ownAccount
      ? 'Enjoyed your trial box?'
      : "You've already tried BroTin Box";
  const sub = coming
    ? "Want the meals to keep coming after that? Pick a plan now and there's no gap."
    : status.ownAccount
      ? 'Keep it going with fresh meals 6 days a week. Skip or pause any day you like.'
      : `A trial box was already ordered with your number${status.phoneLast4 ? ` ending ${status.phoneLast4}` : ''}, and it's one per number. Pick a plan to keep going.`;
  const helpUrl = `https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(
    `Hi BroTin Box! It says a trial box was already ordered with my number${status.phoneLast4 ? ` (ending ${status.phoneLast4})` : ''}, but I haven't had one.`
  )}`;

  return (
    <section className={`rounded-3xl bg-ink text-white p-5 sm:p-6 ${className}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-accent-bright"><Gift className="w-3.5 h-3.5" /> {coming ? 'Your trial box' : 'Your next step'}</p>
      <h2 className="font-heading font-black text-xl sm:text-2xl mt-1">{heading}</h2>
      <p className="text-xs text-white/70 mt-1">{sub}</p>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Link href="/weekly" className="group rounded-2xl bg-white text-gray-900 p-3.5 flex flex-col gap-1">
          <span className="font-heading font-black text-base">Weekly</span>
          <span className="text-[11px] text-gray-600">{weeklySave > 0 ? `Save ${weeklySave}% per meal` : '6 days of meals'}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-ink">Choose <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
        </Link>
        <Link href="/monthly" className="group rounded-2xl bg-white text-gray-900 p-3.5 flex flex-col gap-1">
          <span className="flex items-center justify-between gap-1">
            <span className="font-heading font-black text-base">Monthly</span>
            <span className="text-[10px] font-bold bg-accent-soft text-ink px-2 py-0.5 rounded-full">Best value</span>
          </span>
          <span className="text-[11px] text-gray-600">{monthlySave > 0 ? `Save ${monthlySave}% per meal` : 'Lowest price per meal'}</span>
          <span className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-ink">Choose <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" /></span>
        </Link>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        <Link href="/pricing" className="text-xs font-bold text-accent-bright hover:underline">Compare all plans →</Link>
        {!status.ownAccount && (
          <a href={helpUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-white/80 hover:underline">
            Haven&apos;t had a trial? Message us on WhatsApp
          </a>
        )}
      </div>
    </section>
  );
}
