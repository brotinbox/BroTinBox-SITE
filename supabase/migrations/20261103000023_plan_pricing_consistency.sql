-- Plan rows must describe what checkout actually sells:
--   * Monthly plan = 26 Mon–Sat delivery days (can skip down to 24 and keep the monthly rate).
--   * The 2nd meal of a day is ₹10 off (it is NOT a "10% weekly discount").
--   * No rupee amounts in copy: prices live only in pricing_rules, so they can never drift.
-- Slugs are kept as they are (orders and subscriptions reference the rows by id).

update public.plans set
  name = '26-Day Monthly Plan',
  operating_days = 26,
  tagline = 'Full month, one habit: 26 cooking-free days at the lowest per-meal price.',
  description = 'Lock in a full month of predictable, lab-calibrated nutrition: 26 delivery days (Mon–Sat). Skip up to 2 days and keep the monthly rate. Pause with one tap whenever you travel.',
  features = '["26 daily boxes delivered across a full month (Mon-Sat)", "Lowest per-meal price of any plan", "Skip up to 2 days and keep the monthly rate", "Skipped or paused meals become credits that extend your end date", "Free delivery in core zones; outer areas pay a one-time fee shown before you pay"]'::jsonb
where slug = '24-day-monthly';

update public.plans set
  tagline = 'Complete lunch + dinner daily nutrition with ₹10 off every second meal.',
  features = '["2 boxes/day (Morning 7:00-9:00 AM & Dinner 7:00-9:00 PM)", "₹10 off every second meal of the day", "Customizable egg-free or extra side add-on bundles", "Pause or skip any day up to 9 PM night before", "Dedicated WhatsApp nutritionist support"]'::jsonb
where slug = '12-meal-weekly';

update public.plans set
  features = '["1 box/day following fixed Mon-Sat rotation (Sunday kitchen closed)", "Daily calories & protein printed on every box", "Egg-free & legume customizations saved to your profile", "9:00 PM previous-night cutoff for zero food waste", "Free delivery in core zones; outer areas pay a one-time fee shown before you pay"]'::jsonb
where slug = '6-day-weekly';

-- Monthly with lunch + dinner had no plan row, so those subscriptions showed up with no plan name.
insert into public.plans (slug, name, type, meals_per_day, operating_days, tagline, description, features, ideal_for, badge, is_popular, sort_order)
select '52-meal-monthly', '52-Meal Monthly Plan', 'monthly', 2, 26,
  'Lunch + dinner for a full month, ₹10 off every second meal.',
  'Two boxes a day for 26 delivery days (Mon–Sat): 52 meals. Skip up to 2 days and keep the monthly rate.',
  '["2 boxes/day (Morning 7:00-9:00 AM & Dinner 7:00-9:00 PM)", "Lowest per-meal price of any plan", "₹10 off every second meal of the day", "Skipped or paused meals become credits that extend your end date"]'::jsonb,
  '["Active gym goers", "Busy founders & techies", "Muscle gain seekers"]'::jsonb,
  null, false, 4
where not exists (select 1 from public.plans where slug = '52-meal-monthly');
