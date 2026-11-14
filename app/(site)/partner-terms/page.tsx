import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyValue, LegalPage, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL } from '@/config/legal';
import { getPartnerProgram } from '@/lib/partners/server';

export const metadata: Metadata = {
  title: 'Partner Terms',
  description: `Terms for personal trainers in the ${LEGAL.tradeName} partner programme: codes, commission, payouts and conduct.`,
  alternates: { canonical: '/partner-terms' },
};

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const wa = `https://wa.me/${LEGAL.whatsapp.replace(/\D/g, '')}`;

export default async function PartnerTermsPage() {
  const p = await getPartnerProgram();
  const us = LEGAL.entityName || LEGAL.tradeName;

  const sections: LegalSection[] = [
    {
      id: 'about',
      title: 'About these terms',
      body: (
        <>
          <p>
            These terms apply to the {LEGAL.tradeName} trainer partner programme (&quot;the Programme&quot;), run by {us} (&quot;we&quot;, &quot;us&quot;). You accept them when you apply. Our{' '}
            <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link> also apply to your account.
          </p>
          <p>The current rates and rules are shown on the <Link href="/partners">partner programme page</Link>. They form part of these terms.</p>
        </>
      ),
    },
    {
      id: 'joining',
      title: 'Joining',
      body: (
        <ul>
          <li>The Programme is for working personal trainers and coaches. We review every application and decide at our discretion whether to accept it. We don&apos;t have to give a reason.</li>
          <li>The details you give us must be true and current. One partner account per person.</li>
          <li>Your code works only after we approve you. We choose or confirm the code and may change it if needed (we will tell you).</li>
        </ul>
      ),
    },
    {
      id: 'referrals',
      title: 'How a client counts as yours',
      body: (
        <ul>
          <li>A client is linked to you when they pay for an order using your code, or after opening your link (which fills in your code).</li>
          <li>Your code only works for <strong>new customers</strong>: people who have not yet bought a weekly or monthly plan from us and are not already linked to another partner. A trial box with your code links the client to you.</li>
          <li>Each customer can use one code, ever. Your code can&apos;t be combined with a friend&apos;s referral code.</li>
          <li>The link lasts <strong>{p.linkMonths} months</strong> from the client&apos;s first paid order with your code.</li>
          <li>Our records decide whether an order used your code. We can&apos;t add a code to an order after it is paid.</li>
        </ul>
      ),
    },
    {
      id: 'commission',
      title: 'Commission',
      body: (
        <>
          <p>You earn a fixed amount for every weekly or monthly plan a linked client pays for while the link lasts:</p>
          <KeyValue rows={[
            ["Client's first plan", `By how many new clients' first plans you brought in that calendar month: ${p.tiers.map((t) => `from client ${t.from}: ${inr(t.monthly)} per monthly / ${inr(t.weekly)} per weekly plan`).join('; ')}.`],
            ['Renewals', `${inr(p.renewal.monthly)} per monthly plan and ${inr(p.renewal.weekly)} per weekly plan.`],
            ['Not paid on', 'Trial boxes, add-ons bought alone, delivery or other fees, and plans that are refunded or cancelled.'],
            ['When it is confirmed', `A commission is "pending" until ${p.holdDays} days after the plan's first delivery day. It then becomes "approved" if the order has not been refunded or cancelled. If a plan is refunded or cancelled, its commission is cancelled; if it was already paid to you, we may take it off your next payout.`],
          ]} />
          <p>The rate for an order is the rate on the <Link href="/partners">partner page</Link> when that order is paid.</p>
        </>
      ),
    },
    {
      id: 'payouts',
      title: 'Payouts',
      body: (
        <ul>
          <li>We pay approved commission by UPI on or around the <strong>{p.payoutDay}th of each month</strong>, once your approved total is at least <strong>{inr(p.minPayout)}</strong>. Smaller amounts carry over to the next month.</li>
          <li>Payouts go only to the UPI ID saved in your partner dashboard, which must be in your own name. We are not responsible for money sent to a wrong UPI ID you gave us.</li>
          <li>Commission has no other cash value and can&apos;t be transferred to anyone else.</li>
        </ul>
      ),
    },
    {
      id: 'tax',
      title: 'Tax',
      body: (
        <p>
          Commission is your income and you are responsible for any tax on it. Where Indian law requires us to deduct tax at source (TDS) on commission, we will deduct it at the applicable rate and give you the
          certificate. We may ask for your PAN before paying you; without it, the law may require a higher deduction.
        </p>
      ),
    },
    {
      id: 'conduct',
      title: 'How you share us',
      body: (
        <>
          <p>When you recommend {LEGAL.tradeName}, you agree to:</p>
          <ul>
            <li><strong>Be honest about the food.</strong> Use the menu, prices and nutrition shown on our website. Don&apos;t promise health or medical results: our meals are not a treatment for any condition and are not a substitute for medical advice.</li>
            <li><strong>Say you earn from it.</strong> When you post publicly (Instagram, YouTube, a gym notice), make it clear that you earn a commission, for example &quot;I earn a commission if you use my code&quot;, as advertising rules require.</li>
            <li><strong>No spam.</strong> Share your code with your own clients and contacts. Don&apos;t send bulk unsolicited messages, add people to groups without asking, or post your code on coupon or deal websites.</li>
            <li><strong>No fake or self orders.</strong> Orders on your own account, on accounts you control, or made up to earn commission are not paid. Don&apos;t pay or offer clients money to use your code.</li>
            <li><strong>Don&apos;t speak for us.</strong> You are not our employee or agent. Don&apos;t offer discounts, refunds or promises we haven&apos;t made, or run paid ads using our name or logo.</li>
          </ul>
          <p>If you break these rules we may cancel the commission involved, pause your code or end your partnership.</p>
        </>
      ),
    },
    {
      id: 'privacy',
      title: "Your clients' privacy",
      body: (
        <p>
          In your dashboard you see each linked client&apos;s first name and initial, the type of plan, and what you earned. We do not share their phone number, address, orders or health details, and you must not ask us for them.
          Keep anything a client tells you about their orders confidential.
        </p>
      ),
    },
    {
      id: 'relationship',
      title: 'Our relationship',
      body: (
        <p>
          You take part as an independent professional. Nothing in these terms makes you our employee, agent or partner in law, and you can&apos;t sign anything or make commitments for us. You are free to work with
          other businesses, including other food businesses.
        </p>
      ),
    },
    {
      id: 'ending',
      title: 'Pausing and ending',
      body: (
        <ul>
          <li>You can leave at any time by messaging us. We can pause your code or end your partnership at any time, with immediate effect if you break these terms.</li>
          <li>While your code is paused or after you leave, it stops working and linked clients stop earning commission.</li>
          <li>Commission you earned before then is still paid once approved, unless it came from fake orders or broke these terms.</li>
          <li>We may close the Programme. If we do, we will tell you at least 15 days ahead and pay commission earned until then.</li>
        </ul>
      ),
    },
    {
      id: 'changes',
      title: 'Changes to the Programme',
      body: (
        <p>
          We may change the rates, milestones, payout rules or these terms. We will tell you at least 15 days before a change that lowers your earnings, on WhatsApp or by email. Orders paid before a change follow the
          rules at the time they were paid.
        </p>
      ),
    },
    {
      id: 'liability',
      title: 'Liability, law and contact',
      body: (
        <>
          <p>
            Apart from paying commission you have earned, we are not liable to you for lost income or other indirect losses from the Programme. These terms are governed by the laws of India and the courts at{' '}
            {LEGAL.jurisdiction} have jurisdiction.
          </p>
          <p>
            Questions: <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp {LEGAL.supportPhone}</a> or <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>.
          </p>
        </>
      ),
    },
  ];

  return (
    <LegalPage
      title="Partner Terms"
      current="/partner-terms"
      summary={[
        'For personal trainers we approve. Share your code; new clients who use it are linked to you.',
        `Earn on every weekly or monthly plan a linked client pays for, for ${p.linkMonths} months. Renewals included.`,
        `Commission is confirmed ${p.holdDays} days after a plan starts and paid by UPI monthly (minimum ${inr(p.minPayout)}).`,
        'Be honest: no health promises, no spam, no self or fake orders, and say you earn a commission when you post.',
        "You are independent, not our employee. Either of us can end it; earned commission is still paid.",
      ]}
      sections={sections}
    />
  );
}
