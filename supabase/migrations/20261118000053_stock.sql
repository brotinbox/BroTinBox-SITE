-- =============================================================================
-- BroTin Box · 0053 Kitchen stock: ingredients, buy list, bills, counts
--
-- Own private schema `stock` (service role only, like `finance`). After
-- running this, add "stock" to Supabase › Settings › API › Exposed schemas
-- (one time) so the server can reach it.
--
--   stock.ingredients   one row per thing we buy. kind = fresh (bought for
--                       tomorrow's cooking) or pantry (bought in packs and kept;
--                       on the buy list when fewer than 5 days are left).
--                       unit is the base unit every quantity is stored in: g, ml, pcs.
--   stock.aliases       recipe ingredient name → ingredient. Recipes stay free
--                       text; "Onion, finely chopped" and "Onion, diced" both
--                       count as Onion. ingredient_id null = not tracked (water).
--   stock.moves         every change to stock, signed, in the base unit:
--                       purchase (+), usage (− at the 9 PM lock), waste (−),
--                       count (± to match what was counted), adjust (±).
--   stock.purchases     an itemised bill. Saving one also writes the matching
--                       finance.entries rows (one per finance category), so the
--                       bill shows on Revenue & profit without typing it twice.
--   stock.usage_days    one row per cooking day whose usage was taken off stock.
--   stock.settings      start_date: usage is only taken off from this day (set
--                       by the opening stock count).
--   dish_recipes        + verified_at / verified_by: "checked with mum ✓".
--
-- The app checks stock.read / stock.write first, then uses the service role.
-- Kitchen staff get stock.* (mum and staff add bills, waste and counts).
-- Admins have it by default.
--
-- The 9 PM usage is posted by /api/cron/stock-usage (pg_cron, 21:05 IST) and
-- again by any stock page if the cron missed a day.
-- Run AFTER 0049 (finance). Safe to run twice.
-- =============================================================================

create schema if not exists stock;
revoke all on schema stock from public, anon, authenticated;
grant usage on schema stock to service_role;
alter default privileges in schema stock grant select, insert, update, delete on tables to service_role;
alter default privileges in schema stock grant usage, select on sequences to service_role;

-- ---------------------------------------------------------------------------
-- 1. Ingredients
-- ---------------------------------------------------------------------------
create table if not exists stock.ingredients (
  id              uuid primary key default gen_random_uuid(),
  name            text not null check (char_length(name) between 1 and 60),
  kind            text not null check (kind in ('fresh', 'pantry')),
  unit            text not null check (unit in ('g', 'ml', 'pcs')),
  category        text not null default 'grocery'
                  check (category in ('vegetables', 'meat_eggs', 'dairy', 'grocery', 'packaging')),
  pack_size       numeric(12,3) check (pack_size > 0),             -- base units in one pack (pantry)
  min_stock       numeric(12,3) check (min_stock >= 0),            -- never let it fall below this
  price_per_unit  numeric(12,5) check (price_per_unit >= 0),       -- ₹ per base unit, from the last bill
  price_updated_at timestamptz,
  low_flag_at     timestamptz,                                     -- "running low" tapped in the kitchen
  low_flag_by     uuid references public.profiles (id) on delete set null,
  is_active       boolean not null default true,
  note            text check (char_length(note) <= 200),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists ingredients_name_key on stock.ingredients (lower(name));
create index if not exists ingredients_low_flag_by on stock.ingredients (low_flag_by);
drop trigger if exists ingredients_updated_at on stock.ingredients;
create trigger ingredients_updated_at before update on stock.ingredients
  for each row execute function public.set_updated_at();

create table if not exists stock.aliases (
  alias          text primary key check (alias = lower(alias) and char_length(alias) between 1 and 80),
  ingredient_id  uuid references stock.ingredients (id) on delete cascade,
  created_at     timestamptz not null default now()
);
create index if not exists aliases_ingredient on stock.aliases (ingredient_id);

-- ---------------------------------------------------------------------------
-- 2. Bills, moves, usage days, settings
-- ---------------------------------------------------------------------------
create table if not exists stock.purchases (
  id             uuid primary key default gen_random_uuid(),
  purchase_date  date not null default public.today_ist(),
  vendor         text check (char_length(vendor) <= 80),
  note           text check (char_length(note) <= 300),
  total          numeric(10,2) not null default 0 check (total >= 0),
  extras         jsonb not null default '[]' check (jsonb_typeof(extras) = 'array'),
                 -- items that are not stock: [{ "label": "Gas cylinder", "category": "gas", "amount": 1100 }]
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists purchases_date on stock.purchases (purchase_date desc);
create index if not exists purchases_created_by on stock.purchases (created_by);

create table if not exists stock.moves (
  id             bigint generated always as identity primary key,
  ingredient_id  uuid not null references stock.ingredients (id) on delete cascade,
  move_date      date not null default public.today_ist(),
  kind           text not null check (kind in ('purchase', 'usage', 'waste', 'count', 'adjust')),
  qty            numeric(14,3) not null,                 -- signed, base unit
  amount         numeric(10,2) check (amount >= 0),      -- ₹ paid (purchase lines)
  counted        numeric(14,3),                          -- what was counted (count rows)
  purchase_id    uuid references stock.purchases (id) on delete cascade,
  note           text check (char_length(note) <= 200),
  created_by     uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists moves_ingredient on stock.moves (ingredient_id, move_date desc);
create index if not exists moves_date_kind on stock.moves (move_date, kind);
create index if not exists moves_purchase on stock.moves (purchase_id);
create index if not exists moves_created_by on stock.moves (created_by);

create table if not exists stock.usage_days (
  day        date primary key,
  boxes      int not null default 0,
  lines      jsonb not null default '[]',    -- [{ "ingredient_id": "…", "qty": 240 }] as posted
  posted_at  timestamptz not null default now()
);

create table if not exists stock.settings (
  id          smallint primary key default 1 check (id = 1),
  start_date  date,
  updated_at  timestamptz not null default now()
);
insert into stock.settings (id) values (1) on conflict (id) do nothing;

-- What is in the kitchen now (posted usage included).
create or replace view stock.on_hand with (security_invoker = on) as
  select m.ingredient_id, sum(m.qty) as qty
    from stock.moves m
   group by m.ingredient_id;

-- A bill entered here also lands on Revenue & profit.
alter table finance.entries
  add column if not exists stock_purchase_id uuid references stock.purchases (id) on delete cascade;
create index if not exists finance_entries_stock_purchase on finance.entries (stock_purchase_id);

-- Recipe "checked with mum" tick.
alter table public.dish_recipes add column if not exists verified_at timestamptz;
alter table public.dish_recipes add column if not exists verified_by uuid references public.profiles (id) on delete set null;
create index if not exists dish_recipes_verified_by_idx on public.dish_recipes (verified_by);

-- ---------------------------------------------------------------------------
-- 3. Access: service role only (the app checks stock.* permission first).
-- ---------------------------------------------------------------------------
alter table stock.ingredients enable row level security;
alter table stock.aliases     enable row level security;
alter table stock.purchases   enable row level security;
alter table stock.moves       enable row level security;
alter table stock.usage_days  enable row level security;
alter table stock.settings    enable row level security;

revoke all on all tables in schema stock from public, anon, authenticated;
grant select, insert, update, delete on all tables in schema stock to service_role;
grant usage, select on all sequences in schema stock to service_role;

insert into public.role_permissions (role, permission) values ('kitchen', 'stock.*')
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. Take one cooking day's usage off stock (once). p_replace re-posts it,
--    e.g. after a recipe was corrected.
--    p_lines: [{ "ingredient_id": "…", "qty": 240 }]  (positive, base unit)
-- ---------------------------------------------------------------------------
create or replace function stock.post_usage(p_day date, p_lines jsonb, p_boxes int, p_replace boolean default false)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_replace then
    delete from stock.moves where kind = 'usage' and move_date = p_day;
    delete from stock.usage_days where day = p_day;
  end if;
  insert into stock.usage_days (day, boxes, lines) values (p_day, coalesce(p_boxes, 0), coalesce(p_lines, '[]'))
  on conflict (day) do nothing;
  if not found then
    return false;                       -- already posted
  end if;
  insert into stock.moves (ingredient_id, move_date, kind, qty, note)
  select (l->>'ingredient_id')::uuid, p_day, 'usage', -round((l->>'qty')::numeric, 3), 'Cook sheet'
    from jsonb_array_elements(coalesce(p_lines, '[]')) l
    join stock.ingredients i on i.id = (l->>'ingredient_id')::uuid
   where (l->>'qty')::numeric > 0;
  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Save an itemised bill in one go: stock up, prices, finance entries.
--    p_lines:  [{ "ingredient_id": "…", "qty": 2500, "amount": 600 }]  (qty in base unit)
--    p_extras: [{ "label": "Gas cylinder", "category": "gas", "amount": 1100 }]
-- ---------------------------------------------------------------------------
create or replace function stock.add_purchase(
  p_date date, p_vendor text, p_note text, p_lines jsonb, p_extras jsonb, p_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  pid uuid;
  tot numeric;
begin
  select coalesce(sum((l->>'amount')::numeric), 0) into tot from jsonb_array_elements(coalesce(p_lines, '[]')) l;
  select tot + coalesce(sum((e->>'amount')::numeric), 0) into tot from jsonb_array_elements(coalesce(p_extras, '[]')) e;

  insert into stock.purchases (purchase_date, vendor, note, total, extras, created_by)
  values (p_date, nullif(p_vendor, ''), nullif(p_note, ''), tot, coalesce(p_extras, '[]'), p_user)
  returning id into pid;

  insert into stock.moves (ingredient_id, move_date, kind, qty, amount, purchase_id, created_by)
  select (l->>'ingredient_id')::uuid, p_date, 'purchase', round((l->>'qty')::numeric, 3),
         nullif((l->>'amount')::numeric, 0), pid, p_user
    from jsonb_array_elements(coalesce(p_lines, '[]')) l
   where (l->>'qty')::numeric > 0;

  -- Latest price per base unit (only lines with a price).
  update stock.ingredients i
     set price_per_unit = round(x.amount / x.qty, 5), price_updated_at = now()
    from (select (l->>'ingredient_id')::uuid as id, sum((l->>'amount')::numeric) as amount, sum((l->>'qty')::numeric) as qty
            from jsonb_array_elements(coalesce(p_lines, '[]')) l
           where (l->>'qty')::numeric > 0 and (l->>'amount')::numeric > 0
           group by 1) x
   where i.id = x.id;

  -- One finance entry per category, e.g. Vegetables ₹640 + Meat & eggs ₹600.
  insert into finance.entries (entry_date, category, amount, vendor, note, created_by, stock_purchase_id)
  select p_date, c.category, c.amount, nullif(p_vendor, ''), left('Stock bill: ' || c.items, 300), p_user, pid
    from (
      select category, sum(amount) as amount, string_agg(item, ', ') as items
        from (
          select i.category, (l->>'amount')::numeric as amount, i.name as item
            from jsonb_array_elements(coalesce(p_lines, '[]')) l
            join stock.ingredients i on i.id = (l->>'ingredient_id')::uuid
          union all
          select e->>'category', (e->>'amount')::numeric, e->>'label'
            from jsonb_array_elements(coalesce(p_extras, '[]')) e
        ) t
       where amount > 0
       group by category
    ) c;

  return pid;
end;
$$;

revoke execute on all functions in schema stock from public, anon, authenticated;
grant execute on function stock.post_usage(date, jsonb, int, boolean) to service_role;
grant execute on function stock.add_purchase(date, text, text, jsonb, jsonb, uuid) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Starting ingredients, from the recipes in 0050. Pantry pack sizes are
--    the usual shop packs; change them on the Ingredients page.
-- ---------------------------------------------------------------------------
insert into stock.ingredients (name, kind, unit, category, pack_size) values
  ('Onion', 'fresh', 'g', 'vegetables', null),
  ('Tomato', 'fresh', 'g', 'vegetables', null),
  ('Carrot', 'fresh', 'g', 'vegetables', null),
  ('Cucumber', 'fresh', 'g', 'vegetables', null),
  ('Cabbage', 'fresh', 'g', 'vegetables', null),
  ('Capsicum / bell peppers', 'fresh', 'g', 'vegetables', null),
  ('Beetroot', 'fresh', 'g', 'vegetables', null),
  ('Potato', 'fresh', 'g', 'vegetables', null),
  ('Button mushrooms', 'fresh', 'g', 'vegetables', null),
  ('Mixed vegetables (beans, peas…)', 'fresh', 'g', 'vegetables', null),
  ('Green peas', 'fresh', 'g', 'vegetables', null),
  ('Sweet corn', 'fresh', 'g', 'vegetables', null),
  ('Coriander leaves', 'fresh', 'g', 'vegetables', null),
  ('Mint leaves', 'fresh', 'g', 'vegetables', null),
  ('Curry leaves', 'fresh', 'pcs', 'vegetables', null),
  ('Green chilli', 'fresh', 'pcs', 'vegetables', null),
  ('Ginger', 'fresh', 'g', 'vegetables', null),
  ('Garlic', 'fresh', 'g', 'vegetables', null),
  ('Lemon juice', 'fresh', 'ml', 'vegetables', null),
  ('Fresh coconut', 'fresh', 'g', 'vegetables', null),
  ('Chicken breast', 'fresh', 'g', 'meat_eggs', null),
  ('Mackerel (ayala)', 'fresh', 'g', 'meat_eggs', null),
  ('Eggs', 'fresh', 'pcs', 'meat_eggs', null),
  ('Curd', 'fresh', 'g', 'dairy', null),
  ('Paneer', 'fresh', 'g', 'dairy', null),
  ('Toned milk', 'fresh', 'ml', 'dairy', null),
  ('Fresh cream', 'fresh', 'g', 'dairy', null),
  ('Firm tofu', 'fresh', 'g', 'grocery', null),
  ('Millet dosa batter', 'fresh', 'g', 'grocery', null),
  ('Butter', 'pantry', 'g', 'dairy', 100),
  ('Cheese slices', 'pantry', 'pcs', 'dairy', 10),
  ('Ghee', 'pantry', 'ml', 'dairy', 500),
  ('Cooking oil', 'pantry', 'ml', 'grocery', 1000),
  ('Salt', 'pantry', 'g', 'grocery', 1000),
  ('Black salt (kala namak)', 'pantry', 'g', 'grocery', 100),
  ('Turmeric powder', 'pantry', 'g', 'grocery', 100),
  ('Kashmiri chilli powder', 'pantry', 'g', 'grocery', 100),
  ('Garam masala', 'pantry', 'g', 'grocery', 100),
  ('Tandoori masala', 'pantry', 'g', 'grocery', 100),
  ('Coriander powder', 'pantry', 'g', 'grocery', 100),
  ('Cumin powder', 'pantry', 'g', 'grocery', 100),
  ('Cumin seeds', 'pantry', 'g', 'grocery', 100),
  ('Mustard seeds', 'pantry', 'g', 'grocery', 100),
  ('Black pepper', 'pantry', 'g', 'grocery', 100),
  ('Chaat masala', 'pantry', 'g', 'grocery', 100),
  ('Kasuri methi', 'pantry', 'g', 'grocery', 50),
  ('Chilli flakes', 'pantry', 'g', 'grocery', 50),
  ('Oregano / mixed herbs', 'pantry', 'g', 'grocery', 20),
  ('Asafoetida (hing)', 'pantry', 'g', 'grocery', 50),
  ('Bay leaf', 'pantry', 'pcs', 'grocery', 20),
  ('Ginger garlic paste', 'pantry', 'g', 'grocery', 200),
  ('Urad dal', 'pantry', 'g', 'grocery', 500),
  ('Rice flour', 'pantry', 'g', 'grocery', 500),
  ('Whole wheat atta', 'pantry', 'g', 'grocery', 5000),
  ('Whole wheat penne', 'pantry', 'g', 'grocery', 500),
  ('Rolled oats', 'pantry', 'g', 'grocery', 1000),
  ('Moong dal (yellow)', 'pantry', 'g', 'grocery', 500),
  ('Green gram (whole moong)', 'pantry', 'g', 'grocery', 500),
  ('Horse gram (kollu)', 'pantry', 'g', 'grocery', 500),
  ('Black chana', 'pantry', 'g', 'grocery', 500),
  ('Rajma', 'pantry', 'g', 'grocery', 500),
  ('Raw peanuts', 'pantry', 'g', 'grocery', 500),
  ('Soya chunks', 'pantry', 'g', 'grocery', 200)
on conflict do nothing;

insert into stock.aliases (alias, ingredient_id)
select v.alias, i.id
  from (values
  ('onion', 'Onion'),
  ('onion, chopped', 'Onion'),
  ('onion, diced', 'Onion'),
  ('onion, finely chopped', 'Onion'),
  ('onion, roughly chopped', 'Onion'),
  ('onion, thin slices', 'Onion'),
  ('onion, thinly sliced', 'Onion'),
  ('tomato', 'Tomato'),
  ('tomato, deseeded, chopped', 'Tomato'),
  ('tomato, deseeded, diced', 'Tomato'),
  ('tomato, finely chopped', 'Tomato'),
  ('carrot', 'Carrot'),
  ('carrot, diced or julienned', 'Carrot'),
  ('carrot, finely chopped', 'Carrot'),
  ('carrot, finely grated', 'Carrot'),
  ('carrot, grated or julienned', 'Carrot'),
  ('carrot, grated', 'Carrot'),
  ('cucumber', 'Cucumber'),
  ('cucumber, deseeded and diced', 'Cucumber'),
  ('cucumber, deseeded, chopped', 'Cucumber'),
  ('cucumber, deseeded, diced', 'Cucumber'),
  ('cucumber, thin slices', 'Cucumber'),
  ('cabbage', 'Cabbage'),
  ('cabbage, finely shredded', 'Cabbage'),
  ('capsicum / bell peppers', 'Capsicum / bell peppers'),
  ('bell peppers (red, yellow, green), diced', 'Capsicum / bell peppers'),
  ('capsicum (mixed colours), diced', 'Capsicum / bell peppers'),
  ('beetroot', 'Beetroot'),
  ('beetroot, boiled and grated', 'Beetroot'),
  ('beetroot, peeled and grated', 'Beetroot'),
  ('potato', 'Potato'),
  ('potato, boiled, peeled, small cubes', 'Potato'),
  ('button mushrooms', 'Button mushrooms'),
  ('mixed vegetables (beans, peas…)', 'Mixed vegetables (beans, peas…)'),
  ('mixed veg, finely chopped', 'Mixed vegetables (beans, peas…)'),
  ('beans or peas', 'Mixed vegetables (beans, peas…)'),
  ('green peas', 'Green peas'),
  ('green peas (fresh or frozen)', 'Green peas'),
  ('sweet corn', 'Sweet corn'),
  ('sweet corn kernels, boiled', 'Sweet corn'),
  ('sweet corn kernels', 'Sweet corn'),
  ('sweet corn, boiled', 'Sweet corn'),
  ('coriander leaves', 'Coriander leaves'),
  ('coriander leaves with tender stems', 'Coriander leaves'),
  ('coriander leaves, chopped', 'Coriander leaves'),
  ('mint leaves', 'Mint leaves'),
  ('mint leaves, finely chopped', 'Mint leaves'),
  ('mint or coriander, chopped', 'Mint leaves'),
  ('curry leaves', 'Curry leaves'),
  ('curry leaves, chopped', 'Curry leaves'),
  ('green chilli', 'Green chilli'),
  ('green chilli, chopped', 'Green chilli'),
  ('green chilli, finely chopped', 'Green chilli'),
  ('green chilli, slit', 'Green chilli'),
  ('dry red chilli or green chilli', 'Green chilli'),
  ('ginger', 'Ginger'),
  ('ginger, chopped', 'Ginger'),
  ('ginger, grated', 'Ginger'),
  ('garlic', 'Garlic'),
  ('garlic, finely chopped', 'Garlic'),
  ('garlic, finely minced', 'Garlic'),
  ('lemon juice', 'Lemon juice'),
  ('fresh coconut', 'Fresh coconut'),
  ('fresh coconut, grated', 'Fresh coconut'),
  ('chicken breast', 'Chicken breast'),
  ('chicken breast, boneless skinless', 'Chicken breast'),
  ('mackerel (ayala)', 'Mackerel (ayala)'),
  ('whole mackerel (ayala), fresh', 'Mackerel (ayala)'),
  ('eggs', 'Eggs'),
  ('curd', 'Curd'),
  ('fresh thick curd', 'Curd'),
  ('hung curd', 'Curd'),
  ('thick curd (hung, not watery)', 'Curd'),
  ('thick curd', 'Curd'),
  ('paneer', 'Paneer'),
  ('toned milk', 'Toned milk'),
  ('fresh cream', 'Fresh cream'),
  ('firm tofu', 'Firm tofu'),
  ('millet dosa batter', 'Millet dosa batter'),
  ('millet dosa batter (variety of the day)', 'Millet dosa batter'),
  ('butter', 'Butter'),
  ('cheese slices', 'Cheese slices'),
  ('cheese slice', 'Cheese slices'),
  ('ghee', 'Ghee'),
  ('ghee or oil for smoking', 'Ghee'),
  ('cooking oil', 'Cooking oil'),
  ('oil', 'Cooking oil'),
  ('oil or ghee', 'Cooking oil'),
  ('salt', 'Salt'),
  ('salt for boiling', 'Salt'),
  ('salt for par-boiling', 'Salt'),
  ('salt for pasta water', 'Salt'),
  ('black salt (kala namak)', 'Black salt (kala namak)'),
  ('turmeric powder', 'Turmeric powder'),
  ('turmeric', 'Turmeric powder'),
  ('kashmiri chilli powder', 'Kashmiri chilli powder'),
  ('paprika or kashmiri chilli powder', 'Kashmiri chilli powder'),
  ('garam masala', 'Garam masala'),
  ('tandoori masala', 'Tandoori masala'),
  ('tandoori masala or garam masala', 'Tandoori masala'),
  ('coriander powder', 'Coriander powder'),
  ('cumin powder', 'Cumin powder'),
  ('roasted cumin powder', 'Cumin powder'),
  ('cumin seeds', 'Cumin seeds'),
  ('mustard seeds', 'Mustard seeds'),
  ('mustard or cumin seeds', 'Mustard seeds'),
  ('black pepper', 'Black pepper'),
  ('black pepper powder', 'Black pepper'),
  ('black pepper, coarsely crushed', 'Black pepper'),
  ('black pepper, crushed', 'Black pepper'),
  ('black pepper, freshly crushed', 'Black pepper'),
  ('chaat masala', 'Chaat masala'),
  ('kasuri methi', 'Kasuri methi'),
  ('kasuri methi, crushed', 'Kasuri methi'),
  ('chilli flakes', 'Chilli flakes'),
  ('oregano / mixed herbs', 'Oregano / mixed herbs'),
  ('dried mixed herbs or oregano', 'Oregano / mixed herbs'),
  ('dried oregano', 'Oregano / mixed herbs'),
  ('asafoetida (hing)', 'Asafoetida (hing)'),
  ('bay leaf', 'Bay leaf'),
  ('ginger garlic paste', 'Ginger garlic paste'),
  ('urad dal', 'Urad dal'),
  ('rice flour', 'Rice flour'),
  ('whole wheat atta', 'Whole wheat atta'),
  ('whole wheat flour (atta)', 'Whole wheat atta'),
  ('extra atta for dusting', 'Whole wheat atta'),
  ('whole wheat penne', 'Whole wheat penne'),
  ('whole wheat penne (dry)', 'Whole wheat penne'),
  ('rolled oats', 'Rolled oats'),
  ('moong dal (yellow)', 'Moong dal (yellow)'),
  ('moong dal (yellow), dry', 'Moong dal (yellow)'),
  ('green gram (whole moong)', 'Green gram (whole moong)'),
  ('green gram (whole moong), dry', 'Green gram (whole moong)'),
  ('horse gram (kollu)', 'Horse gram (kollu)'),
  ('horse gram (kollu), dry', 'Horse gram (kollu)'),
  ('black chana', 'Black chana'),
  ('black chana (kala chana), dry', 'Black chana'),
  ('rajma', 'Rajma'),
  ('rajma (red kidney beans), dry', 'Rajma'),
  ('raw peanuts', 'Raw peanuts'),
  ('raw peanuts, shelled', 'Raw peanuts'),
  ('soya chunks', 'Soya chunks'),
  ('soya chunks, dry', 'Soya chunks'),
  ('water', null),
  ('warm water', null),
  ('water for boiling pasta', null),
  ('water for boiling', null),
  ('water for cooking', null),
  ('water for par-boiling', null),
  ('water for soaking', null)
  ) as v(alias, ingredient)
  left join stock.ingredients i on lower(i.name) = lower(v.ingredient)
on conflict (alias) do nothing;

-- ---------------------------------------------------------------------------
-- 7. 9:05 PM IST: take tomorrow's usage off stock (5 minutes after the lock).
--    Same Vault secret as the other /api/cron/* jobs.
-- ---------------------------------------------------------------------------
create extension if not exists pg_net;

select cron.unschedule('brotin-stock-usage')
where exists (select 1 from cron.job where jobname = 'brotin-stock-usage');

-- pg_cron runs in UTC: 15:35 UTC = 21:05 IST.
select cron.schedule('brotin-stock-usage', '35 15 * * *', $$
  select net.http_post(
    url     := 'https://www.brotinbox.com/api/cron/stock-usage',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'brotin_cron_secret')
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 20000
  );
$$);

notify pgrst, 'reload schema';
