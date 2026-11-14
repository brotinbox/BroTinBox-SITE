import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BadgeIndianRupee, CheckCircle2, ChevronDown, ClipboardCheck, Dumbbell, Gift, Share2 } from 'lucide-react';
import { getCurrentProfile } from '@/lib/auth/session';
import { getPartnerByProfile, getPartnerProgram } from '@/lib/partners/server';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Trainer partner programme',
  description: `Personal trainers in ${BRAND.city}: share your ${BRAND.name} code and earn on every weekly and monthly meal plan your clients take.`,
  alternates: { canonical: '/partners' },
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

export default async function PartnersPage() {
  const [program, profile] = await Promise.all([getPartnerProgram(), getCurrentProfile()]);
  const mine = profile ? await getPartnerByProfile(profile.id) : null;
  const [t1, t2, t3] = program.tiers;
  const top = program.tiers[program.tiers.length - 1];

  // "What you could earn": 6 new monthly clients, 4 of last month's renew.
  const exampleNew = 6;
  const exampleRenew = 4;
  let exampleFirst = 0;
  for (let n = 1; n <= exampleNew; n++) {
    let rate = program.tiers[0].monthly;
    for (const t of program.tiers) if (n >= t.from) rate = t.monthly;
    exampleFirst += rate;
  }
  const exampleTotal = exampleFirst + exampleRenew * program.renewal.monthly;

  const cta = mine
    ? { href: '/partner', label: mine.status === 'approved' ? 'Open your partner dashboard' : 'Check your application' }
    : { href: '/partners/apply', label: 'Apply now' };

  const faqs: [string, string][] = [
    ['When do I get paid?', `Every month on the ${program.payoutDay}th, by UPI, once you have at least ${inr(program.minPayout)} ready. Smaller amounts roll over to the next month.`],
    ['When does a plan count?', `When your client pays for a weekly or monthly plan using your code or link. The commission is confirmed ${program.holdDays} days after their plan starts, if the plan isn't refunded.`],
    ['How do you know the client came from me?', 'Your client enters your code at checkout, or opens your link and the code is filled in for them. Once they pay, they stay linked to you.'],
    ['What about renewals?', `Your client stays linked to you for ${program.linkMonths} months from their first order. Every weekly or monthly plan they pay for in that time earns you commission, renewals included.`],
    ['Does my client get anything?', `Yes. With your code, a new client gets ${program.memberJuices.weekly} free juice${program.memberJuices.weekly === 1 ? '' : 's'} on their first weekly plan, or ${program.memberJuices.monthly} on their first monthly plan, on top of our usual offers.`],
    ['What can I see about my clients?', 'Their first name and initial, which plan they took and what you earned. Never their address, phone number or health data.'],
    ['Can I use my own code?', 'No. Codes are for your clients. Orders on your own account, or on accounts you set up for yourself, are not paid.'],
  ];

  return (
    <div className="pb-16">
      {/* ---------- Hero ---------- */}
      <section className="bg-ink text-white">
        <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 grid gap-8 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-accent-bright">
              <Dumbbell className="w-3.5 h-3.5" /> For personal trainers
            </p>
            <h1 className="font-heading font-black text-3xl sm:text-5xl mt-4 leading-[1.05] text-balance">Earn every time your clients eat right</h1>
            <p className="text-white/75 mt-4 text-sm sm:text-base max-w-lg">
              You plan their training. We cook their protein. Share your {BRAND.name} code with your clients and earn on every weekly and monthly meal plan they take.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link href={cta.href} className="inline-flex h-12 px-6 rounded-xl bg-accent hover:bg-accent-bright font-bold text-sm items-center gap-2">
                {cta.label} <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/partner-terms" className="text-xs font-semibold text-white/60 underline underline-offset-2 hover:text-white">Partner Terms</Link>
            </div>
          </div>
          <div className="rounded-3xl bg-white/5 border border-white/10 p-5">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-white/50">Up to</p>
            <p className="font-heading font-black text-5xl text-accent-bright mt-1">{inr(top.monthly)}</p>
            <p className="text-sm text-white/75">for every client who takes a monthly plan</p>
            <div className="mt-4 border-t border-white/10 pt-4 grid grid-cols-2 gap-3 text-sm">
              <div><p className="font-black text-lg">{inr(program.tiers[0].weekly)}–{inr(top.weekly)}</p><p className="text-white/60 text-xs">per weekly plan</p></div>
              <div><p className="font-black text-lg">{inr(program.renewal.monthly)}</p><p className="text-white/60 text-xs">per monthly renewal</p></div>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-5xl mx-auto px-4 space-y-12 mt-10">
        {/* ---------- 3 steps ---------- */}
        <section>
          <h2 className="font-heading font-black text-2xl text-ink">How it works</h2>
          <ol className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { icon: ClipboardCheck, title: 'Apply', body: 'Tell us about you and your gym. We check every trainer personally and reply on WhatsApp.' },
              { icon: Share2, title: 'Share your code', body: 'Get your own code and link. Send it to clients on WhatsApp or put it in your Instagram bio.' },
              { icon: BadgeIndianRupee, title: 'Get paid every month', body: `Track clients and earnings on your dashboard. We pay by UPI on the ${program.payoutDay}th.` },
            ].map((s, i) => (
              <li key={s.title} className="rounded-2xl border border-gray-200 bg-white p-5">
                <span className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center"><s.icon className="w-5 h-5" /></span>
                <p className="text-[10px] font-bold text-gray-400 mt-3">STEP {i + 1}</p>
                <p className="font-heading font-black text-lg text-ink">{s.title}</p>
                <p className="text-sm text-gray-600 mt-1">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---------- Earnings ---------- */}
        <section className="grid gap-6 md:grid-cols-[1.3fr_1fr]">
          <div>
            <h2 className="font-heading font-black text-2xl text-ink">What you earn</h2>
            <p className="text-sm text-gray-600 mt-1">Bring in more new clients in a month and every one after the milestone earns more.</p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-gray-200 bg-white">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-[11px] uppercase tracking-wider text-gray-500">
                  <tr><th className="text-left px-4 py-2.5">New clients this month</th><th className="text-right px-4 py-2.5">Monthly plan</th><th className="text-right px-4 py-2.5">Weekly plan</th></tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {program.tiers.map((t, i) => {
                    const next = program.tiers[i + 1];
                    const range = next ? (next.from - 1 === t.from ? `${t.from}` : `${t.from}–${next.from - 1}`) : `${t.from}+`;
                    return (
                      <tr key={t.from}>
                        <td className="px-4 py-3 font-semibold text-ink">Client {range}</td>
                        <td className="px-4 py-3 text-right font-black">{inr(t.monthly)}</td>
                        <td className="px-4 py-3 text-right font-bold text-gray-700">{inr(t.weekly)}</td>
                      </tr>
                    );
                  })}
                  <tr className="bg-accent/5">
                    <td className="px-4 py-3 font-semibold text-ink">Every renewal (for {program.linkMonths} months)</td>
                    <td className="px-4 py-3 text-right font-black">{inr(program.renewal.monthly)}</td>
                    <td className="px-4 py-3 text-right font-bold text-gray-700">{inr(program.renewal.weekly)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">Per paid plan, whatever the box size or meals per day. Trial boxes link the client to you but don&apos;t earn commission.</p>
          </div>

          <div className="rounded-2xl bg-ink text-white p-5 self-start">
            <p className="text-[11px] font-extrabold uppercase tracking-wider text-accent-bright">What you could earn</p>
            <p className="text-sm text-white/75 mt-2">In one month, {exampleNew} of your clients start a monthly plan and {exampleRenew} from last month renew:</p>
            <ul className="mt-3 space-y-1.5 text-sm">
              <li className="flex justify-between gap-3"><span className="text-white/70">{exampleNew} new monthly plans</span><span className="font-bold">{inr(exampleFirst)}</span></li>
              <li className="flex justify-between gap-3"><span className="text-white/70">{exampleRenew} renewals × {inr(program.renewal.monthly)}</span><span className="font-bold">{inr(exampleRenew * program.renewal.monthly)}</span></li>
            </ul>
            <div className="mt-3 border-t border-white/15 pt-3 flex justify-between items-baseline">
              <span className="text-sm font-bold">That month</span>
              <span className="font-heading font-black text-3xl text-accent-bright">{inr(exampleTotal)}</span>
            </div>
            {t1 && t2 && <p className="text-[11px] text-white/50 mt-3">Clients 1–{t2.from - 1} at {inr(t1.monthly)}, then {inr(t2.monthly)} from client {t2.from}{t3 ? `, ${inr(t3.monthly)} from client ${t3.from}` : ''}.</p>}
          </div>
        </section>

        {/* ---------- Perk + who ---------- */}
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <span className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Gift className="w-5 h-5" /></span>
            <h2 className="font-heading font-black text-lg text-ink mt-3">Your clients get a welcome gift</h2>
            <p className="text-sm text-gray-600 mt-1">
              With your code, a new client gets <strong>{program.memberJuices.weekly} free juice{program.memberJuices.weekly === 1 ? '' : 's'}</strong> on their first weekly plan
              or <strong>{program.memberJuices.monthly} free juices</strong> on their first monthly plan. That&apos;s on top of our usual first-plan offers.
            </p>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white p-5">
            <span className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center"><Dumbbell className="w-5 h-5" /></span>
            <h2 className="font-heading font-black text-lg text-ink mt-3">Who can apply</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-gray-600">
              {['Working personal trainers and coaches', `Training clients at a gym in our ${BRAND.city} delivery areas`, 'Happy to recommend food you would eat yourself'].map((x) => (
                <li key={x} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-accent shrink-0 mt-0.5" />{x}</li>
              ))}
            </ul>
            <p className="text-xs text-gray-500 mt-3">We check every application personally: a quick call, and sometimes a visit to your gym.</p>
          </div>
        </section>

        {/* ---------- FAQ ---------- */}
        <section>
          <h2 className="font-heading font-black text-2xl text-ink">Questions</h2>
          <div className="mt-4 divide-y divide-gray-200 rounded-2xl border border-gray-200 bg-white">
            {faqs.map(([q, a]) => (
              <details key={q} className="group">
                <summary className="flex items-center justify-between gap-3 cursor-pointer list-none px-4 py-3.5 text-sm font-bold text-ink [&::-webkit-details-marker]:hidden">
                  {q}
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="px-4 pb-4 text-sm text-gray-600">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ---------- CTA ---------- */}
        <section className="rounded-3xl bg-accent text-white p-6 sm:p-8 text-center">
          <h2 className="font-heading font-black text-2xl sm:text-3xl">Ready to recommend {BRAND.name}?</h2>
          <p className="text-white/85 text-sm mt-2">Applying takes two minutes. Sign in with your mobile number to start.</p>
          <Link href={cta.href} className="mt-5 inline-flex h-12 px-6 rounded-xl bg-ink hover:bg-black font-bold text-sm items-center gap-2">
            {cta.label} <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="mt-3 text-[11px] text-white/75">By applying you agree to the <Link href="/partner-terms" className="underline">Partner Terms</Link>.</p>
        </section>
      </div>
    </div>
  );
}
