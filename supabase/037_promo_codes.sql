-- 037 — Promo codes, taken at checkout.
--
--   promo_codes             the codes staff make in Marketing → Promo codes
--   orders.discount         what a code took off; orders.subtotal stays what
--   orders.promo_code       the customer pays, so every report, receipt and
--                           refund that reads subtotal is still right
--   promo_quote()           the one set of rules: valid, in its dates, not used
--                           up, minimum met, once per customer
--   check_promo()           public: the cart asks before the order is placed
--   place_order()           gains promo_code; the discount is worked out here,
--                           never trusted from the browser
--
-- Codes are case-insensitive and stored upper-case.

alter table public.orders
  add column if not exists discount numeric(10,3) not null default 0 check (discount >= 0),
  add column if not exists promo_code text;

create table if not exists public.promo_codes (
  code              text primary key check (code ~ '^[A-Z0-9][A-Z0-9-]{2,23}$'),
  kind              text not null default 'percent' check (kind in ('percent', 'amount')),
  value             numeric(10,3) not null check (value > 0),
  min_order         numeric(10,3) not null default 0 check (min_order >= 0),
  starts_at         timestamptz,
  ends_at           timestamptz,
  max_uses          integer check (max_uses is null or max_uses > 0),
  uses              integer not null default 0,
  once_per_customer boolean not null default false,
  active            boolean not null default true,
  note              text not null default '' check (char_length(note) <= 200),
  created_at        timestamptz not null default now(),
  created_by        uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at        timestamptz not null default now(),
  constraint promo_codes_percent_max check (kind <> 'percent' or value <= 100)
);

alter table public.promo_codes enable row level security;
revoke all on public.promo_codes from public, anon, authenticated;

drop policy if exists promo_codes_staff on public.promo_codes;
create policy promo_codes_staff on public.promo_codes
  for all to authenticated
  using ((select public.staff_can('marketing')))
  with check ((select public.staff_can('marketing')));

grant select, insert, update, delete on public.promo_codes to authenticated;

-- A used code is part of the order record: it can be switched off, not deleted.
create or replace function public.promo_codes_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.uses > 0 then
      raise exception 'This code has been used, so it can''t be deleted. Switch it off instead.' using errcode = '42501';
    end if;
    return old;
  end if;
  new.code := upper(btrim(new.code));
  if tg_op = 'UPDATE' then
    if new.code <> old.code and old.uses > 0 then
      raise exception 'A used code can''t be renamed.' using errcode = '42501';
    end if;
    -- Staff can't reset the counter; only a placed order moves it.
    if current_setting('mantel.promo_use', true) is distinct from 'on' then
      new.uses := old.uses;
    end if;
    new.updated_at := now();
  else
    new.uses := 0;
  end if;
  return new;
end;
$$;

drop trigger if exists promo_codes_guard on public.promo_codes;
create trigger promo_codes_guard before insert or update or delete on public.promo_codes
  for each row execute function public.promo_codes_guard();

drop trigger if exists promo_codes_audit on public.promo_codes;
create trigger promo_codes_audit after insert or update or delete on public.promo_codes
  for each row execute function public.audit_row();

-- ── The rules ───────────────────────────────────────────────────────────────

create or replace function public.promo_quote(p_code text, p_subtotal numeric, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_code text := upper(btrim(coalesce(p_code, '')));
  v_p    public.promo_codes;
  v_off  numeric;
begin
  if v_code = '' then
    return jsonb_build_object('ok', false, 'message', 'Enter a code.');
  end if;
  select * into v_p from public.promo_codes where code = v_code;
  if v_p.code is null or not v_p.active then
    return jsonb_build_object('ok', false, 'message', 'That code isn''t valid.');
  end if;
  if v_p.starts_at is not null and v_p.starts_at > now() then
    return jsonb_build_object('ok', false, 'message', 'That code isn''t active yet.');
  end if;
  if v_p.ends_at is not null and v_p.ends_at <= now() then
    return jsonb_build_object('ok', false, 'message', 'That code has expired.');
  end if;
  if v_p.max_uses is not null and v_p.uses >= v_p.max_uses then
    return jsonb_build_object('ok', false, 'message', 'That code has been used up.');
  end if;
  if coalesce(p_subtotal, 0) < v_p.min_order then
    return jsonb_build_object('ok', false, 'message',
      'That code needs an order of at least BD ' || to_char(v_p.min_order, 'FM999990.000') || '.');
  end if;
  if v_p.once_per_customer then
    if nullif(btrim(coalesce(p_email, '')), '') is null then
      return jsonb_build_object('ok', false, 'message', 'Enter your email first to use that code.');
    end if;
    if exists (select 1 from public.orders o
               where o.promo_code = v_code and lower(o.customer_email) = lower(btrim(p_email))
                 and o.status <> 'cancelled') then
      return jsonb_build_object('ok', false, 'message', 'You''ve already used that code.');
    end if;
  end if;

  v_off := case when v_p.kind = 'percent' then round(coalesce(p_subtotal, 0) * v_p.value / 100, 3)
                else least(v_p.value, coalesce(p_subtotal, 0)) end;
  return jsonb_build_object(
    'ok', true,
    'code', v_code,
    'discount', v_off,
    'label', case when v_p.kind = 'percent' then trim(to_char(v_p.value, 'FM990.##')) || '% off'
                  else 'BD ' || to_char(v_p.value, 'FM999990.000') || ' off' end);
end;
$$;

revoke all on function public.promo_quote(text, numeric, text) from public, anon, authenticated;

create or replace function public.check_promo(p_code text, p_subtotal numeric, p_email text default null)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.promo_quote(left(p_code, 40), p_subtotal, left(p_email, 254));
$$;

revoke all on function public.check_promo(text, numeric, text) from public;
grant execute on function public.check_promo(text, numeric, text) to anon, authenticated;

-- ── place_order, now with a code ────────────────────────────────────────────
-- A new parameter means a new signature, and two place_order overloads would
-- make a call without the code ambiguous, so the old one goes.

drop function if exists public.place_order(jsonb, text, text, text, text, timestamptz);

create or replace function public.place_order(
  items jsonb,
  customer_name text default 'Guest',
  customer_email text default null,
  customer_phone text default null,
  payment_method text default 'cash',
  pickup_at timestamptz default null,
  promo_code text default null)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  new_order_id      uuid := gen_random_uuid();
  computed_subtotal numeric(10,3);
  item_count        integer;
  distinct_count    integer;
  total_quantity    integer;
  valid_count       integer;
  client_ip         text;
  v_quote           jsonb;
  v_code            text;
  v_discount        numeric(10,3) := 0;
begin
  if items is null or jsonb_typeof(items) <> 'array'
     or jsonb_array_length(items) not between 1 and 12 then
    raise exception 'order must contain between 1 and 12 line items';
  end if;

  if payment_method not in ('cash', 'card') then
    raise exception 'invalid payment method';
  end if;

  perform public.assert_valid_customer(customer_name, customer_email, customer_phone);
  perform public.assert_valid_pickup(pickup_at);

  client_ip := public.assert_within_rate_limits(customer_email);

  select count(*),
         count(distinct r.menu_item_id),
         coalesce(sum(r.qty), 0),
         count(*) filter (where s.id is not null and r.qty between 1 and 10),
         coalesce(sum(s.price * r.qty), 0)::numeric(10,3)
    into item_count, distinct_count, total_quantity, valid_count, computed_subtotal
  from jsonb_to_recordset(items) as r(menu_item_id uuid, qty integer)
  left join public.sellables s
    on s.id = r.menu_item_id and s.is_available;

  if distinct_count <> item_count then
    raise exception 'order contains duplicate line items';
  end if;

  if total_quantity > 20 then
    raise exception 'order must contain no more than 20 total items';
  end if;

  if valid_count <> item_count then
    raise exception 'order contains unknown, unavailable, or invalid-quantity items';
  end if;

  perform public.assert_ordering_allowed(computed_subtotal, total_quantity);

  if nullif(btrim(coalesce(promo_code, '')), '') is not null then
    v_quote := public.promo_quote(left(promo_code, 40), computed_subtotal, customer_email);
    if not coalesce((v_quote ->> 'ok')::boolean, false) then
      raise exception using errcode = 'MTL01', message = v_quote ->> 'message';
    end if;
    v_code := v_quote ->> 'code';
    v_discount := (v_quote ->> 'discount')::numeric;

    -- Count the use now, atomically, so the last "one left" can't go twice.
    perform set_config('mantel.promo_use', 'on', true);
    update public.promo_codes p set uses = p.uses + 1
    where p.code = v_code and (p.max_uses is null or p.uses < p.max_uses);
    if not found then
      raise exception using errcode = 'MTL01', message = 'That code has been used up.';
    end if;
    perform set_config('mantel.promo_use', 'off', true);
  end if;

  insert into public.orders (
    id, user_id, customer_name, customer_email, customer_phone,
    subtotal, discount, promo_code, payment_method, pickup_at
  )
  values (
    new_order_id,
    auth.uid(),
    coalesce(nullif(btrim(customer_name), ''), 'Guest'),
    nullif(btrim(customer_email), ''),
    nullif(btrim(customer_phone), ''),
    computed_subtotal - v_discount,
    v_discount,
    v_code,
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
$function$;

revoke all on function public.place_order(jsonb, text, text, text, text, timestamptz, text) from public;
grant execute on function public.place_order(jsonb, text, text, text, text, timestamptz, text) to anon, authenticated;

-- ── The order email and invoices show the code ──────────────────────────────

create or replace function public.notify_order_placed()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
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

  if v_url is null or v_secret is null then
    raise warning 'notify_order_placed: vault config missing, skipping notification for %', new.id;
    return new;
  end if;

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

  v_ref := 'MTL-' || upper(substring(replace(new.id::text, '-', '') from 1 for 6));

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
        'discount',       new.discount,
        'promo_code',     new.promo_code,
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
    raise warning 'notify_order_placed: notification failed for % (%)', new.id, sqlerrm;
    return new;
end;
$function$;

-- Invoice lines may now take a negative price, for a discount line.
create or replace function public.invoice_clean_lines(p_lines jsonb)
returns jsonb
language sql
immutable
set search_path to ''
as $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'description', left(btrim(coalesce(l ->> 'description', '')), 300),
           'quantity', round(greatest(coalesce((l ->> 'quantity')::numeric, 0), 0), 3),
           'unit_price', round(least(greatest(coalesce((l ->> 'unit_price')::numeric, 0), -1000000), 1000000), 3))
         order by ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) with ordinality as x(l, ord)
  where btrim(coalesce(l ->> 'description', '')) <> ''
$function$;

create or replace function public.admin_document_from_order(p_order_id uuid, p_kind text)
returns uuid
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_o    public.orders;
  v_set  jsonb;
  v_id   uuid;
  v_lines jsonb;
begin
  perform public.require_staff('payments');
  if p_kind not in ('invoice', 'receipt') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  select * into v_o from public.orders where id = p_order_id;
  if not found then
    raise exception 'That order no longer exists.' using errcode = 'P0001';
  end if;
  select id into v_id from public.documents
  where order_id = p_order_id and kind = p_kind and status <> 'void'
  order by created_at desc limit 1;
  if v_id is not null then
    return v_id;
  end if;
  select value into v_set from public.site_settings where key = 'payments.invoices';
  v_lines := coalesce((select jsonb_agg(jsonb_build_object('description', i.item_name, 'quantity', i.quantity, 'unit_price', i.item_price) order by i.item_name)
                       from public.order_items i where i.order_id = v_o.id), '[]'::jsonb);
  if v_o.discount > 0 then
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'description', 'Promo code ' || coalesce(v_o.promo_code, ''), 'quantity', 1, 'unit_price', -v_o.discount));
  end if;
  return public.admin_save_document(null, p_kind, jsonb_build_object(
    'order_id', v_o.id,
    'bill_to', jsonb_build_object('name', v_o.customer_name, 'email', coalesce(v_o.customer_email, ''), 'phone', coalesce(v_o.customer_phone, '')),
    'lines', v_lines,
    'vat_rate', case when coalesce((v_set ->> 'vat_registered')::boolean, false) then coalesce((v_set ->> 'vat_rate')::numeric, 10) else 0 end,
    'payment_method', case when v_o.payment_method = 'card' then 'card' else 'cash' end,
    'reference', 'MTL-' || upper(left(replace(v_o.id::text, '-', ''), 6)),
    'notes', coalesce(v_set ->> 'default_notes', '')));
end;
$function$;
