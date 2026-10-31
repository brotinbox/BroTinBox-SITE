import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyValue, LegalPage, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL, operatorLine } from '@/config/legal';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `How ${LEGAL.tradeName} collects, uses, shares and protects your personal data under India's Digital Personal Data Protection Act, 2023.`,
  alternates: { canonical: '/privacy' },
};

const g = LEGAL.grievanceOfficer;

const sections: LegalSection[] = [
  {
    id: 'who-we-are',
    title: 'Who we are and what this policy covers',
    body: (
      <>
        <p>
          This policy explains how {operatorLine()} (&quot;<strong>{LEGAL.tradeName}</strong>&quot;, &quot;we&quot;, &quot;us&quot;) handles
          personal data when you use our website, place orders, subscribe to meal plans, or contact us on WhatsApp, phone or email
          (together, the &quot;<strong>Service</strong>&quot;). For your personal data we are the <strong>Data Fiduciary</strong> under
          the Digital Personal Data Protection Act, 2023 (&quot;<strong>DPDP Act</strong>&quot;) and the rules made under it, and a
          &quot;body corporate&quot; for the purposes of section 43A of the Information Technology Act, 2000 and the Information Technology
          (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011.
        </p>
        <p>
          We operate only in {LEGAL.city}, {LEGAL.state}, India. This policy forms part of our <Link href="/terms">Terms of Service</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'data-we-collect',
    title: 'Personal data we collect',
    body: (
      <>
        <p>We collect only what we need to cook, deliver and support your meals. Fields marked optional can be left blank.</p>
        <KeyValue rows={[
          ['Account', 'Name, email address, profile photo and Google account identifier, received from Google when you sign in with Google. We never receive your Google password.'],
          ['Contact and delivery', 'Mobile number; delivery address (flat, street, landmark, area, pincode); delivery instructions; and the name and mobile number of the person receiving the meal if that is someone else.'],
          ['Location', 'Your approximate area, and your precise location only if you allow your browser to share it, used to fill in your address and check whether we deliver there. You can type your address instead.'],
          ['Health and body (optional)', 'Fitness goal, diet type, gender, age, height, weight, target weight, activity level, food allergies and weight logs you choose to record.'],
          ['Orders and payments', 'Plans and meals ordered, delivery dates and slots, skips and pauses, meal credits, coupons, amounts, invoices, and the UPI transaction reference or payment-gateway reference for your payment. We do not receive or store card numbers, CVVs, UPI PINs or net-banking passwords.'],
          ['Communications', 'Messages, photos and feedback you send us on WhatsApp, phone, email or our enquiry form, and our replies.'],
          ['Technical', 'IP address, device and browser type, pages visited, error logs, and the date and time of account actions (for example a skip or address change). Security cookies keep you signed in, and analytics tools record how the website is used; see section 10.'],
        ]} />
        <p>
          <strong>Health data.</strong> Body measurements, allergies and related information are treated as sensitive personal data under the
          2011 Rules. You provide them voluntarily and only to get personalised calorie and protein targets and to help us leave out
          allergens. You can use the Service without providing them.
        </p>
        <p>
          <strong>Information about others.</strong> If you order for someone else (for example, a parent) or give us their name, address,
          mobile number or health details, you confirm that you have their permission to do so and that you have shown them this policy.
        </p>
      </>
    ),
  },
  {
    id: 'how-we-use',
    title: 'Why we use your data and on what basis',
    body: (
      <>
        <p>We process personal data only for the purposes below. Under the DPDP Act, each purpose relies either on your consent or on a &quot;legitimate use&quot; under section 7.</p>
        <KeyValue rows={[
          ['Create and secure your account', 'Your consent when you sign in, and voluntarily provided data for the purpose you provided it (s.7(a)).'],
          ['Take, cook and deliver orders', 'Name, mobile, address, diet, slot and order details. Needed to perform the contract you ask for (s.7(a)).'],
          ['Personalise meals and targets', 'Optional health and body data, used only with your consent. You can withdraw it at any time by deleting the values in your profile.'],
          ['Payments, invoices and refunds', 'Order and payment data. Contract performance and our obligations under tax and accounting laws (s.7(a), s.7(c)).'],
          ['Service messages', 'Order confirmations, payment reminders, delivery updates, cutoff reminders and support replies by WhatsApp, SMS, email or phone.'],
          ['Offers and newsletters', 'Only if you opt in. You can opt out any time by replying STOP or writing to us; this does not affect service messages.'],
          ['Safety, fraud and legal compliance', 'Technical data and logs, to prevent abuse, investigate incidents and comply with law, court orders and CERT-In directions (s.7(c), (d)).'],
          ['Improve the Service', 'Aggregated or de-identified order and usage data to plan menus, routes and kitchen capacity.'],
          ['Understand how the website is used', 'Pages visited, device and browser type, approximate location, how you reached us and the actions you take on the site, collected through analytics tools to see what works and fix what does not. See section 10 for how to opt out.'],
        ]} />
        <p>We do not sell, rent or trade your personal data. We do not use your health data for advertising, and we do not make automated decisions that have a legal or similarly significant effect on you.</p>
      </>
    ),
  },
  {
    id: 'sharing',
    title: 'Who we share it with',
    body: (
      <>
        <p>We share personal data only with the parties below, only as much as each needs, and under contracts or terms that require them to protect it. They act as our Data Processors.</p>
        <KeyValue rows={[
          ['Delivery staff and partners', 'Recipient name, mobile number, address, delivery instructions and slot, to deliver your meal.'],
          ['Kitchen and support staff', 'Diet, allergies and meal preferences (to cook correctly), and order details (to help you). Staff access is limited by role.'],
          ['Hosting and infrastructure', 'Supabase (database, sign-in and file storage), Vercel (website hosting) and Upstash (abuse protection). They store or process data for us.'],
          ['Sign-in and maps', 'Google (sign in with Google; address lookup through Google Maps) and OpenStreetMap Nominatim (backup address lookup, which receives map coordinates only).'],
          ['Website analytics', 'Google (Google Analytics) and Vercel (Web Analytics) receive website usage data, including your IP address, pages visited and device details, to give us reports on how the site is used. We do not send them your name, mobile number, address, health data or payment details.'],
          ['Payments', 'Your bank and UPI app, and our payment gateway (Cashfree Payments India Pvt Ltd) once card or online payments are enabled. They process payments under their own RBI-regulated terms.'],
          ['Messaging', 'WhatsApp (Meta) when you message us or opt in to updates, and Telegram, which our team uses for internal order alerts.'],
          ['Authorities', 'Government, regulators, courts or law enforcement when the law requires it, for example the GST department, FSSAI, or a valid legal request.'],
          ['Business transfer', 'A buyer or successor of our business, which must keep the same protections.'],
        ]} />
        <p>
          <strong>Storage outside India.</strong> Some of these providers store or process data on servers outside India. We transfer data only to
          countries not restricted by the Government of India under section 16 of the DPDP Act, and the provider must protect it to the standard of this policy.
        </p>
      </>
    ),
  },
  {
    id: 'retention',
    title: 'How long we keep it',
    body: (
      <ul>
        <li><strong>Account, profile and addresses:</strong> while your account is active. When you ask us to delete your account, we delete or anonymise them within 30 days, except data we must keep as listed below.</li>
        <li><strong>Health and body data:</strong> until you delete it from your profile, withdraw consent, or close your account. It is then erased from live systems within 30 days.</li>
        <li><strong>Orders, invoices and payment records:</strong> for 8 years from the end of the relevant financial year, as required by the Companies Act, 2013, the CGST Act, 2017 and the Income-tax Act, 1961.</li>
        <li><strong>Security and access logs:</strong> at least 180 days and up to 1 year, as required by CERT-In directions and the DPDP Rules, 2025, unless needed longer for an investigation.</li>
        <li><strong>Website analytics:</strong> up to 14 months in Google Analytics, after which it is deleted automatically. Aggregated reports that do not identify you may be kept longer.</li>
        <li><strong>Complaints and support chats:</strong> up to 3 years after the matter is closed, so we can resolve disputes and meet consumer-law limitation periods.</li>
        <li><strong>Enquiries from people who never sign up:</strong> up to 12 months.</li>
        <li><strong>Backups:</strong> deleted data can remain in encrypted backups for up to 35 days before it is overwritten.</li>
      </ul>
    ),
  },
  {
    id: 'your-rights',
    title: 'Your rights',
    body: (
      <>
        <p>Under the DPDP Act you have the right to:</p>
        <ul>
          <li><strong>Access:</strong> get a summary of the personal data we hold about you, what we do with it, and who we shared it with.</li>
          <li><strong>Correct and update:</strong> fix inaccurate or incomplete data. You can edit most of it yourself in <Link href="/profile">My profile</Link>.</li>
          <li><strong>Erase:</strong> ask us to delete data no longer needed, subject to the legal retention periods in section 5.</li>
          <li><strong>Withdraw consent:</strong> as easily as you gave it. Withdrawal does not affect processing before it, and some features (for example personalised targets) may stop working.</li>
          <li><strong>Grievance redressal:</strong> complain to our Grievance Officer (section 11), and then to the Data Protection Board of India if you are not satisfied.</li>
          <li><strong>Nominate:</strong> name a person to exercise these rights for you in the event of your death or incapacity.</li>
        </ul>
        <p>
          To use any right, write to <a href={`mailto:${g.email}`}>{g.email}</a> from your registered email, or message us on WhatsApp from your registered mobile number.
          We may ask you to verify your identity. We reply within 30 days and in any case within the time required by the DPDP Rules, 2025.
          Exercising your rights is free.
        </p>
      </>
    ),
  },
  {
    id: 'security',
    title: 'How we protect it',
    body: (
      <>
        <p>We follow reasonable security practices as required by section 43A of the IT Act and section 8(5) of the DPDP Act, including:</p>
        <ul>
          <li>Encryption in transit (HTTPS/TLS) and at rest on our database provider.</li>
          <li>Row-level access controls, so each customer can read only their own records, and role-based access for staff.</li>
          <li>Sign-in through Google, so we hold no customer passwords; separate, restricted staff accounts.</li>
          <li>Logs of account and staff actions, rate limiting and abuse protection.</li>
          <li>Payment data handled only by banks, UPI apps and PCI-DSS compliant payment gateways.</li>
        </ul>
        <p>
          No system is perfectly secure. If a personal-data breach occurs, we will inform affected users and the Data Protection Board of India
          as the DPDP Act and Rules require, and report cyber incidents to CERT-In within 6 hours as its directions require.
        </p>
      </>
    ),
  },
  {
    id: 'children',
    title: 'Children',
    body: (
      <p>
        The Service is for people aged 18 or over. We do not knowingly create accounts for children (under 18, as defined in the DPDP Act) or
        track or target advertising at them. A parent or guardian may order meals for a child using their own account, and is responsible for the
        information they provide about that child. If you believe a child has given us personal data, contact us and we will delete it.
      </p>
    ),
  },
  {
    id: 'marketing',
    title: 'Messages from us',
    body: (
      <p>
        Service messages about orders, payments, deliveries and your account are part of the Service. Promotional messages are sent only with your
        opt-in, and we honour Do-Not-Disturb preferences under the Telecom Commercial Communications Customer Preference Regulations, 2018 where they apply.
        You can turn off WhatsApp updates in <Link href="/profile">My profile</Link> or reply STOP at any time.
      </p>
    ),
  },
  {
    id: 'cookies',
    title: 'Cookies and local storage',
    body: (
      <>
        <p>We use the following on this website:</p>
        <ul>
          <li><strong>Essential cookies</strong> that keep you signed in securely and protect against misuse.</li>
          <li><strong>Browser local storage</strong> that remembers your cart, selected area and preferences on your device.</li>
          <li><strong>Analytics cookies</strong> set by Google Analytics (such as <code>_ga</code>), which tell repeat visits apart so we can count visitors and see how the site is used. They last up to 2 years and are set when you use the site.</li>
          <li><strong>Vercel Web Analytics</strong>, which measures page visits without setting cookies.</li>
        </ul>
        <p>
          We do not use advertising cookies. If we later add advertising tools, we will update this policy first and, where the law requires, ask for your consent.
        </p>
        <p>
          You can block analytics cookies in your browser settings, or use the{' '}
          <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics opt-out add-on</a>. Doing so does not affect
          ordering. You can clear cookies and local storage in your browser at any time; you will then need to sign in again.
        </p>
      </>
    ),
  },
  {
    id: 'contact',
    title: 'Contact and Grievance Officer',
    body: (
      <>
        <p>
          Questions, requests and complaints about your personal data go to our Grievance Officer, appointed under rule 5(9) of the 2011 Rules and the
          Consumer Protection (E-Commerce) Rules, 2020. They also answer questions on our behalf under section 8(9) of the DPDP Act.
        </p>
        <KeyValue rows={[
          ...(g.name ? [['Name', g.name] as [string, string]] : []),
          ['Designation', g.designation],
          ['Email', <a key="e" href={`mailto:${g.email}`}>{g.email}</a>],
          ['Phone / WhatsApp', g.phone],
          ['Address', LEGAL.registeredAddress],
          ['Hours', g.hours],
        ]} />
        <p>
          We acknowledge complaints within 48 hours and resolve them within 30 days. If you are not satisfied, you may complain to the Data Protection Board
          of India. See our <Link href="/grievance">Grievance Redressal</Link> page for the full process.
        </p>
      </>
    ),
  },
  {
    id: 'changes',
    title: 'Changes to this policy',
    body: (
      <p>
        We may update this policy when our Service or the law changes. The effective date at the top shows the latest version. If a change materially affects
        how we use your data, we will tell you by email, WhatsApp or a notice when you sign in before it takes effect, and ask for fresh consent where the law requires it.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      current="/privacy"
      summary={[
        'We collect what we need to cook and deliver your meals: name, contact details, address, diet and orders.',
        'Height, weight, age and allergies are optional and used only to personalise your targets and keep allergens out.',
        'We never sell your data. Riders see only what they need to deliver.',
        'We use Google Analytics and Vercel Web Analytics to understand how the website is used. You can opt out; see section 10.',
        'You can access, correct or delete your data, or withdraw consent, by writing to our Grievance Officer.',
        'We keep order and invoice records for 8 years because tax law requires it.',
      ]}
      sections={sections}
    />
  );
}
