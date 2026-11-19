-- =============================================================================
-- BroTin Box · 0052 Single box + same-day ordering
--
-- Run AFTER 0051 (which adds the 'single' order type).
--
-- SINGLE BOX: a one-day box anyone can order again and again (the trial stays
-- one per customer). Priced from pricing_rules plan_type 'single'.
--
-- SAME-DAY: a single box can be for TODAY, until the slot's cutoff
-- (site_settings.same_day: lunch_until 09:30, dinner_until 17:00). Today's
-- boxes come out of a few SPARE boxes the kitchen cooks on top of the 9 PM
-- cook sheet, per slot and diet (same_day_spares: default 3 non-veg + 2 veg
-- per run, changeable per date on the Capacity page). When the spares are
-- gone, today shows "sold out". Staff tatkal moves use the same spares.
--
-- Payment: a same-day order holds its spare for 40 minutes. If the payment
-- lands later than the slot cutoff + grace_minutes, the box is booked for the
-- next open day instead and the order is flagged (same_day_late) for staff.
--
-- Future-day single boxes use the slot capacity seats, like the trial box.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Settings
-- ---------------------------------------------------------------------------
insert into public.site_settings (key, value, is_public)
values ('same_day', '{"enabled": true, "lunch_until": "09:30", "dinner_until": "17:00", "grace_minutes": 40}'::jsonb, false)
on conflict (key) do nothing;

-- ---------------------------------------------------------------------------
-- Plans + prices (regular trial price; Lite = Lite trial price)
-- ---------------------------------------------------------------------------
insert into public.plans (slug, name, type, meals_per_day, operating_days, tagline, description, is_active, sort_order)
select v.slug, v.name, 'single'::public.plan_type, v.mpd, 1, v.tagline, v.descr, true, v.sort
  from (values
    ('single-box',   'Single box',              1, 'One box, any day. Order as often as you like.', 'One-off prepaid box. Same-day delivery when ordered before the cutoff.', 20),
    ('single-box-2', 'Single box · lunch + dinner', 2, 'Lunch and dinner for one day.',               'One-off prepaid lunch + dinner for a single day.',                       21)
  ) v(slug, name, mpd, tagline, descr, sort)
on conflict (slug) do nothing;

insert into public.pricing_rules (plan_type, diet, box_size, price_per_meal, second_meal_discount, effective_from)
select 'single'::public.plan_type, v.diet::public.diet_type, v.size::public.box_size, v.price, 10, now()
  from (values ('non_veg', 'regular', 309), ('veg', 'regular', 279),
               ('non_veg', 'lite',    199), ('veg', 'lite',    179)) v(diet, size, price)
 where not exists (select 1 from public.pricing_rules p
                    where p.plan_type = 'single' and p.diet = v.diet::public.diet_type and p.box_size = v.size::public.box_size);

-- ---------------------------------------------------------------------------
-- Spare boxes per slot + diet (date null = every day)
-- ---------------------------------------------------------------------------
create table if not exists public.same_day_spares (
  id          uuid primary key default gen_random_uuid(),
  kitchen_id  uuid not null default public.default_kitchen_id() references public.kitchens (id),
  slot        public.meal_slot not null,
  diet        public.diet_type not null,
  spare_date  date,
  spares      int not null check (spares between 0 and 100),
  updated_by  uuid references public.profiles (id) on delete set null,
  updated_at  timestamptz not null default now(),
  constraint same_day_spares_unique unique nulls not distinct (kitchen_id, slot, diet, spare_date)
);
create index if not exists same_day_spares_updated_by_idx on public.same_day_spares (updated_by);
alter table public.same_day_spares enable row level security;
drop policy if exists same_day_spares_staff_read on public.same_day_spares;
create policy same_day_spares_staff_read on public.same_day_spares
  for select using (public.has_permission('deliveries.read'));

insert into public.same_day_spares (slot, diet, spare_date, spares) values
  ('lunch', 'non_veg', null, 3), ('lunch', 'veg', null, 2),
  ('dinner', 'non_veg', null, 3), ('dinner', 'veg', null, 2)
on conflict on constraint same_day_spares_unique do nothing;

create or replace function public._same_day_spares(p_kitchen uuid, p_date date, p_slot public.meal_slot, p_diet public.diet_type)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select spares from public.same_day_spares where kitchen_id = p_kitchen and slot = p_slot and diet = p_diet and spare_date = p_date),
    (select spares from public.same_day_spares where kitchen_id = p_kitchen and slot = p_slot and diet = p_diet and spare_date is null),
    0)
$$;

-- Last IST time to order a slot for today.
create or replace function public._same_day_until(p_cfg jsonb, p_slot public.meal_slot)
returns time
language sql
stable
set search_path = ''
as $$
  select coalesce(nullif(p_cfg ->> (p_slot::text || '_until'), ''),
                  case p_slot when 'lunch' then '09:30' else '17:00' end)::time
$$;

-- ---------------------------------------------------------------------------
-- Spares per slot + diet on a date.
-- used = boxes already booked from the spares (same-day orders + staff tatkal)
-- held = unpaid same-day orders from the last 40 minutes
-- ---------------------------------------------------------------------------
create or replace function public._same_day_counts(p_day date, p_kitchen uuid)
returns table (slot public.meal_slot, diet public.diet_type, spares int, used int, held int)
language sql
stable
security definer
set search_path = ''
as $$
  with combos as (
    select s.slot, d.diet
      from unnest(enum_range(null::public.meal_slot)) as s(slot)
     cross join unnest(enum_range(null::public.diet_type)) as d(diet)
  ), used as (
    select x.slot, x.diet, count(*)::int as n
      from public.deliveries x
     where x.kitchen_id = p_kitchen
       and x.delivery_date = p_day
       and x.status in ('scheduled', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered')
       and (x.metadata ->> 'same_day' = 'true' or x.metadata ? 'tatkal')
     group by 1, 2
  ), held as (
    select u.slot, s.diet, count(*)::int as n
      from public.orders o
      join public.subscriptions s on s.id = o.subscription_id
     cross join lateral unnest(s.slots) as u(slot)
     where o.type = 'single'
       and o.status in ('created', 'pending_payment')
       and o.created_at > now() - interval '40 minutes'
       and s.kitchen_id = p_kitchen
       and s.start_date = p_day
       and s.preferences ->> 'same_day' = 'true'
       and not exists (select 1 from public.deliveries x where x.subscription_id = s.id)
     group by 1, 2
  )
  select c.slot, c.diet, public._same_day_spares(p_kitchen, p_day, c.slot, c.diet),
         coalesce(u.n, 0), coalesce(h.n, 0)
    from combos c
    left join used u on u.slot = c.slot and u.diet = c.diet
    left join held h on h.slot = c.slot and h.diet = c.diet
   order by c.slot, c.diet
$$;
revoke all on function public._same_day_spares(uuid, date, public.meal_slot, public.diet_type) from public, anon, authenticated;
revoke all on function public._same_day_until(jsonb, public.meal_slot) from public, anon, authenticated;
revoke all on function public._same_day_counts(date, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Today's same-day status, for the order screen (server) and staff.
-- p_date lets staff see spares for another date (is_open is only ever true today).
-- ---------------------------------------------------------------------------
create or replace function public.same_day_status(p_date date default null, p_kitchen uuid default null)
returns table (day date, slot public.meal_slot, diet public.diet_type, until_time text, is_open boolean,
               spares int, used int, held int, spares_left int)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  k     uuid := coalesce(p_kitchen, public.default_kitchen_id());
  today date := public.today_ist();
  d     date := coalesce(p_date, public.today_ist());
  now_t time := (now() at time zone 'Asia/Kolkata')::time;
  cfg   jsonb;
  on_   boolean;
begin
  if auth.uid() is not null and not public.has_permission('deliveries.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  select value into cfg from public.site_settings where key = 'same_day';
  on_ := cfg is not null and coalesce((cfg ->> 'enabled')::boolean, false)
         and d = today and public.is_operating_day(d, k);
  return query
  select d, c.slot, c.diet, to_char(public._same_day_until(cfg, c.slot), 'HH24:MI'),
         on_ and now_t < public._same_day_until(cfg, c.slot),
         c.spares, c.used, c.held, greatest(c.spares - c.used - c.held, 0)
    from public._same_day_counts(d, k) c;
end;
$$;
revoke execute on function public.same_day_status(date, uuid) from public, anon;
grant execute on function public.same_day_status(date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Staff: change the every-day spares (p_date null) or one date's.
-- p_spares null on a date removes that date's change.
-- ---------------------------------------------------------------------------
create or replace function public.set_same_day_spares(p_slot public.meal_slot, p_diet public.diet_type, p_date date, p_spares int)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare k uuid := public.default_kitchen_id();
begin
  if not public.has_permission('menu.write') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_spares is null then
    if p_date is null then
      raise exception 'the every-day spares need a number' using errcode = 'P0001';
    end if;
    delete from public.same_day_spares where kitchen_id = k and slot = p_slot and diet = p_diet and spare_date = p_date;
  else
    if p_spares < 0 or p_spares > 100 then
      raise exception 'spares must be between 0 and 100' using errcode = 'P0001';
    end if;
    insert into public.same_day_spares (kitchen_id, slot, diet, spare_date, spares, updated_by, updated_at)
    values (k, p_slot, p_diet, p_date, p_spares, auth.uid(), now())
    on conflict on constraint same_day_spares_unique
    do update set spares = excluded.spares, updated_by = excluded.updated_by, updated_at = now();
  end if;
  perform public.log_activity(auth.uid(), 'same_day_spares', null, 'updated', null,
    jsonb_build_object('slot', p_slot, 'diet', p_diet, 'date', p_date, 'spares', p_spares));
end;
$$;
revoke execute on function public.set_same_day_spares(public.meal_slot, public.diet_type, date, int) from public, anon;
grant execute on function public.set_same_day_spares(public.meal_slot, public.diet_type, date, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Slot seats: unpaid future-day single boxes hold a seat like unpaid trials.
-- (Same as 0037 otherwise.)
-- ---------------------------------------------------------------------------
create or replace function public._slot_counts(p_from date, p_to date, p_kitchen uuid)
returns table (day date, slot public.meal_slot, capacity int, booked int, held int)
language sql
stable
security definer
set search_path = ''
as $$
  with days as (
    select g::date as day from generate_series(p_from, p_to, interval '1 day') g
  ), slots as (
    select unnest(enum_range(null::public.meal_slot)) as slot
  ), booked as (
    select d.delivery_date as day, d.slot, count(*)::int as n
      from public.deliveries d
     where d.kitchen_id = p_kitchen
       and d.delivery_date between p_from and p_to
       and d.status in ('scheduled', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered')
     group by 1, 2
  ), held as (
    select s.start_date as day, u.slot, count(*)::int as n
      from public.orders o
      join public.subscriptions s on s.id = o.subscription_id
      cross join lateral unnest(s.slots) as u(slot)
     where o.type in ('trial', 'single')
       and coalesce(s.preferences ->> 'same_day', 'false') <> 'true'
       and o.status in ('created', 'pending_payment')
       and o.created_at > now() - interval '15 minutes'
       and s.kitchen_id = p_kitchen
       and s.start_date between p_from and p_to
       and not exists (select 1 from public.deliveries x where x.subscription_id = s.id)
     group by 1, 2
  )
  select x.day, y.slot, public._slot_capacity(p_kitchen, x.day, y.slot),
         coalesce(b.n, 0), coalesce(h.n, 0)
    from days x
   cross join slots y
    left join booked b on b.day = x.day and b.slot = y.slot
    left join held h on h.day = x.day and h.slot = y.slot
   order by x.day, y.slot
$$;
revoke all on function public._slot_counts(date, date, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Guard on new subscriptions:
--   * same-day single box → today, before the slot cutoff, a spare left
--   * trial / future-day single box → a free slot seat (as in 0037)
-- Staff-entered orders skip both (preferences.capacity_override).
-- ---------------------------------------------------------------------------
create or replace function public._trial_slot_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sl public.meal_slot;
  c record;
  cfg jsonb;
  now_t time := (now() at time zone 'Asia/Kolkata')::time;
  full_slots text[] := '{}';
begin
  if new.type not in ('trial', 'single') or coalesce((new.preferences ->> 'capacity_override')::boolean, false) then
    return new;
  end if;

  if new.type = 'single' and new.preferences ->> 'same_day' = 'true' then
    select value into cfg from public.site_settings where key = 'same_day';
    if cfg is null or not coalesce((cfg ->> 'enabled')::boolean, false)
       or new.start_date <> public.today_ist()
       or not public.is_operating_day(new.start_date, new.kitchen_id) then
      raise exception 'SAME_DAY_CLOSED' using errcode = 'P0001';
    end if;
    foreach sl in array new.slots loop
      if now_t >= public._same_day_until(cfg, sl) then
        raise exception 'SAME_DAY_CLOSED' using errcode = 'P0001';
      end if;
    end loop;
    foreach sl in array array(select x from unnest(new.slots) x order by x) loop
      perform pg_advisory_xact_lock(hashtextextended('sameday:' || new.kitchen_id || ':' || new.start_date || ':' || sl || ':' || new.diet, 0));
    end loop;
    for c in select * from public._same_day_counts(new.start_date, new.kitchen_id) loop
      if c.slot = any (new.slots) and c.diet = new.diet and c.used + c.held >= c.spares then
        full_slots := full_slots || c.slot::text;
      end if;
    end loop;
    if cardinality(full_slots) > 0 then
      raise exception 'SAME_DAY_FULL' using errcode = 'P0001',
        detail = jsonb_build_object('slots', to_jsonb(full_slots))::text;
    end if;
    return new;
  end if;

  foreach sl in array array(select x from unnest(new.slots) x order by x) loop
    perform pg_advisory_xact_lock(hashtextextended('slot:' || new.kitchen_id || ':' || new.start_date || ':' || sl, 0));
  end loop;
  for c in select * from public._slot_counts(new.start_date, new.start_date, new.kitchen_id) loop
    if c.slot = any (new.slots) and c.booked + c.held >= c.capacity then
      full_slots := full_slots || c.slot::text;
    end if;
  end loop;
  if cardinality(full_slots) > 0 then
    raise exception 'SLOT_FULL' using errcode = 'P0001',
      detail = jsonb_build_object('date', new.start_date, 'slots', to_jsonb(full_slots))::text;
  end if;
  return new;
end;
$$;
revoke all on function public._trial_slot_guard() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- generate_deliveries: a paid same-day order is booked for TODAY and locked
-- with today's menu straight away, when the payment arrived in time
-- (before the slot cutoff + grace_minutes). Too late → the normal path books
-- the next open day, and the order is flagged for staff.
-- Everything else is unchanged from 0013.
-- ---------------------------------------------------------------------------
create or replace function public.generate_deliveries(p_sub uuid, p_order uuid default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  d date;
  days_needed int;
  i int := 0;
  sl public.meal_slot;
  n int := 0;
  entry jsonb;
  entry_diet public.diet_type;
  new_id uuid;
  floor_d date;
  last_d date;
  cfg jsonb;
  grace interval;
  now_t time := (now() at time zone 'Asia/Kolkata')::time;
  in_time boolean;
  late boolean := false;
begin
  select * into s from public.subscriptions where id = p_sub for update;
  if s.id is null then
    raise exception 'subscription not found';
  end if;
  if exists (select 1 from public.deliveries where subscription_id = p_sub) then
    return 0;   -- idempotent
  end if;

  -- Same-day single box
  if s.preferences ->> 'same_day' = 'true' then
    select value into cfg from public.site_settings where key = 'same_day';
    grace := make_interval(mins => coalesce((cfg ->> 'grace_minutes')::int, 40));
    in_time := s.start_date = public.today_ist() and public.is_operating_day(s.start_date, s.kitchen_id);
    foreach sl in array s.slots loop
      in_time := in_time and now_t <= public._same_day_until(cfg, sl) + grace;
    end loop;
    if in_time then
      foreach sl in array s.slots loop
        new_id := public._insert_delivery(s, s.start_date, sl, false, p_order);
        update public.deliveries x
           set status = 'locked',
               menu_snapshot = public.menu_snapshot_json(x.delivery_date, x.diet, x.slot, x.kitchen_id),
               metadata = x.metadata || jsonb_build_object('same_day', true)
         where x.id = new_id;
        n := n + 1;
      end loop;
      update public.subscriptions set start_date = s.start_date, end_date = s.start_date where id = p_sub;
      return n;
    end if;
    late := true;
  end if;

  floor_d := public.earliest_bookable_date(s.kitchen_id);

  if jsonb_typeof(s.preferences -> 'schedule') = 'array' and jsonb_array_length(s.preferences -> 'schedule') > 0 then
    last_d := floor_d - 1;
    for entry in select value from jsonb_array_elements(s.preferences -> 'schedule') order by value ->> 'date'
    loop
      d := greatest((entry ->> 'date')::date, floor_d);
      entry_diet := coalesce((entry ->> 'diet')::public.diet_type, s.diet);
      -- keep the chosen date if still bookable and unused; otherwise next free day
      while not public._sub_day_ok(s, d) or d <= last_d loop
        d := public._next_sub_day(s, greatest(d, last_d));
      end loop;
      foreach sl in array s.slots loop
        new_id := public._insert_delivery(s, d, sl, false, p_order);
        if entry_diet <> s.diet then
          update public.deliveries set diet = entry_diet where id = new_id;
        end if;
        n := n + 1;
      end loop;
      last_d := d;
    end loop;
  else
    days_needed := s.meals_total / s.meals_per_day;
    d := greatest(s.start_date, floor_d);
    if not public._sub_day_ok(s, d) then
      d := public._next_sub_day(s, d);
    end if;
    while i < days_needed loop
      foreach sl in array s.slots loop
        perform public._insert_delivery(s, d, sl, false, p_order);
        n := n + 1;
      end loop;
      i := i + 1;
      if i < days_needed then
        d := public._next_sub_day(s, d);
      end if;
    end loop;
  end if;

  update public.subscriptions
     set start_date = (select min(delivery_date) from public.deliveries where subscription_id = p_sub),
         end_date   = (select max(delivery_date) from public.deliveries where subscription_id = p_sub),
         preferences = case when late then preferences || jsonb_build_object('same_day_late', true) else preferences end
   where id = p_sub;

  if late then
    update public.deliveries set metadata = metadata || jsonb_build_object('same_day_late', true)
     where subscription_id = p_sub;
    if p_order is not null then
      update public.orders set metadata = metadata || jsonb_build_object('same_day_late', true) where id = p_order;
    end if;
    perform public.log_activity(s.user_id, 'order', p_order, 'same_day_late', null,
      jsonb_build_object('wanted', s.start_date,
                         'booked', (select min(delivery_date) from public.deliveries where subscription_id = p_sub)));
  end if;
  return n;
end;
$$;
revoke execute on function public.generate_deliveries(uuid, uuid) from public, anon, authenticated;
