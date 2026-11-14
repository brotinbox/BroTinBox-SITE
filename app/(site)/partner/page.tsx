import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, Clock, PauseCircle, Users, Wallet, XCircle } from 'lucide-react';
import { requireCustomer } from '@/lib/auth/session';
import { getPartnerByProfile, getPartnerProgram, loadPartnerActivity } from '@/lib/partners/server';
import { commissionStage, nextMilestone, shortName, tierIndex, todayIst } from '@/lib/partners/program';
import { PartnerCodeCard } from '@/components/partners/PartnerCodeCard';
import { PartnerUpiForm } from '@/components/partners/PartnerUpiForm';
import { BRAND } from '@/config/brand';
import { cn } from '@/lib/utils';

export const metadata: Metadata = { title: 'Partner dashboard', robots: { index: false } };

const inr = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const date = (iso: string) => new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
const wa = `https://wa.me/${BRAND.whatsappNumber.replace(/\D/g, '')}`;

const STAGE: Record<string, { label: string; cls: string }> = {
  pending: { label: 'pending', cls: 'bg-amber-50 text-amber-800' },
  approved: { label: 'approved', cls: 'bg-emerald-50 text-emerald-800' },
  paid: { label: 'paid', cls: 'bg-gray-100 text-gray-700' },
  void: { label: 'cancelled', cls: 'bg-rose-50 text-rose-700' },
};

/** Next payout date: this month's payout day if still ahead, else next month's. */
function nextPayoutDate(day: number): string {
  const t = todayIst();
  const [y, m, d] = t.split('-').map(Number);
  const target = d < day ? new Date(Date.UTC(y, m - 1, day)) : new Date(Date.UTC(y, m, day));
  return target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-3xl mx-auto px-4 py-8 sm:py-10 space-y-5">{children}</div>;
}

function Notice({ icon: Icon, title, children }: { icon: typeof Clock; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 text-center">
      <span className="mx-auto w-12 h-12 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Icon className="w-6 h-6" /></span>
      <h1 className="font-heading font-black text-2xl text-ink mt-3">{title}</h1>
      <div className="text-sm text-gray-600 mt-2 space-y-2">{children}</div>
    </section>
  );
}

export default async function PartnerDashboardPage() {
  const profile = await requireCustomer('/partner');
  const partner = await getPartnerByProfile(profile.id);

  if (!partner) {
    return (
      <Shell>
        <Notice icon={Users} title="Are you a personal trainer?">
          <p>Share {BRAND.name} with your clients and earn on every meal plan they take.</p>
          <Link href="/partners" className="mt-3 inline-flex h-11 px-5 rounded-xl bg-accent hover:bg-accent-bright text-white font-bold text-sm items-center gap-2">
            See the partner programme <ArrowRight className="w-4 h-4" />
          </Link>
        </Notice>
      </Shell>
    );
  }

  if (partner.status === 'pending') {
    return (
      <Shell>
        <Notice icon={Clock} title="Application under review">
          <p>Thanks, {partner.full_name.split(' ')[0]}. We check every trainer personally and will message you on WhatsApp at {partner.phone.replace(/^\+91/, '+91 ')}, usually within 2 days.</p>
          <p className="text-xs text-gray-500">Sent {date(partner.created_at)} · {partner.gym_name}, {partner.gym_area}</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-bold text-accent underline underline-offset-2">Questions? Message us on WhatsApp</a>
        </Notice>
      </Shell>
    );
  }

  if (partner.status === 'rejected') {
    return (
      <Shell>
        <Notice icon={XCircle} title="We can't add you right now">
          <p>Thanks for applying. We&apos;re keeping the programme small while we start, so we can&apos;t take your application at the moment. You&apos;re welcome to message us if anything changes.</p>
          <a href={wa} target="_blank" rel="noopener noreferrer" className="inline-block text-xs font-bold text-accent underline underline-offset-2">Message us on WhatsApp</a>
        </Notice>
      </Shell>
    );
  }

  const [program, activity] = await Promise.all([getPartnerProgram(), loadPartnerActivity(partner.id)]);
  const { customers, commissions, payouts, names, summary } = activity;
  const today = todayIst();
  const milestone = nextMilestone(program, summary.firstPlansThisMonth);
  const currentTier = program.tiers[tierIndex(program, summary.firstPlansThisMonth + 1)];
  const milestonePct = milestone
    ? Math.min(100, Math.round((summary.firstPlansThisMonth / (summary.firstPlansThisMonth + milestone.need)) * 100))
    : 100;

  // One row per client: their latest plan and what it earned.
  const byCustomer = new Map<string, typeof commissions>();
  for (const c of commissions) byCustomer.set(c.customer_id, [...(byCustomer.get(c.customer_id) ?? []), c]);
  const clientRows = customers.map((c) => {
    const list = byCustomer.get(c.customer_id) ?? [];
    const latest = list[0];
    const earned = list.filter((x) => x.status !== 'void').reduce((s, x) => s + x.amount, 0);
    return {
      id: c.customer_id,
      name: shortName(names.get(c.customer_id)?.full_name),
      plan: latest ? (latest.plan_type === 'monthly' ? 'Monthly' : 'Weekly') : 'Trial / no plan yet',
      plans: list.filter((x) => x.status !== 'void').length,
      earned,
      stage: latest ? commissionStage(latest, today) : null,
      linkedAt: c.linked_at,
      active: Date.parse(c.linked_until) > Date.now(),
    };
  });

  return (
    <Shell>
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-wider text-accent">Partner dashboard</p>
          <h1 className="font-heading font-black text-3xl text-ink mt-1">Hi {partner.full_name.split(' ')[0]}</h1>
          <p className="text-sm text-gray-600">{partner.gym_name}, {partner.gym_area}</p>
        </div>
        <Link href="/partners" className="text-xs font-bold text-gray-500 underline underline-offset-2 hover:text-ink">How it works</Link>
      </header>

      {partner.status === 'paused' && (
        <div className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <PauseCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p>Your code is paused, so new orders don&apos;t earn commission right now. Earnings already approved will still be paid. <a href={wa} target="_blank" rel="noopener noreferrer" className="font-bold underline">Message us</a> if you have questions.</p>
        </div>
      )}

      {partner.code && partner.status === 'approved' && <PartnerCodeCard code={partner.code} />}

      {/* ---------- This month ---------- */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-heading font-bold text-ink">This month</h2>
        <div className="mt-3 grid grid-cols-3 gap-3 text-center">
          {[
            ['Clients signed up', String(summary.clientsThisMonth)],
            ['New paid plans', String(summary.firstPlansThisMonth)],
            ['Earnings', inr(summary.earnedThisMonth)],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-gray-50 px-2 py-3">
              <p className="font-heading font-black text-2xl text-ink">{value}</p>
              <p className="text-[11px] font-semibold text-gray-500 leading-tight mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <div className="flex items-baseline justify-between gap-2 text-xs">
            <p className="font-bold text-ink">
              {milestone
                ? `${milestone.need} more paid plan${milestone.need === 1 ? '' : 's'} to unlock ${inr(milestone.tier.monthly)} per monthly plan`
                : `Top rate unlocked: ${inr(currentTier.monthly)} per monthly plan`}
            </p>
            <p className="text-gray-500 shrink-0">Now {inr(currentTier.monthly)} / {inr(currentTier.weekly)}</p>
          </div>
          <div className="mt-2 h-2.5 rounded-full bg-gray-100 overflow-hidden">
            <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${milestonePct}%` }} />
          </div>
          <p className="text-[11px] text-gray-500 mt-1.5">Milestones count new clients&apos; first weekly or monthly plans this month. Renewals earn {inr(program.renewal.monthly)} (monthly) or {inr(program.renewal.weekly)} (weekly).</p>
        </div>
      </section>

      {/* ---------- Earnings ---------- */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5">
        <h2 className="font-heading font-bold text-ink">Earnings</h2>
        <div className="mt-3 grid grid-cols-3 gap-3">
          {[
            ['Pending', summary.pending, `Confirmed ${program.holdDays} days after the plan starts`],
            ['Approved', summary.approved, `Paid on ${nextPayoutDate(program.payoutDay)}${summary.approved < program.minPayout ? ` once it reaches ${inr(program.minPayout)}` : ''}`],
            ['Paid', summary.paid, 'All time'],
          ].map(([label, value, hint]) => (
            <div key={label as string} className="rounded-xl border border-gray-100 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{label}</p>
              <p className="font-heading font-black text-xl text-ink mt-0.5">{inr(value as number)}</p>
              <p className="text-[10px] text-gray-500 leading-tight mt-1">{hint}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Clients ---------- */}
      <section className="rounded-2xl border border-gray-200 bg-white">
        <div className="px-5 pt-5 pb-3 flex items-baseline justify-between">
          <h2 className="font-heading font-bold text-ink">Your clients</h2>
          <p className="text-xs text-gray-500">{summary.clients} total</p>
        </div>
        {clientRows.length ? (
          <ul className="divide-y divide-gray-100">
            {clientRows.map((c) => (
              <li key={c.id} className="px-5 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-sm text-ink truncate">{c.name}</p>
                  <p className="text-xs text-gray-500">
                    {c.plan}{c.plans > 1 ? ` · ${c.plans} plans` : ''} · since {date(c.linkedAt)}{!c.active && ' · link ended'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-bold text-sm text-ink">{c.earned ? inr(c.earned) : '—'}</p>
                  {c.stage && <span className={cn('inline-block mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold', STAGE[c.stage].cls)}>{STAGE[c.stage].label}</span>}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-5 pb-5 text-sm text-gray-500">No clients yet. Share your code and they&apos;ll appear here once they order.</p>
        )}
        <p className="px-5 py-3 border-t border-gray-100 text-[11px] text-gray-500">You see first names only. We never share clients&apos; phone numbers, addresses or health details.</p>
      </section>

      {/* ---------- Payouts ---------- */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-accent" />
          <h2 className="font-heading font-bold text-ink">Payouts</h2>
        </div>
        <PartnerUpiForm upiId={partner.upi_id} upiName={partner.upi_name} />
        <p className="text-xs text-gray-500">
          We pay approved earnings by UPI on the {program.payoutDay}th of every month (next: {nextPayoutDate(program.payoutDay)}), once you have at least {inr(program.minPayout)}.
        </p>
        {payouts.length > 0 && (
          <ul className="divide-y divide-gray-100 border-t border-gray-100">
            {payouts.map((p) => (
              <li key={p.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                <div>
                  <p className="font-semibold text-ink">{date(p.paid_at)}</p>
                  <p className="text-[11px] text-gray-500">UPI ref {p.reference}{p.upi_id ? ` · to ${p.upi_id}` : ''}</p>
                </div>
                <p className="font-bold text-ink">{inr(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-center text-[11px] text-gray-500">
        <Link href="/partner-terms" className="underline underline-offset-2">Partner Terms</Link> · <a href={wa} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">Help on WhatsApp</a>
      </p>
    </Shell>
  );
}
