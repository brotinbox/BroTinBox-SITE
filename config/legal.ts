import { BRAND } from './brand';

/**
 * Every legal fact the policy pages, footer and invoices rely on lives here.
 *
 * RULE: leave a value as '' until you hold the real document. A blank value
 * is simply not shown; a placeholder shown as fact (a licence number you do
 * not hold, "Pvt Ltd" before incorporation) is an offence and undoes the
 * policies. Fill these before going live:
 *   - entityName / entityType: exactly as registered (MCA / Udyam / shop licence)
 *   - fssai.licenseNumber: the 14-digit FSSAI licence/registration for the kitchen
 *   - gstin: once registered (mandatory on invoices if registered)
 *   - grievanceOfficer.name: a real, named person (Consumer Protection (E-Commerce) Rules 2020, r.4(4))
 */
export const LEGAL = {
  /** Trading name customers see. */
  tradeName: BRAND.name,
  /** Registered name of the business, exactly as on the registration certificate. */
  entityName: '',
  /** e.g. 'private limited company', 'limited liability partnership', 'sole proprietorship'. */
  entityType: '',
  /** CIN (company) or LLPIN (LLP); leave '' for a proprietorship. */
  registrationNumber: '',
  gstin: '',

  registeredAddress: BRAND.address,
  kitchenAddress: BRAND.address,
  city: BRAND.city,
  state: BRAND.state,

  fssai: {
    /** 14-digit number. Blank hides every "FSSAI licensed" claim on the site. */
    licenseNumber: '',
    /** 'Registration', 'State Licence' or 'Central Licence', as on the certificate. */
    licenseType: '',
  },

  grievanceOfficer: {
    name: '',
    designation: 'Grievance Officer',
    email: 'grievance@brotinbox.com',
    phone: BRAND.phone,
    hours: 'Monday to Saturday, 10:00 AM to 6:00 PM IST',
  },

  supportEmail: BRAND.supportEmail,
  supportPhone: BRAND.phone,
  whatsapp: BRAND.whatsappNumber,

  /** Courts with exclusive jurisdiction (subject to consumer law, see Terms §15). */
  jurisdiction: 'Coimbatore, Tamil Nadu',

  /** Shown on every policy page. Update when a policy changes materially. */
  effectiveDate: '31 October 2026',
} as const;

/** "BroTin Box Nutrition Private Limited, a private limited company" or just the trade name until registered. */
export function operatorLine() {
  if (!LEGAL.entityName) return LEGAL.tradeName;
  return `${LEGAL.entityName}${LEGAL.entityType ? `, a ${LEGAL.entityType} registered in India` : ''}, trading as ${LEGAL.tradeName}`;
}

export const hasFssai = () => /^\d{14}$/.test(LEGAL.fssai.licenseNumber);
