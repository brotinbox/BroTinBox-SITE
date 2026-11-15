-- Open the six central Coimbatore areas for orders (phase2 "next batch" -> core).
-- Gandhipuram, Ganapathy, Singanallur, Peelamedu and Vadavalli stay as next batch.
update public.delivery_zones as z
set tier = 'core',
    delivery_fee = 0,
    is_active = true,
    description = v.description
from (values
  ('641001', 'Ukkadam & Town Hall side (6.5 km) • Daily insulated delivery • Free Delivery'),
  ('641002', 'RS Puram (7.4 km) • Daily insulated delivery • Free Delivery'),
  ('641018', 'Race Course (9.7 km) • Daily insulated delivery • Free Delivery'),
  ('641045', 'Ramanathapuram (10.0 km) • Daily insulated delivery • Free Delivery'),
  ('641011', 'Saibaba Colony (10.1 km) • Daily insulated delivery • Free Delivery')
) as v(pincode, description)
where z.pincode = v.pincode;

select pincode, area, tier, is_active from public.delivery_zones order by distance_km;
