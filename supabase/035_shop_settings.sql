-- 035 — Shop settings the website obeys.
--
--   ordering_status()          is online ordering open right now, and if not,
--                              why (maintenance, paused, closed day, outside
--                              opening hours) and when it opens next
--   assert_ordering_allowed()  called by place_order: refuses an order while
--                              ordering is closed, below the minimum order or
--                              above the item limit. SQLSTATE MTL01 carries a
--                              sentence written for the customer.
--   public_site()              now also returns the ordering status
--
-- All times are Bahrain time. A day's hours run from `open` to `close`; a
-- close of 00:00 means midnight, and a close earlier than the open means the
-- day runs past midnight (the early hours count as the day before).

create or replace function public.ordering_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_now      timestamp := now() at time zone 'Asia/Bahrain';
  v_ordering jsonb := coalesce((select value from public.site_settings where key = 'ordering'), '{}'::jsonb);
  v_hours    jsonb := coalesce((select value from public.site_settings where key = 'hours'), '{}'::jsonb);
  v_maint    jsonb := coalesce((select value from public.site_settings where key = 'maintenance'), '{}'::jsonb);
  v_min      numeric := coalesce((v_ordering ->> 'min_order')::numeric, 0);
  v_max      integer := least(greatest(coalesce((v_ordering ->> 'max_items')::integer, 20), 1), 20);
  v_base     jsonb;
  v_day      jsonb;
  v_open     time;
  v_close    time;
  v_start    timestamp;
  v_end      timestamp;
  v_next     timestamp;
  v_closure  jsonb;
  i          integer;
begin
  v_base := jsonb_build_object('min_order', v_min, 'max_items', v_max);

  if coalesce((v_maint ->> 'enabled')::boolean, false) then
    return v_base || jsonb_build_object('open', false, 'reason', 'maintenance',
      'message', coalesce(nullif(btrim(v_maint ->> 'message'), ''), 'We''re making a few changes. Back very soon.'));
  end if;

  if coalesce((v_ordering ->> 'paused')::boolean, false) then
    return v_base || jsonb_build_object('open', false, 'reason', 'paused',
      'message', coalesce(nullif(btrim(v_ordering ->> 'pause_message'), ''), 'Online orders are paused for now. Please come by the café.'));
  end if;

  if not coalesce((v_ordering ->> 'only_during_hours')::boolean, false) then
    return v_base || jsonb_build_object('open', true);
  end if;

  -- Look at yesterday (for a night that runs past midnight) through a week ahead.
  for i in -1..7 loop
    select d into v_day from jsonb_array_elements(coalesce(v_hours -> 'week', '[]'::jsonb)) d
    where (d ->> 'day')::integer = extract(dow from v_now::date + i)::integer limit 1;
    continue when v_day is null or coalesce((v_day ->> 'closed')::boolean, false);

    select c into v_closure from jsonb_array_elements(coalesce(v_hours -> 'closures', '[]'::jsonb)) c
    where (v_now::date + i) between (c ->> 'from')::date and coalesce(nullif(c ->> 'to', '')::date, (c ->> 'from')::date)
    limit 1;
    continue when v_closure is not null;

    v_open := (v_day ->> 'open')::time;
    v_close := (v_day ->> 'close')::time;
    v_start := (v_now::date + i) + v_open;
    v_end := case when v_close <= v_open then (v_now::date + i + 1) + v_close else (v_now::date + i) + v_close end;

    if v_now >= v_start and v_now < v_end then
      return v_base || jsonb_build_object('open', true, 'closes_at', to_char(v_end, 'YYYY-MM-DD"T"HH24:MI'));
    end if;
    if v_start > v_now and (v_next is null or v_start < v_next) then
      v_next := v_start;
    end if;
  end loop;

  select c into v_closure from jsonb_array_elements(coalesce(v_hours -> 'closures', '[]'::jsonb)) c
  where v_now::date between (c ->> 'from')::date and coalesce(nullif(c ->> 'to', '')::date, (c ->> 'from')::date)
  limit 1;

  return v_base || jsonb_build_object(
    'open', false,
    'reason', case when v_closure is not null then 'closure' else 'hours' end,
    'message', case
      when v_closure is not null and nullif(btrim(v_closure ->> 'label'), '') is not null
        then 'We''re closed today (' || btrim(v_closure ->> 'label') || ').'
      when v_closure is not null then 'We''re closed today.'
      else 'We''re closed right now.' end,
    'next_open', case when v_next is null then null else to_char(v_next, 'YYYY-MM-DD"T"HH24:MI') end);
end;
$$;

revoke all on function public.ordering_status() from public;
grant execute on function public.ordering_status() to anon, authenticated;

create or replace function public.assert_ordering_allowed(p_subtotal numeric, p_items integer)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_status jsonb := public.ordering_status();
  v_next   timestamp;
begin
  if not coalesce((v_status ->> 'open')::boolean, true) then
    v_next := nullif(v_status ->> 'next_open', '')::timestamp;
    raise exception using errcode = 'MTL01', message =
      coalesce(v_status ->> 'message', 'Online orders are closed right now.') ||
      case when v_next is null then ''
           else ' Orders open again ' ||
                case when v_next::date = (now() at time zone 'Asia/Bahrain')::date then 'today'
                     when v_next::date = (now() at time zone 'Asia/Bahrain')::date + 1 then 'tomorrow'
                     else 'on ' || trim(to_char(v_next, 'FMDay')) end ||
                ' at ' || to_char(v_next, 'FMHH12:MI am') || '.' end;
  end if;
  if coalesce((v_status ->> 'min_order')::numeric, 0) > 0 and p_subtotal < (v_status ->> 'min_order')::numeric then
    raise exception using errcode = 'MTL01', message =
      'The minimum for an online order is BD ' || to_char((v_status ->> 'min_order')::numeric, 'FM999990.000') || '.';
  end if;
  if p_items > coalesce((v_status ->> 'max_items')::integer, 20) then
    raise exception using errcode = 'MTL01', message =
      'Online orders can have up to ' || (v_status ->> 'max_items') || ' items. For bigger orders, please message us.';
  end if;
end;
$$;

revoke all on function public.assert_ordering_allowed(numeric, integer) from public, anon, authenticated;

-- place_order: unchanged except for the one call to assert_ordering_allowed
-- once the server-side subtotal and item count are known.
create or replace function public.place_order(items jsonb, customer_name text DEFAULT 'Guest'::text, customer_email text DEFAULT NULL::text, customer_phone text DEFAULT NULL::text, payment_method text DEFAULT 'cash'::text, pickup_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
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

  insert into public.orders (
    id, user_id, customer_name, customer_email, customer_phone,
    subtotal, payment_method, pickup_at
  )
  values (
    new_order_id,
    auth.uid(),
    coalesce(nullif(btrim(customer_name), ''), 'Guest'),
    nullif(btrim(customer_email), ''),
    nullif(btrim(customer_phone), ''),
    computed_subtotal,
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

create or replace function public.public_site()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', coalesce((select jsonb_object_agg(s.key, s.value) from public.site_settings s where s.is_public), '{}'::jsonb),
    'content',  coalesce((select jsonb_object_agg(c.key, c.published) from public.site_content c where c.published is not null), '{}'::jsonb),
    'status',   public.ordering_status()
  );
$$;

revoke all on function public.public_site() from public;
grant execute on function public.public_site() to anon, authenticated;
