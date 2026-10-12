import { BRAND } from '@/config/brand';
import { Navbar } from '@/components/layout/Navbar';
import { BottomNav } from '@/components/layout/BottomNav';
import { Footer } from '@/components/layout/Footer';
import { FloatingWhatsApp } from '@/components/layout/FloatingWhatsApp';
import { StoreHydration } from '@/components/providers/StoreHydration';
import { AuthSync } from '@/components/providers/AuthSync';
import { CatalogProvider } from '@/components/providers/CatalogProvider';
import { getFaqs, getMenuSnapshot, getPricingMatrix } from '@/lib/data/catalog';
import { AuthSidebar } from '@/components/auth/AuthSidebar';

// Public pages are cached HTML (ISR). Freshness comes from cache tags cleared
// by admin actions; this is only the safety net.
export const revalidate = 3600;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [menu, pricing, faqs] = await Promise.all([getMenuSnapshot(), getPricingMatrix(), getFaqs()]);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FoodEstablishment',
    name: BRAND.name,
    description: BRAND.tagline,
    url: BRAND.siteUrl,
    telephone: BRAND.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: '142, D.B. Road, RS Puram',
      addressLocality: 'Coimbatore',
      addressRegion: 'Tamil Nadu',
      postalCode: '641002',
      addressCountry: 'IN',
    },
    servesCuisine: 'South Indian, High-Protein, Healthy Bowls, Millets',
    priceRange: '₹250 - ₹350',
    areaServed: { '@type': 'City', name: 'Coimbatore' },
  };

  return (
    <CatalogProvider menu={menu} pricing={pricing} faqs={faqs}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />
      <StoreHydration />
      <AuthSync />
      <Navbar />
      <main className="flex-1 w-full">{children}</main>
      <Footer />
      <FloatingWhatsApp />
      <BottomNav />
      <AuthSidebar />
    </CatalogProvider>
  );
}
