-- =============================================================================
-- BroTin Box · 0015 Make-up meals keep the diet of the meal they replace
-- (found in end-to-end testing: skipping a veg day on a mixed plan created a
-- non-veg make-up meal).
-- =============================================================================

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
  -- The make-up meal keeps the diet of the meal it replaces (mixed plans).
  update public.deliveries set diet = dl.diet
   where subscription_id = s.id and delivery_date = make_up and slot = dl.slot and is_make_up;

  perform public.log_activity(s.user_id, 'delivery', dl.id, 'skip',
    jsonb_build_object('date', dl.delivery_date, 'slot', dl.slot),
    jsonb_build_object('make_up_date', make_up));
  return jsonb_build_object('skipped', dl.delivery_date, 'make_up_date', make_up);
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
    update public.deliveries set diet = rec.diet
     where subscription_id = p_sub and delivery_date = made and slot = rec.slot and is_make_up;
    n := n + 1;
  end loop;

  perform public.log_activity(s.user_id, 'subscription', s.id, 'pause', null,
    jsonb_build_object('from', p_from, 'until', p_until, 'meals_moved', n));
  return jsonb_build_object('paused_meals', n, 'from', p_from, 'until', p_until);
end;
$$;
