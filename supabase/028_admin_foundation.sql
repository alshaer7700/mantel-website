-- 028: the foundation the full staff dashboard is built on.
--
-- Everything here is additive. Nothing the live site reads or calls changes
-- shape, so this is safe to apply before the new dashboard ships.
--
--   staff_role_permissions  which dashboard areas each role may use
--   staff_can(area)         the one permission check every policy and RPC uses
--   audit_log + audit_row() "who changed what", written by triggers
--   counter_sessions        PIN attribution on a shared counter tablet
--   site_settings           shop settings (hours, ordering, contact, …)
--   site_content(+versions) editable website copy with draft / publish
--   media_library + bucket  uploaded photographs
--   email_log               what the notification functions sent
--   public_site()           one public read of settings + published content
--   admin_me()              who the signed-in staff member is and what they may do
--
-- Apply order: … -> 027 -> 028.

-- ── Staff: roles, permissions, profile fields ───────────────────────────────

alter table public.staff_members
  add column if not exists display_name text,
  add column if not exists language text not null default 'en',
  add column if not exists pin_hash text,
  add column if not exists last_seen_at timestamptz;

alter table public.staff_members drop constraint if exists staff_members_language_check;
alter table public.staff_members add constraint staff_members_language_check check (language in ('en', 'ar'));

create table if not exists public.staff_role_permissions (
  role    text not null check (role in ('admin', 'manager', 'support')),
  area    text not null check (area in (
            'orders', 'catalog', 'content', 'settings', 'customers',
            'messages', 'marketing', 'reports', 'staff', 'system', 'payments')),
  allowed boolean not null default false,
  primary key (role, area)
);

alter table public.staff_role_permissions enable row level security;
revoke all on public.staff_role_permissions from public, anon, authenticated;

-- Admin is always allowed everything (see staff_can); its rows exist only so
-- the permissions screen can show a complete grid.
insert into public.staff_role_permissions (role, area, allowed)
select r.role, a.area,
       case
         when r.role = 'admin' then true
         when r.role = 'manager' then a.area <> 'staff'
         else a.area in ('orders', 'messages')
       end
from (values ('admin'), ('manager'), ('support')) as r(role)
cross join (values ('orders'), ('catalog'), ('content'), ('settings'), ('customers'),
                   ('messages'), ('marketing'), ('reports'), ('staff'), ('system'), ('payments')) as a(area)
on conflict (role, area) do nothing;

-- ── Site settings ───────────────────────────────────────────────────────────

create table if not exists public.site_settings (
  key        text primary key check (key ~ '^[a-z][a-z0-9_.]{1,60}$'),
  value      jsonb not null default '{}'::jsonb,
  is_public  boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.site_settings enable row level security;
revoke all on public.site_settings from public, anon, authenticated;

-- ── Two-step sign-in requirement and the permission check ───────────────────

create or replace function public.staff_mfa_ok()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
           select (s.value ->> 'require_2fa')::boolean
           from public.site_settings s
           where s.key = 'security'
         ), false) = false
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2';
$$;

revoke all on function public.staff_mfa_ok() from public, anon, authenticated;
grant execute on function public.staff_mfa_ok() to authenticated;

create or replace function public.staff_can(p_area text)
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
             and s.active
             and (
               s.role = 'admin'
               or exists (
                 select 1 from public.staff_role_permissions p
                 where p.role = s.role and p.area = p_area and p.allowed
               )
             )
         )
     and public.staff_mfa_ok();
$$;

revoke all on function public.staff_can(text) from public, anon, authenticated;
grant execute on function public.staff_can(text) to authenticated;

create or replace function public.require_staff(p_area text)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.staff_can(p_area) then
    raise exception 'staff access required' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_staff(text) from public, anon, authenticated;
grant execute on function public.require_staff(text) to authenticated;

-- Settings are split between areas by key prefix, so a support account that
-- can manage orders cannot change the notification recipients or the loyalty
-- programme.
create or replace function public.settings_area(p_key text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when p_key like 'marketing.%' then 'marketing'
           when p_key like 'notify.%'    then 'messages'
           when p_key like 'payments%'   then 'payments'
           when p_key = 'security'       then 'staff'
           else 'settings'
         end;
$$;

drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select to anon, authenticated
  using (is_public);

drop policy if exists site_settings_staff_read on public.site_settings;
create policy site_settings_staff_read on public.site_settings
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists site_settings_staff_write on public.site_settings;
create policy site_settings_staff_write on public.site_settings
  for all to authenticated
  using (public.staff_can(public.settings_area(key)))
  with check (public.staff_can(public.settings_area(key)));

grant select on public.site_settings to anon, authenticated;
grant insert, update, delete on public.site_settings to authenticated;

insert into public.site_settings (key, value, is_public) values
  ('ordering', jsonb_build_object(
      'paused', false,
      'pause_message', '',
      'pause_message_ar', '',
      'pickup_open', false,
      'retail_open', true,
      'only_during_hours', false,
      'min_order', 0,
      'max_items', 20), true),
  ('hours', jsonb_build_object(
      'week', jsonb_build_array(
        jsonb_build_object('day', 0, 'open', '07:00', 'close', '22:00', 'closed', false),
        jsonb_build_object('day', 1, 'open', '07:00', 'close', '22:00', 'closed', false),
        jsonb_build_object('day', 2, 'open', '07:00', 'close', '22:00', 'closed', false),
        jsonb_build_object('day', 3, 'open', '07:00', 'close', '22:00', 'closed', false),
        jsonb_build_object('day', 4, 'open', '07:00', 'close', '22:00', 'closed', false),
        jsonb_build_object('day', 5, 'open', '08:00', 'close', '00:00', 'closed', false),
        jsonb_build_object('day', 6, 'open', '08:00', 'close', '00:00', 'closed', false)),
      'closures', '[]'::jsonb), true),
  ('pickup', jsonb_build_object(
      'prep_minutes', 10,
      'slots_enabled', false,
      'slot_minutes', 15,
      'max_per_slot', 6,
      'days_ahead', 0), true),
  ('announcement', jsonb_build_object(
      'enabled', false, 'text', '', 'text_ar', '',
      'link_label', '', 'link_label_ar', '', 'link_url', '',
      'starts_at', null, 'ends_at', null), true),
  ('popup', jsonb_build_object(
      'enabled', false, 'title', '', 'title_ar', '', 'body', '', 'body_ar', '',
      'image', '', 'link_label', '', 'link_label_ar', '', 'link_url', '',
      'starts_at', null, 'ends_at', null, 'version', 1), true),
  ('contact', jsonb_build_object(
      'email', 'hello@bymantel.com',
      'phone', '',
      'whatsapp', '',
      'instagram', 'https://www.instagram.com/bymantel',
      'address', 'Hidd, Muharraq, Kingdom of Bahrain',
      'address_ar', 'الحد، المحرق، مملكة البحرين',
      'maps_url', 'https://www.google.com/maps/search/?api=1&query=Mantel%20Coffee%2C%20Hidd%2C%20Muharraq%2C%20Bahrain'), true),
  ('tax', jsonb_build_object(
      'vat_registered', false, 'rate', 10, 'prices_include_vat', true, 'vat_number', ''), true),
  ('payments', jsonb_build_object('cash', true, 'card', false), true),
  ('maintenance', jsonb_build_object('enabled', false, 'message', '', 'message_ar', ''), true),
  ('languages', jsonb_build_object('arabic_enabled', false), true),
  ('notify.recipients', jsonb_build_object(
      'orders', jsonb_build_array('hello@bymantel.com'),
      'messages', jsonb_build_array('hello@bymantel.com'),
      'subscribers', jsonb_build_array('hello@bymantel.com'),
      'weekly_summary', jsonb_build_array()), false),
  ('notify.customer', jsonb_build_object(
      'ready_email', true, 'cancel_email', true, 'confirmation_email', false), false),
  ('notify.whatsapp', jsonb_build_object('enabled', false, 'phone', '', 'apikey', ''), false),
  ('security', jsonb_build_object('require_2fa', false, 'idle_minutes', 0), false)
on conflict (key) do nothing;

-- ── Editable website content ────────────────────────────────────────────────

create table if not exists public.site_content (
  key          text primary key check (key ~ '^[a-z][a-z0-9_.-]{1,60}$'),
  draft        jsonb,
  published    jsonb,
  published_at timestamptz,
  published_by uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references auth.users(id) on delete set null
);

alter table public.site_content enable row level security;
revoke all on public.site_content from public, anon, authenticated;

drop policy if exists site_content_staff_all on public.site_content;
create policy site_content_staff_all on public.site_content
  for all to authenticated
  using ((select public.staff_can('content')))
  with check ((select public.staff_can('content')));

grant select, insert, update on public.site_content to authenticated;

create table if not exists public.site_content_versions (
  id           bigint generated always as identity primary key,
  key          text not null,
  value        jsonb not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  published_by_email text
);

create index if not exists site_content_versions_key_idx
  on public.site_content_versions (key, published_at desc);

alter table public.site_content_versions enable row level security;
revoke all on public.site_content_versions from public, anon, authenticated;

drop policy if exists site_content_versions_staff_read on public.site_content_versions;
create policy site_content_versions_staff_read on public.site_content_versions
  for select to authenticated
  using ((select public.staff_can('content')));

grant select on public.site_content_versions to authenticated;

create or replace function public.admin_publish_content(p_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_draft jsonb;
  v_email text;
begin
  perform public.require_staff('content');

  select draft into v_draft from public.site_content where key = p_key;
  if v_draft is null then
    raise exception 'nothing to publish' using errcode = '22023';
  end if;

  select email into v_email from auth.users where id = auth.uid();

  update public.site_content
  set published = v_draft,
      published_at = now(),
      published_by = auth.uid(),
      updated_at = now(),
      updated_by = auth.uid()
  where key = p_key;

  insert into public.site_content_versions (key, value, published_by, published_by_email)
  values (p_key, v_draft, auth.uid(), v_email);

  -- Keep the last 30 versions of each page; older ones are noise.
  delete from public.site_content_versions v
  where v.key = p_key
    and v.id not in (
      select id from public.site_content_versions
      where key = p_key
      order by published_at desc
      limit 30
    );

  return true;
end;
$$;

revoke all on function public.admin_publish_content(text) from public, anon, authenticated;
grant execute on function public.admin_publish_content(text) to authenticated;

create or replace function public.admin_discard_draft(p_key text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('content');
  update public.site_content
  set draft = published, updated_at = now(), updated_by = auth.uid()
  where key = p_key;
  return found;
end;
$$;

revoke all on function public.admin_discard_draft(text) from public, anon, authenticated;
grant execute on function public.admin_discard_draft(text) to authenticated;

-- ── Photo library and storage ───────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-media', 'site-media', true, 8388608,
        array['image/webp', 'image/jpeg', 'image/png', 'image/gif', 'image/avif'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists site_media_staff_insert on storage.objects;
create policy site_media_staff_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'site-media'
    and (public.staff_can('content') or public.staff_can('catalog') or public.staff_can('marketing') or public.staff_can('settings'))
  );

drop policy if exists site_media_staff_update on storage.objects;
create policy site_media_staff_update on storage.objects
  for update to authenticated
  using (bucket_id = 'site-media' and (public.staff_can('content') or public.staff_can('catalog')))
  with check (bucket_id = 'site-media' and (public.staff_can('content') or public.staff_can('catalog')));

drop policy if exists site_media_staff_delete on storage.objects;
create policy site_media_staff_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'site-media' and (public.staff_can('content') or public.staff_can('catalog')));

drop policy if exists site_media_staff_select on storage.objects;
create policy site_media_staff_select on storage.objects
  for select to authenticated
  using (bucket_id = 'site-media' and public.is_staff());

create table if not exists public.media_library (
  id         uuid primary key default gen_random_uuid(),
  path       text not null unique,
  url        text not null,
  alt        text not null default '',
  width      integer,
  height     integer,
  bytes      integer,
  folder     text not null default 'general',
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

alter table public.media_library enable row level security;
revoke all on public.media_library from public, anon, authenticated;

drop policy if exists media_library_staff_read on public.media_library;
create policy media_library_staff_read on public.media_library
  for select to authenticated
  using ((select public.is_staff()));

drop policy if exists media_library_staff_write on public.media_library;
create policy media_library_staff_write on public.media_library
  for all to authenticated
  using ((select public.staff_can('content')) or (select public.staff_can('catalog')) or (select public.staff_can('marketing')) or (select public.staff_can('settings')))
  with check ((select public.staff_can('content')) or (select public.staff_can('catalog')) or (select public.staff_can('marketing')) or (select public.staff_can('settings')));

grant select, insert, update, delete on public.media_library to authenticated;

-- ── Email log (written by the Edge Functions with the service role) ─────────

create table if not exists public.email_log (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  kind        text not null,
  recipient   text not null,
  subject     text not null default '',
  status      text not null check (status in ('sent', 'failed', 'skipped')),
  error       text,
  provider_id text,
  related_id  text
);

create index if not exists email_log_created_idx on public.email_log (created_at desc);

alter table public.email_log enable row level security;
revoke all on public.email_log from public, anon, authenticated;

drop policy if exists email_log_staff_read on public.email_log;
create policy email_log_staff_read on public.email_log
  for select to authenticated
  using ((select public.staff_can('system')) or (select public.staff_can('messages')));

grant select on public.email_log to authenticated;

-- ── Counter PIN sessions ────────────────────────────────────────────────────

create table if not exists public.counter_sessions (
  token_hash text primary key,
  staff_id   uuid not null references public.staff_members(user_id) on delete cascade,
  device_user uuid references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

alter table public.counter_sessions enable row level security;
revoke all on public.counter_sessions from public, anon, authenticated;

-- ── Activity log ────────────────────────────────────────────────────────────

create table if not exists public.audit_log (
  id                bigint generated always as identity primary key,
  at                timestamptz not null default now(),
  actor_id          uuid,
  actor_email       text,
  acting_staff_id   uuid,
  acting_staff_name text,
  action            text not null,
  entity            text not null,
  entity_id         text,
  label             text,
  changes           jsonb
);

create index if not exists audit_log_at_idx on public.audit_log (at desc);
create index if not exists audit_log_entity_idx on public.audit_log (entity, entity_id);

alter table public.audit_log enable row level security;
revoke all on public.audit_log from public, anon, authenticated;

drop policy if exists audit_log_staff_read on public.audit_log;
create policy audit_log_staff_read on public.audit_log
  for select to authenticated
  using ((select public.staff_can('staff')) or (select public.staff_can('system')));

grant select on public.audit_log to authenticated;

-- The acting person on a shared counter tablet, if a PIN session is active.
create or replace function public.counter_actor()
returns table (staff_id uuid, staff_name text)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_token text;
begin
  begin
    v_token := nullif(current_setting('request.headers', true)::jsonb ->> 'x-mantel-counter', '');
  exception when others then
    v_token := null;
  end;
  if v_token is null then
    return;
  end if;
  return query
    select c.staff_id, coalesce(nullif(s.display_name, ''), u.email)::text
    from public.counter_sessions c
    join public.staff_members s on s.user_id = c.staff_id and s.active
    join auth.users u on u.id = c.staff_id
    where c.token_hash = encode(extensions.digest(v_token, 'sha256'), 'hex')
      and c.expires_at > now()
      and (c.device_user is null or c.device_user = auth.uid());
end;
$$;

revoke all on function public.counter_actor() from public, anon, authenticated;

create or replace function public.audit_row()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid     uuid := auth.uid();
  v_old     jsonb;
  v_new     jsonb;
  v_changes jsonb := '{}'::jsonb;
  v_key     text;
  v_id      text;
  v_label   text;
  v_email   text;
  v_acting  uuid;
  v_acting_name text;
begin
  -- Only staff actions are logged. Customers placing orders, triggers and
  -- the service role are not "someone on the team changed something".
  if v_uid is null or not exists (select 1 from public.staff_members where user_id = v_uid) then
    return coalesce(new, old);
  end if;

  if tg_op <> 'INSERT' then v_old := to_jsonb(old); end if;
  if tg_op <> 'DELETE' then v_new := to_jsonb(new); end if;

  if tg_op = 'UPDATE' then
    for v_key in select jsonb_object_keys(v_new) loop
      if v_key in ('updated_at', 'updated_by', 'last_seen_at', 'pin_hash') then
        continue;
      end if;
      if (v_new -> v_key) is distinct from (v_old -> v_key) then
        v_changes := v_changes || jsonb_build_object(
          v_key, jsonb_build_object('from', v_old -> v_key, 'to', v_new -> v_key));
      end if;
    end loop;
    if v_changes = '{}'::jsonb then
      return new;
    end if;
  elsif tg_op = 'INSERT' then
    v_changes := v_new - 'pin_hash';
  else
    v_changes := v_old - 'pin_hash';
  end if;

  -- Page content can be large; keep the names of what changed, not the text.
  if pg_column_size(v_changes) > 16000 then
    select jsonb_object_agg(k, '"(changed)"'::jsonb) into v_changes
    from jsonb_object_keys(v_changes) as k;
  end if;

  v_id := coalesce(v_new ->> 'id', v_old ->> 'id', v_new ->> 'key', v_old ->> 'key',
                   v_new ->> 'slug', v_old ->> 'slug', v_new ->> 'code', v_old ->> 'code',
                   v_new ->> 'user_id', v_old ->> 'user_id', v_new ->> 'email', v_old ->> 'email');
  v_label := coalesce(v_new ->> 'name', v_old ->> 'name', v_new ->> 'label', v_old ->> 'label',
                      v_new ->> 'code', v_old ->> 'code', v_new ->> 'customer_name', v_old ->> 'customer_name',
                      v_new ->> 'subject', v_old ->> 'subject', v_new ->> 'title', v_old ->> 'title',
                      v_new ->> 'email', v_old ->> 'email', v_id);

  select email into v_email from auth.users where id = v_uid;
  select a.staff_id, a.staff_name into v_acting, v_acting_name from public.counter_actor() a limit 1;

  insert into public.audit_log (actor_id, actor_email, acting_staff_id, acting_staff_name,
                                action, entity, entity_id, label, changes)
  values (v_uid, v_email, v_acting, v_acting_name,
          lower(tg_op), tg_table_name, v_id, left(v_label, 200), v_changes);

  return coalesce(new, old);
end;
$$;

revoke all on function public.audit_row() from public, anon, authenticated;

do $$
declare
  t text;
begin
  foreach t in array array['site_settings', 'site_content', 'staff_members',
                           'staff_role_permissions', 'menu_items', 'objects',
                           'media_library']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format(
      'create trigger %I after insert or update or delete on public.%I
         for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end;
$$;

-- Orders: only status and staff-side edits, never the customer's insert.
drop trigger if exists orders_audit on public.orders;
create trigger orders_audit after update on public.orders
  for each row execute function public.audit_row();

-- ── Public read of settings and published content ───────────────────────────

create or replace function public.public_site()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'settings', coalesce((select jsonb_object_agg(s.key, s.value) from public.site_settings s where s.is_public), '{}'::jsonb),
    'content',  coalesce((select jsonb_object_agg(c.key, c.published) from public.site_content c where c.published is not null), '{}'::jsonb)
  );
$$;

revoke all on function public.public_site() from public;
grant execute on function public.public_site() to anon, authenticated;

-- ── Who am I (dashboard boot) ───────────────────────────────────────────────

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

create or replace function public.admin_set_my_preferences(p_language text, p_display_name text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  update public.staff_members
  set language = coalesce(nullif(p_language, ''), language),
      display_name = coalesce(left(btrim(p_display_name), 60), display_name)
  where user_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.admin_set_my_preferences(text, text) from public, anon, authenticated;
grant execute on function public.admin_set_my_preferences(text, text) to authenticated;
