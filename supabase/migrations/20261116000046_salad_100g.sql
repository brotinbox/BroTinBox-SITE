-- =============================================================================
-- BroTin Box · 0046 Salad portion 150 g → 100 g
--
-- The salad compartment can't hold 150 g. Every salad (SL1–SL6) goes to 100 g.
-- Everything per portion scales by the same share (100 / old grams):
--   menu_items        grams, cooked_state label, kcal/protein/carbs/fat/fibre,
--                     metadata.raw_qty_g (raw veg bought per portion)
--   menu_item_costs   cost per portion + gas
--   dish_recipes      ingredient qty in g / ml (pieces, tsp etc. left as is;
--                     the old recipe is kept in dish_recipe_versions)
-- Box totals are summed from the dishes, so they follow on their own.
-- The Lite box salad was already 100 g, so Lite and Full now get the same salad.
-- Safe to run twice: only salads still above 100 g are touched.
-- =============================================================================

begin;

create temporary table _salad_scale on commit drop as
select id, 100.0 / grams as f
  from public.menu_items
 where category = 'salad' and grams > 100;

update public.menu_item_costs c
   set cost_per_portion = round(c.cost_per_portion * s.f, 2),
       gas_cost         = round(c.gas_cost * s.f, 2)
  from _salad_scale s
 where c.menu_item_id = s.id;

update public.dish_recipes r
   set ingredients = (
         select coalesce(jsonb_agg(
                  case when lower(coalesce(e ->> 'unit', '')) in ('g', 'gm', 'gms', 'grams', 'ml')
                             and jsonb_typeof(e -> 'qty') = 'number'
                       then jsonb_set(e, '{qty}', to_jsonb(round((e ->> 'qty')::numeric * s.f)))
                       else e end
                  order by t.ord), '[]'::jsonb)
           from jsonb_array_elements(r.ingredients) with ordinality as t(e, ord))
  from _salad_scale s
 where r.menu_item_id = s.id
   and jsonb_array_length(r.ingredients) > 0;

update public.menu_items m
   set grams        = 100,
       cooked_state = '100 g',
       calories     = round(m.calories * s.f, 1),
       protein      = round(m.protein  * s.f, 1),
       carbs        = round(m.carbs    * s.f, 1),
       fat          = round(m.fat      * s.f, 1),
       fiber        = round(coalesce(m.fiber, 0) * s.f, 1),
       metadata     = case when m.metadata ? 'raw_qty_g'
                           then jsonb_set(m.metadata, '{raw_qty_g}', to_jsonb(round((m.metadata ->> 'raw_qty_g')::numeric * s.f)))
                           else m.metadata end
  from _salad_scale s
 where m.id = s.id;

commit;

-- Check: every salad should now read 100 g.
select code, name, grams, cooked_state, calories, protein
  from public.menu_items where category = 'salad' order by code;
