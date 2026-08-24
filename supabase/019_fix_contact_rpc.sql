-- Fix the Contact RPC variable/column ambiguity revealed by the first smoke test.
-- Use local variable names that cannot collide with table columns.

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
  v_first_name text;
  v_last_name  text;
  v_email      text;
  v_phone      text;
  v_message    text;
  v_client_ip  text;
  v_recent     integer;
  v_new_id     uuid := gen_random_uuid();
begin
  v_first_name := btrim(coalesce($1, ''));
  v_last_name := btrim(coalesce($2, ''));
  v_email := lower(btrim(coalesce($3, '')));
  v_phone := nullif(btrim(coalesce($4, '')), '');
  v_message := btrim(coalesce($5, ''));
  v_client_ip := public.request_client_ip();

  if length(v_first_name) > 120
     or length(v_last_name) > 120
     or length(v_email) > 254
     or length(coalesce(v_phone, '')) > 24
     or length(v_message) not between 1 and 2000 then
    raise exception 'contact details are invalid';
  end if;

  if v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then
    raise exception 'invalid email address';
  end if;

  if v_phone is not null
     and (v_phone !~ '^[+0-9 ()-]+$'
       or length(regexp_replace(v_phone, '[^0-9]', '', 'g')) not between 6 and 15) then
    raise exception 'invalid mobile number';
  end if;

  select count(*) into v_recent
  from public.contact_messages c
  where lower(btrim(c.email)) = v_email
    and c.created_at > now() - interval '10 minutes';
  if v_recent >= 3 then
    raise exception 'too many messages for this email — please try again later' using errcode = 'PT429';
  end if;

  if v_client_ip <> 'unknown' then
    select count(*) into v_recent
    from public.contact_messages c
    where c.client_ip = v_client_ip
      and c.created_at > now() - interval '10 minutes';
    if v_recent >= 6 then
      raise exception 'too many messages from this device — please try again later' using errcode = 'PT429';
    end if;
  end if;

  insert into public.contact_messages (id, first_name, last_name, email, phone, message, client_ip)
  values (v_new_id, v_first_name, v_last_name, v_email, v_phone, v_message, v_client_ip);

  return v_new_id;
end;
$$;

revoke all on function public.submit_contact_message(text, text, text, text, text) from public;
grant execute on function public.submit_contact_message(text, text, text, text, text) to anon, authenticated;
