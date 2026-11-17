-- Rotation swaps: "from date X, serve dish B wherever the 30-day menu has dish A".
--
-- Resolution order for a (date, diet, slot):
--   1. menu_rotation (the 30-day template, never edited by swaps)
--   2. menu_swaps with effective_from <= date, oldest first (so A→B then B→C chains)
--   3. menu_overrides for that exact date (one-off changes always win)
--
-- Deliveries are frozen at 21:00 the day before (menu_snapshot_json), so a swap
-- never changes a meal that is already locked.

create table public.menu_swaps (
  id              uuid primary key default gen_random_uuid(),
  kitchen_id      uuid not null references public.kitchens (id) default public.default_kitchen_id(),
  effective_from  date not null,
  old_item_id     uuid not null references public.menu_items (id),
  new_item_id     uuid not null references public.menu_items (id),
  diet            public.diet_type,   -- null = both diets
  slot            public.meal_slot,   -- null = lunch and dinner
  note            text,
  created_by      uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at      timestamptz not null default now(),
  check (old_item_id <> new_item_id)
);
create index menu_swaps_kitchen_from_idx on public.menu_swaps (kitchen_id, effective_from);
create index menu_swaps_old_item_id_idx on public.menu_swaps (old_item_id);
create index menu_swaps_new_item_id_idx on public.menu_swaps (new_item_id);
create index menu_swaps_created_by_idx on public.menu_swaps (created_by);

alter table public.menu_swaps enable row level security;
create policy "swaps: public reads" on public.menu_swaps for select using (true);
create policy "swaps: menu writers" on public.menu_swaps
  for all using (public.has_permission('menu.write')) with check (public.has_permission('menu.write'));

-- Same signature as before; now applies swaps between rotation and override.
create or replace function public.get_menu_for_date(
  p_date date, p_diet public.diet_type, p_slot public.meal_slot, p_kitchen uuid default null)
returns table (
  menu_date date, day_number smallint, is_closed boolean, name text,
  main_id uuid, protein_side_id uuid, salad_id uuid, legume_id uuid, carb_id uuid, is_override boolean)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  k uuid := coalesce(p_kitchen, public.default_kitchen_id());
  r public.menu_rotation;
  o public.menu_overrides;
  s public.menu_swaps;
begin
  if not public.is_operating_day(p_date, k) then
    return query select p_date, null::smallint, true, null::text, null::uuid, null::uuid, null::uuid, null::uuid, null::uuid, false;
    return;
  end if;

  select * into r from public.menu_rotation mr
   where mr.kitchen_id = k and mr.day_number = public.rotation_day_number(p_date)
     and mr.diet = p_diet and mr.slot = p_slot;

  for s in
    select * from public.menu_swaps ms
     where ms.kitchen_id = k and ms.effective_from <= p_date
       and (ms.diet is null or ms.diet = p_diet)
       and (ms.slot is null or ms.slot = p_slot)
     order by ms.effective_from, ms.created_at
  loop
    if r.main_id = s.old_item_id then r.main_id := s.new_item_id; end if;
    if r.protein_side_id = s.old_item_id then r.protein_side_id := s.new_item_id; end if;
    if r.salad_id = s.old_item_id then r.salad_id := s.new_item_id; end if;
    if r.legume_id = s.old_item_id then r.legume_id := s.new_item_id; end if;
    if r.carb_id = s.old_item_id then r.carb_id := s.new_item_id; end if;
  end loop;

  select * into o from public.menu_overrides mo
   where mo.kitchen_id = k and mo.menu_date = p_date and mo.diet = p_diet and mo.slot = p_slot;

  return query select
    p_date, public.rotation_day_number(p_date), false, r.name,
    coalesce(o.main_id, r.main_id), coalesce(o.protein_side_id, r.protein_side_id),
    coalesce(o.salad_id, r.salad_id), coalesce(o.legume_id, r.legume_id),
    coalesce(o.carb_id, r.carb_id), o.id is not null;
end;
$$;
