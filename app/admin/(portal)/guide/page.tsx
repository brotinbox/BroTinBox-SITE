import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireStaff } from '@/lib/auth/session';
import { adminHref } from '@/lib/admin/paths';
import { Card, PageHeader, StatusBadge } from '@/components/admin/ui';

export const metadata = { title: 'Guide' };

/**
 * Staff handbook: how the website and this console connect. Plain content, no
 * data. Keep it in step with the SQL functions it describes (lock_deliveries,
 * skip_delivery, pause_subscription, mark_order_paid, daily_housekeeping).
 */

const SECTIONS = [
  ['flow', 'The big picture'],
  ['clock', 'The daily clock'],
  ['statuses', 'What every status means'],
  ['customer', 'When a customer does something'],
  ['change', 'How to change things'],
  ['pages', 'Page by page'],
  ['roles', 'Who can do what'],
  ['faq', 'Common questions'],
] as const;

const FLOW: [string, string][] = [
  ['Customer orders', 'Picks a trial, weekly or monthly plan on the website and checks out.'],
  ['Order waits for payment', 'Order is “pending payment”. Unpaid orders cancel themselves after 30 minutes.'],
  ['Payment confirmed', 'Cashfree confirms automatically, or staff click “Mark as paid” for manual UPI.'],
  ['Plan becomes active', 'One meal row is created per day and slot. Each starts as “scheduled” (not locked).'],
  ['9 PM lock', 'The night before, every scheduled meal for the next cooking day becomes “locked”.'],
  ['Cook & pack', 'Kitchen works from the Cook sheet and moves meals to preparing → packed.'],
  ['Deliver', 'Riders take them out → delivered (or failed, with a reason).'],
];

const CLOCK: [string, string, string][] = [
  ['Until 9:00 PM', 'Customers can skip, pause or customise the next day’s meals.', 'Day plan shows those meals as “not locked”.'],
  ['9:00 PM', 'Automatic lock for the next cooking day. The day’s menu is frozen onto each box.', 'Cook sheet and Deliveries are now final.'],
  ['12:05 AM', 'Housekeeping: pauses that ended resume, finished plans become “completed”, abandoned checkouts expire.', 'Nothing to do; see Activity log.'],
  ['Every 15 min', 'Orders unpaid for 30 minutes are cancelled; scheduled blog posts go live.', '—'],
  ['Sundays & closures', 'No cooking, no deliveries. Meals are never scheduled on these days.', 'Add holidays in Menu calendar.'],
];

const DELIVERY_STATUSES: [string, string, string?][] = [
  ['scheduled', 'Booked, but the customer can still skip or change it. Shown as “not locked”.', 'not locked'],
  ['locked', 'Past the 9 PM cutoff. Final: cook it and deliver it.'],
  ['preparing', 'Kitchen has started this box.'],
  ['packed', 'Box is ready for the rider.'],
  ['out_for_delivery', 'Rider has picked it up.'],
  ['delivered', 'Handed over. Counts toward “meals delivered”.'],
  ['failed', 'Could not be delivered. A reason is saved; decide on a make-up meal from the customer page.'],
  ['skipped', 'Customer (or staff) skipped this day. A make-up meal was added at the end of the plan.'],
  ['paused', 'Falls inside a pause. A make-up meal was added after the pause ends.'],
  ['cancelled', 'Plan was cancelled before this day. Will not be cooked.'],
];

const ORDER_STATUSES: [string, string][] = [
  ['pending_payment', 'Checkout started, money not confirmed yet. Auto-cancels after 30 minutes.'],
  ['paid', 'Money received. The plan is active and meals are scheduled.'],
  ['failed', 'The payment attempt failed at Cashfree. The customer can try again.'],
  ['cancelled', 'Never paid (timed out) or cancelled by staff.'],
  ['refunded', 'Money returned. Refunds are done manually outside the console for now.'],
];

const SUB_STATUSES: [string, string][] = [
  ['pending_payment', 'Plan created, waiting for its order to be paid.'],
  ['active', 'Meals are being delivered.'],
  ['paused', 'On a pause. Resumes automatically the day after the pause ends.'],
  ['completed', 'Every meal is done (delivered, skipped or failed).'],
  ['cancelled', 'Stopped early. Future meals removed; refund is manual.'],
  ['expired', 'Its order was never paid.'],
];

const CUSTOMER_ACTIONS: [string, string, string][] = [
  ['Places an order', 'New row in Orders (pending payment) and a Telegram alert.', 'Orders & payments'],
  ['Pays with Cashfree', 'Order turns paid, plan turns active, meals appear on Day plan. Telegram alert.', 'Day plan'],
  ['Pays by manual UPI and enters the reference', 'Shows under “Waiting for payment confirmation”. Check your bank app, then Mark as paid.', 'Orders & payments'],
  ['Skips a day (before 9 PM)', 'That meal turns skipped; one make-up meal is added at the end of the plan, same slot and diet.', 'Customer page'],
  ['Pauses the plan', 'Meals in the window turn paused; the same number of make-up meals is added after it.', 'Subscriptions'],
  ['Turns on egg-free / skip legume for a day', 'The box changes on Day plan and in Cook sheet counts (egg-free gets an extra legume).', 'Cook sheet'],
  ['Tries to change anything after 9 PM', 'Blocked: the meal is locked. Nobody can skip it now; if needed, give a meal back with Add meals.', '—'],
  ['Leaves without paying', 'Order cancels itself after 30 minutes; the plan expires at night.', 'Activity log'],
  ['Sends the enquiry form', 'New lead in Enquiries with status “new”.', 'Enquiries'],
  ['Writes a review', 'Waits as pending. It appears on the site only after you approve it.', 'Reviews'],
];

const CHANGES: [string, string, string][] = [
  ['Price of a box', 'Plans & pricing → Prices per meal → add a new row with a start time. The newest row whose start has passed is charged.', '/pricing'],
  ['Discount code', 'Coupons → new coupon. Limits (per user, first order only, expiry) are checked at checkout.', '/coupons'],
  ['Tomorrow’s dish', 'Menu calendar → Change a dish for one date. Do it before 9 PM: locked boxes keep the menu frozen at lock time.', '/menu'],
  ['A holiday', 'Menu calendar → Holidays & closures. No meals get booked that day.', '/menu'],
  ['Dish photo or nutrition', 'Dishes → open the dish.', '/menu/dishes'],
  ['Sides and drinks', 'Sides & drinks. Turn one off to hide it from the website.', '/addons'],
  ['Where you deliver', 'Delivery zones → pincode, fee, active. Outside pincodes go to the waitlist.', '/zones'],
  ['Stop taking orders', 'Settings → Ordering → untick “Accept new orders”.', '/settings'],
  ['Cashfree or manual UPI', 'Settings → Payments → How customers pay.', '/settings'],
  ['Cutoff time or longest pause', 'Settings → Ordering. Note: the automatic lock itself always runs at 9 PM.', '/settings'],
  ['A customer’s plan', 'Customers → open the customer: pause, resume, skip/undo a meal, add meals, cancel, notes, tags, block.', '/customers'],
  ['Who can use the console', 'Staff & roles (super admin only).', '/staff'],
  ['FAQ, blog, reviews', 'Content section in the sidebar. Changes show on the website within a minute.', '/faqs'],
];

const PAGES: [string, string, string, string][] = [
  ['/', 'Overview', 'Revenue, meals for the next cooking day, payments to confirm and recent activity.', 'Start of the day.'],
  ['/plan', 'Day plan', 'Every box for a date, split into the morning (lunch) and evening (dinner) runs, grouped by area. Includes meals not locked yet.', 'Planning tomorrow before 9 PM; printing the run sheet.'],
  ['/cook-sheet', 'Cook sheet', 'How many boxes per slot and diet, and kilos of each dish to prep, plus sides and drinks.', 'Kitchen, after the 9 PM lock.'],
  ['/deliveries', 'Deliveries', 'Locked meals by area. Select boxes to assign a rider or move them to preparing, packed, out for delivery, delivered or failed.', 'During cooking and delivery.'],
  ['/orders', 'Orders & payments', 'Every purchase. Confirm manual UPI payments, re-check Cashfree, cancel unpaid orders.', 'When a payment alert arrives.'],
  ['/subscriptions', 'Subscriptions', 'Every plan bought, with status and meals left.', 'Finding active, paused or ending plans.'],
  ['/customers', 'Customers', 'Everyone who signed up. The customer page has their plan, meals, payments, addresses, notes and timeline, plus all staff actions.', 'Any customer request.'],
  ['/enquiries', 'Enquiries', 'Leads from the website form. Move them new → contacted → converted or lost.', 'Daily follow-up.'],
  ['/menu', 'Menu calendar', 'The 30-day rotation, one-off dish changes and closures.', 'Weekly menu review.'],
  ['/plans', 'Plans & pricing', 'Plans shown on the website and their prices per meal (with history).', 'Price changes and offers.'],
  ['/activity', 'Activity log', 'Every change by customers, staff and the automatic jobs, newest first.', '“Who did this, and when?”'],
];

const ROLES: [string, string][] = [
  ['Super admin', 'Everything, including staff, settings, prices and refunds.'],
  ['Admin', 'Everything except staff, settings, prices and refunds.'],
  ['Kitchen', 'Overview, Day plan, Cook sheet, Deliveries (can update status), Menu (view), Orders (view).'],
  ['Support', 'Customers (notes), Subscriptions (pause/skip on their behalf), Orders (view), Enquiries, Reviews.'],
  ['Rider', 'Only their assigned deliveries: out for delivery, delivered or failed.'],
];

const FAQ: [string, ReactNode][] = [
  ['Someone ordered on WhatsApp. What do I do?', 'Ask them for 4 things: name, full address with pincode, plan (trial / weekly / monthly, veg or non-veg, lunch / dinner / both) and start date. Their WhatsApp number you already have; a Gmail is optional (lets them sign in later and see the plan). Then Orders & payments → New WhatsApp order. Choose “Not paid yet”, send them the total and your UPI ID, and when the money arrives click “Mark as paid” on the order. That schedules the meals. If they already paid, pick the method and enter the reference on the form instead.'],
  ['Why does a meal say “not locked”?', 'It is before 9 PM the night before, so the customer can still skip or change it. At 9 PM it locks automatically. Plan with it, but treat the Cook sheet after 9 PM as final.'],
  ['Why is Deliveries empty but Day plan has boxes?', 'Deliveries only lists locked meals. Before 9 PM use Day plan.'],
  ['A customer paid but has no meals.', 'Open the order. With Cashfree, click “Re-check with Cashfree”. With manual UPI, check the reference in your bank app and click “Mark as paid”; that schedules the meals.'],
  ['A customer missed the cutoff and wants to skip.', 'A locked meal can’t be skipped, even by staff. If you want to be kind, deliver it anyway or add a make-up meal from the customer page (Add meals).'],
  ['A delivery failed. How do I give the meal back?', 'Customer page → Add meals (1, same slot). It goes at the end of their plan.'],
  ['Do I refund in the console?', 'Not yet. Cancel the plan here (it removes future meals), then refund from Cashfree or by UPI.'],
  ['I changed something but the website still shows the old one.', 'Most changes show within a minute. Price rows apply from their start time.'],
];

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <div id={id} className="scroll-mt-6">
      <Card title={title}>{children}</Card>
    </div>
  );
}

function Rows({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-x-auto -mx-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-gray-500 border-b border-gray-100">
            {head.map((h) => <th key={h} className="px-5 py-2 font-bold">{h}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((r, i) => (
            <tr key={i} className="align-top">
              {r.map((c, j) => <td key={j} className={j === 0 ? 'px-5 py-2.5 font-semibold text-gray-900 whitespace-nowrap' : 'px-5 py-2.5 text-gray-600'}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default async function GuidePage() {
  await requireStaff();
  const page = (href: string, label: string) =>
    <Link href={adminHref(href)} className="font-semibold text-gray-900 underline decoration-gray-300 hover:decoration-gray-900">{label}</Link>;

  return (
    <>
      <PageHeader title="Guide" description="How the website and this console fit together: what each status means, what happens here when a customer acts, and where to change things." />

      <nav className="mb-6 flex flex-wrap gap-2">
        {SECTIONS.map(([id, label]) => (
          <a key={id} href={`#${id}`} className="px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-bold text-gray-700 hover:border-gray-900">{label}</a>
        ))}
      </nav>

      <div className="space-y-6">
        <Section id="flow" title="The big picture: from order to doorstep">
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {FLOW.map(([t, d], i) => (
              <li key={t} className="rounded-xl border border-gray-200 p-3">
                <p className="text-[11px] font-bold text-gray-400">STEP {i + 1}</p>
                <p className="font-heading font-bold text-gray-900 mt-0.5">{t}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{d}</p>
              </li>
            ))}
          </ol>
          <p className="text-xs text-gray-500 mt-4">
            Skips and pauses never lose a meal: each one adds a <strong>make-up meal</strong> at the end of the plan, so the customer always gets what they paid for.
          </p>
        </Section>

        <Section id="clock" title="The daily clock (IST)">
          <Rows head={['When', 'What happens', 'What you see']} rows={CLOCK} />
        </Section>

        <Section id="statuses" title="What every status means">
          <div className="space-y-6">
            {([['Meals (Day plan, Deliveries, customer page)', DELIVERY_STATUSES], ['Orders', ORDER_STATUSES], ['Plans / subscriptions', SUB_STATUSES]] as const).map(([title, list]) => (
              <div key={title}>
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">{title}</h3>
                <dl className="grid gap-x-6 gap-y-2.5 md:grid-cols-2">
                  {list.map(([v, d, label]) => (
                    <div key={v} className="flex gap-3 items-start">
                      <dt className="w-32 shrink-0"><StatusBadge value={v} label={label} /></dt>
                      <dd className="text-sm text-gray-600">{d}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
        </Section>

        <Section id="customer" title="When a customer does something on the website">
          <Rows head={['Customer does', 'What happens here', 'Where to look']} rows={CUSTOMER_ACTIONS} />
        </Section>

        <Section id="change" title="How to change things">
          <Rows head={['To change', 'How', '']} rows={CHANGES.map(([a, b, href]) => [a, b, page(href, 'Open →')])} />
        </Section>

        <Section id="pages" title="Page by page">
          <Rows head={['Page', 'What it shows and does', 'Use it for']} rows={PAGES.map(([href, label, d, use]) => [page(href, label), d, use])} />
        </Section>

        <Section id="roles" title="Who can do what">
          <Rows head={['Role', 'Access']} rows={ROLES} />
          <p className="text-xs text-gray-500 mt-3">Pages you can’t open don’t appear in your sidebar. Super admins add staff and change roles under Staff & roles.</p>
        </Section>

        <Section id="faq" title="Common questions">
          <div className="divide-y divide-gray-100 -my-2">
            {FAQ.map(([q, a]) => (
              <details key={q} className="py-3 group">
                <summary className="cursor-pointer font-semibold text-sm text-gray-900 list-none flex justify-between gap-3">
                  {q}<span className="text-gray-400 group-open:rotate-45 transition-transform">+</span>
                </summary>
                <p className="text-sm text-gray-600 mt-2 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </Section>
      </div>
    </>
  );
}
