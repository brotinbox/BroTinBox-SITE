-- =============================================================================
-- BroTin Box · 0031 Add-ons (sides & juices) at checkout
--
-- Checkout now stores add-ons as
--   subscriptions.preferences.addons = [{ "addon_id": uuid, "qty": 1-5, "slot": "lunch"|"dinner" }, …]
-- Each add-on rides with ONE box per day (the slot it was attached to), which
-- is also what the customer is charged for (qty × delivery days).
--
-- Fixes:
--  1. 2-meal plans: add-ons were attached to BOTH lunch and dinner but charged
--     once per day. Legacy preferences.addon_ids now go on the first slot only.
--  2. Skip / pause: paid add-ons were lost (make-up meals had none). They now
--     move to the make-up meal, and back again on unskip / resume.
-- =============================================================================

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

  -- Make-up meals get their add-ons moved over from the meal they replace.
  if p_make_up then
    return new_id;
  end if;

  if jsonb_typeof(s.preferences -> 'addons') = 'array' then
    insert into public.delivery_addons (delivery_id, addon_id, qty, unit_price, order_id)
    select new_id, a.id, least(greatest(coalesce((e ->> 'qty')::int, 1), 1), 10), a.price, p_order
    from jsonb_array_elements(s.preferences -> 'addons') e
    join public.addons a on a.id = (e ->> 'addon_id')::uuid
    where coalesce(e ->> 'slot', s.slots[1]::text) = p_slot::text
    on conflict (delivery_id, addon_id) do nothing;
  elsif s.preferences ? 'addon_ids' and p_slot = s.slots[1] then
    -- Legacy shape: one of each, first slot of the day only.
    insert into public.delivery_addons (delivery_id, addon_id, qty, unit_price, order_id)
    select new_id, a.id, 1, a.price, p_order
    from public.addons a
    where a.id in (select (jsonb_array_elements_text(s.preferences -> 'addon_ids'))::uuid)
    on conflict (delivery_id, addon_id) do nothing;
  end if;

  return new_id;
end;
$$;

-- Move a delivery's add-ons onto another delivery (skip/pause → make-up and back).
create or replace function public._move_delivery_addons(p_from uuid, p_to uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_from = p_to then
    return;
  end if;
  -- Same add-on already on the target: add the quantities together.
  update public.delivery_addons t
     set qty = least(t.qty + f.qty, 10)
    from public.delivery_addons f
   where f.delivery_id = p_from and t.delivery_id = p_to and t.addon_id = f.addon_id;
  delete from public.delivery_addons f
   where f.delivery_id = p_from
     and exists (select 1 from public.delivery_addons t where t.delivery_id = p_to and t.addon_id = f.addon_id);
  update public.delivery_addons set delivery_id = p_to where delivery_id = p_from;
end;
$$;

-- The make-up delivery _remove_make_up() would delete (same selection).
create or replace function public._make_up_to_remove(p_sub uuid, p_slot public.meal_slot)
returns uuid
language sql
stable
security definer
set search_path = ''
as $$
  select id from public.deliveries
   where subscription_id = p_sub and slot = p_slot and is_make_up
     and status = 'scheduled' and public.is_before_cutoff(delivery_date)
   order by delivery_date desc
   limit 1
$$;

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
  make_up_id uuid;
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
  -- The make-up meal keeps the diet of the meal it replaces (mixed plans) …
  update public.deliveries set diet = dl.diet
   where subscription_id = s.id and delivery_date = make_up and slot = dl.slot and is_make_up
   returning id into make_up_id;
  -- … and its paid add-ons.
  perform public._move_delivery_addons(dl.id, make_up_id);

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
  -- Bring the add-ons back before the make-up meal is deleted.
  perform public._move_delivery_addons(public._make_up_to_remove(s.id, dl.slot), dl.id);
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
  made date;
  made_id uuid;
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
    select id, slot, diet from public.deliveries
     where subscription_id = p_sub and status = 'scheduled'
       and delivery_date between p_from and p_until
     order by delivery_date, slot
  loop
    update public.deliveries set status = 'paused' where id = rec.id;
    made := public._append_make_up(p_sub, rec.slot);
    made_id := null;
    update public.deliveries set diet = rec.diet
     where subscription_id = p_sub and delivery_date = made and slot = rec.slot and is_make_up
     returning id into made_id;
    perform public._move_delivery_addons(rec.id, made_id);
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

  -- Restore still-editable paused meals and pull back the matching make-ups
  -- (with their add-ons).
  for rec in
    select id, slot from public.deliveries
     where subscription_id = p_sub and status = 'paused'
       and public.is_before_cutoff(delivery_date)
     order by delivery_date desc
  loop
    perform public._move_delivery_addons(public._make_up_to_remove(p_sub, rec.slot), rec.id);
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

-- Internal helpers: not callable from the browser.
revoke all on function public._move_delivery_addons(uuid, uuid) from public, anon, authenticated;
revoke all on function public._make_up_to_remove(uuid, public.meal_slot) from public, anon, authenticated;
