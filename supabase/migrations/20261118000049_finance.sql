-- =============================================================================
-- BroTin Box · 0049 Finance: revenue, costs and profit (admin › Revenue & profit)
--
-- Own private schema: service role only, like `partners`. After running this,
-- add "finance" to Supabase › Settings › API › Exposed schemas (one time) so
-- the server can reach it.
--
--   finance.entries            bills and money adjustments the owner types in
--   finance.settings           packaging per box, Cashfree fee %, food-cost target
--   finance.addon_costs        what one juice / side costs us
--   finance.dish_cost_history  every change to a dish cost (filled by a trigger)
--   deliveries.food_cost       food + gas cost of that box, frozen at the 9 PM
--                              lock, so later price changes never rewrite the past
--   finance.daily(from, to)    one row per day: revenue, costs, meals
--   finance.box_costs(from,to) average cost per menu box served
--
-- Mum's cooking and the owner's delivery time are NOT costs (owner profit).
-- No GST: revenue is the amount the customer paid.
-- Safe to run twice.
-- =============================================================================

create schema if not exists finance;
revoke all on schema finance from public, anon, authenticated;
grant usage on schema finance to service_role;
alter default privileges in schema finance grant select, insert, update, delete on tables to service_role;
alter default privileges in schema finance grant usage, select on sequences to service_role;

-- ---------------------------------------------------------------------------
-- 1. Bills and adjustments
--    Procurement (food bought): vegetables, meat_eggs, dairy, grocery, packaging, gas
--    Overheads (running costs): fuel, marketing, rent_utilities, equipment, staff, fees, other
--    refund       money sent back to a customer outside Cashfree (lowers revenue)
--    other_income money received outside the website (raises revenue)
-- ---------------------------------------------------------------------------
create table if not exists finance.entries (
  id           uuid primary key default gen_random_uuid(),
  entry_date   date not null default public.today_ist(),
  category     text not null check (category in (
                 'vegetables', 'meat_eggs', 'dairy', 'grocery', 'packaging', 'gas',
                 'fuel', 'marketing', 'rent_utilities', 'equipment', 'staff', 'fees', 'other',
                 'refund', 'other_income')),
  amount       numeric(10,2) not null check (amount > 0 and amount <= 1000000),
  vendor       text check (char_length(vendor) <= 80),
  note         text check (char_length(note) <= 300),
  receipt_url  text check (char_length(receipt_url) <= 500),
  created_by   uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists finance_entries_date on finance.entries (entry_date desc);
create index if not exists finance_entries_created_by on finance.entries (created_by);
drop trigger if exists finance_entries_updated_at on finance.entries;
create trigger finance_entries_updated_at before update on finance.entries
  for each row execute function public.set_updated_at();

create or replace function finance.entry_group(p_category text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_category in ('vegetables', 'meat_eggs', 'dairy', 'grocery', 'packaging', 'gas') then 'procurement'
    when p_category = 'refund' then 'refund'
    when p_category = 'other_income' then 'income'
    else 'overhead'
  end
$$;

-- ---------------------------------------------------------------------------
-- 2. Settings (one row)
-- ---------------------------------------------------------------------------
create table if not exists finance.settings (
  id                    smallint primary key default 1 check (id = 1),
  packaging_per_box     numeric(8,2) not null default 0 check (packaging_per_box between 0 and 500),
  gateway_fee_pct       numeric(5,2) not null default 0 check (gateway_fee_pct between 0 and 10),
  target_food_cost_pct  numeric(5,2) not null default 35 check (target_food_cost_pct between 1 and 100),
  updated_by            uuid references public.profiles (id) on delete set null,
  updated_at            timestamptz not null default now()
);
insert into finance.settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 3. Add-on (juice / side) cost
-- ---------------------------------------------------------------------------
create table if not exists finance.addon_costs (
  addon_id    uuid primary key references public.addons (id) on delete cascade,
  cost        numeric(8,2) not null check (cost >= 0 and cost <= 5000),
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 4. Dish cost history: every insert/update of public.menu_item_costs
-- ---------------------------------------------------------------------------
create table if not exists finance.dish_cost_history (
  id                bigint generated always as identity primary key,
  menu_item_id      uuid not null references public.menu_items (id) on delete cascade,
  cost_per_portion  numeric(8,2) not null,
  gas_cost          numeric(8,2) not null,
  changed_by        uuid references public.profiles (id) on delete set null,
  changed_at        timestamptz not null default now(),
  note              text
);
create index if not exists finance_dish_cost_history_item on finance.dish_cost_history (menu_item_id, changed_at desc);
create index if not exists finance_dish_cost_history_by on finance.dish_cost_history (changed_by);

create or replace function finance.log_dish_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.cost_per_portion = old.cost_per_portion and new.gas_cost = old.gas_cost then
      return new;
    end if;
  end if;
  insert into finance.dish_cost_history (menu_item_id, cost_per_portion, gas_cost, changed_by)
  values (new.menu_item_id, new.cost_per_portion, new.gas_cost, auth.uid());
  return new;
end;
$$;
drop trigger if exists menu_item_costs_history on public.menu_item_costs;
create trigger menu_item_costs_history after insert or update on public.menu_item_costs
  for each row execute function finance.log_dish_cost();

insert into finance.dish_cost_history (menu_item_id, cost_per_portion, gas_cost, changed_at, note)
select c.menu_item_id, c.cost_per_portion, c.gas_cost, c.updated_at, 'Starting cost'
  from public.menu_item_costs c
 where not exists (select 1 from finance.dish_cost_history);

-- ---------------------------------------------------------------------------
-- 5. Food cost of one box (same rules as lib/lite-box.ts and the cook sheet)
--    main      ×2 with double main; Lite: up to 100 g
--    salad     Lite: up to 100 g
--    carb      Lite: ½ for pieces (roti/dosa), 0.6 otherwise
--    side      egg side dropped when egg-free; Lite keeps only the veg (curd) side
--    legume    none in Lite or with skip legume; ×2 when the egg side was dropped
--    each dish = cost_per_portion + gas_cost
-- ---------------------------------------------------------------------------
create or replace function finance.box_food_cost(
  p_snapshot jsonb, p_box public.box_size, p_double_main boolean, p_egg_free boolean, p_skip_legume boolean)
returns numeric
language sql
stable
security definer
set search_path = ''
as $$
  with items as (
    select (it->>'id')::uuid                                   as id,
           it->>'category'                                     as cat,
           coalesce((it->>'is_veg')::boolean, true)            as veg,
           greatest(coalesce((it->>'grams')::numeric, 1), 1)   as g,
           coalesce(it->>'name', '')                           as nm
      from jsonb_array_elements(coalesce(p_snapshot->'items', '[]'::jsonb)) it
     where it ? 'id'
  ),
  flags as (
    select coalesce(bool_or(cat = 'protein_side' and not veg), false) as has_egg from items
  )
  select coalesce(round(sum((c.cost_per_portion + c.gas_cost) *
    case i.cat
      when 'main' then
        (case when p_box = 'lite' then least(1, 100 / i.g) else 1 end) * (case when p_double_main then 2 else 1 end)
      when 'salad' then
        case when p_box = 'lite' then least(1, 100 / i.g) else 1 end
      when 'carb' then
        case when p_box = 'lite' then (case when i.nm ~* 'piece' then 0.5 else 0.6 end) else 1 end
      when 'protein_side' then
        case when p_box = 'lite' then (case when i.veg then 1 else 0 end)
             when p_egg_free and not i.veg then 0
             else 1 end
      when 'legume' then
        case when p_box = 'lite' or p_skip_legume then 0
             when p_egg_free and f.has_egg then 2
             else 1 end
      else 1
    end), 2), 0)
  from items i
  cross join flags f
  join public.menu_item_costs c on c.menu_item_id = i.id
$$;

alter table public.deliveries add column if not exists food_cost numeric(8,2);

create or replace function finance.set_delivery_food_cost()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recalc boolean := false;
begin
  if new.menu_snapshot is null then
    return new;
  end if;
  if tg_op = 'INSERT' or new.food_cost is null then
    recalc := true;
  elsif new.menu_snapshot is distinct from old.menu_snapshot
     or new.box_size    is distinct from old.box_size
     or new.double_main is distinct from old.double_main
     or new.is_egg_free is distinct from old.is_egg_free
     or new.skip_legume is distinct from old.skip_legume then
    recalc := true;
  end if;
  if recalc then
    new.food_cost := finance.box_food_cost(new.menu_snapshot, new.box_size, new.double_main, new.is_egg_free, new.skip_legume);
  end if;
  return new;
end;
$$;
drop trigger if exists deliveries_food_cost on public.deliveries;
create trigger deliveries_food_cost before insert or update on public.deliveries
  for each row execute function finance.set_delivery_food_cost();

-- Boxes already locked: cost them with today's dish costs (one time).
update public.deliveries d
   set food_cost = finance.box_food_cost(d.menu_snapshot, d.box_size, d.double_main, d.is_egg_free, d.skip_legume)
 where d.menu_snapshot is not null and d.food_cost is null;

-- ---------------------------------------------------------------------------
-- 6. Daily numbers
--    cooked  = delivered or failed, or locked/packed/out on a day already here
--              (counts even if nobody pressed "delivered")
--    earned  = cooked and not failed. A plan's price is spread evenly over its
--              meals (make-up meals included), and earned as each one is served.
--              Top-ups and orders without a plan are earned on the day paid.
--    cash    = money in on the day it was paid
-- ---------------------------------------------------------------------------
create or replace function finance.daily(p_from date, p_to date)
returns table (
  day date, cash_revenue numeric, earned_revenue numeric, refunds numeric, other_income numeric,
  meals_served int, meals_failed int, food_cost numeric, packaging_cost numeric, addon_cost numeric,
  gateway_fees numeric, commissions numeric, procurement numeric, overheads numeric)
language sql
stable
security definer
set search_path = ''
as $$
  with s as (select * from finance.settings where id = 1),
  days as (
    select g::date as day
      from generate_series(p_from::timestamp, least(p_to, p_from + 730)::timestamp, interval '1 day') g
  ),
  paid_orders as (
    select o.*, (o.paid_at at time zone 'Asia/Kolkata')::date as paid_day
      from public.orders o
     where o.paid_at is not null and o.status in ('paid', 'refunded', 'partially_refunded')
  ),
  meal_value as (
    select po.subscription_id,
           sum(po.total) / nullif((select count(*) from public.deliveries x
                                    where x.subscription_id = po.subscription_id
                                      and x.status not in ('skipped', 'paused', 'cancelled')), 0) as per_meal
      from paid_orders po
     where po.subscription_id is not null and not po.is_top_up
     group by po.subscription_id
  ),
  cooked as (
    select d.id, d.delivery_date as day, d.subscription_id, d.status, coalesce(d.food_cost, 0) as food_cost
      from public.deliveries d
     where d.delivery_date between p_from and p_to
       and (d.status in ('delivered', 'failed')
            or (d.status in ('locked', 'preparing', 'packed', 'out_for_delivery') and d.delivery_date <= public.today_ist()))
  ),
  meals as (
    select c.day,
           sum(coalesce(mv.per_meal, 0)) filter (where c.status <> 'failed') as earned,
           count(*) filter (where c.status <> 'failed')::int as served,
           count(*) filter (where c.status = 'failed')::int as failed,
           sum(c.food_cost) as food,
           count(*) as boxes
      from cooked c
      left join meal_value mv on mv.subscription_id = c.subscription_id
     group by c.day
  ),
  addons as (
    select c.day, sum(da.qty * coalesce(ac.cost, 0)) as cost
      from cooked c
      join public.delivery_addons da on da.delivery_id = c.id
      left join finance.addon_costs ac on ac.addon_id = da.addon_id
     group by c.day
  ),
  cash as (
    select po.paid_day as day,
           sum(po.total) as cash,
           sum(po.total) filter (where po.is_top_up or po.subscription_id is null) as earned_direct
      from paid_orders po
     where po.paid_day between p_from and p_to
     group by po.paid_day
  ),
  fees as (
    select (p.created_at at time zone 'Asia/Kolkata')::date as day, sum(p.amount) as amount
      from public.payments p
     where p.status = 'success' and p.provider = 'cashfree'
       and (p.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
     group by 1
  ),
  gateway_refunds as (
    select (r.created_at at time zone 'Asia/Kolkata')::date as day, sum(r.amount) as amount
      from public.refunds r
     where r.status = 'success'
       and (r.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
     group by 1
  ),
  comm as (
    select (c.created_at at time zone 'Asia/Kolkata')::date as day, sum(c.amount) as amount
      from partners.commissions c
     where c.status <> 'void'
       and (c.created_at at time zone 'Asia/Kolkata')::date between p_from and p_to
     group by 1
  ),
  bills as (
    select e.entry_date as day,
           sum(e.amount) filter (where finance.entry_group(e.category) = 'procurement') as procurement,
           sum(e.amount) filter (where finance.entry_group(e.category) = 'overhead')    as overheads,
           sum(e.amount) filter (where finance.entry_group(e.category) = 'refund')      as refunds,
           sum(e.amount) filter (where finance.entry_group(e.category) = 'income')      as income
      from finance.entries e
     where e.entry_date between p_from and p_to
     group by e.entry_date
  )
  select d.day,
         round(coalesce(ca.cash, 0), 2),
         round(coalesce(m.earned, 0) + coalesce(ca.earned_direct, 0), 2),
         round(coalesce(gr.amount, 0) + coalesce(b.refunds, 0), 2),
         round(coalesce(b.income, 0), 2),
         coalesce(m.served, 0),
         coalesce(m.failed, 0),
         round(coalesce(m.food, 0), 2),
         round(coalesce(m.boxes, 0) * (select packaging_per_box from s), 2),
         round(coalesce(a.cost, 0), 2),
         round(coalesce(f.amount, 0) * (select gateway_fee_pct from s) / 100, 2),
         round(coalesce(cm.amount, 0), 2),
         round(coalesce(b.procurement, 0), 2),
         round(coalesce(b.overheads, 0), 2)
    from days d
    left join meals m            on m.day = d.day
    left join addons a           on a.day = d.day
    left join cash ca            on ca.day = d.day
    left join fees f             on f.day = d.day
    left join gateway_refunds gr on gr.day = d.day
    left join comm cm            on cm.day = d.day
    left join bills b            on b.day = d.day
   order by d.day
$$;

-- Average cost per menu box served in a date range (which menu days cost most).
create or replace function finance.box_costs(p_from date, p_to date)
returns table (box text, diet public.diet_type, box_size public.box_size, boxes int, avg_cost numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(d.menu_snapshot->>'name', 'Box'), d.diet, d.box_size, count(*)::int, round(avg(d.food_cost), 2)
    from public.deliveries d
   where d.delivery_date between p_from and p_to
     and d.food_cost is not null
     and (d.status in ('delivered', 'failed')
          or (d.status in ('locked', 'preparing', 'packed', 'out_for_delivery') and d.delivery_date <= public.today_ist()))
   group by 1, 2, 3
   order by 5 desc nulls last
$$;

-- ---------------------------------------------------------------------------
-- Access: service role only (the app checks finance.* permission first;
-- finance is super admin only).
-- ---------------------------------------------------------------------------
alter table finance.entries           enable row level security;
alter table finance.settings          enable row level security;
alter table finance.addon_costs       enable row level security;
alter table finance.dish_cost_history enable row level security;

revoke all on all tables in schema finance from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema finance to service_role;
grant usage, select on all sequences in schema finance to service_role;

revoke execute on all functions in schema finance from public, anon, authenticated;
grant execute on function finance.daily(date, date), finance.box_costs(date, date),
  finance.box_food_cost(jsonb, public.box_size, boolean, boolean, boolean), finance.entry_group(text)
  to service_role;

-- finance.* is super admin only (admins don't see it either).
create or replace function public.is_super_admin_permission(p text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select split_part(p, '.', 1) in ('staff', 'finance')
      or p in ('settings.write', 'pricing.write', 'orders.refund', 'roles.manage')
$$;

notify pgrst, 'reload schema';
