export const BRAND = {
  name: "BroTin Box",
  siteUrl: (() => {
    const url = process.env.NEXT_PUBLIC_SITE_URL;
    // A localhost value leaking into production breaks the sitemap/canonicals.
    if (!url || (process.env.NODE_ENV === "production" && /localhost|127\.0\.0\.1/.test(url))) {
      return "https://www.brotinbox.com";
    }
    return url;
  })(),
  tagline: "Every gram counted. Delivered fresh in Coimbatore.",
  shortDescription: "High-protein fitness meals with calories, protein, carbs and fat measured on every dish. Delivered fresh across Coimbatore 6 days a week.",
  city: "Coimbatore",
  state: "Tamil Nadu",
  country: "India",
  currency: "₹",
  whatsappNumber: "+918248606711",
  whatsappMessage: "Hi BroTin Box! I want to know more about the meal subscription.",
  supportEmail: "support@brotinbox.com",
  phone: "+91 82486 06711",
  gaMeasurementId: "G-FWBS6KKMH7",
  address: "17/2, Semmozhi Nagar, Kuniyamuthur, Coimbatore - 641008, Tamil Nadu",
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
    whatsapp: "https://wa.me/918248606711",
    twitter: "https://twitter.com/brotinbox",
    linkedin: "https://linkedin.com/company/brotinbox",
  },
} as const;

export default BRAND;
