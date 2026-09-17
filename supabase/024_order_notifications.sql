-- 024: tell someone when an order is placed. (Roadmap M-1.)
--
-- The bug this fixes is the one 022 fixed for the contact form, in the place
-- it matters more. place_order writes the order and its lines and returns;
-- nothing tells anyone. The order waits in `orders` to be noticed by a staff
-- member opening the dashboard — while the customer is walking over for a
-- coffee nobody has started making. A pick-up café cannot take orders nobody
-- is told about.
--
-- Shape, deliberately identical to 022 so there is one pattern here and not
-- two: trigger -> pg_net async POST -> order-notify Edge Function -> Resend
-- -> hello@bymantel.com.
--
-- The two rules from 022 carry over unchanged:
--
--   1. The notification must never cost the customer their order. Every
--      failure path is swallowed and logged as a WARNING, so a missing secret,
--      a dead Edge Function or a Resend outage still leaves the order
--      committed. An order rejected because email is down is far worse than
--      one emailed late.
--   2. No secrets in git. The URL and shared secret live in Vault, read at
--      trigger time. Absent config = the trigger quietly does nothing, which
--      is why this is safe to apply before the secrets exist.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- WHY THIS IS A CONSTRAINT TRIGGER AND 022'S IS NOT
--
-- This is the one real difference, and getting it wrong produces a working
-- email with no order in it.
--
-- place_order inserts in two steps, in this order:
--
--     insert into public.orders      (...);   ← a plain AFTER INSERT fires HERE
--     insert into public.order_items (...);   ← the lines arrive after
--
-- A normal `after insert on orders for each row` trigger therefore runs while
-- order_items is still empty for this order, and the aggregate below would
-- return no rows. The café would be emailed "New order MTL-A1B2C3" with an
-- empty list and a total that matches nothing — worse than no email, because
-- it looks like a customer ordered nothing.
--
-- A DEFERRABLE INITIALLY DEFERRED constraint trigger instead fires at COMMIT,
-- by which point both inserts have happened and the lines are readable. That
-- is the whole reason for the unusual trigger type; it is not stylistic.
--
-- A contact message has no second table, which is why 022 needs none of this.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: ... -> 019 -> 021 -> 022 -> 023 -> 024.
--
-- ── Setup ──
--   select vault.create_secret(
--     'https://<project-ref>.supabase.co/functions/v1/order-notify',
--     'order_notify_url', 'order-notify endpoint (024)');
--   select vault.create_secret(encode(extensions.gen_random_bytes(32), 'hex'),
--     'order_notify_secret', 'shared secret for order-notify (024)');
-- Then set ORDER_NOTIFY_SECRET (the same value) as an Edge Function secret in
-- the dashboard. RESEND_API_KEY is already set for contact-notify and is
-- shared. Read the Vault value back with:
--   select decrypted_secret from vault.decrypted_secrets
--   where name = 'order_notify_secret';

-- Already installed by 022; repeated so a fresh database can apply this file
-- on its own. See 022 for why `with schema extensions` is load-bearing.
create extension if not exists pg_net with schema extensions;

-- ─────────────────────────────────────────────────────────────────────────────
-- The trigger function.
--
-- SECURITY DEFINER because vault.decrypted_secrets is not readable by the
-- roles that reach this through place_order. search_path is pinned empty per
-- this project's convention, so every name below is qualified.
create or replace function public.notify_order_placed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url    text;
  v_secret text;
  v_items  jsonb;
  v_ref    text;
begin
  select decrypted_secret into v_url
  from vault.decrypted_secrets where name = 'order_notify_url';

  select decrypted_secret into v_secret
  from vault.decrypted_secrets where name = 'order_notify_secret';

  -- Not configured yet. Not an error: the order is saved either way.
  if v_url is null or v_secret is null then
    raise warning 'notify_order_placed: vault config missing, skipping notification for %', new.id;
    return new;
  end if;

  -- Readable here only because this trigger is deferred to commit time. See
  -- the header. coalesce keeps a pathological empty order sending an email
  -- with an empty list rather than a null body the function cannot parse.
  select coalesce(
           jsonb_agg(
             jsonb_build_object(
               'item_name',  i.item_name,
               'quantity',   i.quantity,
               'item_price', i.item_price
             )
             order by i.created_at, i.item_name
           ),
           '[]'::jsonb
         )
    into v_items
  from public.order_items i
  where i.order_id = new.id;

  -- The same reference the customer is shown and reads back at the counter.
  -- Derived identically to orderReference() in src/lib/api/orders.ts: first
  -- six hex characters of the uuid, uppercased. If one side ever changes, the
  -- slip and the email stop matching and staff cannot find the order.
  v_ref := 'MTL-' || upper(substring(replace(new.id::text, '-', '') from 1 for 6));

  -- Async: pg_net queues the request and returns immediately, so the
  -- customer's checkout never waits on Resend.
  perform net.http_post(
    url     := v_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-order-notify-secret', v_secret
    ),
    body    := jsonb_build_object(
      'record', jsonb_build_object(
        'id',             new.id,
        'reference',      v_ref,
        'customer_name',  new.customer_name,
        'customer_email', new.customer_email,
        'customer_phone', new.customer_phone,
        'subtotal',       new.subtotal,
        'payment_method', new.payment_method,
        'pickup_at',      new.pickup_at,
        'created_at',     new.created_at,
        'items',          v_items
      )
    ),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    -- Rule 1. Never let a notification failure roll back the order.
    raise warning 'notify_order_placed: notification failed for % (%)', new.id, sqlerrm;
    return new;
end;
$$;

revoke all on function public.notify_order_placed() from public, anon, authenticated;

drop trigger if exists orders_notify on public.orders;
create constraint trigger orders_notify
  after insert on public.orders
  deferrable initially deferred
  for each row
  execute function public.notify_order_placed();
