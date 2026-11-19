-- BroTin Box · 0055 Menu change after the 9 PM lock reaches the locked boxes
-- lock_deliveries freezes the menu onto each box (menu_snapshot) at 9 PM. The
-- cook sheet and stock read the live menu, but the customer dashboard, Day
-- plan and Revenue & profit (food_cost) read the frozen copy. So a date
-- override saved after the lock (e.g. 19 Nov lunch, changed at 11 AM) made
-- the kitchen cook one dish while customers and finance saw another.
--
-- admin › Menu now calls this after saving or removing an override: every box
-- for that date / diet / slot that already has a frozen menu is re-frozen
-- from the current menu. The finance trigger recalculates food_cost on its own.

create or replace function public.refresh_locked_menu(p_date date, p_diet public.diet_type, p_slot public.meal_slot)
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  n int;
begin
  if not public.has_permission('menu.write') then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  update public.deliveries d
     set menu_snapshot = public.menu_snapshot_json(d.delivery_date, d.diet, d.slot, d.kitchen_id)
   where d.delivery_date = p_date
     and d.diet = p_diet
     and d.slot = p_slot
     and d.menu_snapshot is not null
     and d.status not in ('cancelled', 'skipped', 'paused');
  get diagnostics n = row_count;

  if n > 0 then
    perform public.log_activity(null, 'kitchen', null, 'menu_refrozen',
      null, jsonb_build_object('date', p_date, 'diet', p_diet, 'slot', p_slot, 'meals', n));
  end if;
  return n;
end;
$$;

revoke all on function public.refresh_locked_menu(date, public.diet_type, public.meal_slot) from public, anon;
grant execute on function public.refresh_locked_menu(date, public.diet_type, public.meal_slot) to authenticated;

-- One-off: today's (19 Nov) lunch was changed to Creamy Garlic Chicken after
-- the lock. Re-freeze only today's boxes; 17 and 18 Nov also had same-day
-- overrides but are left as frozen (run refresh_locked_menu for them by hand
-- if those changes are what was really cooked).
update public.deliveries d
   set menu_snapshot = public.menu_snapshot_json(d.delivery_date, d.diet, d.slot, d.kitchen_id)
  from public.menu_overrides o
 where o.menu_date = d.delivery_date and o.diet = d.diet and o.slot = d.slot
   and d.delivery_date = '2026-11-19'
   and d.menu_snapshot is not null
   and d.status not in ('cancelled', 'skipped', 'paused');

notify pgrst, 'reload schema';
