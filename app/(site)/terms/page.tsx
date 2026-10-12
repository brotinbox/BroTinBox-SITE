import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyValue, LegalPage, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL, hasFssai, operatorLine } from '@/config/legal';
import { BRAND } from '@/config/brand';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: `The terms that apply when you order meals or subscribe to a meal plan from ${LEGAL.tradeName} in ${LEGAL.city}.`,
  alternates: { canonical: '/terms' },
};

const sections: LegalSection[] = [
  {
    id: 'agreement',
    title: 'About these terms',
    body: (
      <>
        <p>
          These Terms of Service (&quot;<strong>Terms</strong>&quot;) are an agreement between you and {operatorLine()} (&quot;<strong>{LEGAL.tradeName}</strong>&quot;,
          &quot;we&quot;, &quot;us&quot;). They apply to our website and to every order, trial box and meal plan you buy from us (the &quot;<strong>Service</strong>&quot;).
        </p>
        <p>
          By signing in, placing an order or using the Service, you accept these Terms and our <Link href="/privacy">Privacy Policy</Link>,{' '}
          <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>, <Link href="/delivery-policy">Delivery Policy</Link> and{' '}
          <Link href="/food-safety">Food Safety &amp; Allergen Information</Link>, which form part of these Terms. This is an electronic contract under
          section 10A of the Information Technology Act, 2000 and needs no physical signature. If you do not agree, please do not use the Service.
        </p>
      </>
    ),
  },
  {
    id: 'eligibility',
    title: 'Eligibility and your account',
    body: (
      <ul>
        <li>You must be at least 18 years old and able to enter a binding contract under the Indian Contract Act, 1872.</li>
        <li>You sign in with your Google account. Keep access to it secure; orders and changes made from your account are treated as made by you.</li>
        <li>Give us accurate details, especially your mobile number, delivery address and allergies, and keep them up to date.</li>
        <li>
          You may order for family members or others (for example, elderly parents). You confirm you are authorised to do so, that you have shared our
          allergen information with them, and that you are responsible for the order.
        </li>
        <li>One person, one account. Accounts may not be sold or transferred.</li>
      </ul>
    ),
  },
  {
    id: 'service',
    title: 'What we provide',
    body: (
      <>
        <p>
          We cook fresh, portion-controlled meals in our kitchen in {LEGAL.city} and deliver them to serviceable pincodes in {LEGAL.city}, {BRAND.workingDays}.
          We offer:
        </p>
        <ul>
          <li><strong>Trial box:</strong> a one-off order of a single day&apos;s meals.</li>
          <li><strong>Weekly plan:</strong> 6 delivery days, Monday to Saturday.</li>
          <li><strong>Monthly plan:</strong> 24 delivery days over about 4 weeks.</li>
        </ul>
        <p>
          Plans may include one or two meals a day in the slots shown at checkout (currently morning {BRAND.deliverySlots.morning} and evening {BRAND.deliverySlots.dinner}).
          The menu rotates daily. Dish photos are for illustration; plating, garnish and portion appearance can vary.
        </p>
        <p>
          If an ingredient is unavailable or fails our quality check, we may substitute a dish of similar type and nutritional value. We will tell you about
          substitutions on the day when practical. We will never substitute an ingredient you have told us you are allergic to.
        </p>
      </>
    ),
  },
  {
    id: 'orders-payment',
    title: 'Orders, prices and payment',
    body: (
      <ul>
        <li>All prices are in Indian Rupees and include applicable taxes unless stated otherwise. Checkout shows the full price, any delivery fee and any discount before you pay. There are no hidden charges.</li>
        <li>Your order is an offer to buy. A binding contract is formed when we confirm your payment, and we then send you an order confirmation.</li>
        <li>
          <strong>UPI payments.</strong> When you pay by UPI and submit the transaction reference, we confirm the payment manually, usually within a few hours during working hours.
          If payment is not received within 48 hours of placing the order, the order is cancelled automatically and nothing is charged.
        </li>
        <li>
          We may decline or cancel an order, for example if your address is outside our delivery area, an item is unavailable, or there is an obvious pricing error.
          If we cancel after you have paid, we refund you in full under our <Link href="/refund-policy">Refund Policy</Link>, and we do not charge you any cancellation fee.
        </li>
        <li>Coupons have their own conditions (validity, minimum order, one per customer), have no cash value, and cannot be combined unless stated.</li>
        <li>Plans are prepaid and <strong>do not renew automatically</strong>. We never charge you again without a fresh order from you.</li>
        <li>If we change prices, the new price applies only to orders placed after the change, never to a plan you have already paid for.</li>
        <li>We issue an invoice for every paid order{LEGAL.gstin ? ` showing our GSTIN ${LEGAL.gstin}` : ''}{hasFssai() ? ` and FSSAI licence number ${LEGAL.fssai.licenseNumber}` : ''}.</li>
      </ul>
    ),
  },
  {
    id: 'changes-to-meals',
    title: 'Skipping, pausing and meal credits',
    body: (
      <ul>
        <li><strong>Cutoff.</strong> You can skip, pause or change a meal until <strong>{BRAND.cutoffTime.replace(' previous night', '')} IST the night before</strong> the delivery date. After the cutoff, ingredients are bought and cooking is scheduled, so the meal is prepared and delivered as planned.</li>
        <li><strong>Skipped meals are not lost.</strong> Each meal you skip before the cutoff becomes a meal credit that moves to the end of your plan, so your plan&apos;s end date moves forward.</li>
        <li><strong>Pausing.</strong> You can pause a plan for 1 to 30 days at a time. The paused meals are added to the end of your plan.</li>
        <li>Meal credits belong to your plan, have no cash value and cannot be transferred. If you cancel your plan, unused credits are refunded as set out in the <Link href="/refund-policy">Refund Policy</Link>.</li>
        <li>We may also add credits when we miss or delay a delivery. See the <Link href="/delivery-policy">Delivery Policy</Link>.</li>
      </ul>
    ),
  },
  {
    id: 'delivery',
    title: 'Delivery',
    body: (
      <p>
        We deliver to the address on your order within the chosen slot. Someone must be available to receive the meal, or you must give safe-drop instructions.
        Late deliveries, failed deliveries and changes of address are covered by our <Link href="/delivery-policy">Delivery Policy</Link>.
      </p>
    ),
  },
  {
    id: 'cancellation',
    title: 'Cancellations and refunds',
    body: (
      <p>
        You may cancel a trial order or a plan at any time. Meals not yet locked by the cutoff are refunded as described in our{' '}
        <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>, along with replacements or refunds for missing, damaged or unsafe meals.
        Nothing in these Terms limits your rights under the Consumer Protection Act, 2019.
      </p>
    ),
  },
  {
    id: 'food-nutrition',
    title: 'Food, nutrition values and allergens',
    body: (
      <>
        <ul>
          <li>
            Calorie and macronutrient values are <strong>estimates</strong>. We calculate them from standard ingredient weights and recognised nutrient databases
            (such as IFCT 2017 by ICMR-NIN). Natural variation in ingredients and cooking means actual values can differ, typically by up to ±10–20%.
          </li>
          <li>
            Our kitchen handles common allergens, including milk, eggs, fish, crustaceans, peanuts, tree nuts, soy, wheat (gluten), mustard and sesame. We
            honour the allergies you tell us about and leave those ingredients out of your meals, but we <strong>cannot guarantee</strong> a meal is free of traces
            from shared equipment. If you have a severe allergy, talk to us before ordering. See <Link href="/food-safety">Food Safety &amp; Allergens</Link>.
          </li>
          <li>Meals are made to be eaten fresh. Follow the storage and reheating guidance on the pack and on our Food Safety page.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'health',
    title: 'Not medical advice',
    body: (
      <>
        <p>
          Our meals are ordinary food, not medicines, medical foods or nutraceuticals, and are not intended to diagnose, treat, cure or prevent any disease.
          Calorie and protein targets on our website are general estimates from standard formulas (Mifflin-St Jeor), not a prescription. Results such as weight
          loss or muscle gain depend on many factors, and we do not guarantee any particular result.
        </p>
        <p>
          If you are pregnant or breastfeeding, have diabetes, kidney, liver or heart disease, an eating disorder, or any other medical condition, or take medication,
          consult a registered medical practitioner or dietitian before changing your diet. Guidance from our team is general nutrition information, not a medical consultation.
        </p>
      </>
    ),
  },
  {
    id: 'acceptable-use',
    title: 'Fair use of the Service',
    body: (
      <>
        <p>You agree not to:</p>
        <ul>
          <li>give false details, use another person&apos;s identity or payment method, or submit a false UPI reference;</li>
          <li>resell our meals or use the Service for commercial catering without our written consent;</li>
          <li>misuse coupons or referral offers, for example by creating multiple accounts;</li>
          <li>harass, threaten or abuse our staff or delivery partners;</li>
          <li>copy, scrape, reverse engineer or disrupt the website, or try to access other people&apos;s data.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'ip',
    title: 'Our content',
    body: (
      <p>
        The {LEGAL.tradeName} name, logo, menus, recipes, photos, text and software belong to us or our licensors and are protected by Indian law. You may view
        and share pages for personal, non-commercial use. Any other use needs our written permission.
      </p>
    ),
  },
  {
    id: 'liability',
    title: 'Our responsibility to you',
    body: (
      <>
        <p>
          We are responsible for preparing and delivering your meals with reasonable care and skill, in compliance with the Food Safety and Standards Act, 2006,
          and for any loss or harm that is a foreseeable result of our breach of these Terms or our negligence.
        </p>
        <p>To the extent permitted by law:</p>
        <ul>
          <li>we are not responsible for losses that were not foreseeable, for business losses, or for losses caused by your failure to follow these Terms (for example, wrong address details, an undisclosed allergy, or eating food long after delivery);</li>
          <li>for any other claim relating to an order, our total liability is limited to the amount you paid for that order or plan.</li>
        </ul>
        <p>
          Nothing in these Terms excludes or limits our liability for death or personal injury caused by our negligence, for fraud, for unsafe food under the
          Food Safety and Standards Act, 2006, for product liability under Chapter VI of the Consumer Protection Act, 2019, or for anything else that cannot
          be limited under Indian law.
        </p>
      </>
    ),
  },
  {
    id: 'indemnity',
    title: 'Your responsibility to us',
    body: (
      <p>
        If you break these Terms fraudulently or deliberately (for example, by submitting a false payment reference or misusing another person&apos;s details), you are
        responsible for the reasonable losses that causes us, including reasonable legal costs.
      </p>
    ),
  },
  {
    id: 'force-majeure',
    title: 'Events outside our control',
    body: (
      <p>
        We are not responsible for delays or failures caused by events outside our reasonable control, such as extreme weather, floods, epidemics, government orders,
        bandhs, strikes, road closures, or failures of power, internet or payment networks. If this happens, we will tell you as soon as possible and offer to reschedule
        the affected meals as credits or refund them.
      </p>
    ),
  },
  {
    id: 'suspension',
    title: 'Suspending or closing accounts',
    body: (
      <p>
        You can stop using the Service and ask us to close your account at any time. We may suspend or close an account that breaks section 10, puts our staff at risk,
        or is involved in fraud. Before doing so we will, where reasonable, give notice and a chance to respond. Unused, undelivered meals on a closed account are refunded
        under the <Link href="/refund-policy">Refund Policy</Link>, minus any amount you owe us because of fraud.
      </p>
    ),
  },
  {
    id: 'law',
    title: 'Governing law and disputes',
    body: (
      <>
        <p>
          These Terms are governed by the laws of India. Please contact us first. Most issues are resolved quickly through the steps on our{' '}
          <Link href="/grievance">Grievance Redressal</Link> page.
        </p>
        <p>
          Subject to your rights below, the courts at {LEGAL.jurisdiction} have exclusive jurisdiction. As a consumer, you may also file a complaint before the appropriate
          Consumer Disputes Redressal Commission, including online through e-Daakhil (edaakhil.nic.in), or contact the National Consumer Helpline on 1915. Nothing in these
          Terms takes away those rights.
        </p>
      </>
    ),
  },
  {
    id: 'general',
    title: 'General',
    body: (
      <ul>
        <li><strong>Changes:</strong> we may update these Terms. Changes apply to orders placed after the new effective date; a plan you have already paid for continues on the Terms in force when you bought it, unless a change is required by law.</li>
        <li><strong>Severability:</strong> if a court finds any part of these Terms invalid, the rest stays in effect.</li>
        <li><strong>No waiver:</strong> if we do not enforce a right immediately, we can still enforce it later.</li>
        <li><strong>Notices:</strong> we will contact you at the email or mobile number on your account; you can contact us at the details below.</li>
        <li><strong>Language:</strong> these Terms are written in English. Ask us if you need help understanding any part.</li>
      </ul>
    ),
  },
  {
    id: 'seller',
    title: 'Seller information',
    body: (
      <>
        <p>Published in line with rule 4(2) of the Consumer Protection (E-Commerce) Rules, 2020.</p>
        <KeyValue rows={[
          ['Business', operatorLine()],
          ...(LEGAL.registrationNumber ? [['CIN / LLPIN', LEGAL.registrationNumber] as [string, string]] : []),
          ...(LEGAL.gstin ? [['GSTIN', LEGAL.gstin] as [string, string]] : []),
          ...(hasFssai() ? [[`FSSAI ${LEGAL.fssai.licenseType || 'licence'}`, LEGAL.fssai.licenseNumber] as [string, string]] : []),
          ['Registered address', LEGAL.registeredAddress],
          ['Kitchen address', LEGAL.kitchenAddress],
          ['Customer care', <span key="c"><a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> · {LEGAL.supportPhone} (phone and WhatsApp)</span>],
          ['Grievance Officer', <Link key="g" href="/grievance">See Grievance Redressal</Link>],
        ]} />
      </>
    ),
  },
];

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      current="/terms"
      summary={[
        'You must be 18+. Plans are prepaid and never renew or charge you automatically.',
        `Skip, pause or change any meal until ${BRAND.cutoffTime.replace(' previous night', '')} the night before. Skipped meals move to the end of your plan.`,
        'Nutrition values are careful estimates, not lab-exact, and our food is not medical treatment.',
        'Our kitchen handles common allergens. Tell us about yours and we will leave them out, but we cannot rule out traces.',
        'Your rights under Indian consumer law always apply, and Coimbatore courts handle disputes.',
      ]}
      sections={sections}
    />
  );
}
