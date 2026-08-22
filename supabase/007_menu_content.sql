-- 007: replace the placeholder menu with the real one.
--
-- Everything before this shipped with the invented seed menu from the Figma
-- export ("Mantel Latte", "Crimson Cortado", "Hearth Cappuccino" …). None of
-- those drinks exist. This loads the fourteen-plus items the café actually
-- sells, in the order they are printed, under the five headings from 006.
--
-- ⚠ PRICES NOT YET CONFIRMED. Eleven items go in with price 0 and
--   is_available = false — the source menu was cropped before their price
--   column. RLS keeps them off the site (the public select policy is
--   "using (is_available = true)"), and 006's menu_items_available_has_price
--   constraint stops anyone publishing them at 0.000 by accident. To publish
--   one, set its real price and availability in the same statement:
--
--     update public.menu_items
--        set price = 2.400, is_available = true
--      where name = 'Spanish Latte';
--
--   The unpriced items are listed by the verification query at the bottom.
--
-- ⚠ DESCRIPTIONS AND NUTRITION ARE EMPTY. `description` is '', and
--   ingredients/calories/macros are null, pending the ingredient list. The menu
--   renders a bare name and price for these, and shows no nutrition panel —
--   null means "not published", never "zero". Fill them per item with:
--
--     update public.menu_items
--        set description = 'Espresso, steamed milk, cardamom, sea salt',
--            ingredients = 'Espresso, whole milk, ground cardamom, vanilla syrup, sea salt',
--            calories = 190, protein_g = 8.0, carbs_g = 22.0, fat_g = 7.5
--      where name = 'Salted Cardamom Latte';
--
-- Deleting the old rows is safe: order_items.menu_item_id is ON DELETE SET
-- NULL and every order row keeps its own item_name/item_price snapshot, so
-- order history survives a menu change intact.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → 003 → 004 → 005 → 006 → 007.

begin;

-- 1. Drop the placeholder menu. Scoped to the exact invented names rather than
--    a bare `delete from menu_items`, so a re-run never touches real items that
--    were added through the dashboard after this migration first landed.
delete from public.menu_items where name in (
  'Mantel Latte', 'Crimson Cortado', 'Hearth Cappuccino', 'Honey Flat White',
  'Seasonal Pour Over', 'Dark Chocolate Mocha', 'Iced Brown Sugar Latte',
  'Matcha Latte', 'Almond Croissant', 'Cardamom Morning Bun', 'Avocado Toast',
  'Banana Bread', 'Granola Bowl', 'Ham & Gruyère Croissant'
);

-- 2. The real menu.
--
--    What `on conflict (name)` does and does not overwrite matters, because
--    this file is meant to be safe to re-run against a database someone has
--    since curated by hand:
--
--      category, sort_order  always overwritten. Structure is owned by this
--                            file, so a re-run is how a heading or an ordering
--                            fix lands.
--      price                 kept if the live row already has a real one. The
--                            placeholder rows below carry price 0, and a plain
--                            `price = excluded.price` would reset a price that
--                            was filled in after this first ran — and then
--                            trip 006's available-has-price constraint on the
--                            way out, failing the whole migration.
--      is_available          never touched. Whether an item is on the menu
--                            today is an operational decision, not this file's.
--                            Left alone, it also cannot contradict the price
--                            rule above: a visible row keeps its real price.
--      description,          never touched. Once someone publishes ingredients
--      ingredients,          or a calorie count, a re-run must not wipe them
--      nutrition             back to empty.
insert into public.menu_items (name, price, category, sort_order, is_available) values
  -- Coffee.
  ('Americano',             1.600, 'coffee',     0, true),
  ('Espresso',              1.200, 'coffee',     1, true),
  ('Espresso Freddo',       1.800, 'coffee',     2, true),
  ('Flat White',            1.900, 'coffee',     3, true),
  ('Cortado',               1.800, 'coffee',     4, true),
  ('Spanish Latte',         0,     'coffee',     5, false),
  ('Latte / Cappuccino',    0,     'coffee',     6, false),
  ('Salted Cardamom Latte', 0,     'coffee',     7, false),
  ('Salted Caramel Latte',  0,     'coffee',     8, false),
  ('V60',                   0,     'coffee',     9, false),
  ('Cold Brew',             0,     'coffee',    10, false),

  -- Not Coffee.
  ('Matcha',                2.500, 'not-coffee', 0, true),
  ('Coconut Matcha',        2.700, 'not-coffee', 1, true),
  ('Salted Vanilla Matcha', 2.700, 'not-coffee', 2, true),
  ('Hibiscus',              2.100, 'not-coffee', 3, true),

  -- Aqua.
  ('Water',                 0,     'aqua',       0, false),
  ('Sparkling Water',       0,     'aqua',       1, false),

  -- Sandwiches.
  ('Halloumi Panini',       2.700, 'sandwiches', 0, true),
  ('Turkey Panini',         2.900, 'sandwiches', 1, true),
  ('Tuna Panini',           2.700, 'sandwiches', 2, true),

  -- Desserts.
  ('Cinnamon Bun',          0,     'desserts',   0, false),
  ('Crêpe',                 0,     'desserts',   1, false),
  ('Waffle',                0,     'desserts',   2, false)
on conflict (name) do update set
  price      = case when menu_items.price > 0 then menu_items.price else excluded.price end,
  category   = excluded.category,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification: what is still waiting on real data.
-- ─────────────────────────────────────────────────────────────────────────────
select
  category,
  name,
  case when price = 0        then 'price'       end as needs_price,
  case when description = '' then 'description' end as needs_description,
  case when calories is null then 'nutrition'   end as needs_nutrition
from public.menu_items
where price = 0 or description = '' or calories is null
order by category, sort_order;
