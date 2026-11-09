-- Lite box goes live today (8 Nov 2026) instead of 23 Nov.
-- Moves the Lite price rows from 0032 to start now. Same prices:
-- trial 199/179, weekly 189/169, monthly 179/159 (non-veg/veg), 2nd meal -10.
update public.pricing_rules
   set effective_from = now()
 where box_size = 'lite'
   and effective_from > now();
