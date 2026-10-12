import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyValue, LegalPage, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL } from '@/config/legal';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy',
  description: `How cancellations, skipped meals, meal credits and refunds work at ${LEGAL.tradeName}.`,
  alternates: { canonical: '/refund-policy' },
};

const cutoff = BRAND.cutoffTime.replace(' previous night', '');
const wa = `https://wa.me/${LEGAL.whatsapp.replace(/\D/g, '')}`;

const sections: LegalSection[] = [
  {
    id: 'cutoff',
    title: 'The 9 PM cutoff',
    body: (
      <p>
        We buy ingredients and plan cooking the night before each delivery. So every meal can be skipped, paused, changed or cancelled free of charge until{' '}
        <strong>{cutoff} IST on the day before delivery</strong>. After the cutoff the meal is &quot;locked&quot;: it will be cooked and delivered, and it counts as used.
      </p>
    ),
  },
  {
    id: 'unpaid',
    title: 'Unpaid orders',
    body: (
      <p>
        If you place an order but do not complete payment, nothing is charged. Orders awaiting UPI payment are cancelled automatically after 48 hours.
      </p>
    ),
  },
  {
    id: 'trial',
    title: 'Trial box',
    body: (
      <ul>
        <li>Cancel before the cutoff: <strong>full refund</strong>.</li>
        <li>After the cutoff the box is being prepared, so it cannot be cancelled. Quality problems are still covered by section 6.</li>
      </ul>
    ),
  },
  {
    id: 'skip-pause',
    title: 'Skips and pauses become meal credits',
    body: (
      <>
        <p>
          On a weekly or monthly plan, a meal you skip or pause before the cutoff is <strong>not lost and not refunded</strong>. It becomes a meal credit, and your plan&apos;s end date
          moves forward so you still receive every meal you paid for. You can pause for 1 to 30 days at a time.
        </p>
        <p>If you would rather have money back than credits, cancel the plan (section 5). Unused credits are refunded at that point.</p>
      </>
    ),
  },
  {
    id: 'cancel-plan',
    title: 'Cancelling a weekly or monthly plan',
    body: (
      <>
        <p>
          You can cancel at any time, for any reason (for example, moving out of {LEGAL.city}), by messaging us on WhatsApp or emailing us. We charge no cancellation fee.
        </p>
        <ul>
          <li>Meals already delivered, and meals locked by the cutoff when you cancel, are charged.</li>
          <li>All other meals, including unused meal credits, are <strong>refunded at the per-meal rate you actually paid</strong>: the total you paid (after any discount) divided by the number of meals in your plan.</li>
        </ul>
        <KeyValue rows={[
          ['Example', 'You paid ₹6,000 for a 24-meal plan, so ₹250 per meal. You cancel after 10 meals are delivered or locked. Refund: 14 × ₹250 = ₹3,500.'],
        ]} />
        <p>We never recalculate delivered meals at a higher one-off price.</p>
      </>
    ),
  },
  {
    id: 'quality',
    title: 'Missing, wrong, damaged or unsafe meals',
    body: (
      <>
        <p>
          If a meal is missing, wrong (including the wrong diet type, for example non-veg sent to a veg customer), spilled, damaged, spoiled, contains a foreign object, or contains
          an allergen you told us about, report it <strong>within 2 hours of delivery</strong>. Send your order number and a photo on{' '}
          <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp ({LEGAL.supportPhone})</a> or email <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>.
          Please keep the meal and packaging until we reply.
        </p>
        <p>Once confirmed, you choose one of:</p>
        <ul>
          <li>a replacement meal in the next available slot;</li>
          <li>a meal credit added to your plan; or</li>
          <li>a full refund for that meal.</li>
        </ul>
        <p>
          <strong>If you feel unwell after eating our food</strong>, seek medical help first, then contact us as soon as you can. We will investigate with the kitchen and keep records.
          This section does not limit your rights under the Food Safety and Standards Act, 2006 or the Consumer Protection Act, 2019, and the 2-hour window does not apply to safety complaints.
        </p>
        <p>
          If you did not enjoy a dish, please tell us. We use the feedback to improve, and we may offer a goodwill credit, but taste alone is not grounds for a refund once a meal has been eaten.
        </p>
      </>
    ),
  },
  {
    id: 'our-failures',
    title: 'When we miss or are late with a delivery',
    body: (
      <ul>
        <li>If we fail to deliver a meal, or cancel a delivery day (for example, for a kitchen closure or a holiday announced at short notice), you get a meal credit or a refund for that meal, whichever you choose.</li>
        <li>If a delivery arrives more than 60 minutes after the end of its slot through our fault and you no longer want it, tell us within 2 hours and you get a credit or refund for that meal.</li>
        <li>If we cancel a paid order or plan for any reason, we refund every undelivered meal in full.</li>
      </ul>
    ),
  },
  {
    id: 'not-refundable',
    title: 'When a meal is not refundable',
    body: (
      <>
        <p>A meal counts as delivered, and is not refunded, when delivery fails for reasons within your control:</p>
        <ul>
          <li>the address or mobile number is wrong or incomplete;</li>
          <li>nobody is available to receive it, there are no safe-drop instructions, and the rider cannot reach you by phone within 10 minutes;</li>
          <li>you refuse the delivery without a quality reason, or building security does not allow entry and no alternative was arranged.</li>
        </ul>
        <p>See the <Link href="/delivery-policy">Delivery Policy</Link> for how to avoid this.</p>
      </>
    ),
  },
  {
    id: 'how-refunds-paid',
    title: 'How and when refunds are paid',
    body: (
      <ul>
        <li>We confirm your request within 48 hours. Once approved, we start the refund within <strong>2 working days</strong>.</li>
        <li>Refunds go to the <strong>original payment method</strong>: the same UPI account, card or bank account. Your bank usually credits it within 5–7 working days after we start it.</li>
        <li>If the original method cannot receive a refund (for example, the account is closed), we ask you for another bank account or UPI ID in your name.</li>
        <li>Duplicate or excess payments are refunded in full within 7 working days of being verified.</li>
        <li>If you used a coupon, the refund is based on the discounted amount you actually paid.</li>
        <li>You can choose meal credits instead of a refund. We never force credits on you when you are entitled to a refund.</li>
      </ul>
    ),
  },
  {
    id: 'help',
    title: 'Requests and complaints',
    body: (
      <p>
        To cancel or ask for a refund, contact us on <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a> or at{' '}
        <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> with your order number. If you are not happy with how we handled it, escalate it to our Grievance Officer
        on the <Link href="/grievance">Grievance Redressal</Link> page. Nothing in this policy limits your statutory rights as a consumer.
      </p>
    ),
  },
];

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      current="/refund-policy"
      summary={[
        `Skip, pause or cancel any meal free until ${cutoff} the night before delivery.`,
        'Skipped and paused meals become credits that extend your plan, so nothing you paid for is lost.',
        'Cancel a plan any time with no fee: unused meals are refunded at the per-meal rate you paid.',
        'Missing, wrong or damaged meal? Report it within 2 hours with a photo for a replacement, credit or refund.',
        'Refunds start within 2 working days and go back to your original payment method.',
      ]}
      sections={sections}
    />
  );
}
