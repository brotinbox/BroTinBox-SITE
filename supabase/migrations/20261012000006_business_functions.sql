-- =============================================================================
-- BroTin Box · 0006 Business rules
--
-- All state changes to subscriptions/deliveries/orders go through these
-- functions. They enforce ownership, the 9 PM IST cutoff and meal-credit
-- rules, and write activity_log + domain_events.
--
-- Meal-credit rule (confirmed 2026-10-12): a skipped or paused meal is not
-- cooked; a make-up delivery is appended after the current last delivery,
-- extending end_date. No automatic refunds.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Internal helpers
-- ---------------------------------------------------------------------------
create or replace function public._sub_day_ok(s public.subscriptions, d date)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select public.is_operating_day(d, s.kitchen_id)
     and not (extract(isodow from d)::smallint = any (s.excluded_weekdays))
$$;

create or replace function public._next_sub_day(s public.subscriptions, after_date date)
returns date
language plpgsql
stable
security definer
set search_path = ''
as $$
declare d date := after_date + 1;
begin
  while not public._sub_day_ok(s, d) loop
    d := d + 1;
  end loop;
  return d;
end;
$$;

create or replace function public._can_manage_subscription(s public.subscriptions)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (s.user_id = auth.uid() and not exists (
            select 1 from public.profiles p where p.id = auth.uid() and p.is_blocked))
      or public.has_permission('subscriptions.write')
$$;

create or replace function public._address_snapshot(p_address uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(a) - 'created_at' - 'updated_at' from public.addresses a where a.id = p_address
$$;

-- Insert one delivery row for a subscription (copies preferences + address).
create or replace function public._insert_delivery(
  s public.subscriptions, d date, p_slot public.meal_slot, p_make_up boolean, p_order uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id uuid;
  addr public.addresses;
begin
  select * into addr from public.addresses where id = s.address_id;

  insert into public.deliveries (
    subscription_id, order_id, user_id, kitchen_id, delivery_date, slot, diet,
    is_egg_free, skip_legume, double_main, is_make_up,
    address_id, address_snapshot, zone_id)
  values (
    s.id, p_order, s.user_id, s.kitchen_id, d, p_slot, s.diet,
    coalesce((s.preferences ->> 'is_egg_free')::boolean, false),
    coalesce((s.preferences ->> 'skip_legume')::boolean, false),
    coalesce((s.preferences ->> 'double_main')::boolean, false),
    p_make_up,
    s.address_id, public._address_snapshot(s.address_id), addr.zone_id)
  returning id into new_id;

  -- Default add-ons chosen at checkout (paid for by the same order)
  insert into public.delivery_addons (delivery_id, addon_id, qty, unit_price, order_id)
  select new_id, a.id, 1, a.price, p_order
  from public.addons a
  where s.preferences ? 'addon_ids'
    and a.id in (select (jsonb_array_elements_text(s.preferences -> 'addon_ids'))::uuid)
    and not p_make_up;

  return new_id;
end;
$$;

-- Append one make-up delivery for a slot at the tail of the subscription.
create or replace function public._append_make_up(p_sub uuid, p_slot public.meal_slot)
returns date
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  d date;
  floor_d date;
begin
  select * into s from public.subscriptions where id = p_sub for update;

  -- Never earlier than the next bookable day, and never inside an active pause.
  floor_d := greatest(public.earliest_bookable_date(s.kitchen_id) - 1,
                      coalesce(s.paused_until, '-infinity'::date));

  select max(delivery_date) into d
    from public.deliveries
   where subscription_id = p_sub and status <> 'cancelled';

  if d is null or d <= floor_d then
    d := public._next_sub_day(s, floor_d);
  elsif not public._sub_day_ok(s, d) then
    d := public._next_sub_day(s, d);
  end if;
  while exists (select 1 from public.deliveries
                 where subscription_id = p_sub and delivery_date = d and slot = p_slot) loop
    d := public._next_sub_day(s, d);
  end loop;

  perform public._insert_delivery(s, d, p_slot, true, null);

  update public.subscriptions
     set meal_credits_issued = meal_credits_issued + 1,
         end_date = greatest(coalesce(end_date, d), d)
   where id = p_sub;
  return d;
end;
$$;

-- Remove the latest still-editable make-up delivery for a slot (undo a credit).
create or replace function public._remove_make_up(p_sub uuid, p_slot public.meal_slot)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  target uuid;
begin
  select id into target from public.deliveries
   where subscription_id = p_sub and slot = p_slot and is_make_up
     and status = 'scheduled' and public.is_before_cutoff(delivery_date)
   order by delivery_date desc
   limit 1;

  if target is null then
    return false;
  end if;

  delete from public.deliveries where id = target;
  update public.subscriptions s
     set meal_credits_issued = greatest(meal_credits_issued - 1, 0),
         end_date = (select max(delivery_date) from public.deliveries d
                      where d.subscription_id = p_sub and d.status <> 'cancelled')
   where s.id = p_sub;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- Generate deliveries after payment (service_role only)
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
begin
  select * into s from public.subscriptions where id = p_sub for update;
  if s.id is null then
    raise exception 'subscription not found';
  end if;
  if exists (select 1 from public.deliveries where subscription_id = p_sub) then
    return 0;   -- idempotent
  end if;

  days_needed := s.meals_total / s.meals_per_day;
  d := greatest(s.start_date, public.earliest_bookable_date(s.kitchen_id));
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

  update public.subscriptions
     set start_date = (select min(delivery_date) from public.deliveries where subscription_id = p_sub),
         end_date = d
   where id = p_sub;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Payment outcome (called by the Cashfree webhook AND the return-URL check;
-- idempotent, whichever arrives first wins). service_role only.
-- ---------------------------------------------------------------------------
create or replace function public.mark_order_paid(
  p_order uuid, p_cf_payment_id text, p_amount numeric, p_method text, p_raw jsonb default '{}')
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
  on conflict (cf_payment_id) do nothing;

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
    end if;
  end if;

  perform public.log_activity(o.user_id, 'order', o.id, 'paid', null,
    jsonb_build_object('order_number', o.order_number, 'total', o.total, 'method', p_method));
  return o;
end;
$$;

create or replace function public.mark_order_failed(p_order uuid, p_reason text, p_raw jsonb default '{}')
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_order for update;
  if o.status in ('created', 'pending_payment') then
    update public.orders set status = 'failed', metadata = metadata || jsonb_build_object('failure', p_reason)
     where id = p_order;
    insert into public.payments (order_id, amount, status, failure_reason, raw)
    values (p_order, o.total, 'failed', p_reason, p_raw);
    perform public.log_activity(o.user_id, 'order', o.id, 'payment_failed', null, jsonb_build_object('reason', p_reason));
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Customer (or support/admin) actions
-- ---------------------------------------------------------------------------
create or replace function public.skip_delivery(p_delivery uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dl public.deliveries;
  s  public.subscriptions;
  make_up date;
begin
  select * into dl from public.deliveries where id = p_delivery for update;
  if dl.id is null then raise exception 'delivery not found'; end if;
  select * into s from public.subscriptions where id = dl.subscription_id;

  if not public._can_manage_subscription(s) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if s.status not in ('active', 'paused') then
    raise exception 'subscription is %', s.status;
  end if;
  if dl.status <> 'scheduled' then
    raise exception 'delivery is %, cannot skip', dl.status;
  end if;
  if not public.is_before_cutoff(dl.delivery_date) and not public.is_admin() then
    raise exception 'cutoff passed for %', dl.delivery_date using errcode = 'P0001';
  end if;

  update public.deliveries set status = 'skipped' where id = p_delivery;
  update public.subscriptions set meals_skipped = meals_skipped + 1 where id = s.id;
  make_up := public._append_make_up(s.id, dl.slot);

  perform public.log_activity(s.user_id, 'delivery', dl.id, 'skip',
    jsonb_build_object('date', dl.delivery_date, 'slot', dl.slot),
    jsonb_build_object('make_up_date', make_up));
  return jsonb_build_object('skipped', dl.delivery_date, 'make_up_date', make_up);
end;
$$;

create or replace function public.unskip_delivery(p_delivery uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  dl public.deliveries;
  s  public.subscriptions;
begin
  select * into dl from public.deliveries where id = p_delivery for update;
  if dl.id is null then raise exception 'delivery not found'; end if;
  select * into s from public.subscriptions where id = dl.subscription_id;

  if not public._can_manage_subscription(s) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if dl.status <> 'skipped' then
    raise exception 'delivery is not skipped';
  end if;
  if not public.is_before_cutoff(dl.delivery_date) then
    raise exception 'cutoff passed for %', dl.delivery_date using errcode = 'P0001';
  end if;
  if not public._remove_make_up(s.id, dl.slot) then
    raise exception 'make-up meal already locked; contact support';
  end if;

  update public.deliveries set status = 'scheduled' where id = p_delivery;
  update public.subscriptions set meals_skipped = greatest(meals_skipped - 1, 0) where id = s.id;

  perform public.log_activity(s.user_id, 'delivery', dl.id, 'unskip', null,
    jsonb_build_object('date', dl.delivery_date, 'slot', dl.slot));
  return jsonb_build_object('restored', dl.delivery_date);
end;
$$;

-- Free customisations only. Paid changes (double main, extra add-ons) go
-- through a server-priced top-up order.
create or replace function public.customise_delivery(
  p_delivery uuid, p_is_egg_free boolean default null, p_skip_legume boolean default null)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  dl public.deliveries;
  s  public.subscriptions;
  before_state jsonb;
begin
  select * into dl from public.deliveries where id = p_delivery for update;
  if dl.id is null then raise exception 'delivery not found'; end if;
  select * into s from public.subscriptions where id = dl.subscription_id;

  if not public._can_manage_subscription(s) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if dl.status <> 'scheduled' or not public.is_before_cutoff(dl.delivery_date) then
    raise exception 'delivery can no longer be changed' using errcode = 'P0001';
  end if;

  before_state := jsonb_build_object('is_egg_free', dl.is_egg_free, 'skip_legume', dl.skip_legume);
  update public.deliveries
     set is_egg_free = coalesce(p_is_egg_free, is_egg_free),
         skip_legume = coalesce(p_skip_legume, skip_legume)
   where id = p_delivery
  returning * into dl;

  perform public.log_activity(s.user_id, 'delivery', dl.id, 'customise', before_state,
    jsonb_build_object('is_egg_free', dl.is_egg_free, 'skip_legume', dl.skip_legume));
  return dl;
end;
$$;

create or replace function public.pause_subscription(p_sub uuid, p_from date, p_until date)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  rec record;
  n int := 0;
  max_days int := coalesce((public.get_setting('max_pause_days') #>> '{}')::int, 30);
begin
  select * into s from public.subscriptions where id = p_sub for update;
  if s.id is null then raise exception 'subscription not found'; end if;
  if not public._can_manage_subscription(s) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if s.status <> 'active' then
    raise exception 'only active subscriptions can be paused (is %)', s.status;
  end if;
  if p_until < p_from or (p_until - p_from) + 1 > max_days then
    raise exception 'pause must be 1–% days', max_days;
  end if;
  if not public.is_before_cutoff(p_from) and not public.is_admin() then
    raise exception 'pause must start on or after %', public.earliest_bookable_date(s.kitchen_id) using errcode = 'P0001';
  end if;

  -- Set the window first so make-ups are appended after it.
  update public.subscriptions
     set status = 'paused', paused_from = p_from, paused_until = p_until
   where id = p_sub;

  for rec in
    select id, slot from public.deliveries
     where subscription_id = p_sub and status = 'scheduled'
       and delivery_date between p_from and p_until
     order by delivery_date, slot
  loop
    update public.deliveries set status = 'paused' where id = rec.id;
    perform public._append_make_up(p_sub, rec.slot);
    n := n + 1;
  end loop;

  perform public.log_activity(s.user_id, 'subscription', s.id, 'pause', null,
    jsonb_build_object('from', p_from, 'until', p_until, 'meals_moved', n));
  return jsonb_build_object('paused_meals', n, 'from', p_from, 'until', p_until);
end;
$$;

create or replace function public.resume_subscription(p_sub uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  rec record;
  n int := 0;
begin
  select * into s from public.subscriptions where id = p_sub for update;
  if s.id is null then raise exception 'subscription not found'; end if;
  if not public._can_manage_subscription(s) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if s.status <> 'paused' then
    raise exception 'subscription is not paused';
  end if;

  -- Restore still-editable paused meals and pull back the matching make-ups.
  for rec in
    select id, slot from public.deliveries
     where subscription_id = p_sub and status = 'paused'
       and public.is_before_cutoff(delivery_date)
     order by delivery_date desc
  loop
    if public._remove_make_up(p_sub, rec.slot) then
      update public.deliveries set status = 'scheduled' where id = rec.id;
      n := n + 1;
    end if;
  end loop;

  update public.subscriptions
     set status = 'active', paused_from = null, paused_until = null
   where id = p_sub;

  perform public.log_activity(s.user_id, 'subscription', s.id, 'resume', null,
    jsonb_build_object('meals_restored', n));
  return jsonb_build_object('meals_restored', n);
end;
$$;

create or replace function public.cancel_subscription(p_sub uuid, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  n int;
begin
  select * into s from public.subscriptions where id = p_sub for update;
  if s.id is null then raise exception 'subscription not found'; end if;
  if not public._can_manage_subscription(s) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if s.status in ('cancelled', 'completed', 'expired') then
    raise exception 'subscription already %', s.status;
  end if;

  update public.deliveries
     set status = 'cancelled'
   where subscription_id = p_sub
     and status in ('scheduled', 'paused')
     and public.is_before_cutoff(delivery_date);
  get diagnostics n = row_count;

  update public.subscriptions
     set status = 'cancelled', cancelled_at = now(), cancel_reason = left(p_reason, 500)
   where id = p_sub;

  perform public.log_activity(s.user_id, 'subscription', s.id, 'cancel', null,
    jsonb_build_object('reason', p_reason, 'meals_cancelled', n));
  return jsonb_build_object('meals_cancelled', n);
end;
$$;

-- ---------------------------------------------------------------------------
-- Staff actions
-- ---------------------------------------------------------------------------
create or replace function public.admin_add_meal_credit(p_sub uuid, p_count int, p_slot public.meal_slot, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  s public.subscriptions;
  i int;
begin
  if not public.has_permission('subscriptions.write') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_count not between 1 and 30 then
    raise exception 'count must be 1–30';
  end if;
  select * into s from public.subscriptions where id = p_sub;
  for i in 1..p_count loop
    perform public._append_make_up(p_sub, p_slot);
  end loop;
  perform public.log_activity(s.user_id, 'subscription', p_sub, 'credit_added', null,
    jsonb_build_object('count', p_count, 'slot', p_slot, 'reason', p_reason));
  return jsonb_build_object('added', p_count);
end;
$$;

create or replace function public.update_delivery_status(
  p_delivery uuid, p_status public.delivery_status, p_reason text default null)
returns public.deliveries
language plpgsql
security definer
set search_path = ''
as $$
declare
  dl public.deliveries;
  old_status public.delivery_status;
begin
  select * into dl from public.deliveries where id = p_delivery for update;
  if dl.id is null then raise exception 'delivery not found'; end if;

  if not (public.has_permission('deliveries.write')
          or (dl.rider_id = auth.uid() and public.has_permission('deliveries.update_assigned')
              and p_status in ('out_for_delivery', 'delivered', 'failed'))) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_status in ('skipped', 'paused', 'scheduled', 'cancelled') then
    raise exception 'use the customer/subscription functions for %', p_status;
  end if;

  old_status := dl.status;
  update public.deliveries
     set status = p_status,
         delivered_at = case when p_status = 'delivered' then now() else delivered_at end,
         failure_reason = case when p_status = 'failed' then p_reason else failure_reason end
   where id = p_delivery
  returning * into dl;

  if p_status = 'delivered' and old_status <> 'delivered' then
    update public.subscriptions set meals_delivered = meals_delivered + 1 where id = dl.subscription_id;
  end if;

  perform public.log_activity(dl.user_id, 'delivery', dl.id, 'status_' || p_status::text,
    jsonb_build_object('status', old_status), jsonb_build_object('status', p_status, 'reason', p_reason));
  return dl;
end;
$$;

create or replace function public.assign_rider(p_delivery_ids uuid[], p_rider uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare n int;
begin
  if not public.has_permission('deliveries.write') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  if p_rider is not null and not exists (select 1 from public.profiles where id = p_rider and role = 'rider') then
    raise exception 'user is not a rider';
  end if;
  update public.deliveries set rider_id = p_rider where id = any (p_delivery_ids);
  get diagnostics n = row_count;
  return n;
end;
$$;

-- ---------------------------------------------------------------------------
-- Jobs (service_role / pg_cron only)
-- ---------------------------------------------------------------------------

-- Full dish details for a resolved menu, frozen onto deliveries at lock time.
create or replace function public.menu_snapshot_json(p_date date, p_diet public.diet_type, p_slot public.meal_slot, p_kitchen uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'day_number', m.day_number, 'name', m.name, 'is_override', m.is_override,
    'items', (select jsonb_agg(to_jsonb(mi) - 'metadata' - 'created_at' - 'updated_at' order by mi.category)
                from public.menu_items mi
               where mi.id in (m.main_id, m.protein_side_id, m.salad_id, m.legume_id, m.carb_id)))
  from public.get_menu_for_date(p_date, p_diet, p_slot, p_kitchen) m
$$;

-- 21:00 IST: lock tomorrow (next operating day) so the cook sheet is final.
create or replace function public.lock_deliveries(p_date date default null)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  target date := coalesce(p_date, public.next_operating_day(public.today_ist()));
  n int;
begin
  update public.deliveries d
     set status = 'locked',
         menu_snapshot = public.menu_snapshot_json(d.delivery_date, d.diet, d.slot, d.kitchen_id)
   where d.delivery_date = target and d.status = 'scheduled';
  get diagnostics n = row_count;

  perform public.log_activity(null, 'kitchen', null, 'locked',
    null, jsonb_build_object('date', target, 'meals', n));
  return n;
end;
$$;

-- Daily housekeeping: auto-resume finished pauses, complete finished subs,
-- expire unpaid orders.
create or replace function public.daily_housekeeping()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  resumed int; completed int; expired int;
begin
  update public.subscriptions
     set status = 'active', paused_from = null, paused_until = null
   where status = 'paused' and paused_until < public.today_ist();
  get diagnostics resumed = row_count;

  update public.subscriptions s
     set status = 'completed'
   where s.status = 'active'
     and not exists (select 1 from public.deliveries d
                      where d.subscription_id = s.id
                        and d.status in ('scheduled', 'paused', 'locked', 'preparing', 'packed', 'out_for_delivery'));
  get diagnostics completed = row_count;

  update public.orders
     set status = 'cancelled'
   where status in ('created', 'pending_payment') and expires_at < now();
  get diagnostics expired = row_count;

  update public.subscriptions s
     set status = 'expired'
   where s.status = 'pending_payment'
     and not exists (select 1 from public.orders o
                      where o.subscription_id = s.id and o.status in ('created', 'pending_payment', 'paid'));

  return jsonb_build_object('resumed', resumed, 'completed', completed, 'orders_expired', expired);
end;
$$;

-- ---------------------------------------------------------------------------
-- Execute grants. Supabase grants EXECUTE to anon/authenticated by default,
-- so lock everything down, then open only what each audience needs.
-- ---------------------------------------------------------------------------
revoke execute on all functions in schema public from public, anon, authenticated;

-- Needed by RLS policies / public reads
grant execute on function
  public.user_role(), public.is_admin(), public.is_staff(), public.has_permission(text),
  public.default_kitchen_id(), public.get_setting(text), public.is_feature_enabled(text),
  public.now_ist(), public.today_ist(),
  public.is_operating_day(date, uuid), public.next_operating_day(date, uuid),
  public.rotation_day_number(date), public.cutoff_for(date), public.is_before_cutoff(date),
  public.earliest_bookable_date(uuid), public.get_menu_for_date(date, public.diet_type, public.meal_slot, uuid),
  public.current_price(public.plan_type, public.diet_type), public.increment_blog_view(text)
to anon, authenticated;

-- Customer + staff actions (each checks ownership/permission itself)
grant execute on function
  public.skip_delivery(uuid), public.unskip_delivery(uuid),
  public.customise_delivery(uuid, boolean, boolean),
  public.pause_subscription(uuid, date, date), public.resume_subscription(uuid),
  public.cancel_subscription(uuid, text),
  public.admin_add_meal_credit(uuid, int, public.meal_slot, text),
  public.update_delivery_status(uuid, public.delivery_status, text),
  public.assign_rider(uuid[], uuid)
to authenticated;

-- Everything else (mark_order_paid, generate_deliveries, lock_deliveries,
-- daily_housekeeping, log_activity, _* helpers) stays service_role only.
-- Trigger functions run regardless of EXECUTE grants.

-- Future functions: don't auto-grant. PUBLIC's EXECUTE is a global default,
-- so it must be revoked without IN SCHEMA; Supabase's anon/authenticated
-- grants are per-schema defaults.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from anon, authenticated;
