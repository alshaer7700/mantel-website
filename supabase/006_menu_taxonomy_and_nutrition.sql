-- 006: the real menu taxonomy, plus ingredients and nutrition per item.
--
-- Two things change here, both driven by the actual café menu:
--
-- 1. TAXONOMY. `category` allowed only 'coffee' and 'food'. The real menu has
--    five sections — Coffee, Not Coffee, Aqua, Sandwiches, Desserts — and
--    "food" collapsed the last three into one heading that matches nothing on
--    the printed menu. The old 'food' rows are remapped before the constraint
--    is swapped, so this is safe to run against a populated table.
--
--    The slugs double as URL segments (/menu/not-coffee), which is why they are
--    hyphenated lowercase and not free text — see src/lib/routes.ts.
--
-- 2. INGREDIENTS + NUTRITION. New nullable columns. Nullable is deliberate:
--    an item with no calorie figure yet must render as "no figure published",
--    never as "0 kcal". The UI keys off null to decide whether to show the
--    panel at all.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → 003 → 004 → 005 → 006.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Taxonomy: remap existing rows, then widen the constraint.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.menu_items drop constraint if exists menu_items_category_check;

-- Old 'food' rows land in 'desserts': every seeded food item was a pastry or a
-- sweet, and none of them were sandwiches. Runs before the new constraint goes
-- on, so there is no window where an existing row violates it.
update public.menu_items set category = 'desserts' where category = 'food';

alter table public.menu_items
  add constraint menu_items_category_check
  check (category in ('coffee', 'not-coffee', 'aqua', 'sandwiches', 'desserts'));

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ingredients and nutrition.
-- ─────────────────────────────────────────────────────────────────────────────

-- `description` stays the short narrative line. `ingredients` is the literal
-- list, kept separate so the menu can show a written description and a factual
-- ingredient list without one having to serve as both.
alter table public.menu_items add column if not exists ingredients text;

-- Per served item, as prepared with the default milk/size. Nullable = not yet
-- measured. Non-negative, and capped at values no single café item can exceed,
-- so a decimal-point slip (1800 kcal for 180) fails at write time.
alter table public.menu_items add column if not exists calories  integer;
alter table public.menu_items add column if not exists protein_g numeric(5,1);
alter table public.menu_items add column if not exists carbs_g   numeric(5,1);
alter table public.menu_items add column if not exists fat_g     numeric(5,1);

alter table public.menu_items drop constraint if exists menu_items_calories_check;
alter table public.menu_items add constraint menu_items_calories_check
  check (calories is null or (calories >= 0 and calories <= 2000));

alter table public.menu_items drop constraint if exists menu_items_macros_check;
alter table public.menu_items add constraint menu_items_macros_check
  check (
        (protein_g is null or (protein_g >= 0 and protein_g <= 200))
    and (carbs_g   is null or (carbs_g   >= 0 and carbs_g   <= 200))
    and (fat_g     is null or (fat_g     >= 0 and fat_g     <= 200))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. An available item must have a real price.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- 007 loads several items whose price is not confirmed yet. They go in with
-- price 0 and is_available = false, so RLS ("select using is_available = true")
-- keeps them off the site entirely. This constraint is the guard rail on that
-- arrangement: flipping one of them visible without first setting its price
-- fails loudly here instead of quietly listing a 0.000 drink.
alter table public.menu_items drop constraint if exists menu_items_available_has_price;
alter table public.menu_items add constraint menu_items_available_has_price
  check (not is_available or price > 0);
