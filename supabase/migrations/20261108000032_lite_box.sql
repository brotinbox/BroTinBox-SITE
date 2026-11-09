-- =============================================================================
-- BroTin Box · 0032 Lite box (₹199)
--
-- A smaller 3-item box: ~100 g main, ~100 g salad, half a carb portion
-- (1 roti / ~30 g dry oats). No protein side (eggs/curd), no legume.
--
--  * box_size ('regular' | 'lite') on pricing_rules and deliveries.
--  * Checkout stores subscriptions.preferences.box_size; each delivery copies it.
--  * Lite prices start 23 Nov 2026 00:00 IST (after the ₹219 trial offer ends).
--    Until then the website hides the Lite option. Change or delay them in
--    Admin › Prices per meal by adding a newer row.
--  * cook_sheet() now also returns box_size, so the kitchen sees Lite counts.
-- =============================================================================

do $$ begin
  create type public.box_size as enum ('regular', 'lite');
exception when duplicate_object then null; end $$;

alter table public.pricing_rules add column if not exists box_size public.box_size not null default 'regular';
drop index if exists public.pricing_rules_lookup_idx;
create index if not exists pricing_rules_lookup_idx on public.pricing_rules (plan_type, diet, box_size, effective_from desc);

alter table public.deliveries add column if not exists box_size public.box_size not null default 'regular';

-- Regular price only (unchanged signature, used by public reads).
create or replace function public.current_price(p_plan_type public.plan_type, p_diet public.diet_type)
returns table (price_per_meal numeric, second_meal_discount numeric)
language sql
stable
security definer
set search_path = ''
as $$
  select price_per_meal, second_meal_discount
  from public.pricing_rules
  where plan_type = p_plan_type and diet = p_diet and box_size = 'regular' and effective_from <= now()
  order by effective_from desc
  limit 1
$$;

-- Lite prices from 23 Nov 2026 00:00 IST.
insert into public.pricing_rules (plan_type, diet, box_size, price_per_meal, second_meal_discount, effective_from)
select v.plan::public.plan_type, v.diet::public.diet_type, 'lite', v.price, 10, '2026-11-23 00:00:00+05:30'
from (values
  ('trial',   'non_veg', 199), ('trial',   'veg', 179),
  ('weekly',  'non_veg', 189), ('weekly',  'veg', 169),
  ('monthly', 'non_veg', 179), ('monthly', 'veg', 159)
) v(plan, diet, price)
where not exists (
  select 1 from public.pricing_rules p
   where p.plan_type = v.plan::public.plan_type and p.diet = v.diet::public.diet_type and p.box_size = 'lite');

-- Each delivery copies the box size chosen at checkout.
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
    address_id, address_snapshot, zone_id, box_size)
  values (
    s.id, p_order, s.user_id, s.kitchen_id, d, p_slot, s.diet,
    coalesce((s.preferences ->> 'is_egg_free')::boolean, false),
    coalesce((s.preferences ->> 'skip_legume')::boolean, false),
    coalesce((s.preferences ->> 'double_main')::boolean, false),
    p_make_up,
    s.address_id, public._address_snapshot(s.address_id), addr.zone_id,
    case when s.preferences ->> 'box_size' = 'lite' then 'lite'::public.box_size else 'regular'::public.box_size end)
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
    insert into public.delivery_addons (delivery_id, addon_id, qty, unit_price, order_id)
    select new_id, a.id, 1, a.price, p_order
    from public.addons a
    where a.id in (select (jsonb_array_elements_text(s.preferences -> 'addon_ids'))::uuid)
    on conflict (delivery_id, addon_id) do nothing;
  end if;

  return new_id;
end;
$$;

-- Cook sheet: counts per slot, diet AND box size (return type changes, so drop first).
drop function if exists public.cook_sheet(date, uuid);
create function public.cook_sheet(p_date date, p_kitchen uuid default null)
returns table (
  slot public.meal_slot, diet public.diet_type, box_size public.box_size, total int,
  egg_free int, skip_legume int, double_main int, make_up int)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.has_permission('cooksheet.read') then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return query
  select d.slot, d.diet, d.box_size, count(*)::int,
         count(*) filter (where d.is_egg_free)::int,
         count(*) filter (where d.skip_legume)::int,
         count(*) filter (where d.double_main)::int,
         count(*) filter (where d.is_make_up)::int
    from public.deliveries d
   where d.delivery_date = p_date
     and d.kitchen_id = coalesce(p_kitchen, public.default_kitchen_id())
     and d.status in ('scheduled', 'locked', 'preparing', 'packed', 'out_for_delivery', 'delivered')
   group by d.slot, d.diet, d.box_size
   order by d.slot, d.diet, d.box_size;
end;
$$;
revoke execute on function public.cook_sheet(date, uuid) from public, anon;
grant execute on function public.cook_sheet(date, uuid) to authenticated;
