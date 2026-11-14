-- =============================================================================
-- BroTin Box · 0040 Dinner gets its own main.
-- Until now dinner repeated lunch's main. Dinner main is now mapped from the
-- lunch main so the two are never the same:
--   Non-veg: +3 in catalog order (NVM1↔NVM4, NVM2↔NVM5, NVM3↔NVM6). Day 30 uses
--            NVM5 instead of NVM1, since day 1's lunch (the next day) is NVM1.
--   Veg:     a different base every time (paneer ↔ tofu/soya/mushroom).
-- Protein side, salad, legume and carb are unchanged. Same rule lives in
-- scripts/seed/build_seed.py and lib/menu-engine.ts (bundled fallback).
-- =============================================================================
with map(lunch_code, dinner_code) as (values
  ('NVM1', 'NVM4'), ('NVM2', 'NVM5'), ('NVM3', 'NVM6'),
  ('NVM4', 'NVM1'), ('NVM5', 'NVM2'), ('NVM6', 'NVM3'),
  ('VM1', 'VM5'), ('VM2', 'VM4'), ('VM3', 'VM7'), ('VM4', 'VM1'),
  ('VM5', 'VM6'), ('VM6', 'VM3'), ('VM7', 'VM2')
)
update public.menu_rotation d
set main_id = dm.id,
    name = 'Day ' || d.day_number || ': ' || dm.name || ' Box'
from public.menu_rotation l
join public.menu_items lm on lm.id = l.main_id
join map on map.lunch_code = lm.code
join public.menu_items dm on dm.code = case
  when l.diet = 'non_veg' and l.day_number = 30 then 'NVM5'
  else map.dinner_code end
where d.slot = 'dinner' and l.slot = 'lunch'
  and l.day_number = d.day_number and l.diet = d.diet
  and l.kitchen_id is not distinct from d.kitchen_id;
