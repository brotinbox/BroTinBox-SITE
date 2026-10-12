import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyValue, LegalPage, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL } from '@/config/legal';

export const metadata: Metadata = {
  title: 'Grievance Redressal',
  description: `How to raise a complaint with ${LEGAL.tradeName}, our Grievance Officer's contact details and response timelines.`,
  alternates: { canonical: '/grievance' },
};

const g = LEGAL.grievanceOfficer;
const wa = `https://wa.me/${LEGAL.whatsapp.replace(/\D/g, '')}`;

const sections: LegalSection[] = [
  {
    id: 'officer',
    title: 'Grievance Officer',
    body: (
      <>
        <p>
          We have appointed a Grievance Officer under rule 4(4) of the Consumer Protection (E-Commerce) Rules, 2020, rule 5(9) of the Information Technology (Reasonable Security
          Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011, and the Digital Personal Data Protection Act, 2023.
        </p>
        <KeyValue rows={[
          ...(g.name ? [['Name', g.name] as [string, string]] : []),
          ['Designation', g.designation],
          ['Email', <a key="e" href={`mailto:${g.email}`}>{g.email}</a>],
          ['Phone / WhatsApp', g.phone],
          ['Postal address', LEGAL.registeredAddress],
          ['Hours', g.hours],
        ]} />
      </>
    ),
  },
  {
    id: 'steps',
    title: 'How to raise a complaint',
    body: (
      <ol>
        <li>
          <strong>Customer care first.</strong> Most issues (a missing meal, a skip, a refund) are fixed fastest on{' '}
          <a href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a> or at <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a>.
        </li>
        <li>
          <strong>Escalate to the Grievance Officer</strong> if you are not satisfied, or if your complaint is about personal data, food safety or how we treated you. Write to{' '}
          <a href={`mailto:${g.email}`}>{g.email}</a> with your name, registered mobile or email, order number (if any), what happened, and what you would like us to do. Attach photos or screenshots if you have them.
        </li>
        <li>
          <strong>We acknowledge it within 48 hours</strong> and give you a complaint reference number.
        </li>
        <li>
          <strong>We resolve it within one month</strong> of receiving it, and usually much sooner. If we need more information we will ask, and we will keep you updated.
        </li>
      </ol>
    ),
  },
  {
    id: 'escalation',
    title: 'If you are still not satisfied',
    body: (
      <>
        <p>You can take the matter further at any time; you do not have to wait for our process to finish:</p>
        <ul>
          <li><strong>National Consumer Helpline:</strong> call 1915 or use consumerhelpline.gov.in.</li>
          <li><strong>Consumer Commission:</strong> file a complaint before the appropriate Consumer Disputes Redressal Commission, including online at e-Daakhil (edaakhil.nic.in).</li>
          <li><strong>Food safety:</strong> the Food Safety and Standards Authority of India, through the Food Safety Connect app, foscos.fssai.gov.in, or the helpline 1800-11-2100.</li>
          <li><strong>Personal data:</strong> once you have used our grievance process, the Data Protection Board of India under the Digital Personal Data Protection Act, 2023.</li>
        </ul>
      </>
    ),
  },
  {
    id: 'related',
    title: 'Related policies',
    body: (
      <p>
        See our <Link href="/terms">Terms of Service</Link>, <Link href="/privacy">Privacy Policy</Link>, <Link href="/refund-policy">Refund &amp; Cancellation Policy</Link>,{' '}
        <Link href="/delivery-policy">Delivery Policy</Link> and <Link href="/food-safety">Food Safety &amp; Allergen Information</Link>.
      </p>
    ),
  },
];

export default function GrievancePage() {
  return (
    <LegalPage
      title="Grievance Redressal"
      current="/grievance"
      summary={[
        'Start with customer care on WhatsApp. Most issues are fixed the same day.',
        `Still unhappy? Write to our Grievance Officer at ${g.email}.`,
        'We acknowledge within 48 hours and resolve within one month.',
        'You can also go to the National Consumer Helpline (1915), the Consumer Commission, FSSAI or the Data Protection Board.',
      ]}
      sections={sections}
    />
  );
}
