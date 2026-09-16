-- 023: fix the ambiguous client_ip reference in subscribe_newsletter, and
--      bring the newsletter limiter into the repo.
--
-- TWO THINGS ARE WRONG, AND THE SECOND IS WHY THE FIRST WENT UNNOTICED.
--
-- 1. A rate-limited subscribe_newsletter was applied directly to the live
--    project and never committed here. The repo's copy (015) still shows the
--    unlimited version, so this file is also the migration that stops the two
--    from disagreeing. What it creates below IS what production already has,
--    except for the fix in (2).
--
-- 2. That live version raises 42702 — 'column reference "client_ip" is
--    ambiguous' — for every visitor who arrives with a real IP, which is every
--    visitor. The per-IP check reads:
--
--        where e.client_ip = client_ip          -- ← the bug
--
--    with `client_ip` also the name of a plpgsql variable in the same scope.
--    Postgres defaults to plpgsql.variable_conflict = error, so it refuses to
--    guess and aborts the function. The branch is guarded by
--    `if client_ip <> 'unknown'`, which is precisely why nobody caught it: run
--    from the SQL editor there is no request.headers, request_client_ip()
--    returns 'unknown', the branch is skipped and the function returns true.
--    It only fails behind PostgREST — that is, only in production.
--
--    Verified rather than assumed: the live source was transcribed into a
--    local PG16, called once with no headers (returned true) and once with
--    cf-connecting-ip set (raised 42702 at the per-IP select).
--
--    The consequence on the site: 42702 is not PT429, so src/lib/api/errors.ts
--    classifies it as `unknown` and the signup form says "Something went wrong
--    on our end" to everyone, forever. newsletter_rate_events holding 0 rows
--    while newsletter_subscribers holds 1 is the fingerprint of exactly that.
--
--    This repo already knew about this trap. supabase/005 documents it for
--    place_order ("an unqualified reference below is ambiguous (42702) and
--    every order fails") and 019 avoids it by prefixing the variable v_. The
--    fix here is the same one: v_client_ip, so a plpgsql variable can never
--    again be confused with a column of the table being counted.
--
-- The limits themselves are NOT changed — 5 per IP and 100 site-wide per 10
-- minutes, as deployed. This migration makes them work, it does not retune
-- them.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Where the counter lives.
--
-- Already present on the live project; written idempotently so a fresh
-- database applying the chain in order arrives at the same place.
--
-- A separate table rather than a client_ip column on newsletter_subscribers,
-- for the reason 005 gives for orders: a column there would attach a network
-- identifier to a subscriber for as long as the subscription is kept. This
-- holds an IP and a timestamp, is never joined back to an email, and is pruned
-- to 24 hours on every successful call.
--
-- Separate from order_ip_events rather than shared, so a customer placing
-- orders cannot exhaust their own newsletter budget, or the reverse.
--
-- RLS on with zero policies and zero grants: unreachable through PostgREST
-- under anon or authenticated. Only the SECURITY DEFINER function below,
-- running as owner, touches it.
create table if not exists public.newsletter_rate_events (
  id         bigserial primary key,
  client_ip  text        not null,
  created_at timestamptz not null default now()
);

alter table public.newsletter_rate_events enable row level security;
revoke all on public.newsletter_rate_events from public, anon, authenticated;
revoke all on sequence public.newsletter_rate_events_id_seq from public, anon, authenticated;

create index if not exists newsletter_rate_events_ip_created_idx
  on public.newsletter_rate_events (client_ip, created_at desc);
create index if not exists newsletter_rate_events_created_idx
  on public.newsletter_rate_events (created_at desc);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. The function.
--
-- request_client_ip() is the helper from 005/017: it prefers cf-connecting-ip
-- (rewritten by the edge on every request, so a client cannot forge it) and
-- falls back to the LAST element of x-forwarded-for. Do not reimplement it
-- here, and in particular do not read the first x-forwarded-for element —
-- that is a one-header bypass.
create or replace function public.subscribe_newsletter(subscriber_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  -- EVERY LOCAL HERE IS v_-PREFIXED, INCLUDING THE ONES THAT DO NOT COLLIDE
  -- TODAY. The bug this migration fixes was one variable sharing a name with
  -- one column; a convention that only applies to names known to clash has to
  -- be re-reasoned every time a column is added, and that is the reasoning
  -- that already failed once. See 019, which prefixes for the same reason.
  v_normalized   text := lower(btrim(coalesce(subscriber_email, '')));
  v_client_ip    text := public.request_client_ip();
  v_recent_count integer;

  -- Tuning lives here, as it does in 005 and 009. These are the values already
  -- deployed; this file does not change them.
  --
  -- 5 per IP is deliberately tighter than orders (6) and contact (6): six
  -- people ordering from the café's own wifi is an ordinary lunch rush, six
  -- people subscribing to a newsletter from one address inside ten minutes is
  -- not something that happens.
  v_per_ip       constant integer  := 5;

  -- A circuit breaker, not a per-customer rule, set well above any real signup
  -- rate — this list grows by a handful a day. The trade-off, written down
  -- rather than hidden: if a launch post ever did drive 100 genuine signups
  -- inside ten minutes, the last of them are told to try again shortly. That
  -- is the right way round. A subscriber who retries in a minute is
  -- recoverable; a list poisoned by a flood is not.
  v_global       constant integer  := 100;

  v_window       constant interval := interval '10 minutes';
begin
  if v_normalized = '' or length(v_normalized) > 254
     or v_normalized !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address';
  end if;

  -- ── rate limiting ──
  --
  -- Both counters read COMMITTED rows only, and that is forced rather than
  -- chosen: a rejection raises, which rolls the transaction back, so a row
  -- written to record a REJECTED attempt would vanish with it (Postgres has no
  -- autonomous transactions). These therefore count calls that actually
  -- landed. A bot's rejected calls are free, but it can never get past the Nth
  -- successful one in a window — which is the property that bounds the table.
  --
  -- PT429 so PostgREST answers 429 rather than a generic 400. errors.ts maps
  -- that code to the `rate-limited` AppError and shows the message verbatim,
  -- so both sentences below are written for a customer to read. (A 42702, by
  -- contrast, lands in `unknown` and shows the generic apology — which is the
  -- whole story of this migration.)

  -- Serialises the global check against concurrent callers. Without it, N
  -- requests arriving together all read a count below the threshold and all
  -- pass, which is exactly the burst the breaker exists to stop. Transaction-
  -- scoped, so it is released by the commit or the rollback either way.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('mantel:newsletter:global:v1', 0)
  );

  select count(*) into v_recent_count
  from public.newsletter_rate_events e
  where e.created_at > now() - v_window;

  if v_recent_count >= v_global then
    raise exception 'newsletter sign-up is busy — please try again in a few minutes'
      using errcode = 'PT429';
  end if;

  -- 'unknown' means the header was not readable (the SQL editor, or an edge
  -- that stopped sending it). Skipped rather than bucketed under one key:
  -- bucketing would let one such caller exhaust a shared counter for everyone
  -- else in the same state.
  if v_client_ip <> 'unknown' then
    select count(*) into v_recent_count
    from public.newsletter_rate_events e
    where e.client_ip = v_client_ip          -- ← the line 42702 was raised on
      and e.created_at > now() - v_window;

    if v_recent_count >= v_per_ip then
      raise exception 'too many sign-up attempts — please try again in a few minutes'
        using errcode = 'PT429';
    end if;
  end if;

  insert into public.newsletter_subscribers (email, subscribed_at, status)
  values (v_normalized, now(), 'active')
  on conflict (email) do update
    set subscribed_at = now(), status = 'active';

  -- Recorded for EVERY landed call, 'unknown' included. The per-IP check above
  -- skips those rows by looking for a specific address, but the global breaker
  -- counts them — and a flood that arrives without a readable IP is precisely
  -- the flood the breaker is for.
  --
  -- Commits with the upsert above, so the counter only ever reflects calls
  -- that actually landed.
  insert into public.newsletter_rate_events (client_ip) values (v_client_ip);

  -- Opportunistic prune, as in 005. At this café's volume it touches a handful
  -- of rows on an indexed range and costs less than a scheduled job to
  -- maintain; if that ever stops being true, move it to pg_cron.
  delete from public.newsletter_rate_events where created_at < now() - interval '1 day';

  return true;
end;
$$;

-- create or replace preserves existing grants; re-asserted so a fresh database
-- applying this file in order ends up in the same state as the live one.
revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
