-- Opening offer: trial box ₹219 (veg and non-veg) for 30 days, 24 Oct – 22 Nov 2026 IST.
-- Checkout charges the newest pricing_rules row whose start has passed, so the
-- regular prices are scheduled now and take over on their own at midnight 23 Nov.
insert into public.pricing_rules (plan_type, diet, price_per_meal, second_meal_discount, effective_from)
select 'trial'::public.plan_type, v.diet::public.diet_type, v.price, 10, v.starts::timestamptz from (values
  ('non_veg', 219, '2026-10-24 00:00:00+05:30'),
  ('veg',     219, '2026-10-24 00:00:00+05:30'),
  ('non_veg', 309, '2026-11-23 00:00:00+05:30'),
  ('veg',     279, '2026-11-23 00:00:00+05:30')
) v(diet, price, starts)
where not exists (select 1 from public.pricing_rules p where p.plan_type = 'trial'
                  and p.diet = v.diet::public.diet_type and p.effective_from = v.starts::timestamptz);

-- Drives the site banner and the struck-through "was" prices. `regular` is the
-- normal trial price (also the base for "save vs trial" on plans).
insert into public.site_settings (key, value, is_public) values ('trial_offer',
  '{"label": "Opening offer", "regular": {"non_veg": 309, "veg": 279}, "ends_at": "2026-11-23T00:00:00+05:30"}'::jsonb, true)
on conflict (key) do update set value = excluded.value, is_public = true;
