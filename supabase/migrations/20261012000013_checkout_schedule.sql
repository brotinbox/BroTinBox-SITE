-- =============================================================================
-- BroTin Box · 0013 Exact delivery schedule from checkout
-- Weekly/monthly checkouts let customers skip specific dates and mix veg /
-- non-veg days. The server stores the chosen dates in
-- subscriptions.preferences.schedule = [{ "date": "YYYY-MM-DD", "diet": "veg"|"non_veg" }, …]
-- and generate_deliveries() uses it when present. Dates that have since
-- become unbookable (cutoff passed, closure) are moved to the next free day.
-- =============================================================================

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
begin
  select * into s from public.subscriptions where id = p_sub for update;
  if s.id is null then
    raise exception 'subscription not found';
  end if;
  if exists (select 1 from public.deliveries where subscription_id = p_sub) then
    return 0;   -- idempotent
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
         end_date   = (select max(delivery_date) from public.deliveries where subscription_id = p_sub)
   where id = p_sub;
  return n;
end;
$$;
