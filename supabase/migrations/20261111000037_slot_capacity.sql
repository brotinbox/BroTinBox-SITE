-- =============================================================================
-- BroTin Box · 0037 Slot capacity (lunch / dinner seats per day)
--
-- Each lunch or dinner box on a date takes one seat. Default 10 lunch +
-- 10 dinner; staff can change the default or one date (Capacity page).
--
-- Only the TRIAL box is limited (decided 2026-11-11). Weekly and monthly
-- plans are never refused: they still count towards the total, so they can
-- push a slot over capacity (shown red in admin) and close it for trials.
--
-- Unpaid trial orders hold their seat for 15 minutes.
-- Staff-entered orders skip the check (preferences.capacity_override).
-- =============================================================================

create table public.slot_capacity (
  id             uuid primary key default gen_random_uuid(),
  kitchen_id     uuid not null default public.default_kitchen_id() references public.kitchens (id),
  slot           public.meal_slot not null,
  capacity_date  date,                       -- null = the everyday default
  capacity       int not null check (capacity between 0 and 500),
  updated_by     uuid references public.profiles (id) on delete set null,
  updated_at     timestamptz not null default now(),
  constraint slot_capacity_unique unique nulls not distinct (kitchen_id, slot, capacity_date)
);
create index slot_capacity_updated_by_idx on public.slot_capacity (updated_by);

alter table public.slot_capacity enable row level security;
create policy slot_capacity_staff_read on public.slot_capacity
  for select using (public.has_permission('deliveries.read'));
-- Writes go through set_slot_capacity().

insert into public.slot_capacity (slot, capacity_date, capacity) values
  ('lunch', null, 10), ('dinner', null, 10);

-- ---------------------------------------------------------------------------
-- Capacity for one date + slot: that date's row, else the default, else 10.
-- ---------------------------------------------------------------------------
create or replace function public._slot_capacity(p_kitchen uuid, p_date date, p_slot public.meal_slot)
returns int
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select capacity from public.slot_capacity where kitchen_id = p_kitchen and slot = p_slot and capacity_date = p_date),
    (select capacity from public.slot_capacity where kitchen_id = p_kitchen and slot = p_slot and capacity_date is null),
    10)
$$;

-- ---------------------------------------------------------------------------
-- Seats per date + slot. booked = boxes the kitchen will cook (same statuses
-- as the cook sheet); held = unpaid trial orders from the last 15 minutes.
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
     where o.type = 'trial'
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
revoke all on function public._slot_capacity(uuid, date, public.meal_slot) from public, anon, authenticated;
revoke all on function public._slot_counts(date, date, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Staff (deliveries.read) and the server (service_role). Max 62 days.
-- ---------------------------------------------------------------------------
create or replace function public.slot_availability(p_from date, p_to date, p_kitchen uuid default null)
returns table (day date, slot public.meal_slot, capacity int, booked int, held int, seats_left int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if auth.uid() is not null and not public.has_permission('deliveries.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_to < p_from or p_to - p_from > 62 then
    raise exception 'pick a range of up to 62 days' using errcode = 'P0001';
  end if;
  return query
  select c.day, c.slot, c.capacity, c.booked, c.held, greatest(c.capacity - c.booked - c.held, 0)
    from public._slot_counts(p_from, p_to, coalesce(p_kitchen, public.default_kitchen_id())) c;
end;
$$;
revoke execute on function public.slot_availability(date, date, uuid) from public, anon;
grant execute on function public.slot_availability(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Change the default (p_date null) or one date. p_capacity null on a date
-- removes that date's change (back to the default).
-- ---------------------------------------------------------------------------
create or replace function public.set_slot_capacity(p_slot public.meal_slot, p_date date, p_capacity int)
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
  if p_capacity is null then
    if p_date is null then
      raise exception 'the default needs a number' using errcode = 'P0001';
    end if;
    delete from public.slot_capacity where kitchen_id = k and slot = p_slot and capacity_date = p_date;
  else
    if p_capacity < 0 or p_capacity > 500 then
      raise exception 'capacity must be between 0 and 500' using errcode = 'P0001';
    end if;
    insert into public.slot_capacity (kitchen_id, slot, capacity_date, capacity, updated_by, updated_at)
    values (k, p_slot, p_date, p_capacity, auth.uid(), now())
    on conflict on constraint slot_capacity_unique
    do update set capacity = excluded.capacity, updated_by = excluded.updated_by, updated_at = now();
  end if;
  perform public.log_activity(auth.uid(), 'slot_capacity', null, 'updated', null,
    jsonb_build_object('slot', p_slot, 'date', p_date, 'capacity', p_capacity));
end;
$$;
revoke execute on function public.set_slot_capacity(public.meal_slot, date, int) from public, anon;
grant execute on function public.set_slot_capacity(public.meal_slot, date, int) to authenticated;

-- ---------------------------------------------------------------------------
-- Guard: a new trial subscription needs a free seat in each of its slots.
-- Runs inside create_checkout_order, so the per-slot lock is held until the
-- order commits (two customers can't take the last seat together).
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
  full_slots text[] := '{}';
begin
  if new.type <> 'trial' or coalesce((new.preferences ->> 'capacity_override')::boolean, false) then
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

create trigger subscriptions_trial_slot_guard
  before insert on public.subscriptions
  for each row execute function public._trial_slot_guard();
