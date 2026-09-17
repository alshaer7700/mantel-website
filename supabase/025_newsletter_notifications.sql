-- 025: tell someone when a newsletter subscriber arrives.
--
-- The third and last of the notification trio — 022 for contact messages, 024
-- for orders, this for subscribers. Same shape deliberately: trigger -> pg_net
-- async POST -> newsletter-notify Edge Function -> Resend -> hello@bymantel.com.
-- Both of 022's rules carry over: the notification can never cost the
-- subscriber their signup (every failure swallowed and logged as a WARNING),
-- and no secrets in git (URL and shared secret live in Vault, read at trigger
-- time, absent config = the trigger quietly does nothing).
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHAT COUNTS AS A SIGNUP, AND WHY THIS IS NOT `after insert` ALONE
--
-- subscribe_newsletter (023) does not insert. It UPSERTS:
--
--     insert into public.newsletter_subscribers (email, subscribed_at, status)
--     values (...)
--     on conflict (email) do update
--       set subscribed_at = now(), status = 'active';
--
-- So the row a signup produces depends on whether that address is already
-- known, and an `after insert` trigger alone would silently miss a case:
--
--   address is new           -> INSERT  -> a genuinely new subscriber. Notify.
--   known, already active    -> UPDATE  -> somebody pressed the button twice,
--                                          or refreshed the page. Nothing has
--                                          changed but subscribed_at. NOISE.
--   known, was unsubscribed  -> UPDATE  -> they left and came back. That is a
--                                          real event and worth knowing about.
--
-- Hence `after insert or update`, with the update arm narrowed to the status
-- transition that actually means something. Firing on every update would email
-- the café once per duplicate button press — and since 023 permits 5 calls per
-- IP per 10 minutes, one bored visitor could send five identical emails.
--
-- The narrow condition also covers the admin path: admin_update_newsletter_status
-- (021) can flip a subscriber back to active, which fires this. That is correct
-- — it is the same event, reached by a different door — but worth knowing when
-- you see a notification nobody on the website caused.
--
-- No deferred constraint trigger here, unlike 024. That one exists because an
-- order is written across two tables and the lines arrive after the header;
-- a subscriber is one row in one table, so there is nothing to wait for.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: ... -> 022 -> 023 -> 024 -> 025.
--
-- ── Setup ──
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/newsletter-notify',
--     'newsletter_notify_url', 'newsletter-notify endpoint (025)');
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
--     'newsletter_notify_secret', 'shared secret for newsletter-notify (025)');
-- Then set NEWSLETTER_NOTIFY_SECRET (the same value) as an Edge Function secret
-- in the dashboard. RESEND_API_KEY is already set and shared. Read the Vault
-- value back with:
--   select decrypted_secret from vault.decrypted_secrets
--   where name = 'newsletter_notify_secret';

-- Already installed by 022; repeated so a fresh database can apply this file on
-- its own. See 022 for why `with schema extensions` is load-bearing.
create extension if not exists pg_net with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- The trigger function.
--
-- SECURITY DEFINER because vault.decrypted_secrets is not readable by the roles
-- that reach this through subscribe_newsletter. search_path is pinned empty per
-- this project's convention, so every name below is qualified.
create or replace function public.notify_newsletter_subscriber()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
  v_kind   text;
  v_total  integer;
begin
  -- Which of the three cases in the header this is. TG_OP is 'INSERT' only for
  -- a genuinely new address; the update trigger is already narrowed by its WHEN
  -- clause, so reaching here on an UPDATE means a real return.
  v_kind := case when tg_op = 'INSERT' then 'new' else 'returning' end;

  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'newsletter_notify_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'newsletter_notify_secret';

  -- Not configured yet. Not an error: the subscriber is saved either way.
  if v_url is null or v_secret is null then
    raise warning 'notify_newsletter_subscriber: vault config missing, skipping notification for %', new.email;
    return new;
  end if;

  -- Counted here rather than in the Edge Function, which would otherwise need
  -- a service-role key and a second round trip just to say "that makes 43".
  select count(*) into v_total
  from public.newsletter_subscribers s
  where s.status = 'active';

  -- Async: pg_net queues the request and returns immediately, so the visitor's
  -- signup never waits on Resend.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-newsletter-notify-secret', v_secret
    ),
    body    := jsonb_build_object(
      'record', jsonb_build_object(
        'email',         new.email,
        'subscribed_at', new.subscribed_at,
        'kind',          v_kind,
        'active_total',  v_total
      )
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    -- Rule 1. Never let a notification failure roll back the signup.
    raise warning 'notify_newsletter_subscriber: notification failed for % (%)', new.email, sqlerrm;
    return new;
end;
$$;

revoke all on function public.notify_newsletter_subscriber() from public, anon, authenticated;

-- TWO TRIGGERS, ONE FUNCTION, and not by preference.
--
-- The obvious single `after insert or update ... when (...)` does not compile.
-- A WHEN clause is plain SQL, not plpgsql: TG_OP is not in scope there, and
-- OLD does not exist for an INSERT, so any condition naming OLD is rejected on
-- a trigger that also fires on INSERT. Postgres is right to refuse — there is
-- no OLD row to compare against.
--
-- Splitting by operation gives each arm exactly the rows it can talk about.
-- The shared function reads TG_OP (which IS in scope inside plpgsql) to tell
-- the two apart for the subject line.
drop trigger if exists newsletter_subscribers_notify on public.newsletter_subscribers;

-- A new address. Always a real signup, so no condition.
drop trigger if exists newsletter_subscribers_notify_insert on public.newsletter_subscribers;
create trigger newsletter_subscribers_notify_insert
  after insert on public.newsletter_subscribers
  for each row
  execute function public.notify_newsletter_subscriber();

-- A known address. Only counts when it reverses an unsubscribe; every other
-- update is a duplicate button press bumping subscribed_at, and must not
-- become an email.
drop trigger if exists newsletter_subscribers_notify_update on public.newsletter_subscribers;
create trigger newsletter_subscribers_notify_update
  after update on public.newsletter_subscribers
  for each row
  when (old.status = 'unsubscribed' and new.status = 'active')
  execute function public.notify_newsletter_subscriber();
