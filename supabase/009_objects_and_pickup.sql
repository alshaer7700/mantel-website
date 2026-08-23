-- 009: the objects shelf, mixed bags, and the two checkout fields the site
--      collects but the schema had nowhere to put.
--
-- Four things change, plus one piece of overdue housekeeping:
--
-- 0. HOUSEKEEPING. place_order's body has been pasted whole into 003, 004 and
--    005 — by now the item-validation block exists in three files verbatim and
--    the rate-limit block in one. This migration would have been the fourth
--    copy. Instead the shared parts move into helper functions and place_order
--    becomes a short function that calls them. Future migrations replace a
--    helper, not the world.
--
-- 1. OBJECTS. The café sells candles, matches, lighters and whole beans
--    alongside the drinks. They are NOT a sixth menu_items category: that
--    table's `category` values double as URL segments (/menu/not-coffee) and
--    its columns are calories and macros, which mean nothing on a lighter.
--    New table, same RLS shape as menu_items.
--
-- 2. MIXED BAGS. Someone orders a flat white and a candle in one go.
--    place_order resolves prices from menu_items only, so that order is
--    rejected today. A `sellables` view unions the two tables and the function
--    prices against it — so pricing stays server-side for both, which is the
--    whole point of 003.
--
-- 3. PICKUP DETAILS. `orders` gains customer_phone and pickup_at. The site's
--    checkout asks for a mobile and a collection time; until now there was
--    nowhere to store either, so both would have been dropped on the floor.
--
-- EXECUTE stays revoked. This migration does not launch ordering — see 004's
-- footer and the note at the bottom of this file.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → … → 008 → 009.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Objects: the retail shelf.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.objects (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  -- The one-line spec printed under the name: "Soy wax · 220g · 45 hrs".
  -- Free text on purpose — these vary too much to normalise, and nothing
  -- computes on them.
  spec         text not null default '',
  description  text not null default '',
  price        numeric(10,3) not null check (price >= 0),
  image_url    text,
  -- Which line drawing stands in for the object until a photograph exists.
  -- The app holds the SVG for each key; an unknown key renders no drawing
  -- rather than breaking the card, so this is deliberately unconstrained.
  art_key      text,
  is_available boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Same guard rail as menu_items (006 §3). The real object list is confirmed
-- but its prices are not, so rows land with price 0 and is_available = false
-- and stay off the site until someone sets a price. Flipping one visible
-- without pricing it fails here instead of listing a candle at 0.000.
alter table public.objects drop constraint if exists objects_available_has_price;
alter table public.objects add constraint objects_available_has_price
  check (not is_available or price > 0);

create index if not exists objects_sort_idx on public.objects (sort_order);

-- RLS identical in shape to menu_items: available rows readable by anyone,
-- writable by no one through the Data API. Note there is exactly ONE select
-- policy — 008 exists because a second, permissive one was added out of band
-- and ORed with the narrow one until is_available meant nothing.
alter table public.objects enable row level security;
drop policy if exists "objects_public_select" on public.objects;
create policy "objects_public_select" on public.objects
  for select using (is_available = true);

revoke all on public.objects from anon, authenticated;
grant select on public.objects to anon, authenticated;

-- updated_at honesty, using the trigger function 004 already created.
drop trigger if exists objects_set_updated_at on public.objects;
create trigger objects_set_updated_at
  before update on public.objects
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Everything the café can sell, as one relation.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- place_order needs a single place to resolve "id → name, price, available?"
-- so that a bag mixing drinks and objects prices in one pass.
--
-- Deliberately NOT granted to anon: the site reads menu_items and objects
-- separately (they render as different things, with different columns), and
-- the only caller that needs the union is place_order, which is SECURITY
-- DEFINER and runs as the owner. Granting it would widen the public API for
-- no reader.
create or replace view public.sellables as
  select id, name, price, is_available, 'menu'::text   as kind from public.menu_items
  union all
  select id, name, price, is_available, 'object'::text as kind from public.objects;

revoke all on public.sellables from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. order_items can now point at an object.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.order_items
  add column if not exists object_id uuid references public.objects(id) on delete set null;

create index if not exists order_items_object_id_idx on public.order_items(object_id);

-- AT MOST one, not exactly one. Both foreign keys are ON DELETE SET NULL, so
-- deleting a delisted product nulls the reference and leaves a row with
-- neither set — item_name and item_price are copied at order time precisely so
-- that row still reads correctly. An "exactly one" constraint would make that
-- existing, intended behaviour a violation.
alter table public.order_items drop constraint if exists order_items_one_product_ref;
alter table public.order_items add constraint order_items_one_product_ref
  check (num_nonnulls(menu_item_id, object_id) <= 1);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Pickup details on the order.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.orders add column if not exists customer_phone text;
alter table public.orders add column if not exists pickup_at      timestamptz;

-- Permissive on shape, strict on length and on containing a plausible number
-- of digits. Bahrain mobiles are +973 plus 8 digits, but customers type
-- spaces, dashes, brackets and sometimes a local 8-digit number with no code,
-- and rejecting those at the database is how you lose an order over
-- punctuation. The check exists to stop junk and overlong input, not to parse.
alter table public.orders drop constraint if exists orders_phone_shape;
alter table public.orders add constraint orders_phone_shape
  check (
    customer_phone is null
    or (
      length(customer_phone) between 6 and 24
      and customer_phone ~ '^[+0-9 ()-]+$'
      and length(regexp_replace(customer_phone, '[^0-9]', '', 'g')) between 6 and 15
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. The helpers that stop place_order being pasted a fourth time.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- None of these are SECURITY DEFINER: they are called from inside place_order,
-- which is, so they already run as the owner. Each has EXECUTE revoked so it
-- cannot be called directly through PostgREST — they raise on bad input and
-- return nothing useful to an attacker, but an ungranted function is one less
-- thing to reason about.

-- 5a. Customer details. Was inline in 003 (length), 004 (+ email format),
--     005 (same again). Now one place, plus the phone rule from §4.
create or replace function public.assert_valid_customer(
  customer_name  text,
  customer_email text,
  customer_phone text
) returns void
language plpgsql
immutable
set search_path = ''
as $$
begin
  if length(coalesce(customer_name, '')) > 120
     or length(coalesce(customer_email, '')) > 254 then
    raise exception 'customer details too long';
  end if;

  if nullif(btrim(coalesce(customer_email, '')), '') is not null
     and btrim(customer_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address';
  end if;

  if nullif(btrim(coalesce(customer_phone, '')), '') is not null
     and (
       length(btrim(customer_phone)) not between 6 and 24
       or btrim(customer_phone) !~ '^[+0-9 ()-]+$'
       or length(regexp_replace(customer_phone, '[^0-9]', '', 'g')) not between 6 and 15
     ) then
    raise exception 'invalid mobile number';
  end if;
end;
$$;

revoke execute on function public.assert_valid_customer(text, text, text)
  from public, anon, authenticated;

-- 5b. The collection time. New in this migration.
create or replace function public.assert_valid_pickup(pickup_at timestamptz)
returns void
language plpgsql
stable
set search_path = ''
as $$
begin
  if pickup_at is null then
    return;  -- "as soon as it's ready" stays a valid answer
  end if;

  -- A small backward tolerance absorbs clock skew between the customer's
  -- device and the server; without it an order placed for "the next slot"
  -- can be rejected for being one second in the past.
  if pickup_at < now() - interval '5 minutes' then
    raise exception 'pickup time is in the past';
  end if;

  if pickup_at > now() + interval '24 hours' then
    raise exception 'pickup time is too far ahead';
  end if;
end;
$$;

revoke execute on function public.assert_valid_pickup(timestamptz)
  from public, anon, authenticated;

-- 5c. The three rate-limit windows from 005, moved wholesale. Returns the
--     client IP so the caller can record the event after the order lands —
--     see the note in 005 about why rejected attempts cannot be recorded.
create or replace function public.assert_within_rate_limits(customer_email text)
returns text
language plpgsql
set search_path = ''
as $$
declare
  -- Tuning lives here, as it did in 005. Raising these is a one-line change;
  -- if they ever need to differ per category or per hour, that is the signal
  -- to move to Turnstile rather than to grow a rules engine in plpgsql.
  rl_window    constant interval := interval '10 minutes';
  rl_per_email constant integer  := 3;
  rl_per_ip    constant integer  := 6;
  rl_global    constant integer  := 60;

  client_ip    text;
  norm_email   text;
  recent_count integer;
begin
  client_ip  := public.request_client_ip();
  norm_email := lower(nullif(btrim(coalesce(customer_email, '')), ''));

  -- The orders alias is load-bearing: this function has a customer_email
  -- PARAMETER and public.orders has a customer_email COLUMN, so an unqualified
  -- reference is ambiguous (42702) and every order fails.
  select count(*) into recent_count
  from public.orders o
  where o.created_at > now() - rl_window;

  if recent_count >= rl_global then
    raise exception 'ordering is temporarily paused — please try again in a few minutes'
      using errcode = 'PT429';
  end if;

  -- 'unknown' means the header wasn't readable (SQL editor, or an edge that
  -- stopped sending it). Skipped rather than bucketed: bucketing would let one
  -- such caller exhaust a shared counter for everyone else in the same state.
  if client_ip <> 'unknown' then
    select count(*) into recent_count
    from public.order_ip_events
    where ip = client_ip
      and created_at > now() - rl_window;

    if recent_count >= rl_per_ip then
      raise exception 'too many orders from this device — please try again in a few minutes'
        using errcode = 'PT429';
    end if;
  end if;

  -- Counts landed orders, not attempts, so a stranger cannot lock a real
  -- customer's address out by spamming it.
  if norm_email is not null then
    select count(*) into recent_count
    from public.orders o
    where o.customer_email is not null
      and lower(btrim(o.customer_email)) = norm_email
      and o.created_at > now() - rl_window;

    if recent_count >= rl_per_email then
      raise exception 'too many orders for this email — please try again in a few minutes'
        using errcode = 'PT429';
    end if;
  end if;

  return client_ip;
end;
$$;

revoke execute on function public.assert_within_rate_limits(text)
  from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. place_order, rebuilt on the helpers and the sellables view.
-- ─────────────────────────────────────────────────────────────────────────────
--
-- ⚠ SIGNATURE CHANGE. Postgres overloads by argument list, so CREATE OR
--   REPLACE with two extra parameters would leave the OLD 4-argument function
--   in place, carrying its own grants, callable independently of everything
--   below. It has to be dropped explicitly. Do this before creating the new
--   one so there is never a window with both.
drop function if exists public.place_order(jsonb, text, text, text);

create or replace function public.place_order(
  items          jsonb,               -- [{"menu_item_id": "<uuid>", "qty": 1}, ...]
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

  -- The parameter is still called menu_item_id even though it may now name a
  -- row in `objects`: renaming it would break every existing caller for a
  -- cosmetic gain. It is an id in `sellables`, which is what the join says.
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
    id, customer_name, customer_email, customer_phone, subtotal, payment_method, pickup_at
  )
  values (
    new_order_id,
    coalesce(nullif(btrim(customer_name), ''), 'Guest'),
    nullif(btrim(customer_email), ''),
    nullif(btrim(customer_phone), ''),
    computed_subtotal,
    payment_method,
    pickup_at
  );

  -- kind decides which column the reference lands in, so a candle is recorded
  -- as an object and a latte as a menu item, and the at-most-one constraint in
  -- §3 holds by construction.
  insert into public.order_items (order_id, menu_item_id, object_id, item_name, item_price, quantity)
  select new_order_id,
         case when s.kind = 'menu'   then s.id end,
         case when s.kind = 'object' then s.id end,
         s.name, s.price, r.qty
  from jsonb_to_recordset(items) as r(menu_item_id uuid, qty integer)
  join public.sellables s on s.id = r.menu_item_id;

  -- Commits with the order above, so the per-IP counter only ever reflects
  -- orders that actually landed.
  if client_ip <> 'unknown' then
    insert into public.order_ip_events (ip) values (client_ip);
  end if;

  -- Opportunistic prune, as in 005.
  delete from public.order_ip_events where created_at < now() - interval '1 day';

  return new_order_id;
end;
$$;

-- The drop above took the old function's grants with it, and a fresh CREATE
-- grants EXECUTE to public by default. Revoke it: this migration does not
-- launch ordering.
revoke execute on function
  public.place_order(jsonb, text, text, text, text, timestamptz)
  from public, anon, authenticated;

-- ⚠ AT ORDERING LAUNCH, and only after the flood test in the roadmap's
--   pre-launch checklist passes ("20 rapid orders → rate limit trips"):
--     grant execute on function
--       public.place_order(jsonb, text, text, text, text, timestamptz)
--       to anon, authenticated;
--   Note the signature has SIX arguments now. The four-argument grant line
--   printed in 004 and 005 refers to a function that no longer exists and
--   will fail if pasted.

-- ─────────────────────────────────────────────────────────────────────────────
-- Verification. Expected, in order: one select policy on objects gated on
-- is_available; exactly one place_order, with six arguments; no EXECUTE for
-- anon on it.
-- ─────────────────────────────────────────────────────────────────────────────
select polname, pg_get_expr(polqual, polrelid) as using_expr
from pg_policy where polrelid = 'public.objects'::regclass;

select p.oid::regprocedure as signature
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and p.proname = 'place_order';

select has_function_privilege('anon',
  'public.place_order(jsonb, text, text, text, text, timestamptz)', 'execute') as anon_can_execute;
