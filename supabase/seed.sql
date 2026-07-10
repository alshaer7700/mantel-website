insert into public.menu_items (name, description, price, category, sort_order) values
  ('Mantel Latte', 'Espresso, steamed oat milk, vanilla bean', 2.200, 'coffee', 0),
  ('Crimson Cortado', 'Double shot, lightly sweetened house blend', 1.800, 'coffee', 1),
  ('Hearth Cappuccino', 'Velvety microfoam, small-batch roast', 2.000, 'coffee', 2),
  ('Honey Flat White', 'Full-cream milk, wildflower honey', 2.200, 'coffee', 3),
  ('Seasonal Pour Over', 'Single origin, rotating every two weeks', 2.500, 'coffee', 4),
  ('Dark Chocolate Mocha', 'Rich but not too sweet — 70% cacao', 2.400, 'coffee', 5),
  ('Iced Brown Sugar Latte', 'Cold brew, brown sugar syrup, oat milk', 2.500, 'coffee', 6),
  ('Matcha Latte', 'Ceremonial grade, full-cream or oat milk', 2.400, 'coffee', 7),
  ('Almond Croissant', 'Buttery, twice-baked, dusted with icing sugar', 1.800, 'food', 0),
  ('Cardamom Morning Bun', 'Spiced dough, orange zest glaze', 1.600, 'food', 1),
  ('Avocado Toast', 'Sourdough, lemon oil, chilli flakes, soft egg', 4.500, 'food', 2),
  ('Banana Bread', 'Brown butter, served warm with ricotta', 2.000, 'food', 3),
  ('Granola Bowl', 'House granola, coconut yoghurt, seasonal fruit', 3.300, 'food', 4),
  ('Ham & Gruyère Croissant', 'Flaky, toasted, dijon butter', 3.000, 'food', 5)
on conflict (name) do nothing;
