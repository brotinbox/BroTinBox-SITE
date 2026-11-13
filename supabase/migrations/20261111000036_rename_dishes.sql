-- =============================================================================
-- BroTin Box · 0036 Rename dishes to customer-facing names.
-- Codes, nutrition, costs and allergens are unchanged. Box names in the 30-day
-- rotation ("Day N: <main> Box") are rebuilt from the new main-dish names.
-- =============================================================================

update public.menu_items mi set name = v.name, updated_at = now()
from (values
  ('NVM1', 'Mint Grilled Chicken'),
  ('NVM2', 'Juicy Roast Chicken'),
  ('NVM3', 'Pepper Chicken Steak'),
  ('NVM4', 'Smashed Chicken Bowl'),
  ('NVM5', 'Smoky Grilled Chicken'),
  ('NVM6', 'Crispy Grilled Mackerel'),
  ('VM1',  'Tandoori Paneer Tikka'),
  ('VM2',  'Fresh Mint Paneer'),
  ('VM3',  'Caramel Onion Paneer'),
  ('VM4',  'Tandoori Tofu Tikka'),
  ('VM5',  'Fresh Mint Tofu'),
  ('VM6',  'Creamy Mushroom'),
  ('VM7',  'Smashed Soya Bowl'),
  ('CD1',  'Pink Beetroot Curd'),
  ('CD2',  'Cool Mint Curd'),
  ('CD3',  'Crunchy Carrot Curd'),
  ('CD4',  'Soft Potato Curd'),
  ('CD5',  'Fresh Cucumber Curd'),
  ('CD6',  'Sweet Corn Curd'),
  ('NVE',  'Golden Boiled Eggs'),
  ('LG1',  'Black Chana Bowl'),
  ('LG2',  'Kollu Sprout Bowl'),
  ('LG3',  'Green Gram Sprouts'),
  ('LG4',  'Warm Peanut Bites'),
  ('LG5',  'Rajma Bowl'),
  ('LG6',  'Green Pea Bowl'),
  ('SL1',  'Sweet Corn Salad'),
  ('SL2',  'Rainbow Salad'),
  ('SL3',  'Crunchy Cabbage Salad'),
  ('SL4',  'Fresh Cucumber Salad'),
  ('SL5',  'Creamy Slaw'),
  ('SL6',  'Green Broccoli Salad'),
  ('CB1',  'Soft Chapati'),
  ('CB2',  'Masala Oats'),
  ('CB3',  'Oats Upma Bowl'),
  ('CB4',  'Pepper Pongal Oats'),
  ('CB5',  'Crispy Oats Dosa')
) v(code, name)
where mi.code = v.code;

update public.menu_rotation r
set name = 'Day ' || r.day_number || ': ' || mi.name || ' Box'
from public.menu_items mi
where mi.id = r.main_id
  and r.name ~ '^Day [0-9]+: .+ Box$';
