/**
 * Staff handbook content for admin › Guide. Plain data so the page can search
 * it (components/admin/GuideSearch.tsx). One topic = one card.
 *
 * Keep it in step with the pages and SQL it describes (lock_deliveries,
 * skip_delivery, pause_subscription, mark_order_paid, daily_housekeeping,
 * stock usage at 9 PM). When you add an admin page, add a topic here.
 *
 *   href      admin route the topic is about ("Open →" link)
 *   keywords  extra words people might search for (synonyms, Tamil/English mix)
 *   who       roles that use it, shown as a small label
 */

export type GuideSectionKey =
  | 'start' | 'daily' | 'orders' | 'customers' | 'kitchen' | 'delivery' | 'stock'
  | 'money' | 'growth' | 'content' | 'setup' | 'statuses' | 'faq';

export const GUIDE_SECTIONS: { key: GuideSectionKey; label: string }[] = [
  { key: 'start', label: 'Getting started' },
  { key: 'daily', label: 'The daily clock' },
  { key: 'orders', label: 'Orders & payments' },
  { key: 'customers', label: 'Customers & plans' },
  { key: 'kitchen', label: 'Menu, cooking & capacity' },
  { key: 'delivery', label: 'Delivery' },
  { key: 'stock', label: 'Kitchen stock & buying' },
  { key: 'money', label: 'Revenue & profit' },
  { key: 'growth', label: 'Leads, trials & partners' },
  { key: 'content', label: 'Website content' },
  { key: 'setup', label: 'Settings, prices & staff' },
  { key: 'statuses', label: 'What statuses mean' },
  { key: 'faq', label: 'Common questions' },
];

export type GuideTopic = {
  id: string;
  section: GuideSectionKey;
  title: string;
  text?: string;
  steps?: string[];
  rows?: { head: [string, string]; rows: [string, string][] };
  href?: string;
  keywords?: string;
  who?: string;
};

export const GUIDE_TOPICS: GuideTopic[] = [
  // -------------------------------------------------------------------------
  // Getting started
  // -------------------------------------------------------------------------
  {
    id: 'big-picture', section: 'start', title: 'From order to doorstep',
    steps: [
      'Customer picks a trial, single box, weekly or monthly plan on the website and checks out (or you enter a WhatsApp order).',
      'The order waits as “pending payment”. Unpaid orders cancel themselves after 30 minutes.',
      'Payment is confirmed: Cashfree does it automatically, or staff click “Mark as paid” for manual UPI.',
      'The plan becomes active: one meal row per day and slot, each “scheduled” (not locked).',
      '9 PM the night before: the next cooking day locks. Menu and food cost are frozen on each box, and the kitchen stock is taken off.',
      'Kitchen cooks from the Cook sheet and moves boxes to preparing → packed.',
      'Delivery: out for delivery → delivered (or failed, with a reason).',
    ],
    text: 'Skips and pauses never lose a meal: each one adds a make-up meal at the end of the plan, so the customer always gets what they paid for.',
    keywords: 'overview flow how it works process lifecycle start',
  },
  {
    id: 'sidebar', section: 'start', title: 'Finding your way around',
    text: 'The sidebar only shows the pages your role can open. Most pages have a date picker (← date →) at the top: it opens on today, or on tomorrow after 9 PM. Print buttons give a clean paper version (Day plan, Cook sheet, Buy list). Every change you make is saved in the Activity log with your name.',
    keywords: 'menu navigation sidebar date picker print where is',
  },
  {
    id: 'phone', section: 'start', title: 'Using the console on a phone',
    text: 'Every page works on a phone. Tables stack into cards, and the menu button (top left) opens the sidebar. Add the console to your home screen from the browser menu so it opens like an app. Keep the link private: it is the secret admin address.',
    keywords: 'mobile phone home screen app link',
  },
  {
    id: 'roles', section: 'start', title: 'Who can do what',
    rows: {
      head: ['Role', 'Access'],
      rows: [
        ['Super admin', 'Everything, including staff, settings, prices, refunds and Revenue & profit.'],
        ['Admin', 'Everything except staff, settings, prices, refunds and Revenue & profit.'],
        ['Kitchen', 'Overview, Day plan, Cook sheet, Cook book, Deliveries (update status), Menu (view), Orders (view), Kitchen stock (buy list, bills, counts, waste).'],
        ['Support', 'Customers (notes), Subscriptions (pause/skip for them), Orders (view), Enquiries, Reviews.'],
        ['Rider', 'Only their assigned deliveries: out for delivery, delivered or failed.'],
      ],
    },
    href: '/staff',
    keywords: 'permissions access role kitchen staff mum rider support admin super admin',
  },

  // -------------------------------------------------------------------------
  // The daily clock
  // -------------------------------------------------------------------------
  {
    id: 'clock', section: 'daily', title: 'The daily clock (IST)',
    rows: {
      head: ['When', 'What happens'],
      rows: [
        ['Until 9:00 PM', 'Customers can skip, pause or customise the next day’s meals. Day plan shows them as “not locked”.'],
        ['9:00 PM', 'Automatic lock for the next cooking day. Menu and food cost are frozen on each box. Cook sheet and Deliveries are final.'],
        ['9:05 PM', 'The locked day’s ingredients are taken off kitchen stock. The Buy list for tomorrow is now final.'],
        ['9:30 AM', 'Last time for same-day lunch single boxes (Settings › Same-day).'],
        ['5:00 PM', 'Last time for same-day dinner single boxes.'],
        ['12:05 AM', 'Housekeeping: ended pauses resume, finished plans become “completed”, abandoned checkouts expire.'],
        ['Every 10–15 min', 'Unpaid orders over 30 minutes are cancelled; Telegram alerts for unpaid orders; scheduled blog posts go live.'],
        ['10:00 AM–7:30 PM', 'Automatic WhatsApp follow-ups after a trial box are sent in this window.'],
        ['Sundays & closures', 'No cooking, no deliveries. Meals are never scheduled on these days.'],
      ],
    },
    keywords: 'time timing schedule cutoff lock 9pm night midnight cron automatic',
  },
  {
    id: 'routine-kitchen', section: 'daily', title: 'A normal day for the kitchen',
    steps: [
      'Morning: open Cook sheet for today. Cook the “What to cook” list; tap a dish for its recipe scaled to the day’s count.',
      'Before lunch goes out: Deliveries → select the lunch boxes → packed → out for delivery.',
      'Afternoon: dinner the same way. Note anything thrown away on Stock & count → Thrown away.',
      'After 9 PM: open the Buy list for tomorrow and send it on WhatsApp.',
      'After shopping: Buy list → “Bought it: add the bill”.',
    ],
    keywords: 'routine daily checklist mum kitchen morning evening what to do',
    who: 'Kitchen',
  },
  {
    id: 'routine-owner', section: 'daily', title: 'A normal day for the owner',
    steps: [
      'Morning: Overview. Clear “Waiting for payment confirmation” and check meals for the next 7 days.',
      'Through the day: answer Telegram alerts (new orders, unpaid orders), follow up Leads and Trials on WhatsApp.',
      'Before 9 PM: Day plan for tomorrow. Make any menu change before the lock.',
      'Deliveries: set the stop order, paste WhatsApp pins for new addresses, follow the route.',
      'Monday: Revenue & profit for the last 7 days. Sunday: stock count.',
    ],
    keywords: 'routine daily checklist owner admin what to do every day',
    who: 'Admin',
  },

  // -------------------------------------------------------------------------
  // Orders & payments
  // -------------------------------------------------------------------------
  {
    id: 'orders-page', section: 'orders', title: 'Orders & payments page',
    text: 'Every purchase: trials, single boxes, weekly and monthly plans, and add-on top-ups. Filter by status, search by customer or order number, and open an order to confirm payment, re-check Cashfree, cancel an unpaid order or move it to today.',
    href: '/orders',
    keywords: 'orders payments list purchase invoice',
  },
  {
    id: 'confirm-upi', section: 'orders', title: 'Confirm a manual UPI payment',
    steps: [
      'The customer pays your UPI ID and types the reference number. The order shows under “Waiting for payment confirmation” on Overview and in Orders.',
      'Check the amount and reference in your bank app.',
      'Open the order → Confirm payment → Mark as paid. The plan turns active and its meals are scheduled.',
    ],
    href: '/orders',
    keywords: 'upi gpay phonepe paytm mark paid manual payment reference bank confirm',
  },
  {
    id: 'cashfree-recheck', section: 'orders', title: 'Customer paid by Cashfree but the order is still unpaid',
    text: 'Open the order → Cashfree → “Re-check with Cashfree”. It asks Cashfree for the payment and activates the plan if it went through. If Cashfree says it failed, the customer can pay again from their Orders page.',
    href: '/orders',
    keywords: 'cashfree paid but not showing webhook payment stuck pending recheck',
  },
  {
    id: 'whatsapp-order', section: 'orders', title: 'Take an order on WhatsApp or phone',
    steps: [
      'Ask for: name, full address with pincode, plan (trial / single / weekly / monthly, veg or non-veg, lunch / dinner / both) and start date. A Gmail is optional (lets them sign in later).',
      'Orders & payments → New WhatsApp order. It creates their account, address and plan with website prices.',
      'Choose “Not paid yet”, send them the total and your UPI ID. When the money arrives, open the order → Mark as paid. If they already paid, pick the method and enter the reference on the form.',
    ],
    href: '/orders/new',
    keywords: 'whatsapp order phone order manual order new order chat offline',
  },
  {
    id: 'cancel-order', section: 'orders', title: 'Cancel an unpaid order',
    text: 'Open the order → Cancel order. Only unpaid orders can be cancelled here; they also cancel themselves after 30 minutes. A paid plan is cancelled from the customer page instead.',
    href: '/orders',
    keywords: 'cancel order unpaid delete order',
  },
  {
    id: 'tatkal', section: 'orders', title: 'Tatkal: deliver a paid order today',
    text: 'When someone pays and needs food today, open the order → “Tatkal: deliver today” → Move to today. It uses a same-day spare box, so it only works while the run still has a spare (Capacity page) and before the tatkal times in Settings (lunch / dinner). Customers never see this option.',
    href: '/orders',
    keywords: 'tatkal urgent today same day move to today emergency',
  },
  {
    id: 'single-box', section: 'orders', title: 'Single box and same-day orders',
    text: 'The single box (/single on the website) is a one-day box anyone can order again and again; the trial stays one per customer. Customers can order it for today until 9:30 AM (lunch) or 5 PM (dinner). Today’s boxes come from spare boxes the kitchen cooks on top of the cook sheet (Capacity › spares). When the spares are gone, today shows “sold out”. A payment that lands too late is booked for the next open day and flagged.',
    href: '/capacity',
    keywords: 'single box one box same day today spare sold out instant',
  },
  {
    id: 'refund', section: 'orders', title: 'Refunds',
    text: 'There is no refund button yet. Cancel the plan on the customer page (it removes future meals), then refund from the Cashfree dashboard or by UPI. Money sent by UPI: add it in Revenue & profit → Bills & adjustments as “Refund to a customer” so revenue is right. Cashfree refunds are counted automatically.',
    href: '/finance?tab=bills',
    keywords: 'refund money back return payment cancel',
  },

  // -------------------------------------------------------------------------
  // Customers & plans
  // -------------------------------------------------------------------------
  {
    id: 'customers-page', section: 'customers', title: 'Customers page',
    text: 'Everyone who signed up, with search. The top card shows how customers found us (from the checkout question). Open a customer for their profile, plans, upcoming meals, orders, addresses, trial box, tags, internal notes and a timeline of everything that happened.',
    href: '/customers',
    keywords: 'customer list search phone name heard from how found us',
  },
  {
    id: 'customer-actions', section: 'customers', title: 'Skip, pause, add meals or cancel a customer’s plan',
    rows: {
      head: ['To', 'On the customer page'],
      rows: [
        ['Skip a meal', 'Upcoming meals → skip on that day (before 9 PM the night before). A make-up meal is added at the end.'],
        ['Undo a skip', 'Upcoming meals → undo, while it is still before the cutoff.'],
        ['Pause', 'Subscriptions → Pause plan with dates. Same number of make-up meals after the pause.'],
        ['Resume early', 'Resume now. Restores paused meals that are still before the cutoff.'],
        ['Give meals back', 'Add meals (e.g. after a failed delivery). They go at the end of the plan.'],
        ['Cancel', 'Cancel plan. Future meals are removed; refund outside the console.'],
        ['Trial again', 'Trial box → Reset trial, to let them book another trial.'],
        ['Notes & tags', 'Internal notes (saved with your name) and tags like “gym”, “no onion”.'],
        ['Block', 'Account → Block. They can’t sign in or order.'],
      ],
    },
    href: '/customers',
    keywords: 'skip pause resume cancel plan add meals credit make up block tag note customer request',
  },
  {
    id: 'subscriptions-page', section: 'customers', title: 'Subscriptions page',
    text: 'Every plan bought, with status and meals left. Use it to find active, paused or ending plans (good for renewal reminders). Open the customer to pause, skip, add meals or cancel.',
    href: '/subscriptions',
    keywords: 'subscriptions plans active ending renewal meals left',
  },
  {
    id: 'customer-acts', section: 'customers', title: 'When a customer does something on the website',
    rows: {
      head: ['Customer does', 'What happens here'],
      rows: [
        ['Places an order', 'New row in Orders (pending payment) and a Telegram alert.'],
        ['Pays with Cashfree', 'Order paid, plan active, meals on Day plan. Telegram alert.'],
        ['Pays by UPI and enters the reference', 'Shows under “Waiting for payment confirmation”. Check the bank, then Mark as paid.'],
        ['Skips a day (before 9 PM)', 'Meal turns skipped; one make-up meal at the end of the plan.'],
        ['Pauses the plan', 'Meals in the window turn paused; the same number of make-up meals after it.'],
        ['Egg-free / skip legume for a day', 'The box changes on Day plan and in Cook sheet counts (egg-free gets an extra legume).'],
        ['Tries to change after 9 PM', 'Blocked: the meal is locked.'],
        ['Leaves without paying', 'Order cancels after 30 minutes; the plan expires at night.'],
        ['Asks for a WhatsApp sign-in code', 'Appears in Leads with what they were looking at.'],
        ['Sends the enquiry form', 'New row in Enquiries with status “new”.'],
        ['Writes a review', 'Waits as pending until you approve it.'],
      ],
    },
    keywords: 'website customer action what happens skip pause pay review enquiry',
  },

  // -------------------------------------------------------------------------
  // Menu, cooking & capacity
  // -------------------------------------------------------------------------
  {
    id: 'day-plan', section: 'kitchen', title: 'Day plan',
    text: 'Every box for a date, split into the morning run (lunch) and evening run (dinner), grouped by area. Includes meals not locked yet. Use it to plan tomorrow before 9 PM and to print the run sheet.',
    href: '/plan',
    keywords: 'day plan tomorrow run sheet who gets what list boxes',
  },
  {
    id: 'cook-sheet', section: 'kitchen', title: 'Cook sheet',
    text: 'How many boxes per slot and diet (Full and Lite, egg-free, no legume, double main), make-up meals, sides and drinks, same-day spares, and “What to cook”: portions, cooked kg and raw kg per dish. Tap a dish to open its recipe already multiplied by the day’s count. Final after the 9 PM lock.',
    href: '/cook-sheet',
    keywords: 'cook sheet how much to cook kg portions count kitchen prep lite egg free',
    who: 'Kitchen',
  },
  {
    id: 'cook-book', section: 'kitchen', title: 'Cook book (recipes)',
    text: 'How we cook every dish: ingredients per ONE portion, steps, times, equipment and tips, so anyone in the kitchen cooks the same box. Search by name or code, or download the whole cook book as a PDF. Admins edit a recipe on its dish page; every edit is kept as a version you can restore.',
    href: '/cook-book',
    keywords: 'recipe cook book ingredients method steps pdf print',
  },
  {
    id: 'recipe-check', section: 'kitchen', title: 'Fixing a recipe with mum',
    steps: [
      'While she cooks, weigh each ingredient before it goes in (a kitchen scale). Note the number of boxes the batch makes.',
      'Menu › Dishes → open the dish → Recipe. Type the batch amounts, enter the number of boxes under “Weighed a whole batch?” and press Divide. Every amount becomes per box.',
      'Write the steps in the order she really cooks. Add anything missing (e.g. mint).',
      'Save recipe, then press “Checked with mum ✓”. The buy list trusts checked recipes and lists the ones still unchecked.',
    ],
    href: '/menu/dishes',
    keywords: 'recipe wrong update verify checked with mum batch divide weigh grams quantities',
  },
  {
    id: 'menu-calendar', section: 'kitchen', title: 'Menu calendar',
    rows: {
      head: ['To', 'Use'],
      rows: [
        ['See the menu', 'The 30-day rotation with any one-off changes, per diet and slot.'],
        ['Change one day’s dish', 'Tap Edit on that lunch or dinner box in the calendar: each part shows “Keep · current dish” or a pick list, then Save. Setting every part back to Keep undoes the change. Or use Change a dish for one date, ideally before 9 PM. A change after the lock (even on the day) also updates the boxes already locked for that slot, so the cook sheet, customer dashboard, Day plan and food cost all show the new dish. Kitchen stock taken at 9 PM is not redone: fix it on the Sunday count. Undo change removes it.'],
        ['Replace a dish for good', 'Replace a dish from a date (swap). Every rotation day with the old dish uses the new one from that date.'],
        ['Holiday / closure', 'Holidays & closures → Add closure. No meals get booked that day.'],
      ],
    },
    href: '/menu',
    keywords: 'menu change dish swap replace holiday closure leave festival rotation tomorrow dish edit inline box calendar',
  },
  {
    id: 'dishes', section: 'kitchen', title: 'Dishes',
    text: 'Every dish with nutrition, portion and photo. Upload real photos to replace placeholders. “New dish” adds one to the library; customers only see it once you put it on a date from the Menu calendar. The dish page also has its recipe, where it is used, and the “checked with mum” tick.',
    href: '/menu/dishes',
    keywords: 'dish photo nutrition calories protein new dish add dish image',
  },
  {
    id: 'capacity', section: 'kitchen', title: 'Capacity and same-day spares',
    text: 'How many boxes the kitchen cooks per lunch and dinner (default 10 + 10). Only one-off boxes (trial, future-day single box) stop when a slot is full; weekly and monthly plans can always book and may push a slot over (shown red). “Change one day” overrides a date. Spares are extra full boxes cooked on top of the cook sheet and sold as same-day single boxes or used for tatkal; set them for every day or one day, 0 turns same-day off for that run. Change spares before 9 PM so the cook sheet shows them.',
    href: '/capacity',
    keywords: 'capacity limit slots full seats spares same day sold out how many boxes',
  },

  // -------------------------------------------------------------------------
  // Delivery
  // -------------------------------------------------------------------------
  {
    id: 'deliveries', section: 'delivery', title: 'Deliveries page',
    steps: [
      'Pick the date and slot. Meals show here only after the 9 PM lock (before that, use Day plan).',
      'Set the stop order, then follow the route.',
      'For a new address, paste the customer’s WhatsApp location or Google Maps link on their stop. It is saved for next time.',
      'Select boxes and move them: preparing → packed → out for delivery → delivered. Use failed with a reason if it couldn’t be delivered.',
    ],
    href: '/deliveries',
    keywords: 'delivery route stops order map location pin whatsapp location google maps rider delivered failed',
  },
  {
    id: 'open-deliveries', section: 'delivery', title: '“Past meals not closed” warning',
    text: 'Every box must end as delivered or failed. If a past box is left locked, packed or out for delivery, its plan never finishes: the customer still sees it as Active. A red warning on Deliveries and a 9 AM Telegram list show these until they are closed. Tap the warning, select the boxes and set delivered (or failed with a reason). Nothing is closed automatically, because delivered vs failed changes meal credits and Revenue & profit.',
    href: '/deliveries',
    keywords: 'stuck open not closed past meal still active plan never completes locked packed telegram warning 9am',
  },
  {
    id: 'failed', section: 'delivery', title: 'A delivery failed',
    text: 'Mark it failed with a reason on Deliveries. Then decide: deliver it later yourself, or give the meal back with Customer page → Add meals (1, same slot). It goes at the end of their plan. Failed boxes earn no revenue.',
    href: '/deliveries',
    keywords: 'failed delivery not home missed wrong address give back',
  },
  {
    id: 'zones', section: 'delivery', title: 'Delivery zones',
    text: 'Pincodes you deliver to, with tier, fee, distance and slots. Core zones are orderable; phase 2 zones are the next batch (customers there join the waitlist and get a WhatsApp when you open). Turn “Delivering now” off to stop a pincode.',
    href: '/zones',
    keywords: 'zone pincode area delivery fee waitlist where we deliver distance',
  },

  // -------------------------------------------------------------------------
  // Kitchen stock & buying
  // -------------------------------------------------------------------------
  {
    id: 'stock-how', section: 'stock', title: 'How kitchen stock works',
    text: 'The Buy list works out what to buy from the cook sheet × each dish’s recipe, minus what is already in the kitchen. Fresh items (chicken, curd, mint, vegetables) are bought for the next day: the need + 5 % for waste − what’s left. Stock items (masala, oil, oats, dals) are bought in packs and only show when less than 5 cooking days are left, or below their minimum, or someone tapped “Running low”. Stock goes up with bills and down at 9 PM for the next day’s cooking. It is only as good as the recipes.',
    href: '/stock',
    keywords: 'inventory stock procurement buying shopping how it works fresh pantry masala',
  },
  {
    id: 'stock-start', section: 'stock', title: 'Start: the opening stock count',
    steps: [
      'Stock & count → Opening stock count.',
      'Weigh or estimate everything in the kitchen: masala packets, oil, oats, dals, atta, and any fresh items left. Skip what you don’t have. Pick kg or g per row.',
      'Answer “Is today’s cooking finished?” so today’s food is counted right.',
      'Save. From the next cooking day, usage is taken off at 9 PM the night before.',
    ],
    href: '/stock/levels',
    keywords: 'opening stock first count setup start inventory',
  },
  {
    id: 'buy-list', section: 'stock', title: 'Buy list',
    text: 'Opens on the next cooking day. After 9 PM tomorrow’s list is final. Sections: “Fresh: buy for this day” (grouped by shop) and “Stock: running low” (whole packs, red = not enough even for that day). “Send on WhatsApp” shares it. “Why the list may be off” lists recipe ingredients not linked to a stock item and dishes not checked with mum.',
    href: '/stock',
    keywords: 'buy list shopping list market list what to buy tomorrow whatsapp list procurement',
    who: 'Kitchen',
  },
  {
    id: 'add-bill', section: 'stock', title: 'Add a kitchen bill',
    steps: [
      'Easiest: Buy list → “Bought it: add the bill”. The items come in already.',
      'Change each quantity to what you really bought and type what you paid for that item (total, not per kg).',
      'Gas, boxes, bags: “Add other cost”. They go to Revenue & profit only.',
      'Save bill. Stock goes up, the price per kg is remembered, and Revenue & profit gets the bill (don’t enter it there again).',
      'Wrong bill? Delete it on Kitchen bills (the person who entered it, or an admin) and add it again.',
    ],
    href: '/stock/bills',
    keywords: 'bill receipt purchase bought expense market vegetables chicken add bill grocery',
    who: 'Kitchen',
  },
  {
    id: 'stock-count', section: 'stock', title: 'Weekly count, waste and running low',
    rows: {
      head: ['When', 'Do this on Stock & count'],
      rows: [
        ['Every Sunday', 'Count the stock items (about 10 minutes). Only rows you fill in change. Big gaps mean a recipe is off: check that dish with mum.'],
        ['Something spoiled', 'Thrown away / spoiled → item, amount, why.'],
        ['Hard to weigh (salt)', 'Tap “Running low”. It goes on the next buy list; the mark clears when you buy or count it.'],
        ['A minus number', 'More was cooked than bought: a bill is missing, or the recipe uses less than written. The next count fixes it.'],
      ],
    },
    href: '/stock/levels',
    keywords: 'count stock take sunday waste spoiled thrown away running low minus negative',
    who: 'Kitchen',
  },
  {
    id: 'stock-items', section: 'stock', title: 'Stock items & recipe links',
    text: 'Each item is fresh or stock, counted in weight, liquid or pieces, with a pack size and an optional “never below” minimum. Recipes keep their own wording (“Onion, finely chopped”); each name is linked once to a stock item (Onion). New names in a recipe appear at the top under “not linked” until you link them. Water is “not tracked”. After fixing a recipe or link, an admin can “Recalculate” a locked day on Stock & count.',
    href: '/stock/ingredients',
    keywords: 'ingredient item add new item pack size minimum link recipe name unlinked not counted',
  },

  // -------------------------------------------------------------------------
  // Revenue & profit
  // -------------------------------------------------------------------------
  {
    id: 'finance-page', section: 'money', title: 'Revenue & profit page (super admin)',
    text: 'Money in, money out and what is left. Pick a date range, then two switches: Earned / Cash in (when revenue counts) and Recipe cost / Bills (which cost to use). The wave chart is revenue (black) against cost (orange); hover a day to see its profit. Tabs: Overview, Bills & adjustments, Dish & add-on costs, Settings.',
    href: '/finance',
    keywords: 'finance profit revenue money margin chart income expense report',
    who: 'Super admin',
  },
  {
    id: 'finance-terms', section: 'money', title: 'What the money numbers mean',
    rows: {
      head: ['Term', 'Meaning'],
      rows: [
        ['Earned revenue', 'Value of meals served that day. A plan’s price is spread over its meals (make-ups included). Failed boxes earn nothing. Top-ups count on the day paid.'],
        ['Cash in', 'Money received that day. Use it to match the bank.'],
        ['Recipe cost', 'What the cooked boxes should cost (dish cost + gas, Lite / egg-free rules, packaging, add-ons). Frozen at the 9 PM lock.'],
        ['Bills', 'What was actually bought: kitchen bills plus bills typed here.'],
        ['Running costs', 'Petrol, ads, rent, equipment, helpers, licences.'],
        ['Automatic costs', 'Cashfree fee and trainer commission. Don’t enter these.'],
        ['Profit / margin', 'Revenue minus cost; margin is the share you keep. Mum’s cooking and delivery time are not costs. No GST.'],
        ['Food cost %', 'Recipe cost ÷ revenue. Green at or below the target (30–35 % is normal).'],
        ['Prepaid, not served', 'Money received for meals still to deliver: owed food, not profit yet.'],
        ['Break-even', 'Meals a day needed to cover running costs, fees and commission.'],
        ['Bills vs recipes', 'Food bills minus recipe cost. Above zero: prices went up, waste, or stocking up.'],
      ],
    },
    href: '/finance',
    keywords: 'earned cash recipe cost food cost margin break even prepaid definition meaning',
  },
  {
    id: 'finance-routine', section: 'money', title: 'Keeping the money numbers right',
    rows: {
      head: ['When', 'Do this'],
      rows: [
        ['Market trip', 'Kitchen bills (with items). It reaches Revenue & profit by itself.'],
        ['Running costs (fuel, ads, rent)', 'Revenue & profit → Bills & adjustments.'],
        ['Refund sent by UPI', 'Bills & adjustments → “Refund to a customer”.'],
        ['Money received outside the website', 'Bills & adjustments → “Money received outside the website”.'],
        ['Chicken / veg price changed', 'Dish & add-on costs → change the dish, or a group by %. “Re-cost boxes” applies it to past days.'],
        ['Packaging, Cashfree fee %, food-cost target', 'Revenue & profit → Settings.'],
        ['Every Monday', 'Range 7 days: profit, food cost % and Bills vs recipe cost.'],
        ['Start of the month', '“Last month”: Cash in for the bank, Earned for real profit.'],
      ],
    },
    href: '/finance?tab=bills',
    keywords: 'expense fuel petrol rent ads cost price change dish cost recost monthly weekly',
  },

  // -------------------------------------------------------------------------
  // Leads, trials & partners
  // -------------------------------------------------------------------------
  {
    id: 'leads', section: 'growth', title: 'Leads',
    text: 'Everyone who entered their number to sign in, what they were looking at, and how far they got. Follow up personally on WhatsApp. They did not opt in to marketing, so don’t send promotions.',
    href: '/leads',
    keywords: 'leads follow up phone numbers sign in abandoned whatsapp prospects',
  },
  {
    id: 'trials', section: 'growth', title: 'Trials',
    text: 'One trial box per customer. Automatic WhatsApp follow-ups go out (feedback the day after, then up to two plan reminders for people who opted in to offers). Message personally too, and press “Mark messaged”. The page also shows who tried to book a second trial. To allow another trial, use “Reset trial”.',
    href: '/trials',
    keywords: 'trial box follow up feedback second trial reset one per customer',
  },
  {
    id: 'whatsapp-followups', section: 'growth', title: 'WhatsApp follow-ups',
    text: 'Settings › WhatsApp follow-ups shows the automatic messages after a trial box: a feedback ask, then up to two plan reminders for customers who opted in. They stop when the customer buys a plan or taps Stop offers, and go out between 10:00 and 19:30.',
    href: '/settings/whatsapp',
    keywords: 'whatsapp message automatic reminder template follow up trial',
  },
  {
    id: 'partners', section: 'growth', title: 'Trainer partners',
    steps: [
      'Trainers apply from the website. Check each one (call, Instagram, gym visit).',
      'Partners → open the application → approve with a code, or reject.',
      'Their clients use the code; commissions appear when a linked client pays for a weekly or monthly plan.',
      'Pay them, then “Record payout”. Pausing stops the code and new commission at once.',
    ],
    href: '/partners',
    keywords: 'partner trainer gym coach referral code commission payout affiliate',
  },
  {
    id: 'enquiries', section: 'growth', title: 'Enquiries',
    text: 'Leads from the website enquiry form. Move each one new → contacted → converted or lost as you follow up.',
    href: '/enquiries',
    keywords: 'enquiry contact form message lead',
  },
  {
    id: 'reviews', section: 'growth', title: 'Reviews',
    text: 'Customer reviews. Reviews written on the website wait as pending. Add ones you got on a call or WhatsApp with “New”. Only approved reviews (with the customer’s OK) appear on the home page.',
    href: '/reviews',
    keywords: 'review testimonial feedback rating approve home page',
  },
  {
    id: 'coupons', section: 'growth', title: 'Coupons',
    text: 'Discount codes customers enter at checkout: flat ₹ or % off, minimum order, maximum discount, dates, total uses, uses per customer and first-order-only. Limits are checked on the server.',
    href: '/coupons',
    keywords: 'coupon discount code offer promo',
  },

  // -------------------------------------------------------------------------
  // Website content
  // -------------------------------------------------------------------------
  {
    id: 'blog', section: 'content', title: 'Blog',
    text: 'Write and publish articles. Published posts appear at /blog straight away; a post with a future publish time goes live by itself. Categories are under Blog categories.',
    href: '/blog',
    keywords: 'blog article post seo publish write cover',
  },
  {
    id: 'faqs', section: 'content', title: 'FAQs',
    text: 'Questions shown on the FAQ page and the home page. Changes show within a minute.',
    href: '/faqs',
    keywords: 'faq question answer help page',
  },
  {
    id: 'addons', section: 'content', title: 'Sides & drinks',
    text: 'Extras customers can add to any day: protein sides, dips and cold-pressed drinks, with price, nutrition and photo. Turn one off to hide it from the website. Their counts show on the Cook sheet.',
    href: '/addons',
    keywords: 'addon add-on side drink juice dip extra',
  },
  {
    id: 'banner', section: 'content', title: 'Announcement banner',
    text: 'Settings → Site announcement banner: show a short message (with an optional link) across the top of the website, e.g. a holiday or an offer.',
    href: '/settings',
    keywords: 'banner announcement notice top bar message holiday offer',
  },

  // -------------------------------------------------------------------------
  // Settings, prices & staff
  // -------------------------------------------------------------------------
  {
    id: 'prices', section: 'setup', title: 'Change a price',
    text: 'Plans & pricing → Prices per meal → add a new row with a start time. The newest row whose start has passed is charged; old rows stay as history. Plans holds the name, description, features and badge shown on the website. Super admin only.',
    href: '/pricing',
    keywords: 'price change cost of box plan price offer pricing rules',
  },
  {
    id: 'settings', section: 'setup', title: 'Settings (super admin)',
    rows: {
      head: ['Card', 'What it controls'],
      rows: [
        ['Payments', 'UPI ID, payee name, QR image and the instructions customers see for manual UPI.'],
        ['Cashfree: Test or Live', 'Which Cashfree keys are used. The ₹1 test payment page checks everything end to end.'],
        ['Ordering', 'Accept new orders (untick to stop taking orders), cutoff time, longest pause, support WhatsApp number.'],
        ['Tatkal', 'Let staff move a paid order to today, and until when for lunch / dinner.'],
        ['Same-day single box', 'Let customers order a box for today, cutoffs and grace minutes. How many: Capacity › spares.'],
        ['Site announcement banner', 'Message across the top of the website.'],
        ['Features', 'Google sign-in, refer & earn and other switches.'],
        ['Phone sign-in (WhatsApp code)', 'Test or live mode, test numbers, template and a test send.'],
        ['Staff alerts (Telegram)', 'Where order and payment alerts go, with a test alert.'],
        ['WhatsApp follow-ups', 'The automatic messages after a trial.'],
      ],
    },
    href: '/settings',
    keywords: 'settings stop orders upi id qr cashfree live test telegram alerts google login referral features',
    who: 'Super admin',
  },
  {
    id: 'staff', section: 'setup', title: 'Add staff (mum, a helper, a rider)',
    steps: [
      'In Supabase → Authentication → Users → Add user: their email and a strong password (12+ characters), tick Auto confirm.',
      'Staff & roles → Add a staff member → the same email and a role (Kitchen for mum and helpers, Rider, Support, Admin) → Give access.',
      'Share the console address and password privately (not in a group chat). They only see the pages their role allows. Change or remove access on the same page.',
    ],
    href: '/staff',
    keywords: 'staff add user employee mum helper rider access login role give access',
    who: 'Super admin',
  },
  {
    id: 'activity', section: 'setup', title: 'Activity log',
    text: 'Every change by customers, staff and the automatic jobs, newest first. Use it for “who did this, and when?”.',
    href: '/activity',
    keywords: 'activity log history audit who changed',
  },
  {
    id: 'overview', section: 'setup', title: 'Overview (home)',
    text: 'Revenue for the last 30 days, meals for the next 7 days, payments waiting for confirmation and recent activity. Start your day here.',
    href: '/',
    keywords: 'overview dashboard home summary',
  },

  // -------------------------------------------------------------------------
  // Statuses
  // -------------------------------------------------------------------------
  {
    id: 'meal-statuses', section: 'statuses', title: 'Meal statuses (Day plan, Deliveries, customer page)',
    rows: {
      head: ['Status', 'Meaning'],
      rows: [
        ['scheduled (not locked)', 'Booked; the customer can still skip or change it until 9 PM the night before.'],
        ['locked', 'Past the cutoff. Final: cook it and deliver it.'],
        ['preparing', 'Kitchen has started this box.'],
        ['packed', 'Ready for the rider.'],
        ['out for delivery', 'Picked up by the rider.'],
        ['delivered', 'Handed over.'],
        ['failed', 'Could not be delivered; a reason is saved.'],
        ['skipped', 'Skipped by the customer or staff; a make-up meal was added.'],
        ['paused', 'Inside a pause; a make-up meal was added after it.'],
        ['cancelled', 'The plan was cancelled before this day.'],
      ],
    },
    keywords: 'status meaning scheduled locked preparing packed delivered failed skipped paused cancelled',
  },
  {
    id: 'order-statuses', section: 'statuses', title: 'Order statuses',
    rows: {
      head: ['Status', 'Meaning'],
      rows: [
        ['pending payment', 'Checkout started, money not confirmed. Auto-cancels after 30 minutes.'],
        ['paid', 'Money received. The plan is active and meals are scheduled.'],
        ['failed', 'The Cashfree attempt failed. The customer can try again.'],
        ['cancelled', 'Never paid (timed out) or cancelled by staff.'],
        ['refunded', 'Money returned.'],
      ],
    },
    keywords: 'order status pending payment paid failed cancelled refunded',
  },
  {
    id: 'plan-statuses', section: 'statuses', title: 'Plan (subscription) statuses',
    rows: {
      head: ['Status', 'Meaning'],
      rows: [
        ['pending payment', 'Plan created, waiting for its order to be paid.'],
        ['active', 'Meals are being delivered.'],
        ['paused', 'On a pause; resumes the day after it ends.'],
        ['completed', 'Every meal is done.'],
        ['cancelled', 'Stopped early; future meals removed.'],
        ['expired', 'Its order was never paid.'],
      ],
    },
    keywords: 'subscription plan status active paused completed expired',
  },

  // -------------------------------------------------------------------------
  // FAQ
  // -------------------------------------------------------------------------
  { id: 'faq-not-locked', section: 'faq', title: 'Why does a meal say “not locked”?', text: 'It is before 9 PM the night before, so the customer can still skip or change it. At 9 PM it locks automatically. Plan with it, but treat the Cook sheet after 9 PM as final.', keywords: 'not locked scheduled' },
  { id: 'faq-deliveries-empty', section: 'faq', title: 'Deliveries is empty but Day plan has boxes', text: 'Deliveries only lists locked meals. Before 9 PM use Day plan.', keywords: 'deliveries empty missing' },
  { id: 'faq-paid-no-meals', section: 'faq', title: 'A customer paid but has no meals', text: 'Open the order. With Cashfree, “Re-check with Cashfree”. With manual UPI, check the reference in your bank app and “Mark as paid”; that schedules the meals.', keywords: 'paid no meals not scheduled' },
  { id: 'faq-late-skip', section: 'faq', title: 'A customer missed the cutoff and wants to skip', text: 'A locked meal can’t be skipped, even by staff. Deliver it anyway, or add a make-up meal from the customer page (Add meals).', keywords: 'late skip after 9pm cutoff missed' },
  { id: 'faq-profit-bank', section: 'faq', title: 'Why is profit different from my bank balance?', text: 'Earned revenue counts meals when served, but the money arrived when the plan was paid. Switch to “Cash in” to match the bank. Bills not entered yet are also missing.', keywords: 'profit bank balance mismatch' },
  { id: 'faq-cost-history', section: 'faq', title: 'I changed a dish cost but last week’s profit didn’t change', text: 'On purpose: each box keeps the cost from the night it was locked. Use “Re-cost boxes” on Dish & add-on costs if the new price should apply to past days.', keywords: 'dish cost past profit recost' },
  { id: 'faq-wrong-bill', section: 'faq', title: 'I typed a bill wrong', text: 'Kitchen bill: delete it on Kitchen bills and add it again (stock is corrected too). Other bills: Revenue & profit → Bills & adjustments → Delete.', keywords: 'wrong bill mistake delete edit' },
  { id: 'faq-buy-list-wrong', section: 'faq', title: 'The buy list looks wrong', text: 'Check “Why the list may be off” under the list: unlinked recipe ingredients aren’t counted, and unchecked recipes may have wrong amounts. Also check that bills were entered and the last count is recent. Fix the recipe with mum, link new names on Items & recipe links, and do a count.', keywords: 'buy list wrong too much too little shopping list error' },
  { id: 'faq-old-website', section: 'faq', title: 'I changed something but the website still shows the old one', text: 'Most changes show within a minute. Price rows apply from their start time.', keywords: 'website not updated cache old' },
  { id: 'faq-stop-orders', section: 'faq', title: 'How do I stop taking orders for a few days?', text: 'For a holiday: Menu calendar → Holidays & closures (no meals get booked those days). To stop all new orders: Settings → Ordering → untick “Accept new orders”. Tell customers with the announcement banner.', keywords: 'stop orders holiday leave close kitchen pause business' },
];

/** Lower-case words of a string, without punctuation. */
export const words = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^\p{L}\p{N}₹%]+/gu, ' ').trim();

/** Everything searchable in a topic, lower-case. */
export function topicHaystack(t: GuideTopic, sectionLabel: string): string {
  return words([
    t.title, t.text ?? '', ...(t.steps ?? []), ...(t.rows?.rows.flat() ?? []), t.keywords ?? '', sectionLabel, t.who ?? '',
  ].join(' '));
}
