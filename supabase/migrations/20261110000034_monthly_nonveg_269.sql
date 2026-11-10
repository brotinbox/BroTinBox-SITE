-- Monthly non-veg plan: ₹279 -> ₹269 per meal (matches the printed poster:
-- "Monthly Plan, 26 meals, ₹269/meal, save 13%"). Veg monthly stays ₹249.
-- The newest effective row wins, so older rows stay as history.
insert into pricing_rules (plan_type, diet, box_size, price_per_meal, second_meal_discount, effective_from)
values ('monthly', 'non_veg', 'regular', 269, 10, now());
