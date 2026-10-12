-- =============================================================================
-- BroTin Box · 0004 Commerce
-- Carts, subscriptions, orders, payments, refunds, webhook log, deliveries.
--
-- Write model:
--   * Customers NEVER insert/update orders, payments, subscriptions or
--     deliveries directly. Server code (service_role) and the security-definer
--     functions in 0006 are the only writers. RLS gives customers read-only.
--   * Prices are computed server-side; order rows store a pricing snapshot.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Carts (one draft per user; price is never trusted from here)
-- ---------------------------------------------------------------------------
create table public.carts (
  user_id        uuid primary key references public.profiles (id) on delete cascade,
  checkout_type  public.plan_type,
  config         jsonb not null default '{}',   -- diet, start date, days, meals/day, add-ons, slots, address_id, coupon
  updated_at     timestamptz not null default now()
);
create trigger carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Subscriptions (trial = 1-day subscription, so every purchase follows one flow)
-- ---------------------------------------------------------------------------
create table public.subscriptions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles (id) on delete restrict,
  kitchen_id          uuid not null references public.kitchens (id) default public.default_kitchen_id(),
  plan_id             uuid references public.plans (id) on delete set null,
  type                public.plan_type not null,
  diet                public.diet_type not null,
  meals_per_day       smallint not null check (meals_per_day in (1, 2)),
  slots               public.meal_slot[] not null check (cardinality(slots) between 1 and 2),
  excluded_weekdays   smallint[] not null default '{}',     -- isodow 1..6 the customer opted out of
  status              public.subscription_status not null default 'pending_payment',
  start_date          date not null,
  end_date            date,                                  -- last scheduled delivery date (moves with credits)
  meals_total         int not null check (meals_total > 0),  -- meals paid for
  meals_delivered     int not null default 0,
  meals_skipped       int not null default 0,
  meal_credits_issued int not null default 0,                -- skips/pauses re-scheduled to the tail
  preferences         jsonb not null default '{}',           -- {is_egg_free, skip_legume, double_main, addon_ids[]}
  address_id          uuid references public.addresses (id) on delete set null,
  payment_mode        public.payment_mode not null default 'prepaid',
  cf_subscription_id  text,                                  -- phase 2 (AutoPay)
  auto_renew          boolean not null default false,
  paused_from         date,
  paused_until        date,
  cancelled_at        timestamptz,
  cancel_reason       text,
  metadata            jsonb not null default '{}',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (meals_per_day = cardinality(slots))
);
create index subscriptions_user_idx   on public.subscriptions (user_id, status);
create index subscriptions_status_idx on public.subscriptions (status, end_date);
create trigger subscriptions_updated_at before update on public.subscriptions
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Orders (the purchase / payment record)
-- ---------------------------------------------------------------------------
create sequence public.order_number_seq start 24001;

create table public.orders (
  id                     uuid primary key default gen_random_uuid(),
  order_number           text not null unique default ('BB-' || nextval('public.order_number_seq')),
  user_id                uuid not null references public.profiles (id) on delete restrict,
  subscription_id        uuid references public.subscriptions (id) on delete set null,
  type                   public.plan_type not null,
  is_top_up              boolean not null default false,       -- extra add-ons / double main on an existing sub
  status                 public.order_status not null default 'created',
  currency               text not null default 'INR',
  subtotal               numeric(10,2) not null check (subtotal >= 0),
  discount               numeric(10,2) not null default 0 check (discount >= 0),
  delivery_fee           numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total                  numeric(10,2) not null check (total >= 0),
  coupon_id              uuid references public.coupons (id) on delete set null,
  pricing_snapshot       jsonb not null,                        -- full quote used to charge
  address_snapshot       jsonb,
  cf_order_id            text unique,
  cf_payment_session_id  text,
  paid_at                timestamptz,
  expires_at             timestamptz not null default now() + interval '30 minutes',
  metadata               jsonb not null default '{}',
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  check (total = subtotal - discount + delivery_fee)
);
create index orders_user_idx    on public.orders (user_id, created_at desc);
create index orders_status_idx  on public.orders (status, created_at desc);
create index orders_sub_idx     on public.orders (subscription_id);
create trigger orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

create table public.order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.orders (id) on delete cascade,
  item_type   public.order_item_type not null,
  ref_id      uuid,                       -- plan / addon id when applicable
  name        text not null,
  qty         int not null check (qty > 0),
  unit_price  numeric(10,2) not null,
  total       numeric(10,2) not null,
  metadata    jsonb not null default '{}'
);
create index order_items_order_idx on public.order_items (order_id);

create table public.coupon_redemptions (
  id          uuid primary key default gen_random_uuid(),
  coupon_id   uuid not null references public.coupons (id) on delete cascade,
  user_id     uuid not null references public.profiles (id) on delete cascade,
  order_id    uuid not null unique references public.orders (id) on delete cascade,
  amount      numeric(10,2) not null,
  created_at  timestamptz not null default now()
);
create index coupon_redemptions_lookup on public.coupon_redemptions (coupon_id, user_id);

-- ---------------------------------------------------------------------------
-- Payments, refunds, webhook log
-- ---------------------------------------------------------------------------
create table public.payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references public.orders (id) on delete restrict,
  provider        text not null default 'cashfree',
  cf_payment_id   text unique,
  amount          numeric(10,2) not null,
  method          text,                     -- upi / card / netbanking / wallet
  status          public.payment_status not null,
  bank_reference  text,
  failure_reason  text,
  raw             jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index payments_order_idx on public.payments (order_id);

create table public.refunds (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders (id) on delete restrict,
  payment_id    uuid references public.payments (id) on delete set null,
  cf_refund_id  text unique,
  amount        numeric(10,2) not null check (amount > 0),
  reason        text not null,
  status        public.refund_status not null default 'pending',
  initiated_by  uuid references public.profiles (id) on delete set null,
  raw           jsonb not null default '{}',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index refunds_order_idx on public.refunds (order_id);
create trigger refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

create table public.webhook_events (
  id            uuid primary key default gen_random_uuid(),
  provider      text not null,
  event_id      text not null,
  event_type    text not null,
  payload       jsonb not null,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text,
  unique (provider, event_id)
);

-- ---------------------------------------------------------------------------
-- Deliveries: ONE ROW PER MEAL PER DATE. Calendar, skip, pause, cook sheet,
-- rider sheet and analytics all read this table.
-- ---------------------------------------------------------------------------
create table public.deliveries (
  id                uuid primary key default gen_random_uuid(),
  subscription_id   uuid not null references public.subscriptions (id) on delete cascade,
  order_id          uuid references public.orders (id) on delete set null,
  user_id           uuid not null references public.profiles (id) on delete restrict,
  kitchen_id        uuid not null references public.kitchens (id) default public.default_kitchen_id(),
  delivery_date     date not null,
  slot              public.meal_slot not null,
  status            public.delivery_status not null default 'scheduled',
  diet              public.diet_type not null,
  is_egg_free       boolean not null default false,
  skip_legume       boolean not null default false,
  double_main       boolean not null default false,
  is_make_up        boolean not null default false,       -- created from a meal credit
  menu_snapshot     jsonb,                                -- frozen at nightly lock
  address_id        uuid references public.addresses (id) on delete set null,
  address_snapshot  jsonb,
  zone_id           uuid references public.delivery_zones (id) on delete set null,
  rider_id          uuid references public.profiles (id) on delete set null,
  delivered_at      timestamptz,
  failure_reason    text,
  metadata          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (subscription_id, delivery_date, slot)
);
create index deliveries_date_idx  on public.deliveries (kitchen_id, delivery_date, slot, status);
create index deliveries_user_idx  on public.deliveries (user_id, delivery_date);
create index deliveries_rider_idx on public.deliveries (rider_id, delivery_date) where rider_id is not null;
create trigger deliveries_updated_at before update on public.deliveries
  for each row execute function public.set_updated_at();

create table public.delivery_addons (
  id           uuid primary key default gen_random_uuid(),
  delivery_id  uuid not null references public.deliveries (id) on delete cascade,
  addon_id     uuid not null references public.addons (id) on delete restrict,
  qty          int not null default 1 check (qty between 1 and 10),
  unit_price   numeric(10,2) not null,
  order_id     uuid references public.orders (id) on delete set null,   -- which order paid for it
  created_at   timestamptz not null default now(),
  unique (delivery_id, addon_id)
);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.carts              enable row level security;
alter table public.subscriptions      enable row level security;
alter table public.orders             enable row level security;
alter table public.order_items        enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.payments           enable row level security;
alter table public.refunds            enable row level security;
alter table public.webhook_events     enable row level security;   -- no policies: service_role only
alter table public.deliveries         enable row level security;
alter table public.delivery_addons    enable row level security;

create policy "carts: owner all" on public.carts
  for all using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy "subs: owner reads" on public.subscriptions
  for select using (user_id = (select auth.uid()));
create policy "subs: staff reads" on public.subscriptions
  for select using (public.has_permission('subscriptions.read'));

create policy "orders: owner reads" on public.orders
  for select using (user_id = (select auth.uid()));
create policy "orders: staff reads" on public.orders
  for select using (public.has_permission('orders.read'));

create policy "order_items: via order" on public.order_items
  for select using (exists (
    select 1 from public.orders o where o.id = order_id
      and (o.user_id = (select auth.uid()) or public.has_permission('orders.read'))));

create policy "redemptions: owner reads" on public.coupon_redemptions
  for select using (user_id = (select auth.uid()) or public.has_permission('coupons.read'));

create policy "payments: via order" on public.payments
  for select using (exists (
    select 1 from public.orders o where o.id = order_id
      and (o.user_id = (select auth.uid()) or public.has_permission('orders.read'))));

create policy "refunds: via order" on public.refunds
  for select using (exists (
    select 1 from public.orders o where o.id = order_id
      and (o.user_id = (select auth.uid()) or public.has_permission('orders.read'))));

create policy "deliveries: owner reads" on public.deliveries
  for select using (user_id = (select auth.uid()));
create policy "deliveries: staff reads" on public.deliveries
  for select using (public.has_permission('deliveries.read'));
create policy "deliveries: rider reads assigned" on public.deliveries
  for select using (rider_id = (select auth.uid()) and public.has_permission('deliveries.read_assigned'));

create policy "delivery_addons: via delivery" on public.delivery_addons
  for select using (exists (
    select 1 from public.deliveries d where d.id = delivery_id
      and (d.user_id = (select auth.uid()) or public.has_permission('deliveries.read')
           or (d.rider_id = (select auth.uid()) and public.has_permission('deliveries.read_assigned')))));
