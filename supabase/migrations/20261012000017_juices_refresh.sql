-- Juice line-up refresh (data/addons.json): own product shots from /public/Juices-images,
-- adds ABC + Amla, cucumber becomes Cucumber Mint. Slugs kept so past orders still resolve.
insert into public.addons (type, slug, name, description, price, calories, protein, carbs, fat, sugar_g, volume_ml, is_veg, tags, image_url, sort_order)
select type::public.addon_type, slug, name, description, price, calories, protein, carbs, fat, sugar_g, volume_ml, is_veg, tags, image_url, sort_order from (values
  ('drink', 'drink-abc', 'ABC Juice', 'Apple, beetroot and carrot cold-pressed together. No added sugar, no water.', 69, 110, 2, 26, 0, 20, 250, true, array['Cold-Pressed', 'Zero Added Sugar', 'Apple-Beet-Carrot', 'Veg']::text[], '/Juices-images/abc.webp', 50),
  ('drink', 'drink-beetroot', 'Beetroot Juice', 'Fresh cold-pressed local beetroot extract with a touch of ginger and lemon.', 59, 85, 2, 19, 0, 14, 250, true, array['Cold-Pressed', 'Zero Added Sugar', 'Veg']::text[], '/Juices-images/beet.webp', 51),
  ('drink', 'drink-carrot', 'Carrot Juice', 'Slow-juiced fresh mountain carrots from Nilgiri farms.', 69, 90, 2, 21, 0, 16, 250, true, array['Cold-Pressed', 'Zero Added Sugar', 'Beta-Carotene', 'Veg']::text[], '/Juices-images/carrot.webp', 52),
  ('drink', 'drink-amla', 'Amla Juice', 'Cold-pressed Indian gooseberry with a pinch of rock salt. Tangy and sharp.', 49, 30, 1, 7, 0, 3, 250, true, array['Cold-Pressed', 'Zero Added Sugar', 'Vitamin C', 'Veg']::text[], '/Juices-images/amla.webp', 53),
  ('drink', 'drink-cucumber', 'Cucumber Mint', 'Crisp polyhouse cucumbers pressed with fresh mint and rock salt.', 49, 35, 1, 7, 0, 4, 250, true, array['Ultra-Light', 'Zero Added Sugar', 'Hydrating', 'Veg']::text[], '/Juices-images/cucumber-mint.webp', 54),
  ('drink', 'drink-mint-lime', 'Mint Lime', 'Freshly squeezed lime with crushed wild mint leaves.', 49, 40, 1, 8, 0, 4, 250, true, array['Fresh', 'Zero Added Sugar', 'Hydrating', 'Veg']::text[], '/Juices-images/mint-lime.webp', 55)
) v(type, slug, name, description, price, calories, protein, carbs, fat, sugar_g, volume_ml, is_veg, tags, image_url, sort_order)
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, price = excluded.price,
  calories = excluded.calories, protein = excluded.protein, carbs = excluded.carbs, fat = excluded.fat,
  sugar_g = excluded.sugar_g, volume_ml = excluded.volume_ml, is_veg = excluded.is_veg,
  tags = excluded.tags, image_url = excluded.image_url, sort_order = excluded.sort_order, is_active = true;
