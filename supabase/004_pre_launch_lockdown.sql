-- 004: pre-launch lockdown (SECURITY-AUDIT-AND-ROADMAP.md items H-1, M-2, L-1).
--
-- 1. place_order gains email-format validation (M-2).
-- 2. EXECUTE on place_order is revoked from the site roles until ordering
--    launches (H-1) — the UI button is disabled, but the function itself was
--    still publicly callable by anyone holding the anon key.
-- 3. menu_items.updated_at now actually updates (L-1).
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.
-- Apply order on a fresh database: schema.sql → 002 → 003 → 004.
--
-- ⚠ AT ORDERING LAUNCH: re-enable with
--     grant execute on function public.place_order(jsonb, text, text, text)
--       to anon, authenticated;
--   but only once abuse protection is in place (Turnstile-verified Edge
--   Function or in-function rate limiting) — see roadmap Phase 2.

-- 1. Same function as 003, plus email-format validation.
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
begin
  if items is null or jsonb_typeof(items) <> 'array'
     or jsonb_array_length(items) not between 1 and 50 then
    raise exception 'order must contain between 1 and 50 line items';
  end if;

  if length(coalesce(customer_name, '')) > 120
     or length(coalesce(customer_email, '')) > 254 then
    raise exception 'customer details too long';
  end if;

  if nullif(trim(coalesce(customer_email, '')), '') is not null
     and trim(customer_email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address';
  end if;

  if payment_method not in ('cash', 'card') then
    raise exception 'invalid payment method';
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
    coalesce(nullif(trim(customer_name), ''), 'Guest'),
    nullif(trim(customer_email), ''),
    computed_subtotal,
    payment_method
  );

  insert into public.order_items (order_id, menu_item_id, item_name, item_price, quantity)
  select new_order_id, m.id, m.name, m.price, r.qty
  from jsonb_to_recordset(items) as r(menu_item_id uuid, qty integer)
  join public.menu_items m on m.id = r.menu_item_id;

  return new_order_id;
end;
$$;

-- 2. Lock the function away until ordering launch (create or replace above
--    preserves existing grants, so revoke after).
revoke execute on function public.place_order(jsonb, text, text, text)
  from public, anon, authenticated;

-- 3. Keep menu_items.updated_at honest.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
  before update on public.menu_items
  for each row execute function public.set_updated_at();
