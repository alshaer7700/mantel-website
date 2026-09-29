-- 030: counter PIN — each person unlocks the shared counter tablet as
-- themselves, so the activity log says who did what (see counter_actor() in 028).
--
-- The PIN is stored as a bcrypt hash. Five wrong tries lock that person's PIN
-- for five minutes, which makes guessing a 4-digit PIN impractical.

create table if not exists public.counter_pin_attempts (
  id         bigint generated always as identity primary key,
  staff_id   uuid not null,
  created_at timestamptz not null default now()
);

alter table public.counter_pin_attempts enable row level security;
revoke all on public.counter_pin_attempts from public, anon, authenticated;

create or replace function public.admin_set_my_pin(p_pin text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;
  if p_pin is null or p_pin !~ '^[0-9]{4}$' then
    raise exception 'The PIN must be exactly 4 digits.' using errcode = 'P0001';
  end if;
  update public.staff_members
  set pin_hash = extensions.crypt(p_pin, extensions.gen_salt('bf'))
  where user_id = auth.uid();
  return found;
end;
$$;

revoke all on function public.admin_set_my_pin(text) from public, anon, authenticated;
grant execute on function public.admin_set_my_pin(text) to authenticated;

-- Who can unlock this tablet: active staff who have set a PIN.
create or replace function public.admin_counter_staff()
returns table (user_id uuid, name text)
language sql
stable
security definer
set search_path = ''
as $$
  select s.user_id, coalesce(nullif(s.display_name, ''), split_part(u.email, '@', 1))::text
  from public.staff_members s
  join auth.users u on u.id = s.user_id
  where s.active and s.pin_hash is not null and public.is_staff()
  order by 2;
$$;

revoke all on function public.admin_counter_staff() from public, anon, authenticated;
grant execute on function public.admin_counter_staff() to authenticated;

create or replace function public.admin_counter_unlock(p_staff_id uuid, p_pin text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_hash  text;
  v_token text;
begin
  if not public.is_staff() then
    raise exception 'staff access required' using errcode = '42501';
  end if;

  if (select count(*) from public.counter_pin_attempts
      where staff_id = p_staff_id and created_at > now() - interval '5 minutes') >= 5 then
    raise exception 'Too many wrong PINs. Wait five minutes and try again.' using errcode = 'P0001';
  end if;

  select pin_hash into v_hash from public.staff_members where user_id = p_staff_id and active;
  if v_hash is null or extensions.crypt(coalesce(p_pin, ''), v_hash) <> v_hash then
    insert into public.counter_pin_attempts (staff_id) values (p_staff_id);
    return null;
  end if;

  delete from public.counter_pin_attempts where staff_id = p_staff_id;
  delete from public.counter_sessions where expires_at < now();

  v_token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.counter_sessions (token_hash, staff_id, device_user, expires_at)
  values (encode(extensions.digest(v_token, 'sha256'), 'hex'), p_staff_id, auth.uid(), now() + interval '12 hours');
  return v_token;
end;
$$;

revoke all on function public.admin_counter_unlock(uuid, text) from public, anon, authenticated;
grant execute on function public.admin_counter_unlock(uuid, text) to authenticated;
