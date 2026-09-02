-- 022: tell someone when a contact message arrives.
--
-- The bug this fixes: submit_contact_message (019) inserts the row and returns.
-- Nothing else happens. The form used to reach the owner through FormSubmit;
-- when that was removed, no notification path replaced it, so every enquiry
-- landed in contact_messages and waited to be noticed by someone opening the
-- table. A café cannot run a contact form nobody is told about.
--
-- Shape: AFTER INSERT trigger -> pg_net async POST -> contact-notify Edge
-- Function -> Resend -> hello@bymantel.com.
--
-- Two rules this migration is built around:
--
--   1. The notification must never cost the customer their message. Every
--      failure path below is swallowed and logged as a WARNING, so a missing
--      secret, a dead Edge Function or a Resend outage still leaves the row
--      committed. A contact form that rejects messages because email is down
--      is worse than one that emails late.
--   2. No secrets in git. The URL and shared secret live in Vault (already
--      installed on this project), read at trigger time. Absent config = the
--      trigger quietly does nothing, which is why this is safe to apply before
--      the secrets exist.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: ... -> 019 -> 021 -> 022.
--
-- ── Setup (already done on the live project; listed for a fresh database) ──
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/contact-notify',
--     'contact_notify_url', 'contact-notify endpoint (022)');
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
--     'contact_notify_secret', 'shared secret for contact-notify (022)');
-- Then set RESEND_API_KEY and CONTACT_NOTIFY_SECRET (the same value as the
-- Vault row) as Edge Function secrets in the dashboard. Read the Vault value
-- back with:
--   select decrypted_secret from vault.decrypted_secrets
--   where name = 'contact_notify_secret';

-- `with schema extensions` matters: pg_net is NOT relocatable, so a bare
-- `create extension pg_net` lands it in public and trips the database linter's
-- extension_in_public warning, and `alter extension ... set schema` cannot undo
-- it — only a drop and recreate can. Its functions live in `net` either way,
-- which is why every call below is net.http_post and not extensions.http_post.
create extension if not exists pg_net with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- The trigger function.
--
-- SECURITY DEFINER because vault.decrypted_secrets is not readable by the
-- roles that reach this through submit_contact_message. search_path is pinned
-- empty per this project's convention, so every name below is qualified.
create or replace function public.notify_contact_message()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'contact_notify_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'contact_notify_secret';

  -- Not configured yet. Not an error: the row is saved either way.
  if v_url is null or v_secret is null then
    raise warning 'notify_contact_message: vault config missing, skipping notification for %', new.id;
    return new;
  end if;

  -- Async: pg_net queues the request and returns immediately, so the customer's
  -- form submit never waits on Resend. client_ip is deliberately not sent —
  -- the notification does not need it.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-contact-notify-secret', v_secret
    ),
    body    := jsonb_build_object(
      'record', jsonb_build_object(
        'id',         new.id,
        'first_name', new.first_name,
        'last_name',  new.last_name,
        'email',      new.email,
        'phone',      new.phone,
        'message',    new.message,
        'created_at', new.created_at
      )
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    -- Rule 1. Never let a notification failure roll back the message.
    raise warning 'notify_contact_message: notification failed for % (%)', new.id, sqlerrm;
    return new;
end;
$$;

revoke all on function public.notify_contact_message() from public, anon, authenticated;

drop trigger if exists contact_messages_notify on public.contact_messages;
create trigger contact_messages_notify
  after insert on public.contact_messages
  for each row
  execute function public.notify_contact_message();
