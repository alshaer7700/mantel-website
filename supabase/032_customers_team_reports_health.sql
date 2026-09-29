-- 032: the People, Team, Reports and Site health screens.
--
--   customer_notes          tags, a private note and a "blocked" flag per customer
--   admin_customers()       everyone who has ordered or has an account, with totals
--   admin_customer()        one customer: orders, messages, subscription, notes
--   admin_set_customer_notes / admin_customer_export / admin_customer_forget
--   staff_invites           invite by email; the person joins by signing in
--   admin_staff() / admin_invite_staff / admin_update_staff / admin_cancel_invite
--   admin_permissions() / admin_set_permission
--   admin_activity()        the activity log, filtered and paged
--   admin_report()          sales, best sellers, busiest hours, categories, returning customers
--   admin_health() / admin_set_alert_status / admin_export_all
--
-- Nothing here changes what customers see.

-- ── Customers ───────────────────────────────────────────────────────────────

create table if not exists public.customer_notes (
  email        text primary key check (email = lower(btrim(email)) and length(email) <= 254),
  tags         text[] not null default '{}',
  note         text not null default '' check (length(note) <= 2000),
  blocked      boolean not null default false,
  block_reason text not null default '',
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) on delete set null
);

alter table public.customer_notes enable row level security;
revoke all on public.customer_notes from public, anon, authenticated;

drop trigger if exists customer_notes_audit on public.customer_notes;
create trigger customer_notes_audit after insert or update or delete on public.customer_notes
  for each row execute function public.audit_row();

create or replace function public.admin_customers(
  p_query  text default null,
  p_filter text default null,
  p_limit  integer default 100,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_q text := nullif(lower(btrim(coalesce(p_query, ''))), '');
begin
  perform public.require_staff('customers');
  return (
    with emails as (
      select lower(btrim(o.customer_email)) as email from public.orders o where o.customer_email is not null
      union
      select lower(u.email) from public.profiles p join auth.users u on u.id = p.id
      where u.email is not null and not exists (select 1 from public.staff_members s where s.user_id = u.id)
    ),
    agg as (
      select e.email,
             (select o.customer_name from public.orders o where lower(o.customer_email) = e.email order by o.created_at desc limit 1) as last_name_used,
             (select p.full_name from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = e.email limit 1) as profile_name,
             (select coalesce(p.phone, null) from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = e.email limit 1) as profile_phone,
             (select o.customer_phone from public.orders o where lower(o.customer_email) = e.email and o.customer_phone is not null order by o.created_at desc limit 1) as order_phone,
             exists (select 1 from auth.users u where lower(u.email) = e.email) as has_account,
             count(o.id) filter (where o.status <> 'cancelled') as orders,
             coalesce(sum(o.subtotal - o.refunded_amount) filter (where o.status not in ('cancelled')), 0) as spent,
             min(o.created_at) as first_order,
             max(o.created_at) as last_order,
             count(o.id) filter (where o.status = 'not_collected') as no_shows
      from emails e
      left join public.orders o on lower(o.customer_email) = e.email
      group by e.email
    ),
    rows as (
      select a.*, n.tags, n.note, coalesce(n.blocked, false) as blocked,
             exists (select 1 from public.newsletter_subscribers ns where ns.email = a.email and ns.status = 'active') as subscribed
      from agg a left join public.customer_notes n on n.email = a.email
      where (v_q is null or a.email like '%' || v_q || '%'
             or lower(coalesce(a.profile_name, a.last_name_used, '')) like '%' || v_q || '%'
             or coalesce(a.order_phone, a.profile_phone, '') like '%' || v_q || '%')
        and (
          p_filter is null or p_filter = '' or
          (p_filter = 'regulars' and a.orders >= 3) or
          (p_filter = 'new' and a.first_order >= now() - interval '30 days') or
          (p_filter = 'blocked' and coalesce(n.blocked, false)) or
          (p_filter = 'subscribed' and exists (select 1 from public.newsletter_subscribers ns where ns.email = a.email and ns.status = 'active')) or
          (p_filter like 'tag:%' and substring(p_filter from 5) = any(coalesce(n.tags, '{}')))
        )
    )
    select jsonb_build_object(
      'total', (select count(*) from rows),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'email', r.email,
                 'name', coalesce(nullif(r.profile_name, ''), nullif(r.last_name_used, ''), split_part(r.email, '@', 1)),
                 'phone', coalesce(r.order_phone, r.profile_phone),
                 'has_account', r.has_account,
                 'orders', r.orders, 'spent', r.spent,
                 'first_order', r.first_order, 'last_order', r.last_order, 'no_shows', r.no_shows,
                 'tags', coalesce(r.tags, '{}'), 'blocked', r.blocked, 'subscribed', r.subscribed)
               order by r.last_order desc nulls last, r.email)
        from (select * from rows order by last_order desc nulls last, email
              limit least(greatest(p_limit, 1), 500) offset greatest(p_offset, 0)) r), '[]'::jsonb),
      'tags', coalesce((select jsonb_agg(distinct t) from public.customer_notes, unnest(tags) t), '[]'::jsonb)
    )
  );
end;
$$;

revoke all on function public.admin_customers(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_customers(text, text, integer, integer) to authenticated;

create or replace function public.admin_customer(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  perform public.require_staff('customers');
  return jsonb_build_object(
    'email', v_email,
    'account', (
      select jsonb_build_object('created_at', u.created_at, 'name', p.full_name, 'phone', p.phone, 'last_sign_in', u.last_sign_in_at)
      from auth.users u left join public.profiles p on p.id = u.id where lower(u.email) = v_email limit 1),
    'notes', (select to_jsonb(n) - 'updated_by' from public.customer_notes n where n.email = v_email),
    'subscription', (select to_jsonb(s) from public.newsletter_subscribers s where s.email = v_email),
    'orders', coalesce((
      select jsonb_agg(public.order_json(o) order by o.created_at desc)
      from public.orders o where lower(o.customer_email) = v_email), '[]'::jsonb),
    'messages', coalesce((
      select jsonb_agg(jsonb_build_object('id', c.id, 'message', c.message, 'status', c.status, 'created_at', c.created_at) order by c.created_at desc)
      from public.contact_messages c where lower(c.email) = v_email), '[]'::jsonb),
    'favourites', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.item_name, 'quantity', x.qty) order by x.qty desc)
      from (select i.item_name, sum(i.quantity) as qty
            from public.order_items i join public.orders o on o.id = i.order_id
            where lower(o.customer_email) = v_email and o.status <> 'cancelled'
            group by i.item_name order by 2 desc limit 5) x), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_customer(text) from public, anon, authenticated;
grant execute on function public.admin_customer(text) to authenticated;

create or replace function public.admin_set_customer_notes(p_email text, p_tags text[], p_note text, p_blocked boolean, p_reason text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  perform public.require_staff('customers');
  if v_email = '' then
    raise exception 'That customer has no email address.' using errcode = 'P0001';
  end if;
  insert into public.customer_notes (email, tags, note, blocked, block_reason, updated_at, updated_by)
  values (v_email,
          coalesce((select array_agg(distinct lower(btrim(t))) from unnest(coalesce(p_tags, '{}')) t where btrim(t) <> ''), '{}'),
          left(coalesce(p_note, ''), 2000), coalesce(p_blocked, false), left(coalesce(p_reason, ''), 300), now(), auth.uid())
  on conflict (email) do update
    set tags = excluded.tags, note = excluded.note, blocked = excluded.blocked,
        block_reason = excluded.block_reason, updated_at = now(), updated_by = auth.uid();
  return true;
end;
$$;

revoke all on function public.admin_set_customer_notes(text, text[], text, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_set_customer_notes(text, text[], text, boolean, text) to authenticated;

-- Everything Mantel holds about one email address, for a privacy request.
create or replace function public.admin_customer_export(p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
begin
  perform public.require_staff('customers');
  return jsonb_build_object(
    'exported_at', now(),
    'email', v_email,
    'account', (select jsonb_build_object('created_at', u.created_at, 'last_sign_in_at', u.last_sign_in_at)
                from auth.users u where lower(u.email) = v_email),
    'profile', (select to_jsonb(p) from public.profiles p join auth.users u on u.id = p.id where lower(u.email) = v_email),
    'orders', coalesce((select jsonb_agg(public.order_json(o) - 'staff_note') from public.orders o where lower(o.customer_email) = v_email), '[]'::jsonb),
    'contact_messages', coalesce((select jsonb_agg(to_jsonb(c) - 'client_ip') from public.contact_messages c where lower(c.email) = v_email), '[]'::jsonb),
    'newsletter', (select to_jsonb(s) from public.newsletter_subscribers s where s.email = v_email)
  );
end;
$$;

revoke all on function public.admin_customer_export(text) from public, anon, authenticated;
grant execute on function public.admin_customer_export(text) to authenticated;

-- A deletion request: personal details are removed, sales figures are kept.
create or replace function public.admin_customer_forget(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_orders integer;
  v_messages integer;
  v_account boolean := false;
begin
  perform public.require_staff('customers');
  if v_email = '' then
    raise exception 'That customer has no email address.' using errcode = 'P0001';
  end if;
  if exists (select 1 from auth.users u join public.staff_members s on s.user_id = u.id where lower(u.email) = v_email) then
    raise exception 'This email belongs to a team member. Remove them from the team first.' using errcode = 'P0001';
  end if;

  update public.orders
  set customer_name = 'Deleted customer', customer_email = null, customer_phone = null, notes = null, user_id = null
  where lower(customer_email) = v_email;
  get diagnostics v_orders = row_count;

  delete from public.contact_messages where lower(email) = v_email;
  get diagnostics v_messages = row_count;

  delete from public.newsletter_subscribers where email = v_email;
  delete from public.customer_notes where email = v_email;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    delete from auth.users where lower(email) = v_email;
    v_account := true;
  end if;

  insert into public.audit_log (actor_id, actor_email, action, entity, entity_id, label, changes)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'delete', 'customer', 'redacted',
          'Privacy deletion', jsonb_build_object('orders_anonymised', v_orders, 'messages_deleted', v_messages, 'account_deleted', v_account));

  return jsonb_build_object('orders', v_orders, 'messages', v_messages, 'account', v_account);
end;
$$;

revoke all on function public.admin_customer_forget(text) from public, anon, authenticated;
grant execute on function public.admin_customer_forget(text) to authenticated;

-- ── Team ────────────────────────────────────────────────────────────────────

create table if not exists public.staff_invites (
  email      text primary key check (email = lower(btrim(email))),
  role       text not null check (role in ('admin', 'manager', 'support')),
  display_name text not null default '',
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.staff_invites enable row level security;
revoke all on public.staff_invites from public, anon, authenticated;

drop trigger if exists staff_invites_audit on public.staff_invites;
create trigger staff_invites_audit after insert or update or delete on public.staff_invites
  for each row execute function public.audit_row();

-- Someone invited by email becomes staff the first time they open the
-- dashboard signed in with that (confirmed) address.
create or replace function public.admin_claim_invite()
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
  v_invite public.staff_invites%rowtype;
begin
  select lower(email) into v_email from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v_email is null then
    return false;
  end if;
  select * into v_invite from public.staff_invites where email = v_email;
  if not found then
    return false;
  end if;
  insert into public.staff_members (user_id, role, active, display_name)
  values (auth.uid(), v_invite.role, true, nullif(v_invite.display_name, ''))
  on conflict (user_id) do update set role = excluded.role, active = true,
    display_name = coalesce(public.staff_members.display_name, excluded.display_name);
  delete from public.staff_invites where email = v_email;
  return true;
end;
$$;

revoke all on function public.admin_claim_invite() from public, anon, authenticated;
grant execute on function public.admin_claim_invite() to authenticated;

create or replace function public.admin_staff()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('staff');
  return jsonb_build_object(
    'members', coalesce((
      select jsonb_agg(jsonb_build_object(
               'user_id', s.user_id, 'email', u.email, 'role', s.role, 'active', s.active,
               'display_name', coalesce(nullif(s.display_name, ''), split_part(u.email, '@', 1)),
               'has_pin', s.pin_hash is not null, 'last_seen_at', s.last_seen_at, 'created_at', s.created_at,
               'two_step', exists (select 1 from auth.mfa_factors f where f.user_id = s.user_id and f.status = 'verified'),
               'is_me', s.user_id = auth.uid())
             order by s.active desc, s.role, u.email)
      from public.staff_members s join auth.users u on u.id = s.user_id), '[]'::jsonb),
    'invites', coalesce((
      select jsonb_agg(jsonb_build_object('email', i.email, 'role', i.role, 'display_name', i.display_name, 'created_at', i.created_at,
                                          'has_account', exists (select 1 from auth.users u where lower(u.email) = i.email))
             order by i.created_at desc)
      from public.staff_invites i), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_staff() from public, anon, authenticated;
grant execute on function public.admin_staff() to authenticated;

create or replace function public.admin_invite_staff(p_email text, p_role text, p_name text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text := lower(btrim(coalesce(p_email, '')));
  v_user uuid;
begin
  perform public.require_staff('staff');
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'Enter a valid email address.' using errcode = 'P0001';
  end if;
  if p_role not in ('admin', 'manager', 'support') then
    raise exception 'invalid role' using errcode = '22023';
  end if;

  -- Already has a confirmed account: add them straight away.
  select id into v_user from auth.users where lower(email) = v_email and email_confirmed_at is not null;
  if v_user is not null then
    insert into public.staff_members (user_id, role, active, display_name)
    values (v_user, p_role, true, nullif(btrim(coalesce(p_name, '')), ''))
    on conflict (user_id) do update set role = excluded.role, active = true,
      display_name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), public.staff_members.display_name);
    return 'added';
  end if;

  insert into public.staff_invites (email, role, display_name, invited_by)
  values (v_email, p_role, btrim(coalesce(p_name, '')), auth.uid())
  on conflict (email) do update set role = excluded.role, display_name = excluded.display_name;
  return 'invited';
end;
$$;

revoke all on function public.admin_invite_staff(text, text, text) from public, anon, authenticated;
grant execute on function public.admin_invite_staff(text, text, text) to authenticated;

create or replace function public.admin_cancel_invite(p_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('staff');
  delete from public.staff_invites where email = lower(btrim(coalesce(p_email, '')));
  return found;
end;
$$;

revoke all on function public.admin_cancel_invite(text) from public, anon, authenticated;
grant execute on function public.admin_cancel_invite(text) to authenticated;

create or replace function public.admin_update_staff(p_user_id uuid, p_role text, p_active boolean, p_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_current public.staff_members%rowtype;
begin
  perform public.require_staff('staff');
  select * into v_current from public.staff_members where user_id = p_user_id;
  if not found then
    raise exception 'That person is no longer on the team.' using errcode = 'P0001';
  end if;
  if p_role not in ('admin', 'manager', 'support') then
    raise exception 'invalid role' using errcode = '22023';
  end if;
  -- Never leave the café without an admin who can undo this.
  if v_current.role = 'admin' and v_current.active and (p_role <> 'admin' or not p_active)
     and (select count(*) from public.staff_members where role = 'admin' and active) <= 1 then
    raise exception 'There must always be at least one active admin. Make someone else an admin first.' using errcode = 'P0001';
  end if;
  update public.staff_members
  set role = p_role, active = p_active,
      display_name = coalesce(nullif(btrim(coalesce(p_name, '')), ''), display_name)
  where user_id = p_user_id;
  if not p_active then
    delete from public.counter_sessions where staff_id = p_user_id;
  end if;
  return true;
end;
$$;

revoke all on function public.admin_update_staff(uuid, text, boolean, text) from public, anon, authenticated;
grant execute on function public.admin_update_staff(uuid, text, boolean, text) to authenticated;

create or replace function public.admin_permissions()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('staff');
  return coalesce((select jsonb_object_agg(role || ':' || area, allowed) from public.staff_role_permissions), '{}'::jsonb);
end;
$$;

revoke all on function public.admin_permissions() from public, anon, authenticated;
grant execute on function public.admin_permissions() to authenticated;

create or replace function public.admin_set_permission(p_role text, p_area text, p_allowed boolean)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('staff');
  if p_role = 'admin' then
    raise exception 'Admins can always do everything.' using errcode = 'P0001';
  end if;
  insert into public.staff_role_permissions (role, area, allowed) values (p_role, p_area, p_allowed)
  on conflict (role, area) do update set allowed = excluded.allowed;
  return true;
end;
$$;

revoke all on function public.admin_set_permission(text, text, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_permission(text, text, boolean) to authenticated;

create or replace function public.admin_activity(p_entity text default null, p_actor text default null, p_limit integer default 100, p_offset integer default 0)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.staff_can('staff') or public.staff_can('system')) then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  return jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.at desc)
      from (select * from public.audit_log
            where (p_entity is null or p_entity = '' or entity = p_entity)
              and (p_actor is null or p_actor = '' or actor_email = p_actor or acting_staff_name = p_actor)
            order by at desc limit least(greatest(p_limit, 1), 300) offset greatest(p_offset, 0)) a), '[]'::jsonb),
    'actors', coalesce((select jsonb_agg(distinct actor_email) from public.audit_log where actor_email is not null), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_activity(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_activity(text, text, integer, integer) to authenticated;

-- admin_me() now also turns a pending invite into membership.
create or replace function public.admin_me()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_staff public.staff_members%rowtype;
  v_email text;
  v_perms jsonb;
  v_require_2fa boolean;
  v_idle integer;
begin
  perform public.admin_claim_invite();

  select * into v_staff from public.staff_members where user_id = auth.uid() and active;
  if not found then
    return null;
  end if;

  select email into v_email from auth.users where id = auth.uid();

  select jsonb_object_agg(a.area, v_staff.role = 'admin' or coalesce(p.allowed, false))
    into v_perms
  from (values ('orders'), ('catalog'), ('content'), ('settings'), ('customers'),
               ('messages'), ('marketing'), ('reports'), ('staff'), ('system'), ('payments')) as a(area)
  left join public.staff_role_permissions p on p.role = v_staff.role and p.area = a.area;

  select coalesce((value ->> 'require_2fa')::boolean, false), coalesce((value ->> 'idle_minutes')::integer, 0)
    into v_require_2fa, v_idle
  from public.site_settings where key = 'security';

  update public.staff_members set last_seen_at = now() where user_id = auth.uid();

  return jsonb_build_object(
    'user_id', v_staff.user_id,
    'email', v_email,
    'role', v_staff.role,
    'display_name', coalesce(nullif(v_staff.display_name, ''), split_part(v_email, '@', 1)),
    'language', v_staff.language,
    'has_pin', v_staff.pin_hash is not null,
    'permissions', v_perms,
    'require_2fa', coalesce(v_require_2fa, false),
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'),
    'idle_minutes', coalesce(v_idle, 0)
  );
end;
$$;

revoke all on function public.admin_me() from public, anon, authenticated;
grant execute on function public.admin_me() to authenticated;

-- ── Reports ─────────────────────────────────────────────────────────────────

create or replace function public.admin_report(p_from date, p_to date)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_days integer := greatest((p_to - p_from) + 1, 1);
  v_prev_from date := p_from - v_days;
  v_prev_to date := p_from - 1;
begin
  perform public.require_staff('reports');
  return (
    with o as (
      select o.*, (o.created_at at time zone 'Asia/Bahrain') as local_at
      from public.orders o
      where (o.created_at at time zone 'Asia/Bahrain')::date between p_from and p_to
    ),
    sold as (select * from o where status not in ('cancelled')),
    prev as (
      select * from public.orders o
      where (o.created_at at time zone 'Asia/Bahrain')::date between v_prev_from and v_prev_to
        and o.status not in ('cancelled')
    ),
    lines as (
      select i.item_name, i.quantity, i.item_price, i.menu_item_id, i.object_id, s.local_at
      from public.order_items i join sold s on s.id = i.order_id
    )
    select jsonb_build_object(
      'from', p_from, 'to', p_to,
      'totals', jsonb_build_object(
        'orders', (select count(*) from sold),
        'revenue', (select coalesce(sum(subtotal - refunded_amount), 0) from sold),
        'average', (select coalesce(round(avg(subtotal), 3), 0) from sold),
        'items', (select coalesce(sum(quantity), 0) from lines),
        'refunds', (select coalesce(sum(refunded_amount), 0) from o),
        'cancelled', (select count(*) from o where status = 'cancelled'),
        'not_collected', (select count(*) from o where status = 'not_collected'),
        'cash', (select coalesce(sum(subtotal - refunded_amount), 0) from sold where payment_method = 'cash')
      ),
      'previous', jsonb_build_object(
        'orders', (select count(*) from prev),
        'revenue', (select coalesce(sum(subtotal - refunded_amount), 0) from prev)
      ),
      'by_day', coalesce((
        select jsonb_agg(jsonb_build_object('day', d::date, 'orders', coalesce(x.orders, 0), 'revenue', coalesce(x.revenue, 0)) order by d)
        from generate_series(p_from::timestamp, p_to::timestamp, interval '1 day') d
        left join (select local_at::date as day, count(*) as orders, sum(subtotal - refunded_amount) as revenue from sold group by 1) x
          on x.day = d::date), '[]'::jsonb),
      'top_items', coalesce((
        select jsonb_agg(jsonb_build_object('name', item_name, 'quantity', qty, 'revenue', revenue) order by qty desc, revenue desc)
        from (select item_name, sum(quantity) as qty, sum(quantity * item_price) as revenue from lines group by item_name order by 2 desc limit 30) t), '[]'::jsonb),
      'slow_items', coalesce((
        select jsonb_agg(jsonb_build_object('name', m.name, 'quantity', coalesce(t.qty, 0)) order by coalesce(t.qty, 0), m.name)
        from public.menu_items m
        left join (select menu_item_id, sum(quantity) as qty from lines where menu_item_id is not null group by 1) t on t.menu_item_id = m.id
        where m.archived_at is null and m.is_available and coalesce(t.qty, 0) <= 1), '[]'::jsonb),
      'by_hour', coalesce((
        select jsonb_agg(jsonb_build_object('dow', dow, 'hour', hr, 'orders', n))
        from (select extract(dow from local_at)::int as dow, extract(hour from local_at)::int as hr, count(*) as n from sold group by 1, 2) h), '[]'::jsonb),
      'by_category', coalesce((
        select jsonb_agg(jsonb_build_object('category', category, 'revenue', revenue, 'quantity', qty) order by revenue desc)
        from (
          select coalesce(c.label, case when l.object_id is not null then 'Retail' else 'Other' end) as category,
                 sum(l.quantity * l.item_price) as revenue, sum(l.quantity) as qty
          from lines l
          left join public.menu_items m on m.id = l.menu_item_id
          left join public.menu_categories c on c.slug = m.category
          group by 1) cat), '[]'::jsonb),
      'by_source', coalesce((
        select jsonb_agg(jsonb_build_object('source', source, 'orders', n, 'revenue', revenue))
        from (select source, count(*) as n, sum(subtotal - refunded_amount) as revenue from sold group by 1) s), '[]'::jsonb),
      'customers', jsonb_build_object(
        'new', (select count(distinct lower(s.customer_email)) from sold s
                where s.customer_email is not null
                  and not exists (select 1 from public.orders p where lower(p.customer_email) = lower(s.customer_email)
                                  and (p.created_at at time zone 'Asia/Bahrain')::date < p_from and p.status <> 'cancelled')),
        'returning', (select count(distinct lower(s.customer_email)) from sold s
                      where s.customer_email is not null
                        and exists (select 1 from public.orders p where lower(p.customer_email) = lower(s.customer_email)
                                    and (p.created_at at time zone 'Asia/Bahrain')::date < p_from and p.status <> 'cancelled')),
        'guests', (select count(*) from sold where customer_email is null)
      )
    )
  );
end;
$$;

revoke all on function public.admin_report(date, date) from public, anon, authenticated;
grant execute on function public.admin_report(date, date) to authenticated;

-- ── Site health ─────────────────────────────────────────────────────────────

create or replace function public.admin_health()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('system');
  return jsonb_build_object(
    'alerts', coalesce((
      select jsonb_agg(to_jsonb(a) order by a.last_seen_at desc)
      from (select * from public.monitoring_alerts order by last_seen_at desc limit 50) a), '[]'::jsonb),
    'errors_7d', (select count(*) from public.monitoring_events where created_at > now() - interval '7 days'),
    'emails', coalesce((
      select jsonb_agg(to_jsonb(e) order by e.created_at desc)
      from (select * from public.email_log order by created_at desc limit 50) e), '[]'::jsonb),
    'notification_calls', coalesce((
      select jsonb_agg(jsonb_build_object('at', r.created, 'status', r.status_code, 'error', r.error_msg) order by r.created desc)
      from (select * from net._http_response order by created desc limit 30) r), '[]'::jsonb),
    'busy_devices', coalesce((
      select jsonb_agg(jsonb_build_object('device', left(md5(ip), 8), 'orders', n, 'last', last_at) order by n desc)
      from (select ip, count(*) as n, max(created_at) as last_at from public.order_ip_events
            where created_at > now() - interval '1 day' group by ip having count(*) >= 3) d), '[]'::jsonb),
    'counts', jsonb_build_object(
      'orders', (select count(*) from public.orders),
      'menu_items', (select count(*) from public.menu_items where archived_at is null),
      'objects', (select count(*) from public.objects where archived_at is null),
      'customers', (select count(distinct lower(customer_email)) from public.orders where customer_email is not null),
      'subscribers', (select count(*) from public.newsletter_subscribers where status = 'active'),
      'photos', (select count(*) from public.media_library)
    )
  );
end;
$$;

revoke all on function public.admin_health() from public, anon, authenticated;
grant execute on function public.admin_health() to authenticated;

create or replace function public.admin_set_alert_status(p_fingerprint text, p_status text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('system');
  if p_status not in ('open', 'acknowledged', 'resolved') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.monitoring_alerts set status = p_status where fingerprint = p_fingerprint;
  return found;
end;
$$;

revoke all on function public.admin_set_alert_status(text, text) from public, anon, authenticated;
grant execute on function public.admin_set_alert_status(text, text) to authenticated;

-- A full backup of the café's own data, for safekeeping.
create or replace function public.admin_export_all()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('system');
  return jsonb_build_object(
    'exported_at', now(),
    'orders', coalesce((select jsonb_agg(public.order_json(o)) from public.orders o), '[]'::jsonb),
    'menu_categories', coalesce((select jsonb_agg(to_jsonb(c)) from public.menu_categories c), '[]'::jsonb),
    'menu_items', coalesce((select jsonb_agg(to_jsonb(m)) from public.menu_items m), '[]'::jsonb),
    'option_groups', coalesce((select jsonb_agg(to_jsonb(g)) from public.option_groups g), '[]'::jsonb),
    'option_choices', coalesce((select jsonb_agg(to_jsonb(c)) from public.option_choices c), '[]'::jsonb),
    'objects', coalesce((select jsonb_agg(to_jsonb(o)) from public.objects o), '[]'::jsonb),
    'contact_messages', coalesce((select jsonb_agg(to_jsonb(c) - 'client_ip') from public.contact_messages c), '[]'::jsonb),
    'newsletter_subscribers', coalesce((select jsonb_agg(to_jsonb(s)) from public.newsletter_subscribers s), '[]'::jsonb),
    'customer_notes', coalesce((select jsonb_agg(to_jsonb(n)) from public.customer_notes n), '[]'::jsonb),
    'site_settings', coalesce((select jsonb_agg(to_jsonb(s)) from public.site_settings s where s.key not in ('notify.whatsapp')), '[]'::jsonb),
    'site_content', coalesce((select jsonb_agg(to_jsonb(c)) from public.site_content c), '[]'::jsonb),
    'media_library', coalesce((select jsonb_agg(to_jsonb(m)) from public.media_library m), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.admin_export_all() from public, anon, authenticated;
grant execute on function public.admin_export_all() to authenticated;

-- A blocked customer can't place online orders. Staff (the counter, manual
-- orders) still can. The website shows its generic "not available" sentence,
-- so the customer isn't told they were blocked.
create or replace function public.orders_block_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.customer_email is not null
     and not public.staff_can('orders')
     and exists (select 1 from public.customer_notes n
                 where n.email = lower(btrim(new.customer_email)) and n.blocked) then
    raise exception 'orders are not accepted for this customer' using errcode = '42501';
  end if;
  return new;
end;
$$;

revoke all on function public.orders_block_guard() from public, anon, authenticated;

drop trigger if exists orders_block_guard on public.orders;
create trigger orders_block_guard before insert on public.orders
  for each row execute function public.orders_block_guard();
