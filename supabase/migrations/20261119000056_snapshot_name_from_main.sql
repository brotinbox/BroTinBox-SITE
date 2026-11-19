-- BroTin Box · 0056 Box label follows the dish actually served
-- menu_snapshot.name came from the 30-day rotation's label ("Day 4: Smashed
-- Chicken Bowl Box"), so a date override or a dish swap changed the dishes but
-- not the label, and Revenue & profit (grouped by that label) showed the old
-- dish. Build the label from the resolved main instead.

create or replace function public.menu_snapshot_json(p_date date, p_diet public.diet_type, p_slot public.meal_slot, p_kitchen uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'day_number', m.day_number,
    'name', coalesce('Day ' || m.day_number || ': ' || (select mi.name from public.menu_items mi where mi.id = m.main_id) || ' Box', m.name),
    'is_override', m.is_override,
    'items', (select jsonb_agg(to_jsonb(mi) - 'metadata' - 'created_at' - 'updated_at' order by mi.category)
                from public.menu_items mi
               where mi.id in (m.main_id, m.protein_side_id, m.salad_id, m.legume_id, m.carb_id)))
  from public.get_menu_for_date(p_date, p_diet, p_slot, p_kitchen) m
$$;

-- Fix the label on boxes whose frozen dishes don't match it (19 Nov lunch).
with fixed as (
  select d.id, 'Day ' || (d.menu_snapshot->>'day_number') || ': ' || (x->>'name') || ' Box' as label
    from public.deliveries d
    cross join lateral jsonb_array_elements(d.menu_snapshot->'items') x
   where d.delivery_date >= '2026-11-16'
     and x->>'category' = 'main'
)
update public.deliveries d
   set menu_snapshot = jsonb_set(d.menu_snapshot, '{name}', to_jsonb(f.label))
  from fixed f
 where f.id = d.id
   and d.menu_snapshot->>'name' is distinct from f.label;
