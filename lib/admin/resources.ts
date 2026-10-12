/**
 * Config-driven admin sections. Each entry gets a list page at /<key>,
 * a create page at /<key>/new (if creatable) and an edit page at /<key>/<id>
 * from app/admin/(portal)/[resource]. The database (RLS) enforces the same
 * permissions; these only decide what is shown.
 */
export type FieldType = 'text' | 'textarea' | 'number' | 'boolean' | 'select' | 'tags' | 'lines' | 'datetime' | 'image' | 'upper';

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: { value: string; label: string }[];
  min?: number;
  max?: number;
  step?: number;
  maxLength?: number;
  hint?: string;
  readOnly?: boolean;
  /** Number field that may be cleared to NULL on edit (others keep their value/default). */
  nullable?: boolean;
};

export type ResourceDef = {
  key: string;
  table: 'addons' | 'coupons' | 'delivery_zones' | 'faqs' | 'reviews' | 'enquiries' | 'plans' | 'pricing_rules' | 'blog_categories';
  label: string;
  singular: string;
  description: string;
  readPermission: string;
  writePermission: string;
  deletePermission?: string;
  creatable: boolean;
  order: { column: string; ascending: boolean };
  listColumns: string[];
  search?: string[];
  filter?: { column: string; options: { value: string; label: string }[] };
  fields: FieldDef[];
  revalidate: string[];
  imageBucket?: 'menu-images' | 'blog-images';
  title: (row: Record<string, any>) => string;
  links?: { href: string; label: string }[];
};

const yesNo = (v: string) => ({ value: v, label: v });

export const RESOURCES: ResourceDef[] = [
  {
    key: 'addons', table: 'addons', label: 'Sides & drinks', singular: 'add-on',
    description: 'Extras customers can add to any day: protein sides, dips and cold-pressed drinks.',
    readPermission: 'catalog.read', writePermission: 'catalog.write', deletePermission: 'catalog.write', creatable: true,
    order: { column: 'sort_order', ascending: true },
    listColumns: ['image_url', 'name', 'type', 'price', 'calories', 'protein', 'is_active'],
    search: ['name'],
    filter: { column: 'type', options: [{ value: 'side', label: 'Sides & dips' }, { value: 'drink', label: 'Drinks' }] },
    fields: [
      { name: 'type', label: 'Type', type: 'select', required: true, options: [{ value: 'side', label: 'Side / dip' }, { value: 'drink', label: 'Drink' }] },
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 120 },
      { name: 'slug', label: 'URL slug', type: 'text', required: true, maxLength: 80, hint: 'lowercase-with-dashes, unique' },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 600 },
      { name: 'price', label: 'Price (₹)', type: 'number', required: true, min: 0, max: 5000, step: 1 },
      { name: 'calories', label: 'kcal', type: 'number', min: 0, max: 3000, step: 0.1 },
      { name: 'protein', label: 'Protein (g)', type: 'number', min: 0, max: 300, step: 0.1 },
      { name: 'carbs', label: 'Carbs (g)', type: 'number', min: 0, max: 500, step: 0.1 },
      { name: 'fat', label: 'Fat (g)', type: 'number', min: 0, max: 300, step: 0.1 },
      { name: 'sugar_g', label: 'Natural sugar (g, drinks)', type: 'number', min: 0, max: 200, step: 0.1, nullable: true },
      { name: 'volume_ml', label: 'Volume (ml, drinks)', type: 'number', min: 0, max: 2000, step: 1, nullable: true },
      { name: 'is_veg', label: 'Vegetarian', type: 'boolean' },
      { name: 'tags', label: 'Tags', type: 'tags', hint: 'Comma separated' },
      { name: 'image_url', label: 'Photo', type: 'image' },
      { name: 'sort_order', label: 'Sort order', type: 'number', min: 0, max: 9999, step: 1 },
      { name: 'is_active', label: 'Active (shown to customers)', type: 'boolean' },
    ],
    revalidate: ['addons'], imageBucket: 'menu-images', title: (r) => r.name,
  },
  {
    key: 'coupons', table: 'coupons', label: 'Coupons', singular: 'coupon',
    description: 'Discount codes customers enter at checkout. Limits are enforced on the server.',
    readPermission: 'coupons.read', writePermission: 'coupons.write', creatable: true,
    order: { column: 'created_at', ascending: false },
    listColumns: ['code', 'discount_type', 'value', 'min_order', 'valid_to', 'is_active'],
    search: ['code'],
    fields: [
      { name: 'code', label: 'Code', type: 'upper', required: true, maxLength: 30, hint: 'A–Z, 0–9, - or _ (3–30 chars)' },
      { name: 'description', label: 'Description shown to customer', type: 'text', maxLength: 200 },
      { name: 'discount_type', label: 'Type', type: 'select', required: true, options: [{ value: 'flat', label: 'Flat ₹ off' }, { value: 'percentage', label: '% off' }] },
      { name: 'value', label: 'Value (₹ or %)', type: 'number', required: true, min: 1, max: 100000, step: 1 },
      { name: 'min_order', label: 'Minimum order (₹)', type: 'number', min: 0, max: 1000000, step: 1 },
      { name: 'max_discount', label: 'Maximum discount (₹)', type: 'number', min: 0, max: 1000000, step: 1, nullable: true },
      { name: 'valid_from', label: 'Valid from', type: 'datetime' },
      { name: 'valid_to', label: 'Valid until', type: 'datetime', hint: 'Leave empty for no end date' },
      { name: 'usage_limit', label: 'Total uses allowed', type: 'number', min: 1, max: 1000000, step: 1, hint: 'Empty = unlimited', nullable: true },
      { name: 'per_user_limit', label: 'Uses per customer', type: 'number', required: true, min: 1, max: 100, step: 1 },
      { name: 'first_order_only', label: 'First order only', type: 'boolean' },
      { name: 'is_active', label: 'Active', type: 'boolean' },
    ],
    revalidate: [], title: (r) => r.code,
  },
  {
    key: 'zones', table: 'delivery_zones', label: 'Delivery zones', singular: 'zone',
    description: 'Pincodes you deliver to, with fee and slots. Customers outside these join the waitlist.',
    readPermission: 'zones.read', writePermission: 'zones.write', deletePermission: 'zones.write', creatable: true,
    order: { column: 'distance_km', ascending: true },
    listColumns: ['area', 'pincode', 'tier', 'delivery_fee', 'distance_km', 'is_active'],
    search: ['area', 'pincode'],
    fields: [
      { name: 'area', label: 'Area', type: 'text', required: true, maxLength: 80 },
      { name: 'pincode', label: 'Pincode', type: 'text', required: true, maxLength: 6 },
      { name: 'tier', label: 'Tier', type: 'select', required: true, options: [{ value: 'core', label: 'Core (free delivery)' }, { value: 'phase2', label: 'Phase 2 (fee)' }] },
      { name: 'delivery_fee', label: 'Delivery fee (₹)', type: 'number', min: 0, max: 1000, step: 1 },
      { name: 'distance_km', label: 'Distance (km)', type: 'number', min: 0, max: 100, step: 0.1, nullable: true },
      { name: 'avg_minutes', label: 'Typical delivery time (min)', type: 'number', min: 0, max: 240, step: 1, nullable: true },
      { name: 'slots', label: 'Slots', type: 'tags', hint: 'Comma separated, e.g. 7:00 AM - 9:00 AM, 7:00 PM - 9:00 PM' },
      { name: 'description', label: 'Description', type: 'text', maxLength: 200 },
      { name: 'is_active', label: 'Delivering now', type: 'boolean' },
    ],
    revalidate: ['zones'], title: (r) => `${r.area} (${r.pincode})`,
  },
  {
    key: 'plans', table: 'plans', label: 'Plans', singular: 'plan',
    description: 'Plans shown on the website. Prices per meal are set under Prices.',
    readPermission: 'pricing.read', writePermission: 'pricing.write', creatable: true,
    order: { column: 'sort_order', ascending: true },
    listColumns: ['name', 'type', 'meals_per_day', 'operating_days', 'badge', 'is_active'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 80 },
      { name: 'slug', label: 'URL slug', type: 'text', required: true, maxLength: 60 },
      { name: 'type', label: 'Type', type: 'select', required: true, options: ['trial', 'weekly', 'monthly'].map(yesNo) },
      { name: 'meals_per_day', label: 'Meals per day', type: 'select', required: true, options: [{ value: '1', label: '1' }, { value: '2', label: '2' }] },
      { name: 'operating_days', label: 'Delivery days in plan', type: 'number', required: true, min: 1, max: 60, step: 1 },
      { name: 'tagline', label: 'Tagline', type: 'text', maxLength: 160 },
      { name: 'description', label: 'Description', type: 'textarea', maxLength: 800 },
      { name: 'features', label: 'Features', type: 'lines', hint: 'One per line' },
      { name: 'ideal_for', label: 'Ideal for', type: 'lines', hint: 'One per line' },
      { name: 'badge', label: 'Badge', type: 'text', maxLength: 30 },
      { name: 'is_popular', label: 'Highlight as popular', type: 'boolean' },
      { name: 'sort_order', label: 'Sort order', type: 'number', min: 0, max: 999, step: 1 },
      { name: 'is_active', label: 'Active', type: 'boolean' },
    ],
    revalidate: ['plans'], title: (r) => r.name,
    links: [{ href: '/pricing', label: 'Prices per meal →' }],
  },
  {
    key: 'pricing', table: 'pricing_rules', label: 'Prices per meal', singular: 'price',
    description: 'The newest price whose start time has passed is used. Add a new row to change a price; old rows stay as history.',
    readPermission: 'pricing.read', writePermission: 'pricing.write', creatable: true,
    order: { column: 'effective_from', ascending: false },
    listColumns: ['plan_type', 'diet', 'price_per_meal', 'second_meal_discount', 'effective_from'],
    fields: [
      { name: 'plan_type', label: 'Plan type', type: 'select', required: true, options: ['trial', 'weekly', 'monthly'].map(yesNo) },
      { name: 'diet', label: 'Diet', type: 'select', required: true, options: [{ value: 'non_veg', label: 'Non-veg' }, { value: 'veg', label: 'Veg' }] },
      { name: 'price_per_meal', label: 'Price per box (₹)', type: 'number', required: true, min: 1, max: 5000, step: 1 },
      { name: 'second_meal_discount', label: 'Discount on 2nd box per day (₹)', type: 'number', min: 0, max: 1000, step: 1 },
      { name: 'effective_from', label: 'Starts', type: 'datetime', required: true },
    ],
    revalidate: ['plans'], title: (r) => `${r.plan_type} · ${r.diet}`,
    links: [{ href: '/plans', label: '← Plans' }],
  },
  {
    key: 'faqs', table: 'faqs', label: 'FAQs', singular: 'FAQ',
    description: 'Questions shown on the FAQ page and home page.',
    readPermission: 'content.read', writePermission: 'content.write', deletePermission: 'content.write', creatable: true,
    order: { column: 'sort_order', ascending: true },
    listColumns: ['question', 'category', 'sort_order', 'is_active'],
    search: ['question'],
    fields: [
      { name: 'question', label: 'Question', type: 'text', required: true, maxLength: 250 },
      { name: 'answer', label: 'Answer', type: 'textarea', required: true, maxLength: 3000 },
      { name: 'category', label: 'Category', type: 'text', maxLength: 50 },
      { name: 'sort_order', label: 'Sort order', type: 'number', min: 0, max: 999, step: 1 },
      { name: 'is_active', label: 'Shown on website', type: 'boolean' },
    ],
    revalidate: ['faqs'], title: (r) => r.question,
  },
  {
    key: 'reviews', table: 'reviews', label: 'Reviews', singular: 'review',
    description: 'Customer reviews. Only approved ones appear on the website.',
    readPermission: 'reviews.read', writePermission: 'reviews.write', deletePermission: 'reviews.delete', creatable: false,
    order: { column: 'created_at', ascending: false },
    listColumns: ['name', 'rating', 'comment', 'status', 'is_featured', 'created_at'],
    filter: { column: 'status', options: [{ value: 'pending', label: 'Pending' }, { value: 'approved', label: 'Approved' }, { value: 'rejected', label: 'Rejected' }] },
    fields: [
      { name: 'name', label: 'Name', type: 'text', readOnly: true },
      { name: 'area', label: 'Area', type: 'text', readOnly: true },
      { name: 'rating', label: 'Rating', type: 'number', readOnly: true },
      { name: 'comment', label: 'Comment', type: 'textarea', readOnly: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: ['pending', 'approved', 'rejected'].map(yesNo) },
      { name: 'is_featured', label: 'Feature on home page', type: 'boolean' },
    ],
    revalidate: ['reviews'], title: (r) => `${r.name} · ${r.rating}★`,
  },
  {
    key: 'enquiries', table: 'enquiries', label: 'Enquiries', singular: 'enquiry',
    description: 'Leads from the website enquiry form. Update the status as you follow up.',
    readPermission: 'enquiries.read', writePermission: 'enquiries.write', creatable: false,
    order: { column: 'created_at', ascending: false },
    listColumns: ['name', 'phone', 'area', 'plan_interest', 'status', 'created_at'],
    search: ['name', 'phone'],
    filter: { column: 'status', options: ['new', 'contacted', 'converted', 'lost'].map(yesNo) },
    fields: [
      { name: 'name', label: 'Name', type: 'text', readOnly: true },
      { name: 'phone', label: 'Phone', type: 'text', readOnly: true },
      { name: 'area', label: 'Area', type: 'text', readOnly: true },
      { name: 'goal', label: 'Goal', type: 'text', readOnly: true },
      { name: 'diet', label: 'Diet', type: 'text', readOnly: true },
      { name: 'plan_interest', label: 'Plan interest', type: 'text', readOnly: true },
      { name: 'preferred_slot', label: 'Preferred slot', type: 'text', readOnly: true },
      { name: 'note', label: 'Customer note', type: 'textarea', readOnly: true },
      { name: 'status', label: 'Status', type: 'select', required: true, options: ['new', 'contacted', 'converted', 'lost'].map(yesNo) },
    ],
    revalidate: [], title: (r) => `${r.name} · ${r.phone}`,
  },
  {
    key: 'blog-categories', table: 'blog_categories', label: 'Blog categories', singular: 'category',
    description: 'Categories for blog posts.',
    readPermission: 'blog.read', writePermission: 'blog.write', deletePermission: 'blog.write', creatable: true,
    order: { column: 'sort_order', ascending: true },
    listColumns: ['name', 'slug', 'sort_order'],
    fields: [
      { name: 'name', label: 'Name', type: 'text', required: true, maxLength: 60 },
      { name: 'slug', label: 'URL slug', type: 'text', required: true, maxLength: 60 },
      { name: 'sort_order', label: 'Sort order', type: 'number', min: 0, max: 999, step: 1 },
    ],
    revalidate: ['blog'], title: (r) => r.name,
    links: [{ href: '/blog', label: '← Blog posts' }],
  },
];

export function getResource(key: string) {
  return RESOURCES.find((r) => r.key === key);
}
