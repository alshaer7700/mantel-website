-- 008: remove a permissive menu_items policy that was never in this repo.
--
-- Found while verifying 007 against production. The live database carried TWO
-- select policies on menu_items:
--
--   menu_items_public_select   using (is_available = true)   -- schema.sql
--   public_read_menu_items     using (true)                  -- added out-of-band
--
-- Postgres ORs permissive policies for the same command together, so
-- `true OR is_available` evaluates to true for every row and the second policy
-- silently cancelled the first. is_available had stopped meaning anything to
-- the public API: anon could read every row in the table.
--
-- That mattered immediately, because 007 loads eleven items with price 0 and
-- is_available = false on the understanding that RLS keeps them off the site.
-- With the permissive policy in place they would have listed at "0.000".
--
-- The narrow policy is left in place and is the one the site has always been
-- documented to rely on. Available items stay readable, so nothing the site
-- shows today changes.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → … → 007 → 008.
-- (On a fresh database this is a no-op: the policy it drops is not in schema.sql.)

drop policy if exists "public_read_menu_items" on public.menu_items;

-- Verification: exactly one select policy should remain, gated on is_available.
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy
where polrelid = 'public.menu_items'::regclass;
