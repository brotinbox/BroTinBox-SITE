import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyValue, LegalPage, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL } from '@/config/legal';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Delivery Policy',
  description: `Where, when and how ${LEGAL.tradeName} delivers fresh meals in ${LEGAL.city}.`,
  alternates: { canonical: '/delivery-policy' },
};

const cutoff = BRAND.cutoffTime.replace(' previous night', '');

const sections: LegalSection[] = [
  {
    id: 'area',
    title: 'Where we deliver',
    body: (
      <p>
        We deliver only within the serviceable pincodes of {LEGAL.city}, {LEGAL.state}, listed on our <Link href="/delivery-areas">Delivery Areas</Link> page. Checkout checks
        your pincode before you pay; we do not accept payment for an address we cannot serve. We do not ship food outside {LEGAL.city} or by courier.
      </p>
    ),
  },
  {
    id: 'when',
    title: 'Delivery days and slots',
    body: (
      <>
        <KeyValue rows={[
          ['Days', `${BRAND.workingDays}. No deliveries on Sundays or on kitchen holidays we announce in advance.`],
          ['Morning slot', BRAND.deliverySlots.morning],
          ['Evening slot', BRAND.deliverySlots.dinner],
          ['First delivery', `The earliest date shown at checkout, usually the next delivery day if you order and pay before ${cutoff} IST.`],
          ['Delivery charge', 'Shown at checkout before you pay. Most plans include free delivery.'],
        ]} />
        <p>
          Slot times are our delivery window, not a fixed appointment. Traffic, weather and route order can affect the exact time within the slot. Skipped and paused meals
          are added to the end of your plan as described in the <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'holidays',
    title: 'Holidays and closures',
    body: (
      <p>
        If the kitchen closes on a delivery day (for example, a festival, an election day or a government order), we tell you in advance where possible and move those meals to the
        end of your plan as credits at no cost. You can ask for a refund for them instead.
      </p>
    ),
  },
  {
    id: 'receiving',
    title: 'Receiving your meal',
    body: (
      <ul>
        <li>Keep your mobile reachable during the slot. The rider calls if they cannot find you or get in.</li>
        <li>Give clear directions, gate or tower details and a landmark. Add safe-drop instructions (for example, &quot;leave with security&quot;) if nobody will be home.</li>
        <li>With safe drop, the meal counts as delivered once it is left as instructed, and we are not responsible for it after that.</li>
        <li>If the rider cannot reach you within 10 minutes and there are no safe-drop instructions, the meal is returned and counts as delivered (see the <Link href="/refund-policy">Refund Policy</Link>).</li>
        <li>Check the seal when you receive the meal. Do not accept or eat a meal with a broken or tampered seal; report it to us instead.</li>
      </ul>
    ),
  },
  {
    id: 'address-change',
    title: 'Changing your address',
    body: (
      <p>
        You can change the delivery address for future meals until {cutoff} IST the night before, as long as the new address is within our delivery area. Changes after the cutoff
        take effect from the following delivery day.
      </p>
    ),
  },
  {
    id: 'late',
    title: 'Late or missed deliveries',
    body: (
      <p>
        If we are running late we will try to let you know. If a delivery is more than 60 minutes past the end of its slot through our fault, or we miss it, you can choose a meal credit
        or a refund for that meal, as set out in the <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>.
      </p>
    ),
  },
  {
    id: 'handling',
    title: 'Food handling in transit',
    body: (
      <p>
        Meals are packed and sealed in our kitchen shortly before dispatch and carried in insulated bags by riders who follow our hygiene rules. Please eat or refrigerate
        your meal promptly. See <Link href="/food-safety">Food Safety &amp; Allergens</Link> for storage and reheating guidance.
      </p>
    ),
  },
];

export default function DeliveryPolicyPage() {
  return (
    <LegalPage
      title="Delivery Policy"
      current="/delivery-policy"
      summary={[
        `We deliver only to serviceable ${LEGAL.city} pincodes, ${BRAND.workingDays}.`,
        `Morning slot ${BRAND.deliverySlots.morning}, evening slot ${BRAND.deliverySlots.dinner}.`,
        `Change your address or skip a day until ${cutoff} the night before.`,
        'Keep your phone reachable or leave safe-drop instructions. Undeliverable meals count as delivered.',
        'Late or missed through our fault? You get a credit or a refund.',
      ]}
      sections={sections}
    />
  );
}
