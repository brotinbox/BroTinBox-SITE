-- =============================================================================
-- BroTin Box · 0038 Recipe workbook (cook book)
--
-- One recipe per dish, so anyone in the kitchen can cook it the same way.
-- Quantities are per ONE portion; the cook book multiplies them by the
-- day's count. Kitchen staff read (menu.read); admins edit (menu.write).
-- Every edit keeps the previous version (dish_recipe_versions).
-- Starts from the workbook notes in menu_items.metadata.kitchen_notes.
-- =============================================================================

create table public.dish_recipes (
  menu_item_id  uuid primary key references public.menu_items (id) on delete cascade,
  ingredients   jsonb not null default '[]'
                check (jsonb_typeof(ingredients) = 'array' and jsonb_array_length(ingredients) <= 60),
                -- [{ "name": "Chicken breast (raw)", "qty": 200, "unit": "g", "note": "skinless" }]
  steps         jsonb not null default '[]'
                check (jsonb_typeof(steps) = 'array' and jsonb_array_length(steps) <= 40),
                -- ["Marinate 30 min", "Grill 6 min each side", …]
  prep_minutes  int check (prep_minutes between 0 and 1440),
  cook_minutes  int check (cook_minutes between 0 and 1440),
  equipment     text check (char_length(equipment) <= 300),
  tips          text check (char_length(tips) <= 2000),
  notes         text check (char_length(notes) <= 2000),
  updated_by    uuid references public.profiles (id) on delete set null,
  updated_at    timestamptz not null default now(),
  created_at    timestamptz not null default now()
);
create index dish_recipes_updated_by_idx on public.dish_recipes (updated_by);

create table public.dish_recipe_versions (
  id            uuid primary key default gen_random_uuid(),
  menu_item_id  uuid not null references public.menu_items (id) on delete cascade,
  snapshot      jsonb not null,          -- the recipe as it was before the edit
  edited_by     uuid references public.profiles (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index dish_recipe_versions_item_idx on public.dish_recipe_versions (menu_item_id, created_at desc);
create index dish_recipe_versions_edited_by_idx on public.dish_recipe_versions (edited_by);

alter table public.dish_recipes enable row level security;
alter table public.dish_recipe_versions enable row level security;

create policy dish_recipes_read on public.dish_recipes
  for select using (public.has_permission('menu.read'));
create policy dish_recipes_write on public.dish_recipes
  for all using (public.has_permission('menu.write')) with check (public.has_permission('menu.write'));
create policy dish_recipe_versions_read on public.dish_recipe_versions
  for select using (public.has_permission('menu.read'));
-- Versions are written only by the trigger below.

create or replace function public._dish_recipe_versioning()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  if tg_op = 'UPDATE' and (old.ingredients, old.steps, old.prep_minutes, old.cook_minutes, old.equipment, old.tips, old.notes)
                     is distinct from (new.ingredients, new.steps, new.prep_minutes, new.cook_minutes, new.equipment, new.tips, new.notes) then
    insert into public.dish_recipe_versions (menu_item_id, snapshot, edited_by)
    values (old.menu_item_id,
            jsonb_build_object('ingredients', old.ingredients, 'steps', old.steps,
                               'prep_minutes', old.prep_minutes, 'cook_minutes', old.cook_minutes,
                               'equipment', old.equipment, 'tips', old.tips, 'notes', old.notes,
                               'updated_by', old.updated_by, 'updated_at', old.updated_at),
            auth.uid());
    -- Keep the last 30 versions per dish.
    delete from public.dish_recipe_versions
     where menu_item_id = old.menu_item_id
       and id not in (select id from public.dish_recipe_versions
                       where menu_item_id = old.menu_item_id order by created_at desc limit 30);
  end if;
  return new;
end;
$$;
revoke all on function public._dish_recipe_versioning() from public, anon, authenticated;

create trigger dish_recipes_versioning
  before insert or update on public.dish_recipes
  for each row execute function public._dish_recipe_versioning();

-- Start every dish from its workbook note.
insert into public.dish_recipes (menu_item_id, notes)
select id, left(metadata ->> 'kitchen_notes', 2000)
  from public.menu_items
 where coalesce(metadata ->> 'kitchen_notes', '') <> ''
on conflict (menu_item_id) do nothing;
