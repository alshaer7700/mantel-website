-- 031: running orders from the dashboard.
--
--   orders +columns     customer notes, staff note, cancel reason, source
--                       (online / phone / walk-in), refunds, timestamps per step
--   'not_collected'     a new status for no-shows
--   order_events        the timeline of every order (who moved it, when, why)
--   stock               retail stock goes down when an order is placed and
--                       back up when one is cancelled
--   admin_counts()      the numbers on the sidebar badges
--   admin_board()       the live board: what's waiting, being made, ready
--   admin_orders()      searchable, filterable, paged order history
--   admin_order()       one order with its lines and timeline
--   admin_set_order_status / admin_bulk_order_status / admin_refund_order /
--   admin_set_order_staff_note / admin_create_manual_order
--   admin_search()      the dashboard's search box
--   staff read/update policies on contact messages and subscribers
--
-- place_order is untouched here; customers order exactly as before.

alter table public.orders
  add column if not exists notes           text,
  add column if not exists staff_note      text,
  add column if not exists cancel_reason   text,
  add column if not exists source          text not null default 'online',
  add column if not exists refunded_amount numeric(10,3) not null default 0,
  add column if not exists refund_note     text,
  add column if not exists status_changed_at timestamptz,
  add column if not exists preparing_at    timestamptz,
  add column if not exists ready_at        timestamptz,
  add column if not exists completed_at    timestamptz,
  add column if not exists cancelled_at    timestamptz;

alter table public.orders drop constraint if exists orders_source_check;
alter table public.orders add constraint orders_source_check check (source in ('online', 'phone', 'walk-in'));

alter table public.orders drop constraint if exists orders_refund_check;
alter table public.orders add constraint orders_refund_check check (refunded_amount >= 0 and refunded_amount <= subtotal);

alter table public.orders drop constraint if exists orders_notes_length;
alter table public.orders add constraint orders_notes_length check (
  (notes is null or length(notes) <= 500) and (staff_note is null or length(staff_note) <= 1000));

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('received', 'preparing', 'ready', 'completed', 'cancelled', 'not_collected'));

create index if not exists orders_created_idx on public.orders (created_at desc);
create index if not exists orders_status_idx on public.orders (status, created_at desc);

create table if not exists public.order_events (
  id         bigint generated always as identity primary key,
  order_id   uuid not null references public.orders(id) on delete cascade,
  at         timestamptz not null default now(),
  kind       text not null,
  status     text,
  note       text,
  actor_id   uuid,
  actor_name text
);

create index if not exists order_events_order_idx on public.order_events (order_id, at);

alter table public.order_events enable row level security;
revoke all on public.order_events from public, anon, authenticated;

-- Who is acting: the PIN holder on a counter tablet, else the signed-in person.
create or replace function public.staff_actor_name()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select a.staff_name from public.counter_actor() a limit 1),
    (select coalesce(nullif(s.display_name, ''), split_part(u.email, '@', 1))
     from public.staff_members s join auth.users u on u.id = s.user_id
     where s.user_id = auth.uid()),
    'Staff');
$$;

revoke all on function public.staff_actor_name() from public, anon, authenticated;

-- ── Stock follows orders ────────────────────────────────────────────────────

create or replace function public.order_items_take_stock()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.object_id is not null then
    update public.objects
    set stock_qty = greatest(stock_qty - new.quantity, 0)
    where id = new.object_id and stock_qty is not null;
  end if;
  return new;
end;
$$;

drop trigger if exists order_items_take_stock on public.order_items;
create trigger order_items_take_stock after insert on public.order_items
  for each row execute function public.order_items_take_stock();

create or replace function public.order_return_stock(p_order_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.objects o
  set stock_qty = o.stock_qty + i.quantity
  from public.order_items i
  where i.order_id = p_order_id and i.object_id = o.id and o.stock_qty is not null;
$$;

revoke all on function public.order_return_stock(uuid) from public, anon, authenticated;

-- ── Reading orders ──────────────────────────────────────────────────────────

create or replace function public.order_json(p_order public.orders)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select to_jsonb(p_order) - 'user_id'
    || jsonb_build_object(
         'reference', 'MTL-' || upper(substring(replace(p_order.id::text, '-', '') from 1 for 6)),
         'has_account', p_order.user_id is not null,
         'items', coalesce((
           select jsonb_agg(jsonb_build_object(
                    'name', i.item_name, 'price', i.item_price, 'quantity', i.quantity,
                    'kind', case when i.object_id is not null then 'object' else 'menu' end)
                  order by i.created_at, i.item_name)
           from public.order_items i where i.order_id = p_order.id), '[]'::jsonb));
$$;

revoke all on function public.order_json(public.orders) from public, anon, authenticated;

create or replace function public.admin_counts()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'new_orders', case when public.staff_can('orders')
      then (select count(*) from public.orders where status = 'received') else 0 end,
    'active_orders', case when public.staff_can('orders')
      then (select count(*) from public.orders where status in ('received', 'preparing', 'ready')) else 0 end,
    'unread_messages', case when public.staff_can('messages')
      then (select count(*) from public.contact_messages where status = 'new') else 0 end,
    'low_stock', case when public.staff_can('catalog')
      then (select count(*) from public.objects
            where archived_at is null and is_available and stock_qty is not null and stock_qty <= low_stock_at) else 0 end,
    'open_alerts', case when public.staff_can('system')
      then (select count(*) from public.monitoring_alerts where status = 'open') else 0 end
  );
$$;

revoke all on function public.admin_counts() from public, anon, authenticated;
grant execute on function public.admin_counts() to authenticated;

create or replace function public.admin_board()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('orders');
  return jsonb_build_object(
    'active', coalesce((
      select jsonb_agg(public.order_json(o) order by coalesce(o.pickup_at, o.created_at), o.created_at)
      from public.orders o where o.status in ('received', 'preparing', 'ready')), '[]'::jsonb),
    'done_today', coalesce((
      select jsonb_agg(public.order_json(o) order by o.status_changed_at desc nulls last)
      from public.orders o
      where o.status in ('completed', 'cancelled', 'not_collected')
        and coalesce(o.status_changed_at, o.created_at) >= ((now() at time zone 'Asia/Bahrain')::date::timestamp at time zone 'Asia/Bahrain')), '[]'::jsonb),
    'server_time', now()
  );
end;
$$;

revoke all on function public.admin_board() from public, anon, authenticated;
grant execute on function public.admin_board() to authenticated;

create or replace function public.admin_orders(
  p_statuses text[] default null,
  p_from     date default null,
  p_to       date default null,
  p_query    text default null,
  p_source   text default null,
  p_limit    integer default 50,
  p_offset   integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(lower(btrim(coalesce(p_query, ''))), '');
  v_ref text;
begin
  perform public.require_staff('orders');
  v_ref := case when v_q like 'mtl-%' then replace(substring(v_q from 5), '-', '') else null end;

  return (
    with filtered as (
      select o.*
      from public.orders o
      where (p_statuses is null or cardinality(p_statuses) = 0 or o.status = any(p_statuses))
        and (p_from is null or (o.created_at at time zone 'Asia/Bahrain')::date >= p_from)
        and (p_to is null or (o.created_at at time zone 'Asia/Bahrain')::date <= p_to)
        and (p_source is null or p_source = '' or o.source = p_source)
        and (
          v_q is null
          or (v_ref is not null and replace(o.id::text, '-', '') like v_ref || '%')
          or lower(o.customer_name) like '%' || v_q || '%'
          or lower(coalesce(o.customer_email, '')) like '%' || v_q || '%'
          or coalesce(o.customer_phone, '') like '%' || v_q || '%'
          or exists (select 1 from public.order_items i where i.order_id = o.id and lower(i.item_name) like '%' || v_q || '%')
        )
    )
    select jsonb_build_object(
      'total', (select count(*) from filtered),
      'revenue', (select coalesce(sum(subtotal - refunded_amount), 0) from filtered where status not in ('cancelled')),
      'rows', coalesce((
        select jsonb_agg(public.order_json(o2) order by o2.created_at desc)
        from public.orders o2
        join (select id from filtered order by created_at desc
              limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)) f on f.id = o2.id), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_orders(text[], date, date, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_orders(text[], date, date, text, text, integer, integer) to authenticated;

create or replace function public.admin_order(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_order public.orders%rowtype;
begin
  perform public.require_staff('orders');
  select * into v_order from public.orders where id = p_id;
  if not found then
    raise exception 'That order no longer exists.' using errcode = 'P0001';
  end if;
  return public.order_json(v_order) || jsonb_build_object(
    'events', coalesce((
      select jsonb_agg(jsonb_build_object('at', e.at, 'kind', e.kind, 'status', e.status, 'note', e.note, 'actor', e.actor_name) order by e.at)
      from public.order_events e where e.order_id = p_id), '[]'::jsonb),
    'previous_orders', (
      select count(*) from public.orders o
      where o.id <> p_id and v_order.customer_email is not null
        and lower(o.customer_email) = lower(v_order.customer_email))
  );
end;
$$;

revoke all on function public.admin_order(uuid) from public, anon, authenticated;
grant execute on function public.admin_order(uuid) to authenticated;

-- ── Changing orders ─────────────────────────────────────────────────────────

create or replace function public.admin_set_order_status(p_id uuid, p_status text, p_note text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_old text;
begin
  perform public.require_staff('orders');
  if p_status not in ('received', 'preparing', 'ready', 'completed', 'cancelled', 'not_collected') then
    raise exception 'invalid order status' using errcode = '22023';
  end if;

  select status into v_old from public.orders where id = p_id for update;
  if v_old is null then
    raise exception 'That order no longer exists.' using errcode = 'P0001';
  end if;
  if v_old = p_status then
    return true;
  end if;

  update public.orders
  set status = p_status,
      status_changed_at = now(),
      preparing_at = case when p_status = 'preparing' then coalesce(preparing_at, now()) else preparing_at end,
      ready_at     = case when p_status = 'ready' then coalesce(ready_at, now()) else ready_at end,
      completed_at = case when p_status = 'completed' then now() else completed_at end,
      cancelled_at = case when p_status = 'cancelled' then now() else cancelled_at end,
      cancel_reason = case when p_status = 'cancelled' then nullif(btrim(coalesce(p_note, '')), '') else cancel_reason end
  where id = p_id;

  -- A cancelled order puts retail stock back; un-cancelling takes it again.
  if p_status = 'cancelled' and v_old <> 'cancelled' then
    perform public.order_return_stock(p_id);
  elsif v_old = 'cancelled' and p_status <> 'cancelled' then
    update public.objects o set stock_qty = greatest(o.stock_qty - i.quantity, 0)
    from public.order_items i where i.order_id = p_id and i.object_id = o.id and o.stock_qty is not null;
  end if;

  insert into public.order_events (order_id, kind, status, note, actor_id, actor_name)
  values (p_id, 'status', p_status, nullif(btrim(coalesce(p_note, '')), ''), auth.uid(), public.staff_actor_name());
  return true;
end;
$$;

revoke all on function public.admin_set_order_status(uuid, text, text) from public, anon, authenticated;
grant execute on function public.admin_set_order_status(uuid, text, text) to authenticated;

create or replace function public.admin_bulk_order_status(p_ids uuid[], p_status text)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid;
  v_count integer := 0;
begin
  perform public.require_staff('orders');
  foreach v_id in array p_ids loop
    perform public.admin_set_order_status(v_id, p_status, null);
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.admin_bulk_order_status(uuid[], text) from public, anon, authenticated;
grant execute on function public.admin_bulk_order_status(uuid[], text) to authenticated;

create or replace function public.admin_refund_order(p_id uuid, p_amount numeric, p_note text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_subtotal numeric;
  v_refunded numeric;
begin
  perform public.require_staff('orders');
  select subtotal, refunded_amount into v_subtotal, v_refunded from public.orders where id = p_id for update;
  if v_subtotal is null then
    raise exception 'That order no longer exists.' using errcode = 'P0001';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter an amount above zero.' using errcode = 'P0001';
  end if;
  if v_refunded + p_amount > v_subtotal then
    raise exception 'That is more than was paid for this order.' using errcode = 'P0001';
  end if;
  update public.orders
  set refunded_amount = refunded_amount + round(p_amount, 3),
      refund_note = nullif(btrim(coalesce(p_note, '')), '')
  where id = p_id;
  insert into public.order_events (order_id, kind, note, actor_id, actor_name)
  values (p_id, 'refund', 'BD ' || to_char(round(p_amount, 3), 'FM999990.000') || coalesce(' — ' || nullif(btrim(p_note), ''), ''),
          auth.uid(), public.staff_actor_name());
  return true;
end;
$$;

revoke all on function public.admin_refund_order(uuid, numeric, text) from public, anon, authenticated;
grant execute on function public.admin_refund_order(uuid, numeric, text) to authenticated;

create or replace function public.admin_set_order_staff_note(p_id uuid, p_note text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('orders');
  update public.orders set staff_note = nullif(btrim(coalesce(p_note, '')), '') where id = p_id;
  if not found then
    raise exception 'That order no longer exists.' using errcode = 'P0001';
  end if;
  insert into public.order_events (order_id, kind, note, actor_id, actor_name)
  values (p_id, 'note', nullif(btrim(coalesce(p_note, '')), ''), auth.uid(), public.staff_actor_name());
  return true;
end;
$$;

revoke all on function public.admin_set_order_staff_note(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_set_order_staff_note(uuid, text) to authenticated;

-- Phone and walk-in orders, priced by the database like any other order.
-- Any listed item may be sold at the counter, even one hidden from the website.
create or replace function public.admin_create_manual_order(
  p_items    jsonb,
  p_name     text,
  p_phone    text,
  p_email    text,
  p_note     text,
  p_source   text,
  p_status   text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id uuid := gen_random_uuid();
  v_subtotal numeric(10,3);
  v_count integer;
  v_valid integer;
begin
  perform public.require_staff('orders');
  if p_source not in ('phone', 'walk-in') then
    raise exception 'invalid source' using errcode = '22023';
  end if;
  if p_status not in ('received', 'completed') then
    raise exception 'invalid order status' using errcode = '22023';
  end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Add at least one item.' using errcode = 'P0001';
  end if;
  perform public.assert_valid_customer(p_name, p_email, p_phone);

  select count(*), count(s.id), coalesce(sum(s.price * r.qty), 0)
    into v_count, v_valid, v_subtotal
  from jsonb_to_recordset(p_items) as r(id uuid, qty integer)
  left join (
    select id, price from public.menu_items where archived_at is null
    union all
    select id, price from public.objects where archived_at is null
  ) s on s.id = r.id
  where r.qty between 1 and 99;

  if v_valid <> jsonb_array_length(p_items) then
    raise exception 'One of the items no longer exists or has a wrong quantity.' using errcode = 'P0001';
  end if;

  insert into public.orders (id, customer_name, customer_email, customer_phone, subtotal, payment_method,
                             status, notes, source, status_changed_at, completed_at)
  values (v_id, coalesce(nullif(btrim(p_name), ''), 'Walk-in'), nullif(btrim(p_email), ''), nullif(btrim(p_phone), ''),
          v_subtotal, 'cash', p_status, nullif(btrim(coalesce(p_note, '')), ''), p_source, now(),
          case when p_status = 'completed' then now() end);

  insert into public.order_items (order_id, menu_item_id, object_id, item_name, item_price, quantity)
  select v_id,
         case when m.id is not null then r.id end,
         case when ob.id is not null then r.id end,
         coalesce(m.name, ob.name), coalesce(m.price, ob.price), r.qty
  from jsonb_to_recordset(p_items) as r(id uuid, qty integer)
  left join public.menu_items m on m.id = r.id
  left join public.objects ob on ob.id = r.id;

  insert into public.order_events (order_id, kind, status, note, actor_id, actor_name)
  values (v_id, 'created', p_status, p_source, auth.uid(), public.staff_actor_name());
  return v_id;
end;
$$;

revoke all on function public.admin_create_manual_order(jsonb, text, text, text, text, text, text) from public, anon, authenticated;
grant execute on function public.admin_create_manual_order(jsonb, text, text, text, text, text, text) to authenticated;

-- ── Search ──────────────────────────────────────────────────────────────────

create or replace function public.admin_search(p_query text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := lower(btrim(coalesce(p_query, '')));
  v_ref text;
  v_out jsonb := '[]'::jsonb;
begin
  if not public.is_staff() or length(v_q) < 2 then
    return '[]'::jsonb;
  end if;
  v_ref := case when v_q like 'mtl-%' then replace(substring(v_q from 5), '-', '') else null end;

  if public.staff_can('orders') then
    v_out := v_out || coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('kind', 'order', 'id', o.id,
                 'title', 'MTL-' || upper(substring(replace(o.id::text, '-', '') from 1 for 6)) || ' · ' || o.customer_name,
                 'subtitle', to_char(o.created_at at time zone 'Asia/Bahrain', 'DD Mon HH24:MI') || ' · BD ' || to_char(o.subtotal, 'FM999990.000') || ' · ' || o.status) as x
        from public.orders o
        where (v_ref is not null and replace(o.id::text, '-', '') like v_ref || '%')
           or lower(o.customer_name) like '%' || v_q || '%'
           or lower(coalesce(o.customer_email, '')) like '%' || v_q || '%'
           or coalesce(o.customer_phone, '') like '%' || v_q || '%'
        order by o.created_at desc limit 6) s), '[]'::jsonb);
  end if;

  if public.staff_can('customers') then
    v_out := v_out || coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('kind', 'customer', 'id', lower(o.customer_email),
                 'title', max(o.customer_name), 'subtitle', lower(o.customer_email) || ' · ' || count(*) || ' orders') as x
        from public.orders o
        where o.customer_email is not null
          and (lower(o.customer_email) like '%' || v_q || '%' or lower(o.customer_name) like '%' || v_q || '%')
        group by lower(o.customer_email)
        order by max(o.created_at) desc limit 5) s), '[]'::jsonb);
  end if;

  if public.staff_can('catalog') then
    v_out := v_out || coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('kind', 'menu', 'id', m.id, 'title', m.name,
                 'subtitle', 'Menu · BD ' || to_char(m.price, 'FM999990.000')) as x
        from public.menu_items m
        where lower(m.name) like '%' || v_q || '%' or m.name_ar like '%' || btrim(p_query) || '%'
        order by m.name limit 5) s), '[]'::jsonb)
      || coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('kind', 'object', 'id', o.id, 'title', o.name,
                 'subtitle', 'Retail · BD ' || to_char(o.price, 'FM999990.000')) as x
        from public.objects o
        where lower(o.name) like '%' || v_q || '%' or o.name_ar like '%' || btrim(p_query) || '%'
        order by o.name limit 5) s), '[]'::jsonb);
  end if;

  if public.staff_can('messages') then
    v_out := v_out || coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('kind', 'message', 'id', c.id,
                 'title', btrim(c.first_name || ' ' || c.last_name), 'subtitle', c.email || ' · ' || left(c.message, 60)) as x
        from public.contact_messages c
        where lower(c.email) like '%' || v_q || '%'
           or lower(c.first_name || ' ' || c.last_name) like '%' || v_q || '%'
           or lower(c.message) like '%' || v_q || '%'
        order by c.created_at desc limit 5) s), '[]'::jsonb);
  end if;

  return v_out;
end;
$$;

revoke all on function public.admin_search(text) from public, anon, authenticated;
grant execute on function public.admin_search(text) to authenticated;

-- ── Messages and subscribers: staff can read and update them directly ──────

drop policy if exists contact_messages_staff_read on public.contact_messages;
create policy contact_messages_staff_read on public.contact_messages
  for select to authenticated using ((select public.staff_can('messages')));

drop policy if exists contact_messages_staff_update on public.contact_messages;
create policy contact_messages_staff_update on public.contact_messages
  for update to authenticated
  using ((select public.staff_can('messages')))
  with check ((select public.staff_can('messages')));

grant select, update on public.contact_messages to authenticated;

drop policy if exists newsletter_subscribers_staff_read on public.newsletter_subscribers;
create policy newsletter_subscribers_staff_read on public.newsletter_subscribers
  for select to authenticated using ((select public.staff_can('marketing')) or (select public.staff_can('messages')));

drop policy if exists newsletter_subscribers_staff_update on public.newsletter_subscribers;
create policy newsletter_subscribers_staff_update on public.newsletter_subscribers
  for update to authenticated
  using ((select public.staff_can('marketing')))
  with check ((select public.staff_can('marketing')));

grant select, update on public.newsletter_subscribers to authenticated;
