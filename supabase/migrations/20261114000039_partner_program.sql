-- =============================================================================
-- BroTin Box · 0039 Trainer partner programme
--
-- Personal trainers apply at /partners, staff approve them in Admin › Partners
-- and give them a code (e.g. RAHUL10). Members use the code at checkout (or
-- arrive through brotinbox.com/?ref=RAHUL10, the same box as friend codes).
--
--   partners.partners     one row per trainer: application, status, code, UPI
--   partners.customers    customer → trainer link (one per customer, 6 months)
--   partners.commissions  one row per paid weekly/monthly plan while linked
--   partners.payouts      UPI payouts staff record with "Mark paid"
--
-- How it works
--   Checkout stores subscriptions.preferences.partner = { "partner_id": uuid }
--   when an approved trainer's code is applied before the customer's first
--   weekly/monthly plan (trials included: they link, with no perk or commission).
--   mark_order_paid() → _apply_partner():
--     1. links the customer to the trainer (first link wins, never replaced)
--     2. on a paid weekly/monthly plan while linked and the trainer is approved,
--        records a commission: first plan = milestone rate by how many new plans
--        the trainer brought in this month (IST), later plans = renewal rate.
--   A commission is payable once hold_until (plan start + hold_days) has passed
--   and the order is still paid; refund/cancel voids it automatically.
--   Rates live in site_settings.partner_program (public: /partners shows them).
-- =============================================================================

-- Own private schema: service role only. Add "partners" to Supabase ›
-- Settings › API › Exposed schemas so the server (service role) can reach it.
create schema if not exists partners;
revoke all on schema partners from public, anon, authenticated;
grant usage on schema partners to service_role;
alter default privileges in schema partners grant select, insert, update, delete on tables to service_role;
alter default privileges in schema partners grant usage, select on sequences to service_role;
alter default privileges in schema partners grant execute on functions to service_role;

create table if not exists partners.partners (
  id                 uuid primary key default gen_random_uuid(),
  profile_id         uuid not null unique references public.profiles (id) on delete cascade,
  status             text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'paused')),
  code               text unique check (code ~ '^[A-Z0-9]{4,20}$'),
  full_name          text not null,
  phone              text not null,
  email              text,
  gym_name           text not null,
  gym_area           text not null,
  gym_pincode        text not null check (gym_pincode ~ '^[0-9]{6}$'),
  gym_maps_url       text,
  instagram          text,
  years_training     int  not null check (years_training between 0 and 60),
  active_clients     int  not null check (active_clients between 0 and 2000),
  pitch              text,
  terms_version      text not null,
  terms_accepted_at  timestamptz not null default now(),
  upi_id             text,
  upi_name           text,
  admin_note         text,
  decided_by         uuid references public.profiles (id) on delete set null,
  decided_at         timestamptz,
  approved_at        timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists partners_status on partners.partners (status, created_at desc);

create table if not exists partners.customers (
  customer_id     uuid primary key references public.profiles (id) on delete cascade,
  partner_id      uuid not null references partners.partners (id) on delete cascade,
  first_order_id  uuid references public.orders (id) on delete set null,
  linked_at       timestamptz not null default now(),
  linked_until    timestamptz not null
);
create index if not exists partner_customers_partner on partners.customers (partner_id, linked_at desc);

create table if not exists partners.payouts (
  id          uuid primary key default gen_random_uuid(),
  partner_id  uuid not null references partners.partners (id) on delete cascade,
  amount      numeric(10, 2) not null check (amount > 0),
  upi_id      text,
  reference   text not null,
  note        text,
  paid_at     timestamptz not null default now(),
  paid_by     uuid references public.profiles (id) on delete set null
);
create index if not exists partner_payouts_partner on partners.payouts (partner_id, paid_at desc);

create table if not exists partners.commissions (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references partners.partners (id) on delete cascade,
  customer_id  uuid not null references public.profiles (id) on delete cascade,
  order_id     uuid not null unique references public.orders (id) on delete cascade,
  kind         text not null check (kind in ('first_plan', 'renewal')),
  plan_type    text not null check (plan_type in ('weekly', 'monthly')),
  amount       numeric(10, 2) not null check (amount >= 0),
  tier         int,
  status       text not null default 'pending' check (status in ('pending', 'paid', 'void')),
  hold_until   date not null,
  void_reason  text,
  payout_id    uuid references partners.payouts (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists partner_commissions_partner on partners.commissions (partner_id, created_at desc);
create index if not exists partner_commissions_payout on partners.commissions (payout_id);
create index if not exists partner_commissions_customer on partners.commissions (customer_id);

alter table partners.partners            enable row level security;
alter table partners.customers   enable row level security;
alter table partners.payouts     enable row level security;
alter table partners.commissions enable row level security;
revoke all on partners.partners, partners.customers, partners.payouts, partners.commissions from public, anon, authenticated;
grant select, insert, update, delete on partners.partners, partners.customers, partners.payouts, partners.commissions to service_role;

drop trigger if exists partners_updated_at on partners.partners;
create trigger partners_updated_at before update on partners.partners
  for each row execute function public.set_updated_at();

-- Rates and rules (public: the /partners page shows them). Tiers in ascending
-- "from" order: the Nth new paid plan of the month gets the highest tier it reaches.
insert into public.site_settings (key, value, is_public) values ('partner_program', '{
  "enabled": true,
  "link_months": 6,
  "hold_days": 7,
  "min_payout": 500,
  "payout_day": 5,
  "member_juices": { "weekly": 1, "monthly": 2 },
  "tiers": [
    { "from": 1,  "monthly": 250, "weekly": 60 },
    { "from": 5,  "monthly": 350, "weekly": 80 },
    { "from": 10, "monthly": 450, "weekly": 100 }
  ],
  "renewal": { "monthly": 100, "weekly": 40 }
}'::jsonb, true)
on conflict (key) do nothing;

-- -----------------------------------------------------------------------------
-- Link + commission for a paid order. Called by mark_order_paid().
-- -----------------------------------------------------------------------------
create or replace function public._apply_partner(p_order uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  o       public.orders;
  s       public.subscriptions;
  cfg     jsonb;
  p       partners.partners;
  lnk     partners.customers;
  v_pid   uuid;
  v_kind  text;
  v_n     int;
  v_tier  int;
  v_amt   numeric;
  v_i     int;
  t       jsonb;
  v_month timestamptz;
begin
  select * into o from public.orders where id = p_order;
  if o.id is null or o.is_top_up or o.status <> 'paid' then return; end if;

  select value into cfg from public.site_settings where key = 'partner_program';
  if cfg is null or coalesce((cfg ->> 'enabled')::boolean, true) = false then return; end if;

  if o.subscription_id is not null then
    select * into s from public.subscriptions where id = o.subscription_id;
  end if;

  -- 1. New link from the code applied at checkout (first link wins).
  v_pid := nullif(s.preferences -> 'partner' ->> 'partner_id', '')::uuid;
  if v_pid is not null then
    select * into p from partners.partners where id = v_pid;
    if p.id is not null and p.status = 'approved' and p.profile_id <> o.user_id then
      insert into partners.customers (customer_id, partner_id, first_order_id, linked_at, linked_until)
      values (o.user_id, p.id, o.id, now(), now() + make_interval(months => coalesce((cfg ->> 'link_months')::int, 6)))
      on conflict (customer_id) do nothing;
    end if;
  end if;

  -- 2. Commission on a paid weekly/monthly plan while the link is live.
  if o.type::text not in ('weekly', 'monthly') then return; end if;
  select * into lnk from partners.customers where customer_id = o.user_id;
  if lnk.customer_id is null or lnk.linked_until < now() then return; end if;
  select * into p from partners.partners where id = lnk.partner_id;
  if p.id is null or p.status <> 'approved' then return; end if;

  v_kind := case when exists (
    select 1 from public.orders x
     where x.user_id = o.user_id and x.id <> o.id and x.status = 'paid'
       and x.type::text in ('weekly', 'monthly') and not x.is_top_up and x.paid_at <= o.paid_at
  ) then 'renewal' else 'first_plan' end;

  if v_kind = 'first_plan' then
    v_month := date_trunc('month', now() at time zone 'Asia/Kolkata') at time zone 'Asia/Kolkata';
    select count(*) + 1 into v_n from partners.commissions
     where partner_id = p.id and kind = 'first_plan' and status <> 'void' and created_at >= v_month;
    v_tier := null; v_amt := 0; v_i := 0;
    for t in select value from jsonb_array_elements(coalesce(cfg -> 'tiers', '[]'::jsonb)) loop
      v_i := v_i + 1;
      if v_n >= coalesce((t ->> 'from')::int, 1) then
        v_tier := v_i;
        v_amt := coalesce((t ->> o.type::text)::numeric, 0);
      end if;
    end loop;
  else
    v_amt := coalesce((cfg -> 'renewal' ->> o.type::text)::numeric, 0);
  end if;
  if v_amt <= 0 then return; end if;

  insert into partners.commissions (partner_id, customer_id, order_id, kind, plan_type, amount, tier, hold_until)
  values (p.id, o.user_id, o.id, v_kind, o.type::text, v_amt, v_tier,
          coalesce(s.start_date, (now() at time zone 'Asia/Kolkata')::date) + coalesce((cfg ->> 'hold_days')::int, 7))
  on conflict (order_id) do nothing;
end;
$$;

revoke all on function public._apply_partner(uuid) from public, anon, authenticated;

-- A refunded or cancelled order voids its unpaid commission.
create or replace function partners._void_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status::text in ('refunded', 'cancelled') and old.status is distinct from new.status then
    update partners.commissions
       set status = 'void', void_reason = 'Order ' || new.status::text
     where order_id = new.id and status = 'pending';
  end if;
  return new;
end;
$$;
revoke all on function partners._void_commission() from public, anon, authenticated;

drop trigger if exists orders_void_partner_commission on public.orders;
create trigger orders_void_partner_commission after update of status on public.orders
  for each row execute function partners._void_commission();

-- -----------------------------------------------------------------------------
-- mark_order_paid: as in 0035, plus the partner link / commission.
-- A problem with either offer never blocks a payment (it is logged instead).
-- -----------------------------------------------------------------------------
create or replace function public.mark_order_paid(p_order uuid, p_cf_payment_id text, p_amount numeric, p_method text, p_raw jsonb default '{}'::jsonb)
returns public.orders
language plpgsql
security definer
set search_path = ''
as $$
declare
  o public.orders;
  s public.subscriptions;
begin
  select * into o from public.orders where id = p_order for update;
  if o.id is null then
    raise exception 'order not found';
  end if;

  insert into public.payments (order_id, cf_payment_id, amount, method, status, raw)
  values (p_order, p_cf_payment_id, p_amount, p_method, 'success', p_raw)
  on conflict (cf_payment_id) do update
    set status = 'success', amount = excluded.amount, method = excluded.method,
        failure_reason = null, raw = excluded.raw
    where public.payments.status <> 'success';

  if o.status = 'paid' then
    return o;   -- already processed
  end if;
  if p_amount < o.total then
    raise exception 'amount mismatch: paid %, expected %', p_amount, o.total;
  end if;

  update public.orders set status = 'paid', paid_at = now() where id = p_order returning * into o;

  if o.coupon_id is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id, amount)
    values (o.coupon_id, o.user_id, o.id, o.discount)
    on conflict (order_id) do nothing;
  end if;

  if o.subscription_id is not null and not o.is_top_up then
    select * into s from public.subscriptions where id = o.subscription_id for update;
    -- 'expired' covers a late payment arriving after housekeeping gave up on it.
    if s.status in ('pending_payment', 'expired') then
      update public.subscriptions set status = 'active' where id = s.id;
      perform public.generate_deliveries(s.id, o.id);
      begin
        perform public._apply_free_juices(o.id);
      exception when others then
        perform public.log_activity(o.user_id, 'order', o.id, 'free_juice_failed', null,
          jsonb_build_object('error', sqlerrm));
      end;
    end if;
  end if;

  if not o.is_top_up then
    begin
      perform public._apply_partner(o.id);
    exception when others then
      perform public.log_activity(o.user_id, 'order', o.id, 'partner_commission_failed', null,
        jsonb_build_object('error', sqlerrm));
    end;
  end if;

  perform public.log_activity(o.user_id, 'order', o.id, 'paid', null,
    jsonb_build_object('order_number', o.order_number, 'total', o.total, 'method', p_method));
  return o;
end;
$$;
