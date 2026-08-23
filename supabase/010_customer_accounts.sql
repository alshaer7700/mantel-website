-- 010: customer accounts.
--
-- Roadmap Phase 5. Three things, in the order they depend on each other:
--
--   1. profiles   a row per auth user, holding the details a customer would
--                 otherwise retype at every checkout
--   2. orders.user_id + a select policy, so an account has a history to show
--   3. place_order stamps the order with auth.uid() when there is one
--
-- ⚠ THIS MIGRATION DOES NOT ENABLE SIGNUP. Public signup is disabled on the
--   project (audit M-6, done and verified 2026-07-10, on the reasoning that an
--   open door to auth.users is dangerous the moment any policy references the
--   authenticated role — which, as of this migration, several do). Turning it
--   on is a dashboard change and a deliberate decision:
--
--     Dashboard → Authentication → Sign In / Up → enable email signups
--
--   Everything below is written so that flipping that switch is the only
--   remaining step, and so that nothing is exposed before it is flipped.
--
-- ⚠ IT ALSO DOES NOT LAUNCH ORDERING. EXECUTE on place_order stays revoked
--   (004, re-asserted in 005 and 009). An account can exist before ordering
--   does; the history simply stays empty until orders can be placed.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → … → 009 → 010.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Profiles.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Keyed BY auth.users.id rather than carrying its own id, so a profile cannot
-- exist without a user and cannot be pointed at the wrong one. ON DELETE
-- CASCADE means deleting the auth user really deletes their profile — which is
-- what a PDPL erasure request needs (Privacy #4, "no deletion workflow").

create table if not exists public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  full_name    text not null default '',
  phone        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Same shape rule as orders.customer_phone in 009: permissive on punctuation,
-- strict on length and digit count.
alter table public.profiles drop constraint if exists profiles_phone_shape;
alter table public.profiles add constraint profiles_phone_shape
  check (
    phone is null
    or (
      length(phone) between 6 and 24
      and phone ~ '^[+0-9 ()-]+$'
      and length(regexp_replace(phone, '[^0-9]', '', 'g')) between 6 and 15
    )
  );

alter table public.profiles drop constraint if exists profiles_name_length;
alter table public.profiles add constraint profiles_name_length
  check (length(full_name) <= 120);

alter table public.profiles enable row level security;

-- Own row only, on every verb. Note there is no policy for anon at all: a
-- signed-out visitor cannot see that a profile exists, let alone read one.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert to authenticated with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

-- No delete policy: a customer deletes their account, not their profile row,
-- and the cascade above handles the row. A DELETE here would let someone
-- orphan their orders' name while keeping the login.

revoke all on public.profiles from anon, authenticated;
grant select, insert, update on public.profiles to authenticated;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Orders belong to a user, when there is one.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- NULLABLE, and that is the whole design. Guest checkout must survive: the
-- roadmap's line is "never force signup for a coffee". A null user_id is an
-- order placed by someone who did not sign in, and it stays readable by nobody
-- through the API.
--
-- ON DELETE SET NULL rather than CASCADE: deleting an account must not delete
-- the café's financial record of what was sold. The order survives, detached.

alter table public.orders
  add column if not exists user_id uuid references auth.users(id) on delete set null;

create index if not exists orders_user_id_idx on public.orders (user_id)
  where user_id is not null;

-- The first select policy orders has ever had. Before this, orders had RLS on
-- with NO select policy at all, so no role could read any row through
-- PostgREST — deliberate (003). This opens exactly one door: your own orders,
-- and only when signed in.
drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own" on public.orders
  for select to authenticated using (auth.uid() = user_id);

-- Order lines follow the order they belong to. The EXISTS re-checks ownership
-- against orders rather than trusting a join, so a line cannot be read by
-- guessing its order_id.
drop policy if exists "order_items_select_own" on public.order_items;
create policy "order_items_select_own" on public.order_items
  for select to authenticated using (
    exists (
      select 1 from public.orders o
      where o.id = order_items.order_id
        and o.user_id = auth.uid()
    )
  );

-- SELECT only. Insert stays impossible for both roles: everything still goes
-- through place_order.
grant select on public.orders      to authenticated;
grant select on public.order_items to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. place_order stamps the order with the signed-in user, if any.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- auth.uid() is read INSIDE the function, never passed in as a parameter. A
-- user_id argument would let any caller claim any account's order history —
-- the same class of mistake as client-supplied prices, which is what 003
-- existed to fix.
--
-- Same six-argument signature as 009, so the grant line at the foot of that
-- file still names the right function.

create or replace function public.place_order(
  items          jsonb,
  customer_name  text default 'Guest',
  customer_email text default null,
  customer_phone text default null,
  payment_method text default 'cash',
  pickup_at      timestamptz default null
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_order_id      uuid := gen_random_uuid();
  computed_subtotal numeric(10,3);
  item_count        integer;
  valid_count       integer;
  client_ip         text;
begin
  if items is null or jsonb_typeof(items) <> 'array'
     or jsonb_array_length(items) not between 1 and 50 then
    raise exception 'order must contain between 1 and 50 line items';
  end if;

  if payment_method not in ('cash', 'card') then
    raise exception 'invalid payment method';
  end if;

  perform public.assert_valid_customer(customer_name, customer_email, customer_phone);
  perform public.assert_valid_pickup(pickup_at);

  client_ip := public.assert_within_rate_limits(customer_email);

  select count(*),
         count(*) filter (where s.id is not null and r.qty between 1 and 50),
         coalesce(sum(s.price * r.qty), 0)::numeric(10,3)
    into item_count, valid_count, computed_subtotal
  from jsonb_to_recordset(items) as r(menu_item_id uuid, qty integer)
  left join public.sellables s
    on s.id = r.menu_item_id and s.is_available;

  if valid_count <> item_count then
    raise exception 'order contains unknown, unavailable, or invalid-quantity items';
  end if;

  insert into public.orders (
    id, user_id, customer_name, customer_email, customer_phone,
    subtotal, payment_method, pickup_at
  )
  values (
    new_order_id,
    auth.uid(),                     -- null for a guest, and that is fine
    coalesce(nullif(btrim(customer_name), ''), 'Guest'),
    nullif(btrim(customer_email), ''),
    nullif(btrim(customer_phone), ''),
    computed_subtotal,
    payment_method,
    pickup_at
  );

  insert into public.order_items (order_id, menu_item_id, object_id, item_name, item_price, quantity)
  select new_order_id,
         case when s.kind = 'menu'   then s.id end,
         case when s.kind = 'object' then s.id end,
         s.name, s.price, r.qty
  from jsonb_to_recordset(items) as r(menu_item_id uuid, qty integer)
  join public.sellables s on s.id = r.menu_item_id;

  if client_ip <> 'unknown' then
    insert into public.order_ip_events (ip) values (client_ip);
  end if;

  delete from public.order_ip_events where created_at < now() - interval '1 day';

  return new_order_id;
end;
$$;

-- Still revoked. This migration does not launch ordering.
revoke execute on function
  public.place_order(jsonb, text, text, text, text, timestamptz)
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification. Expected: three own-row policies on profiles; one on orders and
-- one on order_items, both scoped to auth.uid(); anon holds nothing anywhere.
-- ─────────────────────────────────────────────────────────────────────────────
select relname, polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy p join pg_class c on c.oid = p.polrelid
where relname in ('profiles', 'orders', 'order_items')
order by relname, polname;

select
  has_table_privilege('anon', 'public.profiles', 'select') as anon_reads_profiles,
  has_table_privilege('anon', 'public.orders',   'select') as anon_reads_orders,
  has_function_privilege('anon',
    'public.place_order(jsonb,text,text,text,text,timestamptz)', 'execute') as anon_can_order;
