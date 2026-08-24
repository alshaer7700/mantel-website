-- Restore the shared rate-limit storage and request IP helper required by the
-- production place_order and assert_within_rate_limits functions.

create table if not exists public.order_ip_events (
  id         bigserial primary key,
  ip         text not null,
  created_at timestamptz not null default now()
);

alter table public.order_ip_events enable row level security;
revoke all on public.order_ip_events from public, anon, authenticated;
revoke all on sequence public.order_ip_events_id_seq from public, anon, authenticated;

create index if not exists order_ip_events_ip_created_idx
  on public.order_ip_events (ip, created_at desc);
create index if not exists order_ip_events_created_idx
  on public.order_ip_events (created_at);

create or replace function public.request_client_ip()
returns text
language plpgsql
stable
set search_path = ''
as $$
declare
  headers jsonb;
  forwarded text;
begin
  begin
    headers := coalesce(current_setting('request.headers', true), '{}')::jsonb;
  exception when others then
    return 'unknown';
  end;

  if nullif(btrim(coalesce(headers ->> 'cf-connecting-ip', '')), '') is not null then
    return btrim(headers ->> 'cf-connecting-ip');
  end if;

  forwarded := headers ->> 'x-forwarded-for';
  if nullif(btrim(coalesce(forwarded, '')), '') is not null then
    return btrim(split_part(forwarded, ',', array_length(string_to_array(forwarded, ','), 1)));
  end if;

  return 'unknown';
end;
$$;

revoke all on function public.request_client_ip() from public, anon, authenticated;
