-- 011: remove two permissive INSERT policies that were never in this repo.
--
-- Found while verifying 010 against production. The live database carried, on
-- top of everything this repo creates:
--
--   orders.public_create_orders            INSERT  to anon, authenticated
--                                          with check (true)
--
--   order_items.public_create_order_items  INSERT  to anon, authenticated
--                                          with check (order exists)
--
-- These are the policies 003 dropped, re-added out of band under different
-- names. 003 exists precisely because client-priced anon inserts were the
-- project's only Critical finding: anyone holding the public anon key — which
-- ships in the JS bundle by design — could insert an order with any subtotal
-- and line items at any price.
--
-- WERE THEY LIVE? No. Verified at the time of writing:
--
--   has_table_privilege('anon',          'public.orders', 'insert')  = false
--   has_table_privilege('authenticated', 'public.orders', 'insert')  = false
--   (same for order_items)
--
-- RLS is necessary but not sufficient: a role needs BOTH the table-level grant
-- AND a permitting policy. 003's `revoke all` is what was actually holding the
-- line, and it held.
--
-- SO WHY DROP THEM? Because the line is held by one thread instead of two, and
-- the remaining thread is the one most likely to be cut by accident. At
-- ordering launch someone will be working through "why can't the site write an
-- order", and `grant insert on public.orders to anon` is the obvious-looking
-- fix. With these policies present that single statement silently restores
-- client-priced ordering. With them gone it grants a privilege that no policy
-- permits, and the insert still fails — which is the correct outcome, because
-- orders must go through place_order.
--
-- This is the second instance of the same drift (see 008, which removed a
-- permissive SELECT policy on menu_items added the same way). Two occurrences
-- is a pattern: something outside this repo — a dashboard template, an
-- assistant, or a "make it work" session — is adding permissive policies. The
-- verification queries at the foot of this file are worth re-running after any
-- work done outside version control.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → … → 010 → 011.
-- (On a fresh database this is a no-op: neither policy is created by this repo.)

drop policy if exists "public_create_orders"      on public.orders;
drop policy if exists "public_create_order_items" on public.order_items;

-- Re-assert the grants 003 set, in case the same hand that added the policies
-- also added privileges. SELECT for authenticated is 010's, and stays.
revoke insert, update, delete on public.orders      from anon, authenticated;
revoke insert, update, delete on public.order_items from anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification.
--
-- Expected policies after this runs — and NOTHING else on these two tables:
--   orders.orders_select_own             SELECT  authenticated  auth.uid() = user_id
--   order_items.order_items_select_own   SELECT  authenticated  EXISTS(... auth.uid())
--
-- Any INSERT/UPDATE/DELETE policy appearing here again means the drift
-- happened again.
-- ─────────────────────────────────────────────────────────────────────────────
select
  c.relname as table_name,
  p.polname as policy,
  case p.polcmd when 'r' then 'SELECT' when 'a' then 'INSERT'
                when 'w' then 'UPDATE' when 'd' then 'DELETE' else 'ALL' end as command,
  coalesce((select string_agg(r.rolname, ',') from pg_roles r where r.oid = any(p.polroles)),
           'PUBLIC (all roles)') as applies_to
from pg_policy p
join pg_class c on c.oid = p.polrelid
where c.relname in ('orders', 'order_items')
order by c.relname, p.polname;

select
  has_table_privilege('anon',          'public.orders',      'insert') as anon_insert_orders,
  has_table_privilege('authenticated', 'public.orders',      'insert') as auth_insert_orders,
  has_table_privilege('anon',          'public.order_items', 'insert') as anon_insert_items,
  has_table_privilege('authenticated', 'public.order_items', 'insert') as auth_insert_items;
