-- 005: in-function rate limiting for place_order (SECURITY-AUDIT-AND-ROADMAP.md H-1).
--
-- H-1's "fix (at launch)" offers two options: Cloudflare Turnstile verified in
-- an Edge Function, or "at minimum a per-email/per-interval check inside the
-- function (e.g. reject >3 orders per email per 10 min)". This is that minimum,
-- plus the two limits it needs to not be trivially sidestepped:
--
--   per email   >3 per 10 min   the roadmap's stated rule
--   per IP      >6 per 10 min   customer_email is nullable — without this, a bot
--                               omits the email and the per-email rule never fires
--   global     >60 per 10 min   circuit breaker; ~10x a real peak for one café,
--                               so it only trips on a flood, never on a rush
--
-- This is defence in depth, NOT a replacement for Turnstile. A distributed bot
-- with fresh IPs and fresh emails still gets 3 orders per email per window. The
-- roadmap's acceptance test ("RPC call from a bare script fails without a valid
-- captcha token") is still only met by the Turnstile/Edge Function route — keep
-- that on the Phase 2 list. What this does buy: a single-source flood stops at
-- 6 orders instead of unbounded, and it holds the line even if the Edge Function
-- is bypassed and the RPC is called directly.
--
-- EXECUTE stays revoked (004). This migration does not launch ordering; it
-- removes one of the blockers in front of launching it. See the footer for the
-- one line to run when ordering actually opens.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → 003 → 004 → 005.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Where the per-IP counter lives.
--
-- orders has no IP column and shouldn't get one: that would attach a network
-- identifier to every order row for as long as the order is kept. This table
-- holds the IP and a timestamp, nothing else — deliberately NOT linked to
-- order_id, so it can't be joined back into "who ordered what". It is pruned to
-- 24h on every successful order (step 3), which also keeps it off the Privacy #3
-- retention backlog.
--
-- RLS on with zero policies + zero grants: unreachable from anon/authenticated
-- through PostgREST under any role. Only place_order (SECURITY DEFINER, runs as
-- owner) touches it.
create table if not exists public.order_ip_events (
  id         bigserial primary key,
  ip         text        not null,
  created_at timestamptz not null default now()
);

alter table public.order_ip_events enable row level security;
revoke all on public.order_ip_events from anon, authenticated;
revoke all on sequence public.order_ip_events_id_seq from anon, authenticated;

create index if not exists order_ip_events_ip_created_idx
  on public.order_ip_events (ip, created_at desc);
create index if not exists order_ip_events_created_idx
  on public.order_ip_events (created_at);

-- The per-email and global counters read straight from public.orders (it
-- already has customer_email and created_at), so they need no new storage —
-- just the indexes to keep the window queries off a sequential scan.
create index if not exists orders_created_at_idx
  on public.orders (created_at desc);
create index if not exists orders_email_created_idx
  on public.orders (lower(btrim(customer_email)), created_at desc)
  where customer_email is not null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Client IP, as reported by the edge in front of PostgREST.
create or replace function public.request_client_ip()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  headers jsonb;
  fwd     text;
begin
  -- Unset outside a PostgREST request (e.g. called from the SQL editor), and
  -- the cast fails loudly on anything unexpected — neither should take an
  -- order down, so both degrade to 'unknown'.
  begin
    headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  exception when others then
    return 'unknown';
  end;

  -- Cloudflare fronts the Supabase API edge and rewrites cf-connecting-ip on
  -- every request, so a client cannot forge it. Prefer it when present.
  if nullif(btrim(coalesce(headers ->> 'cf-connecting-ip', '')), '') is not null then
    return btrim(headers ->> 'cf-connecting-ip');
  end if;

  -- Fallback: x-forwarded-for. A client CAN prepend fake entries to this, but
  -- the edge appends the address it actually observed, so the LAST element is
  -- the trustworthy one. Reading the first element here would hand every bot a
  -- one-header bypass.
  fwd := headers ->> 'x-forwarded-for';
  if nullif(btrim(coalesce(fwd, '')), '') is not null then
    return btrim(split_part(fwd, ',', array_length(string_to_array(fwd, ','), 1)));
  end if;

  return 'unknown';
end;
$$;

revoke all on function public.request_client_ip() from public, anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Same function as 004, plus the three window checks.
create or replace function public.place_order(
  items          jsonb,               -- [{"menu_item_id": "<uuid>", "qty": 1}, ...]
  customer_name  text default 'Guest',
  customer_email text default null,
  payment_method text default 'card'
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

  -- Tuning lives here. Raising these is a one-line change; if they ever need to
  -- differ per category or per hour, that's the signal to move to Turnstile
  -- rather than to grow a rules engine in plpgsql.
  rl_window    constant interval := interval '10 minutes';
  rl_per_email constant integer  := 3;
  rl_per_ip    constant integer  := 6;
  rl_global    constant integer  := 60;

  client_ip    text;
  norm_email   text;
  recent_count integer;
begin
  if items is null or jsonb_typeof(items) <> 'array'
     or jsonb_array_length(items) not between 1 and 50 then
    raise exception 'order must contain between 1 and 50 line items';
  end if;

  if length(coalesce(customer_name, '')) > 120
     or length(coalesce(customer_email, '')) > 254 then
    raise exception 'customer details too long';
  end if;

  if nullif(btrim(coalesce(customer_email, '')), '') is not null
     and btrim(customer_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address';
  end if;

  if payment_method not in ('cash', 'card') then
    raise exception 'invalid payment method';
  end if;

  -- ── rate limiting (H-1) ──
  --
  -- All three counters read COMMITTED rows only. That is forced, not chosen: a
  -- rejection raises, which rolls the whole transaction back, so anything
  -- written to record a *rejected* attempt would vanish with it (Postgres has
  -- no autonomous transactions). So these count orders that actually landed.
  -- The practical consequence: a bot's rejected calls are free, but it can
  -- never get past the Nth successful order in a window, which is the property
  -- that matters.
  --
  -- Raised with SQLSTATE PT429 so PostgREST answers 429 Too Many Requests
  -- rather than a generic 400 — the client can then tell "slow down" apart
  -- from "your order is malformed".

  client_ip  := public.request_client_ip();
  norm_email := lower(nullif(btrim(coalesce(customer_email, '')), ''));

  -- The orders alias is load-bearing: this function has a customer_email
  -- PARAMETER and public.orders has a customer_email COLUMN, so an unqualified
  -- reference below is ambiguous (42702) and every order fails. Alias both
  -- reads from orders rather than relying on which one plpgsql resolves first.
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

  select count(*),
         count(*) filter (where m.id is not null and r.qty between 1 and 50),
         coalesce(sum(m.price * r.qty), 0)::numeric(10,3)
    into item_count, valid_count, computed_subtotal
  from jsonb_to_recordset(items) as r(menu_item_id uuid, qty integer)
  left join public.menu_items m
    on m.id = r.menu_item_id and m.is_available;

  if valid_count <> item_count then
    raise exception 'order contains unknown, unavailable, or invalid-quantity items';
  end if;

  insert into public.orders (id, customer_name, customer_email, subtotal, payment_method)
  values (
    new_order_id,
    coalesce(nullif(btrim(customer_name), ''), 'Guest'),
    nullif(btrim(customer_email), ''),
    computed_subtotal,
    payment_method
  );

  insert into public.order_items (order_id, menu_item_id, item_name, item_price, quantity)
  select new_order_id, m.id, m.name, m.price, r.qty
  from jsonb_to_recordset(items) as r(menu_item_id uuid, qty integer)
  join public.menu_items m on m.id = r.menu_item_id;

  -- Commits with the order above, so the per-IP counter only ever reflects
  -- orders that actually landed.
  if client_ip <> 'unknown' then
    insert into public.order_ip_events (ip) values (client_ip);
  end if;

  -- Opportunistic prune. At this café's volume this touches a handful of rows
  -- on an indexed range and costs less than a scheduled job to maintain; if
  -- order volume ever makes that untrue, move it to pg_cron.
  delete from public.order_ip_events where created_at < now() - interval '1 day';

  return new_order_id;
end;
$$;

-- create or replace preserves existing grants, so re-assert 004's revoke: this
-- migration is not the thing that opens ordering.
revoke execute on function public.place_order(jsonb, text, text, text)
  from public, anon, authenticated;

-- ⚠ AT ORDERING LAUNCH, and only after the flood test in the roadmap's
--   pre-launch checklist passes ("20 rapid orders → rate limit trips"):
--     grant execute on function public.place_order(jsonb, text, text, text)
--       to anon, authenticated;
