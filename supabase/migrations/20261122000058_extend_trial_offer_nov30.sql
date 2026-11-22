-- Extend the ₹219 trial opening offer to 30 Nov 2026 (was 22 Nov).
-- Regular trial prices (₹309 non-veg / ₹279 veg) now return at 00:00 IST 1 Dec.
update public.pricing_rules
   set effective_from = '2026-12-01 00:00:00+05:30'
 where plan_type = 'trial'
   and box_size = 'regular'
   and effective_from = '2026-11-23 00:00:00+05:30'
   and ((diet = 'non_veg' and price_per_meal = 309) or (diet = 'veg' and price_per_meal = 279));

-- Banner + struck-through prices end at the same moment.
update public.site_settings
   set value = jsonb_set(value, '{ends_at}', '"2026-12-01T00:00:00+05:30"')
 where key = 'trial_offer';
