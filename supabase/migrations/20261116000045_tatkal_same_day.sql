-- =============================================================================
-- BroTin Box · 0045 Tatkal: staff move a paid order's first day to TODAY
--
-- Customers can only book from the next day after the 9 PM cutoff. Staff can
-- move an already-paid order's first delivery day to today from the admin
-- order page, when:
--   * today is an operating day
--   * the IST time is before that slot's tatkal cutoff
--     (site_settings.tatkal: lunch_until / dinner_until, "HH:MM")
--   * each slot has a free seat today (same counts as the Capacity page)
-- The moved meals are locked with today's menu straight away.
-- =============================================================================

insert into public.site_settings (key, value, is_public)
values ('tatkal', '{"enabled": true, "lunch_until": "10:00", "dinner_until": "18:00"}'::jsonb, false)
on conflict (key) do nothing;

create or replace function public.admin_tatkal_move_to_today(p_order uuid)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  today       date := public.today_ist();
  now_t       time := (now() at time zone 'Asia/Kolkata')::time;
  cfg         jsonb;
  first_day   date;
  sl          public.meal_slot;
  slots       public.meal_slot[];
  until_t     time;
  c           record;
  n           int;
  k           uuid;
  sub_ids     uuid[];
begin
  if not public.has_permission('orders.write') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  select value into cfg from public.site_settings where key = 'tatkal';
  if cfg is null or not coalesce((cfg ->> 'enabled')::boolean, false) then
    raise exception 'Tatkal is switched off in Settings.' using errcode = 'P0001';
  end if;
  if not public.is_operating_day(today) then
    raise exception 'The kitchen is closed today.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.orders where id = p_order and status = 'paid') then
    raise exception 'Only paid orders can be moved to today. Mark it paid first.' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.deliveries
     where order_id = p_order and delivery_date = today
       and status not in ('skipped', 'cancelled')
  ) then
    raise exception 'This order already has a meal today.' using errcode = 'P0001';
  end if;

  -- The order's first upcoming day and the slots booked on it
  select min(delivery_date) into first_day
    from public.deliveries
   where order_id = p_order and delivery_date > today and status in ('scheduled', 'locked');
  if first_day is null then
    raise exception 'No upcoming meal on this order to move.' using errcode = 'P0001';
  end if;
  select array_agg(distinct slot order by slot), min(kitchen_id::text)::uuid
    into slots, k
    from public.deliveries
   where order_id = p_order and delivery_date = first_day and status in ('scheduled', 'locked');

  -- Time window per slot
  foreach sl in array slots loop
    until_t := coalesce(nullif(cfg ->> (sl::text || '_until'), ''), case sl when 'lunch' then '10:00' else '18:00' end)::time;
    if now_t > until_t then
      raise exception 'Tatkal for % closed at % today.', sl, to_char(until_t, 'HH12:MI AM') using errcode = 'P0001';
    end if;
  end loop;

  -- Seats today (lock each slot so two staff can't take the last seat together)
  foreach sl in array slots loop
    perform pg_advisory_xact_lock(hashtextextended('slot:' || k || ':' || today || ':' || sl, 0));
  end loop;
  for c in select * from public._slot_counts(today, today, k) loop
    if c.slot = any (slots) and c.booked + c.held >= c.capacity then
      raise exception 'No seat left for % today (% of % booked). Raise today''s capacity on the Capacity page if the kitchen can take one more.',
        c.slot, c.booked + c.held, c.capacity using errcode = 'P0001';
    end if;
  end loop;

  -- Move and lock with today's menu
  with moved as (
    update public.deliveries d
       set delivery_date = today,
           status = 'locked',
           stop_no = null,
           menu_snapshot = public.menu_snapshot_json(today, d.diet, d.slot, d.kitchen_id),
           metadata = d.metadata || jsonb_build_object('tatkal', jsonb_build_object(
             'from', first_day, 'by', auth.uid(), 'at', now()))
     where d.order_id = p_order and d.delivery_date = first_day and d.status in ('scheduled', 'locked')
    returning d.subscription_id
  )
  select count(*), array_agg(distinct subscription_id) into n, sub_ids from moved;

  update public.subscriptions s
     set start_date = (select min(delivery_date) from public.deliveries where subscription_id = s.id),
         end_date   = (select max(delivery_date) from public.deliveries where subscription_id = s.id)
   where s.id = any (sub_ids);

  perform public.log_activity(auth.uid(), 'order', p_order, 'tatkal_moved',
    jsonb_build_object('date', first_day), jsonb_build_object('date', today, 'meals', n));
  return n;
end;
$$;
revoke execute on function public.admin_tatkal_move_to_today(uuid) from public, anon;
grant execute on function public.admin_tatkal_move_to_today(uuid) to authenticated;
