-- =============================================================================
-- BroTin Box · 0003 Catalog & menu
-- Dishes, 30-day rotation, date overrides, closures, add-ons, plans, pricing,
-- delivery zones, coupons. Everything here is admin-editable and drives the
-- live site (Next.js revalidates cache tags on change).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Dish catalog (replaces menu-30day.json "catalog")
-- ---------------------------------------------------------------------------
create table public.menu_items (
  id                uuid primary key default gen_random_uuid(),
  code              text not null unique,               -- NVM1, VM2, CD1, LG1, SL1, CB1 …
  category          public.menu_category not null,
  name              text not null,
  description       text,
  grams             int not null check (grams > 0),
  cooked_state      text,
  calories          numeric(6,1) not null check (calories >= 0),
  protein           numeric(6,1) not null check (protein >= 0),
  carbs             numeric(6,1) not null check (carbs >= 0),
  fat               numeric(6,1) not null check (fat >= 0),
  fiber             numeric(6,1) not null default 0,
  allergens         text[] not null default '{}',
  is_veg            boolean not null,
  contains_egg      boolean not null default false,
  image_url         text,
  is_active         boolean not null default true,
  metadata          jsonb not null default '{}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items (category) where is_active;
create trigger menu_items_updated_at before update on public.menu_items
  for each row execute function public.set_updated_at();

-- Costs live apart from menu_items so public pages can select('*') safely.
create table public.menu_item_costs (
  menu_item_id      uuid primary key references public.menu_items (id) on delete cascade,
  cost_per_portion  numeric(8,2) not null check (cost_per_portion >= 0),
  gas_cost          numeric(8,2) not null default 0,
  updated_at        timestamptz not null default now()
);
create trigger menu_item_costs_updated_at before update on public.menu_item_costs
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 30-day rotation template (day_number 1..30 × diet × slot)
-- ---------------------------------------------------------------------------
create table public.menu_rotation (
  id               uuid primary key default gen_random_uuid(),
  kitchen_id       uuid not null references public.kitchens (id) default public.default_kitchen_id(),
  day_number       smallint not null check (day_number between 1 and 30),
  diet             public.diet_type not null,
  slot             public.meal_slot not null,
  name             text,                                  -- "Day 1: Green mint grilled chicken Box"
  main_id          uuid not null references public.menu_items (id),
  protein_side_id  uuid not null references public.menu_items (id),
  salad_id         uuid not null references public.menu_items (id),
  legume_id        uuid not null references public.menu_items (id),
  carb_id          uuid not null references public.menu_items (id),
  updated_by       uuid references public.profiles (id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (kitchen_id, day_number, diet, slot)
);
create trigger menu_rotation_updated_at before update on public.menu_rotation
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Per-date overrides (replaces overrides.json). Null item = keep rotation item.
-- ---------------------------------------------------------------------------
create table public.menu_overrides (
  id               uuid primary key default gen_random_uuid(),
  kitchen_id       uuid not null references public.kitchens (id) default public.default_kitchen_id(),
  menu_date        date not null,
  diet             public.diet_type not null,
  slot             public.meal_slot not null,
  main_id          uuid references public.menu_items (id),
  protein_side_id  uuid references public.menu_items (id),
  salad_id         uuid references public.menu_items (id),
  legume_id        uuid references public.menu_items (id),
  carb_id          uuid references public.menu_items (id),
  reason           text,
  created_by       uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (kitchen_id, menu_date, diet, slot)
);
create trigger menu_overrides_updated_at before update on public.menu_overrides
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Kitchen closures (holidays). Sundays are always closed by rule.
-- ---------------------------------------------------------------------------
create table public.kitchen_closures (
  id           uuid primary key default gen_random_uuid(),
  kitchen_id   uuid not null references public.kitchens (id) default public.default_kitchen_id(),
  closed_date  date not null,
  reason       text not null,
  created_by   uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at   timestamptz not null default now(),
  unique (kitchen_id, closed_date)
);

-- ---------------------------------------------------------------------------
-- Add-ons: sides & drinks (replaces sides.json + addons.json)
-- ---------------------------------------------------------------------------
create table public.addons (
  id           uuid primary key default gen_random_uuid(),
  type         public.addon_type not null,
  slug         text not null unique,
  name         text not null,
  description  text,
  price        numeric(10,2) not null check (price >= 0),
  calories     numeric(6,1) not null default 0,
  protein      numeric(6,1) not null default 0,
  carbs        numeric(6,1) not null default 0,
  fat          numeric(6,1) not null default 0,
  sugar_g      numeric(5,1),
  volume_ml    int,
  is_veg       boolean not null default true,
  tags         text[] not null default '{}',
  image_url    text,
  is_active    boolean not null default true,
  sort_order   int not null default 0,
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create trigger addons_updated_at before update on public.addons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Plans & pricing (replaces plans.json and the hard-coded PRICING matrix)
-- ---------------------------------------------------------------------------
create table public.plans (
  id              uuid primary key default gen_random_uuid(),
  slug            text not null unique,
  name            text not null,
  type            public.plan_type not null,
  meals_per_day   smallint not null check (meals_per_day in (1, 2)),
  operating_days  smallint not null check (operating_days between 1 and 60),
  tagline         text,
  description     text,
  features        jsonb not null default '[]',
  ideal_for       jsonb not null default '[]',
  badge           text,
  is_popular      boolean not null default false,
  is_active       boolean not null default true,
  sort_order      int not null default 0,
  metadata        jsonb not null default '{}',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create trigger plans_updated_at before update on public.plans
  for each row execute function public.set_updated_at();

create table public.pricing_rules (
  id                    uuid primary key default gen_random_uuid(),
  plan_type             public.plan_type not null,
  diet                  public.diet_type not null,
  price_per_meal        numeric(10,2) not null check (price_per_meal > 0),
  second_meal_discount  numeric(10,2) not null default 0 check (second_meal_discount >= 0),
  effective_from        timestamptz not null default now(),
  created_by            uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at            timestamptz not null default now()
);
create index pricing_rules_lookup_idx on public.pricing_rules (plan_type, diet, effective_from desc);

-- Current price per meal for a plan type + diet.
create or replace function public.current_price(p_plan_type public.plan_type, p_diet public.diet_type)
returns table (price_per_meal numeric, second_meal_discount numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select price_per_meal, second_meal_discount
  from public.pricing_rules
  where plan_type = p_plan_type and diet = p_diet and effective_from <= now()
  order by effective_from desc
  limit 1
$$;

-- ---------------------------------------------------------------------------
-- Delivery zones (replaces delivery-zones.json)
-- ---------------------------------------------------------------------------
create table public.delivery_zones (
  id            uuid primary key default gen_random_uuid(),
  kitchen_id    uuid not null references public.kitchens (id) default public.default_kitchen_id(),
  pincode       text not null check (pincode ~ '^[0-9]{6}$'),
  area          text not null,
  tier          public.zone_tier not null default 'core',
  delivery_fee  numeric(10,2) not null default 0 check (delivery_fee >= 0),
  distance_km   numeric(5,2),
  avg_minutes   int,
  lat           numeric(9,6),
  lng           numeric(9,6),
  slots         text[] not null default '{}',
  description   text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (pincode, area)
);
create index delivery_zones_pincode_idx on public.delivery_zones (pincode) where is_active;
create trigger delivery_zones_updated_at before update on public.delivery_zones
  for each row execute function public.set_updated_at();

alter table public.addresses
  add constraint addresses_zone_fk foreign key (zone_id) references public.delivery_zones (id) on delete set null;

-- ---------------------------------------------------------------------------
-- Coupons
-- ---------------------------------------------------------------------------
create table public.coupons (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique check (code = upper(code) and code ~ '^[A-Z0-9_-]{3,30}$'),
  description      text,
  discount_type    public.discount_type not null,
  value            numeric(10,2) not null check (value > 0),
  min_order        numeric(10,2) not null default 0,
  max_discount     numeric(10,2),
  valid_from       timestamptz not null default now(),
  valid_to         timestamptz,
  usage_limit      int,                               -- total redemptions
  per_user_limit   int not null default 1,
  first_order_only boolean not null default false,
  plan_types       public.plan_type[],                -- null = all
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  check (discount_type <> 'percentage' or value <= 100)
);
create trigger coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Operating-day helpers + DB port of lib/menu-engine.ts
-- ---------------------------------------------------------------------------

-- Mon–Sat and not a closure date.
create or replace function public.is_operating_day(d date, p_kitchen uuid default null)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select extract(isodow from d) between 1 and 6
     and not exists (
       select 1 from public.kitchen_closures c
       where c.closed_date = d
         and c.kitchen_id = coalesce(p_kitchen, public.default_kitchen_id())
     )
$$;

create or replace function public.next_operating_day(after_date date, p_kitchen uuid default null)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare d date := after_date + 1;
begin
  while not public.is_operating_day(d, p_kitchen) loop
    d := d + 1;
  end loop;
  return d;
end;
$$;

-- Same formula as getOperatingDayInfo(): anchor Mon 2026-01-05, 6 operating days/week.
create or replace function public.rotation_day_number(d date)
returns smallint
language sql
immutable
set search_path = ''
as $$
  select case when extract(isodow from d) = 7 then null
    else ((abs(floor((d - date '2026-01-05')::numeric / 7)::int * 6
               + extract(isodow from d)::int - 1) % 30) + 1)::smallint
  end
$$;

-- Cutoff for a delivery date = previous day at site_settings.cutoff_time (IST).
create or replace function public.cutoff_for(d date)
returns timestamp
language sql
stable
security definer
set search_path = ''
as $$
  select (d - 1) + coalesce((public.get_setting('cutoff_time') #>> '{}')::time, time '21:00')
$$;

create or replace function public.is_before_cutoff(d date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$ select public.now_ist() < public.cutoff_for(d) $$;

-- Earliest date a new order/customisation can target.
create or replace function public.earliest_bookable_date(p_kitchen uuid default null)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare d date := public.today_ist();
begin
  loop
    d := public.next_operating_day(d, p_kitchen);
    exit when public.is_before_cutoff(d);
  end loop;
  return d;
end;
$$;

-- Resolved menu for a date: rotation + override, as item ids.
create or replace function public.get_menu_for_date(
  p_date date, p_diet public.diet_type, p_slot public.meal_slot, p_kitchen uuid default null)
returns table (
  menu_date date, day_number smallint, is_closed boolean, name text,
  main_id uuid, protein_side_id uuid, salad_id uuid, legume_id uuid, carb_id uuid, is_override boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  k uuid := coalesce(p_kitchen, public.default_kitchen_id());
  r public.menu_rotation;
  o public.menu_overrides;
begin
  if not public.is_operating_day(p_date, k) then
    return query select p_date, null::smallint, true, null::text, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, false;
    return;
  end if;

  select * into r from public.menu_rotation mr
   where mr.kitchen_id = k and mr.day_number = public.rotation_day_number(p_date)
     and mr.diet = p_diet and mr.slot = p_slot;

  select * into o from public.menu_overrides mo
   where mo.kitchen_id = k and mo.menu_date = p_date and mo.diet = p_diet and mo.slot = p_slot;

  return query select
    p_date, public.rotation_day_number(p_date), false, r.name,
    coalesce(o.main_id, r.main_id), coalesce(o.protein_side_id, r.protein_side_id),
    coalesce(o.salad_id, r.salad_id), coalesce(o.legume_id, r.legume_id),
    coalesce(o.carb_id, r.carb_id), o.id is not null;
end;
$$;

-- ---------------------------------------------------------------------------
-- RLS: public reads active rows, admins write. Costs stay staff-only.
-- ---------------------------------------------------------------------------
alter table public.menu_items       enable row level security;
alter table public.menu_rotation    enable row level security;
alter table public.menu_overrides   enable row level security;
alter table public.kitchen_closures enable row level security;
alter table public.addons           enable row level security;
alter table public.plans            enable row level security;
alter table public.pricing_rules    enable row level security;
alter table public.delivery_zones   enable row level security;
alter table public.coupons          enable row level security;

alter table public.menu_item_costs  enable row level security;
create policy "costs: staff reads" on public.menu_item_costs
  for select using (public.has_permission('menu.read'));
create policy "costs: menu writers" on public.menu_item_costs
  for all using (public.has_permission('menu.write')) with check (public.has_permission('menu.write'));

create policy "menu_items: public reads active" on public.menu_items
  for select using (is_active or public.is_staff());
create policy "menu_items: menu writers" on public.menu_items
  for all using (public.has_permission('menu.write')) with check (public.has_permission('menu.write'));

create policy "rotation: public reads" on public.menu_rotation for select using (true);
create policy "rotation: menu writers" on public.menu_rotation
  for all using (public.has_permission('menu.write')) with check (public.has_permission('menu.write'));

create policy "overrides: public reads" on public.menu_overrides for select using (true);
create policy "overrides: menu writers" on public.menu_overrides
  for all using (public.has_permission('menu.write')) with check (public.has_permission('menu.write'));

create policy "closures: public reads" on public.kitchen_closures for select using (true);
create policy "closures: menu writers" on public.kitchen_closures
  for all using (public.has_permission('menu.write')) with check (public.has_permission('menu.write'));

create policy "addons: public reads active" on public.addons
  for select using (is_active or public.is_staff());
create policy "addons: admin writes" on public.addons
  for all using (public.has_permission('catalog.write')) with check (public.has_permission('catalog.write'));

create policy "plans: public reads active" on public.plans
  for select using (is_active or public.is_staff());
create policy "plans: admin writes" on public.plans
  for all using (public.has_permission('pricing.write')) with check (public.has_permission('pricing.write'));

create policy "pricing: public reads" on public.pricing_rules for select using (true);
create policy "pricing: admin writes" on public.pricing_rules
  for all using (public.has_permission('pricing.write')) with check (public.has_permission('pricing.write'));

create policy "zones: public reads active" on public.delivery_zones
  for select using (is_active or public.is_staff());
create policy "zones: admin writes" on public.delivery_zones
  for all using (public.has_permission('zones.write')) with check (public.has_permission('zones.write'));

-- Coupons are never listed publicly; validation happens server-side (quote API).
create policy "coupons: staff reads" on public.coupons
  for select using (public.has_permission('coupons.read'));
create policy "coupons: admin writes" on public.coupons
  for all using (public.has_permission('coupons.write')) with check (public.has_permission('coupons.write'));
