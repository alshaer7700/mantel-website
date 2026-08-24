-- Publish the Mantel Retail catalog used by the storefront.
-- Prices match the owner-approved Retail UI values in src/app/content/retail.ts.
-- Images remain application assets; Supabase stores product identity, price,
-- availability, and order-facing descriptions.

insert into public.objects (name, spec, description, price, art_key, is_available, sort_order)
values
  ('Matcha Powder', 'Matcha refill', 'Bright, clean, and quietly grassy.', 4.500, 'bag', true, 1),
  ('Candles', 'Scented candle · 165g / 5.8oz', 'A soft light for the end of the day.', 7.000, 'candle', true, 2),
  ('Candle Sticks', 'Candle sticks', 'For the shelf, the table, and the in-between.', 5.500, 'candle', true, 3),
  ('Lighters', 'Pocket lighter', 'A small object with a little ceremony.', 3.000, 'lighter', true, 4),
  ('Match Sticks', 'Matchbox', 'A little fire for the everyday ritual.', 2.500, 'matches', true, 5),
  ('Custom Bags', 'Reusable bag', 'Made for the things you take with you.', 6.500, 'bag', true, 6)
on conflict (name) do update set
  spec = excluded.spec,
  description = excluded.description,
  price = excluded.price,
  art_key = excluded.art_key,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order;

-- These rows were the pre-launch placeholders from 012. Keep them for audit
-- history, but ensure they can never appear in the public catalog.
update public.objects
set is_available = false
where name in ('Scented Candle', 'Safety Matches', 'Matcha Refill', 'Cold Brew');
