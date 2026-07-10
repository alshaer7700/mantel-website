-- 003: lock down order placement.
--
-- Replaces direct anon INSERTs into orders/order_items (client-priced, so any
-- caller with the public anon key could submit arbitrary prices) with a single
-- server-priced, atomic RPC. Also resets table privileges: the live project
-- had Supabase's default GRANT ALL on these tables, and only the absence of
-- RLS policies was hiding order rows from anon.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run.

-- 1. Drop the trust-the-client insert policies. RLS stays ENABLED on every
--    table; with no policies at all, PostgREST can no longer read or write
--    orders/order_items directly under any role.
drop policy if exists "orders_public_insert" on public.orders;
drop policy if exists "order_items_public_insert" on public.order_items;

-- 2. Reset table privileges to exactly what the site needs (menu reads only).
revoke all on public.orders      from anon, authenticated;
revoke all on public.order_items from anon, authenticated;
revoke all on public.menu_items  from anon, authenticated;
grant select on public.menu_items to anon, authenticated;

-- 3. Server-priced order placement. SECURITY DEFINER runs as the table owner,
--    so it needs no table grants for anon; prices and item names are resolved
--    from menu_items, never taken from the client. The whole function is one
--    transaction: order + items land together or not at all.
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

-- 4. Callable by the site roles only (functions default to EXECUTE for public).
revoke execute on function public.place_order(jsonb, text, text, text) from public;
grant execute on function public.place_order(jsonb, text, text, text) to anon, authenticated;
