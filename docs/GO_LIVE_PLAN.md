# BroTin Box — Go-Live Plan (Supabase + Cashfree)

Replaces `docs/BACKEND_PLAN.md`, which describes the older 6-box model. This plan is based on the code as it is today.

---

## 0. Where the app stands today

| Area | Current state | Problem for go-live |
|---|---|---|
| Auth | `/login` fakes OTP with `setTimeout`. The store starts with `isLoggedIn: true` and a hardcoded profile ("Mohammed Anas") | Every visitor is "logged in" as the same fake user |
| Menu | **Two models in parallel:** `lib/menu-engine.ts` + `menu-30day.json` + `overrides.json` (used by `/menu`, trial, weekly, monthly and pricing flows, cook-sheet) **and** `boxes.json` + `schedule.json` (used by home, `/box/[slug]`, `/my-plan`, the planner and store pricing) | Prices and dishes differ between pages. We need one source of truth |
| Pricing | Calculated in the browser (`trialOrder.price`, `getPlanTotalWeeklyPrice`) and passed to checkout | The client can change the amount. Prices must be recalculated on the server |
| Checkout | `handleSimulatePayment`, no gateway | Needs the Cashfree integration |
| Orders, subscriptions, skip, pause | Mock data in `lib/api/orders.ts` and Zustand in `localStorage` | Nothing reaches the admin side |
| Admin | 4 pages (cook-sheet, deliveries, dishes, subscribers) on static data, **no auth guard** | Anyone can open `/admin` |
| Blog | Hardcoded `BLOG_POSTS` array in `app/blog/page.tsx`, no `/blog/[slug]` | No CMS, weak SEO |
| Enquiries | `/api/enquiry` sends to Telegram only, not stored, no rate limit | Leads are lost and the endpoint can be spammed |
| Security | No `proxy.ts` (Next 16's replacement for middleware), no rate limits, no security headers, no input validation on routes | Must be fixed before launch |

---

## 1. Decisions (confirmed 2026-10-12)

| # | Decision | Consequence |
|---|---|---|
| 1 | **The 30-day rotation is the only menu** | Retire `boxes.json` and `schedule.json`. Rebuild home, `/box/[slug]`, `/my-plan` and the planner on the menu engine. Sides and drinks stay as add-ons |
| 2 | **Google login now, WhatsApp OTP later** | Launch with Supabase Google OAuth. Add WhatsApp OTP afterwards through Supabase's *Send SMS hook* to a WhatsApp Business provider (Interakt, AiSensy, Gupshup or MSG91 WhatsApp) using an approved *authentication* template. This avoids SMS DLT registration. The login page reads enabled providers from config, so adding WhatsApp OTP needs no rewrite. Phone number is collected during onboarding for delivery and WhatsApp updates |
| 3 | **Prepaid only at launch** | Cashfree PG one-time orders. AutoPay is a phase-2 feature behind a flag |
| 4 | **Skipped or paused meals become meal credits** | The end date moves forward. Refunds happen only when an admin issues one. The refund-policy page must say this |
| 5 | **Brand is BroTin Box** | Done in code (see section 11) |
| 6 | **Build the framework now, add most sub-pages later** | See section 10. Simple admin pages come from configuration rather than being hand-built |

---

## 2. Target architecture

```
Browser ──► Next.js 16 (Vercel)
             ├─ proxy.ts ............ session refresh, /admin + /account guards, rate limit, security headers
             ├─ Server Components ... read through the Supabase server client (RLS applies, user's JWT)
             ├─ Server Actions ...... customer + admin mutations (zod-validated, rate-limited)
             ├─ /api/checkout/* ..... create Cashfree order (server prices it)
             ├─ /api/webhooks/cashfree  signature-verified, idempotent
             └─ /api/cron/* ......... nightly lock, auto-resume, reminders (CRON_SECRET)
Supabase
  ├─ Auth (phone/email OTP, roles via profiles.role + custom JWT claim)
  ├─ Postgres + RLS on every table, business rules in SQL functions (skip/pause cutoff)
  ├─ Storage buckets: menu-images, blog-images (admin write, public read)
  ├─ Realtime: new orders, delivery status → admin dashboard
  └─ pg_cron: 9 PM IST lock, materialized analytics refresh
Upstash Redis ─ rate limiting (@upstash/ratelimit)
Cashfree ─ PG orders, refunds, (phase 2) Subscriptions / UPI AutoPay
Telegram/WhatsApp/Email ─ admin alerts + customer notifications
```

**Code layout to add**

```
lib/supabase/client.ts      browser client (anon key)
lib/supabase/server.ts      server client using cookies (@supabase/ssr)
lib/supabase/admin.ts       service-role client, server-only, used only by webhooks/cron
lib/auth/guards.ts          requireUser(), requireAdmin(), requireRole()
lib/ratelimit.ts            Upstash limiters by bucket
lib/pricing.ts              the ONE server-side pricing function (replaces client math)
lib/cashfree.ts             create order, fetch order, verify webhook, refund
lib/validation/*.ts         zod schemas shared by forms and server
supabase/migrations/*.sql   every schema change, committed to git
supabase/seed.sql           generated from data/*.json
types/database.ts           `supabase gen types` output
proxy.ts                    Next 16 request proxy
```

Zustand keeps **UI state and the in-progress plan builder only**. Who the user is, their subscription, orders and addresses come from the database.

---

## 3. Database schema

All tables have `id uuid pk default gen_random_uuid()`, `created_at`, `updated_at` (trigger) unless noted. **RLS is enabled on every table.**

### 3.1 Identity and customers

| Table | Key columns | RLS |
|---|---|---|
| `profiles` | `id` (= auth.users.id), `full_name`, `phone`, `email`, `role` enum(`customer`,`admin`,`kitchen`,`rider`), `goal`, `gender`, `dob`, `height_cm`, `weight_kg`, `target_weight_kg`, `activity_level`, `diet_type`, `allergies text[]`, `disliked_ingredients text[]`, `target_calories/protein/carbs/fat`, `is_onboarded`, `referral_code`, `referred_by`, `marketing_opt_in`, `last_seen_at`, `is_blocked` | Owner reads and updates their own row **except `role` and `is_blocked`**. Admin has full access |
| `addresses` | `user_id`, `label`, `recipient_name`, `phone`, `flat`, `street`, `landmark`, `area`, `pincode`, `city`, `lat`, `lng`, `zone_id`, `instructions`, `is_default` | Owner CRUD. Admin reads |
| `progress_logs` | `user_id`, `log_date`, `weight_kg`, `calories`, `protein`, `water_l`, unique(user_id, log_date) | Owner CRUD. Admin reads |
| `customer_notes` | `customer_id`, `author_id`, `body`, `pinned` | **Admin only** (internal notes on the customer profile) |
| `customer_tags` | `customer_id`, `tag` (VIP, gym-partner, complaint…) | Admin only |

### 3.2 Menu and catalog (admin edits update the live site)

| Table | Key columns | Notes |
|---|---|---|
| `menu_items` | `code` (NVM1, VM2, LG1…), `category` enum(main, protein_side, salad, legume, carb), `name`, `description`, `grams`, `cooked_state`, `calories`, `protein`, `carbs`, `fat`, `fiber`, `allergens text[]`, `is_veg`, `contains_egg`, `cost_per_portion`, `image_url`, `is_active` | Replaces the `menu-30day.json` catalog |
| `menu_rotation` | `day_number` 1–30, `diet` enum(veg, non_veg), `slot` enum(lunch, dinner), `main_id`, `protein_side_id`, `salad_id`, `legume_id`, `carb_id`, unique(day_number, diet, slot) | The 30-day template |
| `menu_overrides` | `menu_date`, `diet`, `slot`, item FKs, `reason`, `created_by` | One-off dish swaps for a date. Replaces `overrides.json` |
| `kitchen_closures` | `closed_date`, `reason` | Holidays and festivals. Sundays stay closed by rule |
| `addons` | `type` enum(side, drink), `slug`, `name`, `description`, `price`, `calories`, `protein`, `carbs`, `fat`, `sugar_g`, `volume_ml`, `is_veg`, `tags`, `image_url`, `is_active`, `sort_order` | Replaces `sides.json` and `addons.json` |
| `plans` | `slug`, `name`, `type` enum(trial, weekly, monthly), `meals_per_day`, `operating_days` (1, 6, 24/26), `tagline`, `description`, `features jsonb`, `badge`, `is_popular`, `is_active`, `sort_order` | Replaces `plans.json` |
| `pricing_rules` | `plan_type`, `diet`, `price_per_meal`, `second_meal_discount`, `effective_from` | Admin changes prices here. `lib/pricing.ts` reads the latest rule |
| `delivery_zones` | `pincode`, `area`, `tier` enum(core, phase2), `delivery_fee`, `distance_km`, `avg_minutes`, `lat`, `lng`, `slots text[]`, `is_active` | Replaces `delivery-zones.json` |
| `coupons` | `code` (unique, upper), `discount_type`, `value`, `min_order`, `max_discount`, `valid_from`, `valid_to`, `usage_limit`, `per_user_limit`, `first_order_only`, `plan_types text[]`, `is_active` | |
| `coupon_redemptions` | `coupon_id`, `user_id`, `order_id` | Enforces usage limits |

**Read access:** public `select` on active rows. **Write access:** admin only.
**Live updates:** each admin mutation calls `revalidateTag('menu' | 'plans' | 'addons' | 'zones' | 'blog')`, so public pages (ISR) update within seconds without a redeploy.

The database function `get_menu_for_date(date, diet)` ports `lib/menu-engine.ts` (anchor date, Sunday closed, rotation day, overrides, closures), so the website, cook sheet and customer calendar all use the same logic.

### 3.3 Cart, orders, payments

| Table | Key columns | Notes |
|---|---|---|
| `carts` | `user_id` unique, `checkout_type`, `config jsonb` (diet, days, meals/day, add-ons, slots, address_id, coupon), `updated_at` | Saved draft, so the cart works across devices. **It never stores a trusted price** |
| `orders` | `order_number` (MG-24001, sequence), `user_id`, `subscription_id`, `type`, `status` enum(created, pending_payment, paid, failed, cancelled, refunded, partially_refunded), `subtotal`, `discount`, `delivery_fee`, `total`, `coupon_id`, `pricing_snapshot jsonb`, `address_snapshot jsonb`, `cf_order_id`, `cf_payment_session_id`, `paid_at`, `expires_at` | Created **only** by the server |
| `order_items` | `order_id`, `item_type` (meal, addon, bundle, fee), `ref_id`, `name`, `qty`, `unit_price`, `total` | Snapshot of prices at the time of purchase |
| `payments` | `order_id`, `cf_payment_id`, `amount`, `method`, `status`, `bank_reference`, `raw jsonb` | Written by the webhook |
| `refunds` | `order_id`, `payment_id`, `cf_refund_id`, `amount`, `reason`, `status`, `initiated_by` | Admin-initiated |
| `webhook_events` | `provider`, `event_id` unique, `event_type`, `payload`, `processed_at`, `error` | Idempotency and debugging |

### 3.4 Subscriptions and deliveries (the core of the app)

| Table | Key columns | Notes |
|---|---|---|
| `subscriptions` | `user_id`, `plan_id`, `type`, `diet`, `meals_per_day`, `status` enum(pending_payment, active, paused, cancelled, completed, expired), `start_date`, `end_date`, `meals_total`, `meals_delivered`, `meals_skipped`, `meal_credits`, `address_id`, `lunch_slot`, `dinner_slot`, `payment_mode` (prepaid, autopay), `cf_subscription_id`, `paused_from`, `paused_until`, `cancelled_at`, `cancel_reason`, `auto_renew` | |
| `deliveries` | `subscription_id`, `order_id`, `user_id`, `delivery_date`, `slot`, `status` enum(scheduled, skipped, paused, locked, preparing, packed, out_for_delivery, delivered, failed, cancelled), `diet`, `is_egg_free`, `skip_legume`, `double_main`, `menu_snapshot jsonb` (set at lock time), `address_snapshot jsonb`, `zone_id`, `rider_id`, `delivered_at`, `failure_reason`, unique(subscription_id, delivery_date, slot) | **One row per meal per date.** The customer calendar, skip, pause, cook sheet, rider sheet and analytics all read this table |
| `delivery_addons` | `delivery_id`, `addon_id`, `qty`, `unit_price` | Sides and drinks added to a specific day |
| `activity_log` | `user_id`, `actor_id`, `actor_role`, `entity` (subscription, delivery, order, profile), `entity_id`, `action` (skip, unskip, pause, resume, cancel, address_change, customise, refund, admin_edit…), `before jsonb`, `after jsonb`, `ip`, `created_at` | **Every customer and admin action is logged here.** It feeds the timeline on the admin customer page |

**Business rules are enforced in SQL functions (`security definer`, with an ownership check), not in the UI:**
- `skip_delivery(delivery_id)` / `unskip_delivery`: only before **9:00 PM IST the night before**. Adds a meal credit and extends `end_date`.
- `pause_subscription(sub_id, from, until)` / `resume_subscription`: marks the covered deliveries `paused` and shifts the end date.
- `cancel_subscription(sub_id, reason)`: cancels future deliveries. Any refund is an admin decision.
- `customise_delivery(delivery_id, egg_free, skip_legume, double_main, addons[])`: before the cutoff only. A price difference (double main, add-ons) creates a small top-up order.
- `generate_deliveries(subscription_id)`: runs after payment and creates rows for every operating day, skipping Sundays and closures.

The customer cannot `update` `deliveries` or `subscriptions` directly. RLS gives them `select` only, and all changes go through these functions. This keeps the cutoff from being bypassed.

### 3.5 Content and leads

| Table | Key columns | Notes |
|---|---|---|
| `blog_posts` | `slug` unique, `title`, `excerpt`, `content` (Markdown), `cover_image_url`, `category_id`, `tags text[]`, `author_name`, `author_role`, `read_minutes`, `macros_highlight`, `status` enum(draft, scheduled, published, archived), `published_at`, `seo_title`, `seo_description`, `og_image_url`, `is_featured`, `views` | Public sees `published` rows with `published_at <= now()` |
| `blog_categories` | `slug`, `name`, `sort_order` | |
| `faqs` | `question`, `answer`, `category`, `sort_order`, `is_active` | Replaces `faqs.json` |
| `reviews` | `user_id` (nullable), `name`, `area`, `rating`, `comment`, `goal`, `status` (pending, approved, rejected), `is_featured` | Customers submit, admin approves |
| `enquiries` | `name`, `phone`, `area`, `goal`, `diet`, `plan_interest`, `preferred_slot`, `note`, `source`, `status` (new, contacted, converted, lost), `assigned_to`, `converted_user_id` | `/api/enquiry` stores the lead **and** still sends it to Telegram |
| `waitlist` | `phone`, `pincode`, `area` | For pincodes we do not serve yet |
| `site_settings` | `key` pk, `value jsonb` | Cutoff time, ordering open/closed, announcement banner, WhatsApp number |
| `notifications` | `user_id`, `type`, `title`, `body`, `channel`, `sent_at`, `read_at` | In-app notifications plus a record of WhatsApp/email sends |
| `admin_audit_log` | (can reuse `activity_log` with `actor_role='admin'`) | |

### 3.6 Analytics (admin only)

Views with `security_invoker` plus RPCs gated by `is_admin()`. Heavy ones become materialized views refreshed nightly by `pg_cron`.
- **Revenue:** today, 7d, 30d, by plan type, by diet; MRR from active subscriptions; average order value; refunds.
- **Customers:** new signups, onboarding completion, active, paused and churned subscribers; churn rate; LTV; repeat rate; trial→weekly/monthly conversion.
- **Operations:** meals per day (next 7 days forecast), skip rate, pause rate, on-time delivery %, failed deliveries, top zones.
- **Menu:** most-skipped dishes, add-on attach rate, egg-free share.
- **Funnel:** enquiries → signups → paid; coupon usage and the discount they cost.

---

## 4. Pages: what exists, what to wire, what to build

### 4.1 Customer side

| Route | Status | Work |
|---|---|---|
| `/login` | exists (fake) | Real Supabase OTP, Turnstile captcha, redirect to `/onboarding` or `next` |
| `/auth/callback` | **new** | Session exchange (email or Google) |
| `/onboarding` | exists | Save to `profiles` and calculate targets on the server |
| `/menu`, `/pricing`, `/plans`, `/monthly`, `/weekly` | exist | Read from the database (ISR + tags) |
| `/box/[slug]` | exists (old model) | Rebuild on the 30-day engine, e.g. `/menu/[date]` or a dish page |
| `/checkout` | exists | Load the cart from the DB, server quote (`/api/checkout/quote`), Cashfree Drop-in |
| `/checkout/status` | **new** | Return URL. Asks the server for the real order status (paid, pending or failed) |
| `/checkout/success` | exists | Show only after server confirmation |
| `/dashboard`, `/tomorrow`, `/my-plan` | exist | Real deliveries, skip/customise before cutoff, countdown to 9 PM |
| `/subscription` | exists | Real pause, resume and cancel through the SQL functions |
| `/orders`, `/orders/[id]` | exist | Real orders, payments, invoice |
| `/profile` | exists | Edit profile, **address book** (CRUD), notification preferences, delete account |
| `/progress` | exists | `progress_logs` |
| `/blog` | exists (hardcoded) | List from the DB with category filter and search |
| `/blog/[slug]` | **new** | Article page, `generateMetadata`, JSON-LD, ISR |
| `/reviews/new` or a modal | **new** | Review submission after N delivered meals |
| `/delivery-areas` | exists | Zones from the DB plus a waitlist form |
| `sitemap.ts`, `robots.ts` | **new** | Include blog slugs |

### 4.2 Admin side (role-guarded, `/admin/*`)

| Route | Status | Contents |
|---|---|---|
| `/admin` | redirect → **new overview** | KPI tiles (revenue today/MTD, active subscribers, meals tomorrow, skips tomorrow, new signups, pending payments), 30-day revenue chart, live feed of new orders and skips (Realtime) |
| `/admin/customers` | **new** | Search by name or phone, filter by status, plan, zone or tag, CSV export |
| `/admin/customers/[id]` | **new, the main customer page** | Profile and body stats, goals and targets, addresses, **current subscription card** (meals left, credits, end date), **delivery calendar** (delivered, skipped, paused, upcoming, colour-coded), orders and payments, refunds, **activity timeline** (every skip, pause, edit, with time and source), internal notes and tags, progress chart. Actions: pause, extend, add credit, change address, cancel, refund, block, WhatsApp button |
| `/admin/orders`, `/admin/orders/[id]` | **new** | All orders, payment status, Cashfree reference, refund button |
| `/admin/subscriptions` | `subscribers` exists | Rework into a filterable list (active, paused, ending this week, pending payment) |
| `/admin/cook-sheet` | exists | Tomorrow's locked counts from `deliveries` (veg/non-veg, egg-free, double main, skip legume, add-ons, raw kg) plus print view |
| `/admin/deliveries` | exists | Rider sheet by zone and slot, assign rider, update status (Realtime) |
| `/admin/menu` | **new** | 30-day rotation grid editor, **date override calendar** (swap a dish for a date, which updates `/menu` immediately), kitchen closures |
| `/admin/menu/items` | `dishes` exists | Dish catalog CRUD, image upload to Storage, macros |
| `/admin/addons` | **new** | Sides and drinks CRUD, prices, active toggle |
| `/admin/plans` | **new** | Plans and `pricing_rules` |
| `/admin/coupons` | **new** | CRUD and redemption stats |
| `/admin/zones` | **new** | Pincodes, fees, slots, waitlist demand by pincode |
| `/admin/blog`, `/admin/blog/new`, `/admin/blog/[id]` | **new** | Markdown editor with preview, cover upload, SEO fields, draft, schedule or publish |
| `/admin/faqs`, `/admin/reviews` | **new** | CRUD and moderation |
| `/admin/enquiries` | **new** | Lead pipeline (new, contacted, converted) and WhatsApp reply link |
| `/admin/analytics` | **new** | The section 3.6 charts |
| `/admin/settings` | **new** | Cutoff time, ordering on/off, banner, staff and roles (admin, kitchen, rider) |
| `/admin/activity` | **new** | Global audit log |

Role access: `admin` sees everything. `kitchen` sees cook-sheet, deliveries and menu read-only. `rider` sees only their assigned deliveries (a mobile `/rider` page can come in phase 2).

---

## 5. Cashfree integration

Environment variables: `CASHFREE_APP_ID`, `CASHFREE_SECRET_KEY`, `NEXT_PUBLIC_CASHFREE_ENV=sandbox|production` (one variable for both server and browser SDK so they can't disagree). The API version header (`2025-01-01`) is pinned in `lib/cashfree.ts`. Built: `lib/cashfree.ts`, `lib/payments/cashfree-checkout.ts` (session + `syncOrderFromCashfree`), `/api/webhooks/cashfree`, Pay button on `/checkout/pay/[id]`, Settings payment-mode switch (Cashfree / manual UPI fallback), admin "Re-check with Cashfree", migration 0016.

1. **Quote:** `POST /api/checkout/quote` takes the cart config (no prices). The server validates it with zod, checks the zone, cutoff, plan and coupon, prices it from `pricing_rules` and `addons`, and returns a breakdown.
2. **Create:** `POST /api/checkout/create-order` re-quotes, then inserts `orders` (pending_payment, expires in 30 min) and `subscriptions` (pending_payment) in one transaction. It calls Cashfree `POST /pg/orders` with `order_id = order_number` and `customer_details`, stores `payment_session_id`, and returns only that session ID.
3. **Pay:** The client runs `@cashfreepayments/cashfree-js` `checkout({ paymentSessionId })`.
4. **Return:** `/checkout/status?order_id=…` calls the server, which runs `GET /pg/orders/{id}`. **The redirect alone is never trusted.**
5. **Webhook:** `POST /api/webhooks/cashfree` verifies `x-webhook-signature` (HMAC-SHA256 of `timestamp + rawBody` with the secret) and dedupes with `webhook_events.event_id`. It then calls the SQL function `mark_order_paid()`, which records the payment, activates the subscription, runs `generate_deliveries`, records the coupon redemption, logs the activity and queues notifications. Steps 4 and 5 both call the same idempotent function, so whichever arrives first wins safely.
6. **Refunds:** an admin button calls Cashfree `POST /pg/orders/{id}/refunds` and records it. The refund webhook updates the status.
7. **Cleanup:** cron expires unpaid orders after 30 minutes.
8. **Phase 2:** Cashfree Subscriptions (plan + UPI AutoPay mandate) for weekly/monthly auto-renew, with renewal webhooks creating the next order and deliveries.

---

## 6. Security and rate limiting

**Rate limits** (Upstash Redis, sliding window; keyed by IP and/or user ID; 429 with `Retry-After`):

| Bucket | Limit |
|---|---|
| OTP send | 3 / 10 min per phone, 10 / hour per IP (plus Supabase's built-in auth limits) |
| OTP verify | 5 / 10 min per phone |
| `/api/enquiry`, waitlist, review submit | 5 / hour per IP + Turnstile |
| Checkout quote / create-order | 20 / min and 10 / min per user |
| Skip, pause, customise actions | 30 / min per user |
| Admin mutations | 120 / min per admin |
| Global fallback in `proxy.ts` for `/api/*` | 100 / min per IP |
| Webhooks | No limit, signature verification only |

**Other controls**
- RLS on every table. The anon key can only read public catalog and blog data.
- The service-role key is used only in `lib/supabase/admin.ts` (marked `import 'server-only'`) for webhooks and cron.
- Admin check happens twice: in `proxy.ts` (fast redirect) **and** in every admin server action and query through `requireAdmin()` and the RLS `is_admin()` function. Roles are stored in `profiles.role` and exposed through a custom access-token hook. Users can never write their own role.
- zod validation on every route handler and server action.
- Prices are always calculated on the server, and order amounts are never accepted from the client.
- Cutoff and ownership checks live inside SQL functions.
- Security headers in `next.config.mjs`: CSP allowing self, Supabase, `sdk.cashfree.com`, Google Maps and Unsplash; HSTS; `X-Frame-Options: DENY`; `Referrer-Policy`; `Permissions-Policy: geolocation=(self)`.
- Webhook signature checks; `CRON_SECRET` on cron routes.
- Blog Markdown is rendered with sanitisation (no raw HTML).
- Storage buckets: public read, admin-only write, MIME and size limits.
- Every admin action is written to `activity_log`.
- PII: phone and address are visible only to the owner and staff. Riders see only their assigned deliveries.
- Run Supabase security and performance advisors after every migration batch.
- Before launch: PITR/backups enabled, Sentry for errors, `/security-review` pass.

---

## 7. Scheduled jobs

| Job | When (IST) | What |
|---|---|---|
| Nightly lock | 21:00 daily | Lock tomorrow's `deliveries` (`scheduled` → `locked`) and snapshot the menu. The cook sheet is final. Send a Telegram summary to the kitchen |
| Auto-resume | 00:05 daily | Resume subscriptions whose `paused_until` has passed |
| Expire unpaid | every 15 min | Orders still `pending_payment` after `expires_at` become `cancelled` |
| Renewal reminders | 10:00 daily | Subscriptions ending within 2 days get a WhatsApp or email reminder |
| Complete subscriptions | 23:30 daily | Subscriptions with all meals delivered or credited become `completed` |
| Analytics refresh | 02:00 daily | Refresh materialized views |
| Scheduled blog posts | every 15 min | `scheduled` → `published` and revalidate the blog |

Implemented with `pg_cron` for pure SQL jobs and Vercel Cron → `/api/cron/*` for jobs that send messages.

---

## 8. Build phases

> **Progress (2026-10-12):** Phase 1 database applied to Supabase project `glokratuyauuodnsxizf`: migrations 0001–0009 in `supabase/migrations/` (37 tables, all with RLS; 76 policies; business functions; cook-sheet/analytics RPCs; `menu-images`/`blog-images` buckets; realtime on orders/deliveries/notifications; pg_cron jobs; FK indexes). Types generated to `types/database.ts`. Advisors: security warnings are the intended security-definer RPCs; performance FK warnings fixed by 0009. Seed applied (0010, generated by `scripts/seed/build_seed.py` from the menu workbook): 37 dishes + costs, 120 rotation rows (30 days × veg/non-veg × lunch/dinner), 6 prices, 12 add-ons, 4 plans, 13 zones, 3 coupons, 6 FAQs, staff-only cost model. **Next:** Supabase clients + `proxy.ts`, then wire the public pages to the DB.
>
> Note: the Supabase MCP declines migrations containing `revoke`/`delete`. Those files (0006–0008) were run manually in the SQL Editor.

"Now" builds everything a paying customer and the kitchen need on day one, plus the framework in section 10. "Later" items are mostly configuration on top of that framework.

| # | Phase | Output | Needs |
|---|---|---|---|
| 0 | **Cleanup** | Remove the fake logged-in default user. Retire `boxes.json` and `schedule.json` and move those pages to the 30-day engine. Install `@supabase/ssr`, `@supabase/supabase-js`, `@upstash/ratelimit`, `@upstash/redis`, `server-only` | — |
| 1 | **Database foundation** | Every table, enum, RLS policy and SQL function in section 3 as migrations. Seed from `data/*.json`. Generated types. Supabase clients. `proxy.ts` with session refresh, route guards, rate limits and headers | Supabase MCP connected ✅ keys in env |
| 2 | **Framework** (section 10) | Service layer, permissions, feature flags, resource registry, admin UI kit, generic `/admin/[resource]` pages, notification and payment interfaces | Phase 1 |
| 3 | **Auth and profile** | Google login, `/auth/callback`, onboarding saves to `profiles`, phone capture, address book, first admin account | Google OAuth client ID/secret |
| 4 | **Public read path** | Menu, plans, add-ons, zones, FAQs, reviews and blog from the DB with ISR + tags. `/blog/[slug]`, sitemap, robots | Phase 1 |
| 5 | **Checkout** | Server pricing, carts, Cashfree sandbox, webhook, status page, delivery generation | Cashfree sandbox keys (later) |
| 6 | **Customer self-service** | Dashboard, tomorrow, my-plan, skip, pause, resume, cancel, customise, orders, progress | Phase 5 |
| 7 | **Admin core (custom pages)** | Overview, customer profile page, menu calendar + overrides, cook sheet, deliveries, blog editor. Lists for customers, orders and subscriptions through the resource framework | Phases 2–6 |
| 8 | **Operations** | Cron jobs, Realtime, Telegram kitchen alerts | Phase 7 |
| 9 | **Launch hardening** | Turnstile, CSP review, `/security-review`, Supabase advisors, Sentry, backups, legal pages, Cashfree production | All |
| Later | **Configured add-ons** | Coupons, zones, FAQs, reviews, enquiries, add-ons, plans and pricing, blog categories, activity log: one resource config each. Then deeper analytics, WhatsApp OTP, AutoPay, rider app, referrals/wallet, more kitchens or cities | Flags + configs |

---

## 9. What the owner needs to provide

| Item | Status | Needed by |
|---|---|---|
| Supabase URL, anon key and service-role key | ✅ in `.env.local` | Phase 1 |
| Supabase MCP connected to Claude | ⏳ not yet visible in this session | Phase 1 |
| Upstash Redis REST URL + token | ✅ in `.env.local` | Phase 1 |
| Google OAuth client (Google Cloud Console) entered in Supabase → Auth → Providers | ⏳ | Phase 3 |
| Email address(es) to make admin | ⏳ | Phase 3 |
| Cashfree sandbox App ID + Secret | ⏳ later | Phase 5 |
| Cloudflare Turnstile keys | ⏳ | Phase 9 |
| Final domain, support email, social handles, legal company name | ⏳ placeholders in `config/brand.ts` | Before launch |
| New logo files (`public/logo.png`, icons) | ⏳ still old artwork | Before launch |
| WhatsApp Business provider + approved auth template | later | WhatsApp OTP |

Env keys still to add later:
```
NEXT_PUBLIC_SITE_URL=
CASHFREE_APP_ID=
CASHFREE_SECRET_KEY=
NEXT_PUBLIC_CASHFREE_ENV=sandbox
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=
CRON_SECRET=
```

---

## 10. Build once, extend later

The goal: adding a feature later should mean adding a config entry, a row of data or one new panel, not rewriting pages. These pieces are built in phase 2, before most pages.

### 10.1 Service layer: one place for business logic
```
server/services/
  pricing.ts        quote(cart) → line items, discounts, fees, total
  menu.ts           getMenuForDate, getRange, overrides, closures
  subscriptions.ts  create, activate, pause, resume, cancel, addCredit
  deliveries.ts     generate, skip, customise, lock, assign, updateStatus
  orders.ts         create, markPaid, refund
  customers.ts      profile, addresses, notes, tags, 360 summary
  content.ts        blog, faqs, reviews
  analytics.ts      metric queries
```
Pages, server actions, API routes and cron jobs all call these functions, so the UI stays thin. A future mobile or rider app uses the same services through `/api/v1/*`.

### 10.2 Admin resource registry: new admin pages come from config
Each table gets one config file:
```ts
// admin/resources/coupons.ts
export default defineResource({
  key: 'coupons', table: 'coupons', label: 'Coupons', icon: 'Ticket',
  permission: 'coupons',                       // → coupons.read / coupons.write
  schema: couponSchema,                        // zod: drives form fields + server validation
  columns: ['code', 'discount_type', 'value', 'valid_to', 'is_active'],
  filters: ['is_active', 'discount_type'],
  search: ['code'],
  rowActions: ['edit', 'duplicate', 'deactivate'],
  revalidate: ['coupons'],                     // cache tags busted on save
  flag: 'coupons',                             // hidden until feature flag is on
});
```
- Generic routes `/admin/[resource]` (list) and `/admin/[resource]/[id]` (detail and form) render any registered resource. Lists have server-side pagination, sort, filters and search in the URL, plus CSV export.
- The sidebar is built from the registry, filtered by the viewer's permissions and feature flags.
- **Custom pages** (overview, customer profile, menu calendar, cook sheet, deliveries, blog editor) are registered the same way with `component:` instead of columns. Navigation and permissions work identically.
- Coupons, zones, FAQs, reviews, enquiries, add-ons, plans, pricing rules and blog categories are expected to need only a config file each.

### 10.3 Detail pages built from panels
The customer profile page is a layout plus a list of panels:
```ts
customerPanels = [ProfileCard, SubscriptionCard, DeliveryCalendar, OrdersTable,
                  PaymentsTable, ActivityTimeline, NotesPanel, ProgressChart]
```
A later feature (referrals, wallet, support tickets) adds one panel to the list. Order and subscription detail pages work the same way. The customer `/account` area uses the same pattern for its navigation.

### 10.4 Permissions as data
`can(user, 'orders.refund')` is used everywhere: in nav, buttons, server actions and RLS (through `has_permission()`). Roles map to permission lists in a `role_permissions` table. Adding a "support" or "kitchen manager" role later is a data change.

### 10.5 Feature flags
`site_settings.features` (JSON), read with `isEnabled('whatsapp_otp')` on both server and client. Code for later features can ship turned off, then be enabled from `/admin/settings`. Planned flags: `whatsapp_otp`, `autopay`, `coupons`, `reviews`, `rider_app`, `referrals`, `wallet`.

### 10.6 Interfaces for providers that will change
| Interface | Implementations now | Later |
|---|---|---|
| `AuthProviders` (list shown on the login page) | Google | WhatsApp OTP, email OTP |
| `PaymentProvider` (createOrder, getStatus, verifyWebhook, refund) | Cashfree PG | Cashfree Subscriptions (AutoPay) |
| `NotificationChannel` (send(to, template, data)) | Telegram (admin), in-app | WhatsApp, email |

### 10.7 Events, so new features don't touch core flows
Every service writes to `activity_log` and inserts a row into `domain_events` (`order.paid`, `delivery.skipped`, `subscription.paused`…). Notifications, analytics and future webhooks subscribe to events. The checkout and skip code never needs editing to add a new reaction.

### 10.8 Schema choices that leave room to grow
- A `metadata jsonb` column on the main tables for small extras without a migration.
- `kitchen_id` and `city` columns from day one (defaulting to the single Coimbatore kitchen), so a second kitchen or city does not mean reworking every query.
- Plans, pricing, zones, slots, cutoff time and closures are data, not code.
- Statuses are Postgres enums managed through migrations, and `ALTER TYPE … ADD VALUE` adds new ones safely.

### 10.9 Shared UI kit (`components/admin/ui`, `components/account/ui`)
`DataTable`, `FormFromSchema` (zod → fields), `StatCard`, `ChartCard`, `Timeline`, `CalendarGrid`, `ConfirmDialog`, `EmptyState`, `StatusBadge`. Every admin and account page is assembled from these, so a new page needs no new UI work.

### 10.10 Analytics metrics registry
```ts
metrics = [{ key: 'revenue_daily', rpc: 'metric_revenue_daily', format: 'inr', chart: 'line' }, …]
```
The overview and analytics pages render whatever metrics are listed. A new KPI is one SQL function plus one entry.

---

## 11. Rebrand to BroTin Box (done 2026-10-12)

- Every user-facing "MuscleGrow" and "Gramwise" string now reads **BroTin Box**, including WhatsApp prefill links, the PWA manifest, `icon.svg` text, the enquiry Telegram message, cook-sheet CSV names, `package.json` and docs.
- `config/brand.ts` gained `siteUrl` (from `NEXT_PUBLIC_SITE_URL`). `app/layout.tsx` metadata now uses it.
- **Placeholders to confirm:** domain `brotinbox.com`, `hello@brotinbox.com`, social handles `brotinbox`, legal name "BroTin Box Nutrition Pvt Ltd".
- **Still old artwork:** `public/logo.png`, `public/icons/*`, `delivery-mascot.jpg` if branded.
- The source spreadsheet `public/Gramwise_30Day_Menu_and_Profit_Model - Scenarios.csv` keeps its file name because code comments refer to it. It is not shown to users.
- The Zustand storage key changed to `brotinbox-storage`, which clears any locally saved cart. This is fine before launch.

---

## 12. Demo → live (confirmed 2026-10-12)

**Decisions:** admin portal in the same repo/Vercel project at a secret path (`ADMIN_PATH` env var; `/admin` returns 404; can move to `admin.` subdomain later with one Vercel domain setting). Admin login = email + password only (no 2FA yet), rate-limited. Checkout uses **manual UPI confirmation** until Cashfree keys arrive (order → "pending payment" → customer pays your UPI → staff clicks *Mark paid* → meals scheduled). Roles: **super_admin, admin, kitchen, support** (+ rider later).

| Role | Can do |
|---|---|
| super_admin | Everything, incl. staff & roles, prices, refunds, site settings |
| admin | Daily ops: customers, orders (mark paid), subscriptions, menu, catalog, blog, content, enquiries, coupons, zones |
| kitchen | Cook sheet, deliveries, menu (read) |
| support | Customers (read + notes), orders/subscriptions (read + pause/skip on behalf), enquiries, reviews |

**Build order**
1. **DB 0011–0012:** add `super_admin` role; role-aware `has_permission`; only super_admin changes roles; `admin_mark_order_paid` (manual UPI); `payment_settings` (UPI ID, payee name, QR) in settings; staff-login audit.
2. **Foundation:** `@supabase/ssr` clients (browser / server / service-role), `proxy.ts` (session refresh, secret admin path rewrite, `/admin` → 404, rate limits, `noindex` on admin), security headers + CSP, zod everywhere, upload checks (magic-byte MIME sniff, 5 MB, random names).
3. **Auth:** customers → Google sign-in (`/login`, auth drawer, `/auth/callback`), onboarding saves to `profiles`; staff → `/<ADMIN_PATH>/login` email+password, staff-role check, generic errors, 5 tries / 15 min per IP+email, login/logout audit.
4. **Remove demo state:** no default user, no demo number/OTP, no hardcoded "Mohammed Anas"/"Murugan S."/mock orders, no "[Telemetry Pending]" stats; empty states when signed out / no plan.
5. **Customer pages on real data:** dashboard, my plan, tomorrow, subscription (pause/resume/cancel/skip via DB functions), orders, profile + addresses, progress; checkout → server-priced order + UPI pay screen.
6. **Admin portal (new UI):** overview KPIs; customers list + customer profile (details, addresses, subscription, delivery calendar, orders/payments, activity timeline, notes/tags, actions); orders (mark paid / cancel); subscriptions; cook sheet + deliveries (DB); menu calendar + overrides + closures; dishes; add-ons; plans & pricing; coupons; delivery zones; blog; FAQs; reviews; enquiries; staff & roles; settings (payment/UPI, cutoff, ordering open, announcement, features); activity log.
7. **Public pages on DB:** menu, pricing/plans, delivery areas, FAQ, blog list + `/blog/[slug]`.

**Owner actions:** set `ADMIN_PATH` (and the same on Vercel); create your account in Supabase → Authentication → Users (email + password, auto-confirm) and tell Claude the email to make it super_admin; enable Google provider in Supabase Auth; add your UPI ID in admin Settings.


### Progress (2026-10-12, demo → live)

Done and tested end-to-end with a temporary account (removed afterwards):
- Migrations 0011–0015: super_admin role, role-aware permissions, manual UPI payments, server checkout, exact delivery schedule, make-up meals keep their diet, blog drafts.
- Supabase auth (Google for customers; email + password staff console at `/<ADMIN_PATH>`; `/admin` is 404), `proxy.ts`, rate limits (Upstash), security headers + CSP, upload magic-byte checks, safe Markdown.
- Demo state removed (fake user, OTP, mock orders, fake AutoPay/Cashfree screens, hardcoded prices).
- Customer: onboarding → profile + address in DB; trial/weekly/monthly → server-priced order → UPI pay page; dashboard, my meals (skip/customise), my plan (pause/resume/cancel), orders, profile + addresses, progress.
- Staff console: overview, orders (mark paid / cancel), subscriptions, customers + customer profile (timeline, notes, tags, act on behalf), cook sheet, deliveries, menu calendar + overrides + closures, dishes (photos), config-driven add-ons / plans / prices / coupons / zones / FAQs / reviews / enquiries / blog categories, blog editor, staff & roles, settings, activity log.
- Public: live menu data from DB (admin changes show on menu views), FAQs from DB, blog list + `/blog/[slug]` from DB, enquiries saved to DB + Telegram, sitemap/robots.

Still to do:
- Old 6-box pages (`/build-plan`, `/custom`, `/box/[slug]`) still read `boxes.json`; rebuild on the 30-day engine or remove.
- Plans/pricing/delivery-areas page copy still from JSON (prices are live via `usePricing`).
- Cashfree (replace manual UPI), WhatsApp OTP, Turnstile on forms, notifications (WhatsApp/email), Sentry.

---

## 13. Caching plan

**Goal:** public pages load from the CDN in milliseconds and cost almost nothing in database reads, while anything personal or money-related is never cached, and admin changes show on the site within seconds.

### 13.1 Where things stand today
| Area | Now | Problem |
|---|---|---|
| Menu, prices, FAQs | Fetched **in each visitor's browser** from Supabase (`MenuDataSync`, `usePricing`, `useFaqs`) | Every visitor = several Supabase queries; first paint shows bundled JSON, then swaps |
| Blog, sitemap | Server, `unstable_cache` + tag `blog` (5 min) | Good. This is the model for the rest |
| Account pages, checkout, console | Dynamic, `no-store` | Correct. Must stay that way |
| Images | `next/image` for most; Google avatars as plain `<img>` | Fine |
| Static assets | Next hashes JS/CSS → immutable | Fine |

### 13.2 Target: five layers

| # | Layer | What lives there | How long | How it's cleared |
|---|---|---|---|---|
| 1 | **Browser** | Hashed JS/CSS/fonts (1 year, immutable); images | long | New deploy = new file names |
| 2 | **Vercel CDN (edge)** | Full HTML of public pages: home, menu, plans, pricing, delivery areas, FAQ, blog, legal | until changed (ISR) | `revalidateTag` from admin actions |
| 3 | **Next.js data cache** | Catalog reads: menu (rotation + overrides + closures + dishes), prices, plans, add-ons, zones, FAQs, reviews, blog, public settings | tag-based, 1 h safety TTL | Admin save → `revalidateTag('menu' / 'plans' / …)` (already wired in every admin action) |
| 4 | **Upstash Redis** | Expensive staff numbers: overview KPIs, revenue chart (30–60 s); rate-limit counters (already) | seconds | Short TTL + delete on "Mark paid" |
| 5 | **Postgres** | Indexes (done), materialized views for analytics refreshed by pg_cron | n/a | Nightly refresh |

**Never cached (anywhere):** sign-in, `/auth/*`, onboarding, checkout, payment page, dashboard / my meals / plan / orders / profile / progress, the staff console, `/api/*` writes, webhooks. These send `Cache-Control: private, no-store` and read the user's session.

### 13.3 Changes to make
1. **Central cached data module** `lib/data/catalog.ts`. One cached function per dataset, each with a tag:
   `getMenuData()` → tag `menu`, `getPricing()` → `plans`, `getPlans()` → `plans`, `getAddons()` → `addons`, `getZones()` → `zones`, `getFaqs()` → `faqs`, `getApprovedReviews()` → `reviews`, `getPublicSettings()` → `settings`, blog (exists) → `blog`.
   Uses the anon client (no cookies), so results are shareable between users.
2. **Move public pages to server data + client islands.** `/`, `/menu`, `/plans`, `/pricing`, `/delivery-areas`, `/faq` fetch on the server from step 1 and pass the data to the existing client components as props (or seed the store once). The browser makes **zero** Supabase calls for them, and the first paint shows the real menu and prices (no swap from bundled JSON). Remove `MenuDataSync`, `usePricing` and `useFaqs` client fetching (keep them as fallbacks during the move).
3. **ISR for public pages.** Mark those routes static with `revalidate = 3600` as a safety net; real freshness comes from tags. Admin "change a dish" → `revalidateTag('menu')` → next visitor gets fresh HTML from the CDN.
4. **Tag map** (who clears what):

   | Admin action | Tags cleared |
   |---|---|
   | Menu override, closure, dish edit | `menu` |
   | Prices, plans | `plans` |
   | Sides & drinks | `addons` |
   | Delivery zones | `zones` |
   | FAQs | `faqs` |
   | Review approve/feature | `reviews` |
   | Blog post / category | `blog` |
   | Settings (banner, ordering open, UPI) | `settings` |

5. **Date-sensitive menu.** "Tomorrow" changes at midnight IST. Cache the *raw* menu data (rotation/overrides), not "tomorrow's menu"; compute the date in the page. Add a pg_cron-free safety: page `revalidate = 3600` so HTML never lags more than an hour past midnight.
6. **Redis for the console overview.** Cache `admin_overview` and the 30-day revenue series for 30 s per kitchen; clear on mark-paid / cancel. Keeps the dashboard instant when several staff have it open.
7. **Headers.** In `next.config`: `/_next/static/*` immutable (default), images `max-age=86400, stale-while-revalidate=604800`, account/console/API `private, no-store`. Make sure the proxy never adds `Set-Cookie` to cacheable public responses (Supabase refresh only when a session cookie exists).
8. **Client navigation.** Keep Next's router cache + `<Link prefetch>` for public pages; account pages use `router.refresh()` after actions (already) so they're never stale.
9. **Images.** Serve dish and blog photos through `next/image` (Supabase Storage host already allowed), `sizes` set everywhere, `cacheControl: 1 year` on upload (done) because uploads get new random names.
10. **Measure.** Vercel Analytics (Speed Insights) + response header `x-vercel-cache` (HIT/STALE/MISS) on public pages; Supabase "Query performance" for DB load. Target: >95% CDN HIT on public pages, <50 Supabase reads per 1,000 public page views.

### 13.4 Order of work
1. Data module + tags (small, no visible change).
2. Menu page + home calendar strip → server data (biggest win; removes per-visitor DB calls).
3. Plans/pricing/FAQ/delivery areas → server data.
4. ISR + headers; verify `x-vercel-cache: HIT`.
5. Redis cache for console overview.
6. Measure and tune.

### 13.5 Progress (2026-10-13): implemented and verified with `next start`
- `lib/data/catalog.ts`: tagged `unstable_cache` reads (menu, prices, plans, add-ons, FAQs, public settings) with an anon client.
- `CatalogProvider` in the site layout passes them to client components; the browser makes no Supabase calls for public pages and the first paint shows live data. `MenuDataSync`, `usePricing` and `useFaqs` client fetching removed.
- Public pages are ISR (`revalidate = 3600` safety net; `/blog` 5 min; `/blog/[slug]` pre-rendered). Verified `x-nextjs-cache: HIT`, `Cache-Control: s-maxage=…, stale-while-revalidate`, no `Set-Cookie`.
- Account pages, checkout payment, console: `private, no-store` (verified).
- `proxy.ts` skips the Supabase Auth call when there is no session cookie (anonymous traffic never hits Auth).
- Console overview KPIs cached 30–60 s in Upstash (`lib/cache/redis.ts`), cleared on mark-paid / cancel.
- Fix: `/tomorrow` (trial ordering) was wrongly sign-in-only; it is public again.

**Rule for the team:** change catalog data through the console (it clears the cache tags). Edits made directly in the Supabase table editor appear on the website only after the 1-hour safety refresh.
