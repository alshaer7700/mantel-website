-- Store Contact and Newsletter submissions in Supabase.
-- Public roles can call only the validated RPCs; they cannot read or write the
-- underlying tables directly.

create table if not exists public.contact_messages (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null default '',
  last_name    text not null default '',
  email        text not null,
  phone        text,
  message      text not null,
  client_ip    text not null default 'unknown',
  status       text not null default 'new' check (status in ('new', 'read', 'resolved')),
  created_at   timestamptz not null default now()
);

alter table public.contact_messages add column if not exists client_ip text not null default 'unknown';
create index if not exists contact_messages_created_idx on public.contact_messages (created_at desc);
create index if not exists contact_messages_email_idx on public.contact_messages (lower(email), created_at desc);
create index if not exists contact_messages_ip_idx on public.contact_messages (client_ip, created_at desc);

alter table public.contact_messages enable row level security;
revoke all on public.contact_messages from public, anon, authenticated;

create table if not exists public.newsletter_subscribers (
  email          text primary key,
  subscribed_at  timestamptz not null default now(),
  status         text not null default 'active' check (status in ('active', 'unsubscribed'))
);

alter table public.newsletter_subscribers enable row level security;
revoke all on public.newsletter_subscribers from public, anon, authenticated;

create or replace function public.submit_contact_message(
  first_name text,
  last_name  text,
  email      text,
  phone      text,
  message    text
) returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_id    uuid := gen_random_uuid();
  client_ip text := public.request_client_ip();
  recent    integer;
begin
  if length(coalesce(first_name, '')) > 120
     or length(coalesce(last_name, '')) > 120
     or length(coalesce(email, '')) > 254
     or length(coalesce(phone, '')) > 24
     or length(coalesce(message, '')) not between 1 and 2000 then
    raise exception 'contact details are invalid';
  end if;

  if btrim(email) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address';
  end if;

  if nullif(btrim(coalesce(phone, '')), '') is not null
     and (
       btrim(phone) !~ '^[+0-9 ()-]+$'
       or length(regexp_replace(phone, '[^0-9]', '', 'g')) not between 6 and 15
     ) then
    raise exception 'invalid mobile number';
  end if;

  select count(*) into recent
  from public.contact_messages c
  where lower(btrim(c.email)) = lower(btrim(email))
    and c.created_at > now() - interval '10 minutes';
  if recent >= 3 then
    raise exception 'too many messages for this email — please try again later' using errcode = 'PT429';
  end if;

  if client_ip <> 'unknown' then
    select count(*) into recent
    from public.contact_messages c
    where c.client_ip = client_ip
      and c.created_at > now() - interval '10 minutes';
    if recent >= 6 then
      raise exception 'too many messages from this device — please try again later' using errcode = 'PT429';
    end if;
  end if;

  insert into public.contact_messages (id, first_name, last_name, email, phone, message, client_ip)
  values (
    new_id,
    btrim(coalesce(first_name, '')),
    btrim(coalesce(last_name, '')),
    lower(btrim(email)),
    nullif(btrim(coalesce(phone, '')), ''),
    btrim(message),
    client_ip
  );

  return new_id;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text) to anon, authenticated;

create or replace function public.subscribe_newsletter(subscriber_email text)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  normalized text := lower(btrim(coalesce(subscriber_email, '')));
begin
  if normalized = '' or length(normalized) > 254
     or normalized !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address';
  end if;

  insert into public.newsletter_subscribers (email, subscribed_at, status)
  values (normalized, now(), 'active')
  on conflict (email) do update
    set subscribed_at = now(), status = 'active';

  return true;
end;
$$;

revoke all on function public.subscribe_newsletter(text) from public;
grant execute on function public.subscribe_newsletter(text) to anon, authenticated;
