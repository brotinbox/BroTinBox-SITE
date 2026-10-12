/**
 * Admin sidebar. Each item is shown only if the viewer has `permission`.
 * Adding a page = add an entry here (and a resource config or a page file).
 */
export type AdminNavItem = { href: string; label: string; icon: string; permission: string };
export type AdminNavGroup = { label: string; items: AdminNavItem[] };

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    label: 'Today',
    items: [
      { href: '/', label: 'Overview', icon: 'LayoutDashboard', permission: 'dashboard.read' },
      { href: '/cook-sheet', label: 'Cook sheet', icon: 'ChefHat', permission: 'cooksheet.read' },
      { href: '/deliveries', label: 'Deliveries', icon: 'Bike', permission: 'deliveries.read' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { href: '/orders', label: 'Orders & payments', icon: 'Receipt', permission: 'orders.read' },
      { href: '/subscriptions', label: 'Subscriptions', icon: 'CalendarRange', permission: 'subscriptions.read' },
      { href: '/customers', label: 'Customers', icon: 'Users', permission: 'customers.read' },
      { href: '/enquiries', label: 'Enquiries', icon: 'Inbox', permission: 'enquiries.read' },
    ],
  },
  {
    label: 'Menu & catalog',
    items: [
      { href: '/menu', label: 'Menu calendar', icon: 'CalendarDays', permission: 'menu.read' },
      { href: '/menu/dishes', label: 'Dishes', icon: 'Utensils', permission: 'menu.read' },
      { href: '/addons', label: 'Sides & drinks', icon: 'CupSoda', permission: 'catalog.read' },
      { href: '/plans', label: 'Plans & pricing', icon: 'Tags', permission: 'pricing.read' },
      { href: '/coupons', label: 'Coupons', icon: 'Ticket', permission: 'coupons.read' },
      { href: '/zones', label: 'Delivery zones', icon: 'MapPin', permission: 'zones.read' },
    ],
  },
  {
    label: 'Content',
    items: [
      { href: '/blog', label: 'Blog', icon: 'Newspaper', permission: 'blog.read' },
      { href: '/faqs', label: 'FAQs', icon: 'HelpCircle', permission: 'content.read' },
      { href: '/reviews', label: 'Reviews', icon: 'Star', permission: 'reviews.read' },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/staff', label: 'Staff & roles', icon: 'ShieldCheck', permission: 'staff.manage' },
      { href: '/settings', label: 'Settings', icon: 'Settings', permission: 'settings.read' },
      { href: '/activity', label: 'Activity log', icon: 'History', permission: 'activity.read' },
    ],
  },
];
