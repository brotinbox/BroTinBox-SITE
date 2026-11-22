-- BroTin Box · 0057 Open the Avinashi Road corridor: Gandhipuram, Lakshmi Mills, Nava India
-- Gandhipuram moves from next batch to core; Lakshmi Mills and Nava India are new.
-- Nava India addresses use 641028 and 641004. 641004 is also Peelamedu, which stays
-- next batch, so pincode lookups order by tier (core first) and Nava India wins.
-- Distances are road km from the Kuniyamuthur kitchen.

insert into public.delivery_zones (pincode, area, tier, delivery_fee, distance_km, avg_minutes, slots, description, is_active)
select pincode, area, 'core'::public.zone_tier, 0, km, mins,
       array['11:30 AM - 1:30 PM', '7:00 PM - 9:00 PM']::text[], description, true
from (values
  ('641012', 'Gandhipuram',   9.7, 40, 'Gandhipuram (9.7 km) • Daily insulated delivery • Free Delivery'),
  ('641037', 'Lakshmi Mills', 11.5, 45, 'Lakshmi Mills & Avinashi Road (11.5 km) • Daily insulated delivery • Free Delivery'),
  ('641028', 'Nava India',    13.5, 50, 'Nava India & Hindusthan College side (13.5 km) • Daily insulated delivery • Free Delivery'),
  ('641004', 'Nava India',    13.5, 50, 'Nava India & Hindusthan College side (13.5 km) • Daily insulated delivery • Free Delivery')
) as v(pincode, area, km, mins, description)
on conflict (pincode, area) do update
  set tier = excluded.tier,
      delivery_fee = 0,
      distance_km = excluded.distance_km,
      avg_minutes = excluded.avg_minutes,
      slots = excluded.slots,
      description = excluded.description,
      is_active = true;

select pincode, area, tier, distance_km, is_active from public.delivery_zones order by distance_km;
