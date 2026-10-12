import type { Metadata } from 'next';
import Link from 'next/link';
import { KeyValue, LegalPage, type LegalSection } from '@/components/legal/LegalPage';
import { LEGAL, hasFssai } from '@/config/legal';

export const metadata: Metadata = {
  title: 'Food Safety & Allergen Information',
  description: `FSSAI compliance, allergens, nutrition values, storage and reheating guidance for ${LEGAL.tradeName} meals.`,
  alternates: { canonical: '/food-safety' },
};

const sections: LegalSection[] = [
  {
    id: 'licence',
    title: 'Licence and kitchen',
    body: (
      <>
        <KeyValue rows={[
          ['Food business operator', LEGAL.entityName || LEGAL.tradeName],
          ...(hasFssai() ? [[`FSSAI ${LEGAL.fssai.licenseType || 'licence'} no.`, LEGAL.fssai.licenseNumber] as [string, string]] : []),
          ['Kitchen address', LEGAL.kitchenAddress],
        ]} />
        <p>
          We cook under the Food Safety and Standards Act, 2006 and follow the general hygiene and sanitary practices in Schedule 4 of the Food Safety and Standards
          (Licensing and Registration of Food Businesses) Regulations, 2011. These include clean, pest-controlled premises, potable water, health-checked food handlers,
          separate handling of raw and cooked food, and temperature control.
          {hasFssai() && ' Our FSSAI licence number is printed on every invoice.'}
        </p>
      </>
    ),
  },
  {
    id: 'veg-nonveg',
    title: 'Vegetarian and non-vegetarian meals',
    body: (
      <>
        <p>
          Every dish is marked with the symbols required by the Food Safety and Standards (Labelling and Display) Regulations, 2020:
          a <strong>green</strong> filled circle in a green square for vegetarian food, and a <strong>brown</strong> filled triangle in a brown square for non-vegetarian food.
          Egg dishes are non-vegetarian under these Regulations.
        </p>
        <p>
          Vegetarian meals contain no meat, poultry, fish or egg. Our kitchen prepares both vegetarian and non-vegetarian food, and we keep them apart while cooking and
          packing. If your practice requires a kitchen that never handles meat or egg (for example, Jain cooking), our meals may not be suitable for you.
        </p>
      </>
    ),
  },
  {
    id: 'allergens',
    title: 'Allergens',
    body: (
      <>
        <p>Our kitchen uses ingredients from the allergen groups listed in the FSS (Labelling and Display) Regulations, 2020, as well as others common in South Indian cooking:</p>
        <ul>
          <li>Cereals containing gluten (wheat, barley, oats and their products)</li>
          <li>Crustaceans (prawns, crab) and fish</li>
          <li>Milk and milk products (curd, paneer, ghee, butter)</li>
          <li>Eggs</li>
          <li>Peanuts and tree nuts (cashew, almond, walnut)</li>
          <li>Soybeans and soy products</li>
          <li>Sulphites (10 mg/kg or more)</li>
          <li>Mustard and sesame</li>
        </ul>
        <p>
          <strong>How we protect you.</strong> Tell us your allergies in <Link href="/profile#body">My profile</Link> or at checkout. We leave those ingredients out of your meals
          and flag your order for the kitchen. Ask us on WhatsApp for the full ingredient list of any dish.
        </p>
        <p>
          <strong>What we cannot promise.</strong> We share equipment and work surfaces, so we cannot guarantee any meal is completely free of traces of an allergen. If you have a severe or
          life-threatening allergy (anaphylaxis), we advise you not to order unless you have spoken to us and are satisfied that the risk is acceptable for you.
        </p>
      </>
    ),
  },
  {
    id: 'nutrition',
    title: 'How we calculate nutrition values',
    body: (
      <>
        <ul>
          <li>Each dish follows a standard recipe, and portions are weighed when packed.</li>
          <li>
            Calories, protein, carbohydrate, fat and fibre per serving are calculated from those weights using recognised food composition data, mainly the Indian Food Composition
            Tables (IFCT 2017, ICMR-National Institute of Nutrition), with USDA FoodData Central for ingredients IFCT does not cover.
          </li>
          <li>
            The values are <strong>calculated, not laboratory-tested</strong>, unless a dish page says otherwise. Natural differences in ingredients and cooking mean actual values can
            vary, typically by up to ±10–20%.
          </li>
          <li>
            We only call a meal &quot;high protein&quot; when at least 20% of its energy comes from protein, the threshold in the Food Safety and Standards (Advertising and Claims)
            Regulations, 2018.
          </li>
          <li>Values are per serving as delivered, before any sauces, sides or add-ons you choose separately, which are listed separately.</li>
        </ul>
        <p>
          Our meals are food, not medical treatment. Personal calorie and protein targets are general estimates. If you have a medical condition, consult your doctor or a registered dietitian.
          See section 9 of our <Link href="/terms#health">Terms</Link>.
        </p>
      </>
    ),
  },
  {
    id: 'storage',
    title: 'Storage and reheating',
    body: (
      <>
        <p>Our meals are cooked fresh on the day of delivery, with no preservatives added. For safety:</p>
        <ul>
          <li><strong>Eat within 2 hours of delivery</strong>, or refrigerate at 5°C or below within 2 hours.</li>
          <li>Refrigerated meals should be eaten within 24 hours of delivery.</li>
          <li>Reheat until piping hot all the way through (at least 75°C at the centre), and reheat only once.</li>
          <li>Transfer food to a microwave-safe dish before microwaving, unless the pack says it is microwave-safe.</li>
          <li>Keep salads, curd and raita cold. Do not reheat them.</li>
          <li>Do not eat a meal whose seal is broken, or that smells, looks or tastes off. Tell us instead.</li>
        </ul>
        <p>We are not responsible for illness caused by food that has been kept or reheated in a way that does not follow this guidance.</p>
      </>
    ),
  },
  {
    id: 'packaging',
    title: 'Packaging',
    body: (
      <p>
        We use food-grade containers that meet the Food Safety and Standards (Packaging) Regulations, 2018, sealed after packing so you can see the meal has not been opened.
        Please dispose of or recycle packaging responsibly.
      </p>
    ),
  },
  {
    id: 'report',
    title: 'Reporting a food safety concern',
    body: (
      <>
        <p>
          If you think a meal was unsafe, for example spoiled food, a foreign object, an undeclared allergen, or illness after eating, seek medical help first if needed. Then contact
          us at once on WhatsApp ({LEGAL.supportPhone}) or <a href={`mailto:${LEGAL.supportEmail}`}>{LEGAL.supportEmail}</a> with your order number and photos, and keep the meal and
          packaging. We investigate every report with our kitchen, and remedies are described in our <Link href="/refund-policy#quality">Refund Policy</Link>.
        </p>
        <p>
          You also have the right to complain directly to the Food Safety and Standards Authority of India through the Food Safety Connect app, at foscos.fssai.gov.in, or on the
          FSSAI helpline 1800-11-2100.
        </p>
      </>
    ),
  },
];

export default function FoodSafetyPage() {
  return (
    <LegalPage
      title="Food Safety & Allergen Information"
      current="/food-safety"
      summary={[
        'Meals are cooked fresh each day under the Food Safety and Standards Act, 2006 and FSSAI hygiene rules.',
        'Veg and non-veg are clearly marked. The kitchen handles both.',
        'Tell us your allergies and we leave them out, but traces cannot be ruled out.',
        'Nutrition values are calculated from weighed recipes, not lab-tested, so allow about ±10–20%.',
        'Eat within 2 hours of delivery or refrigerate, and reheat until piping hot.',
      ]}
      sections={sections}
    />
  );
}
