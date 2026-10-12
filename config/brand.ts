export const BRAND = {
  name: "BroTin Box",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "https://brotinbox.com",
  tagline: "Every gram counted. Delivered fresh in Coimbatore.",
  shortDescription: "High-protein fitness meals with calories, protein, carbs and fat measured on every dish. Delivered fresh across Coimbatore 6 days a week.",
  city: "Coimbatore",
  state: "Tamil Nadu",
  country: "India",
  currency: "₹",
  whatsappNumber: "+917604909848",
  whatsappMessage: "Hi BroTin Box! I want to know more about the meal subscription.",
  supportEmail: "hello@brotinbox.com",
  phone: "+91 76049 09848",
  address: "142, D.B. Road, RS Puram, Coimbatore - 641002, Tamil Nadu",
  workingDays: "Monday to Saturday (6 days a week)",
  deliverySlots: {
    morning: "7:00 AM - 9:00 AM",
    dinner: "7:00 PM - 9:00 PM",
  },
  cutoffTime: "9:00 PM previous night",
  pricing: {
    subscriptionMin: 239,
    subscriptionMax: 289,
    oneOffAvg: 319,
  },
  socials: {
    instagram: "https://instagram.com/brotinbox",
    whatsapp: "https://wa.me/917604909848",
    twitter: "https://twitter.com/brotinbox",
    linkedin: "https://linkedin.com/company/brotinbox",
  },
} as const;

export default BRAND;
