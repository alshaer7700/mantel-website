-- Mantel staff dashboard boundary.
-- Bootstrap the first operator manually after their Auth account exists:
-- insert into public.staff_members (user_id, role)
-- select id, 'admin' from auth.users where email = 'owner@example.com';

create table if not exists public.staff_members (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'support'
             check (role in ('admin', 'manager', 'support')),
  active     boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.staff_members enable row level security;
revoke all on public.staff_members from public, anon, authenticated;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.staff_members s
    where s.user_id = auth.uid()
      and s.active = true
  );
$$;

revoke all on function public.is_staff() from public, anon, authenticated;
grant execute on function public.is_staff() to authenticated;

create or replace function public.admin_dashboard()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  payload jsonb;
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'summary', jsonb_build_object(
      'orders', (select count(*)::integer from public.orders),
      'received', (select count(*)::integer from public.orders where status = 'received'),
      'preparing', (select count(*)::integer from public.orders where status = 'preparing'),
      'ready', (select count(*)::integer from public.orders where status = 'ready'),
      'unreadMessages', (select count(*)::integer from public.contact_messages where status = 'new'),
      'activeSubscribers', (select count(*)::integer from public.newsletter_subscribers where status = 'active'),
      'availableObjects', (select count(*)::integer from public.objects where is_available = true)
    ),
    'orders', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
      from (
        select o.id, o.customer_name, o.customer_email, o.customer_phone,
               o.status, o.subtotal, o.payment_method, o.pickup_at,
               o.created_at
        from public.orders o
        order by o.created_at desc
        limit 100
      ) row_data
    ), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.created_at desc)
      from (
        select c.id, c.first_name, c.last_name, c.email, c.phone,
               c.message, c.status, c.created_at
        from public.contact_messages c
        order by c.created_at desc
        limit 100
      ) row_data
    ), '[]'::jsonb),
    'newsletter', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.subscribed_at desc)
      from (
        select n.email, n.status, n.subscribed_at
        from public.newsletter_subscribers n
        order by n.subscribed_at desc
        limit 100
      ) row_data
    ), '[]'::jsonb),
    'objects', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.sort_order, row_data.name)
      from (
        select o.id, o.name, o.spec, o.description, o.price,
               o.is_available, o.sort_order
        from public.objects o
        order by o.sort_order, o.name
        limit 100
      ) row_data
    ), '[]'::jsonb),
    'menu', coalesce((
      select jsonb_agg(to_jsonb(row_data) order by row_data.category, row_data.sort_order, row_data.name)
      from (
        select m.id, m.name, m.description, m.price, m.category,
               m.is_available, m.sort_order
        from public.menu_items m
        order by m.category, m.sort_order, m.name
        limit 100
      ) row_data
    ), '[]'::jsonb)
  ) into payload;

  return payload;
end;
$$;

revoke all on function public.admin_dashboard() from public, anon, authenticated;
grant execute on function public.admin_dashboard() to authenticated;

create or replace function public.admin_update_order_status(
  p_order_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  if p_status not in ('received', 'preparing', 'ready', 'completed', 'cancelled') then
    raise exception 'invalid order status' using errcode = '22023';
  end if;
  update public.orders
  set status = p_status
  where id = p_order_id;
  return found;
end;
$$;

revoke all on function public.admin_update_order_status(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_update_order_status(uuid, text) to authenticated;

create or replace function public.admin_update_object_availability(
  p_object_id uuid,
  p_is_available boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  update public.objects
  set is_available = p_is_available,
      updated_at = now()
  where id = p_object_id;
  return found;
end;
$$;

revoke all on function public.admin_update_object_availability(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_update_object_availability(uuid, boolean) to authenticated;

create or replace function public.admin_update_menu_availability(
  p_menu_item_id uuid,
  p_is_available boolean
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  update public.menu_items
  set is_available = p_is_available,
      updated_at = now()
  where id = p_menu_item_id;
  return found;
end;
$$;

revoke all on function public.admin_update_menu_availability(uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_update_menu_availability(uuid, boolean) to authenticated;

create or replace function public.admin_update_contact_status(
  p_message_id uuid,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  if p_status not in ('new', 'read', 'resolved') then
    raise exception 'invalid contact status' using errcode = '22023';
  end if;
  update public.contact_messages
  set status = p_status
  where id = p_message_id;
  return found;
end;
$$;

revoke all on function public.admin_update_contact_status(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_update_contact_status(uuid, text) to authenticated;

create or replace function public.admin_update_newsletter_status(
  p_email text,
  p_status text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  if p_status not in ('active', 'unsubscribed') then
    raise exception 'invalid subscriber status' using errcode = '22023';
  end if;
  update public.newsletter_subscribers
  set status = p_status
  where email = lower(btrim(p_email));
  return found;
end;
$$;

revoke all on function public.admin_update_newsletter_status(text, text) from public, anon, authenticated;
grant execute on function public.admin_update_newsletter_status(text, text) to authenticated;
