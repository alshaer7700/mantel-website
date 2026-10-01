-- 038 — Loyalty stamps and gift cards.
--
-- LOYALTY. A stamp card whose number is the customer's mobile. At the counter
-- they say their number (or show the card in Apple Wallet, whose barcode is
-- that number) and staff have the card in front of them. Every completed
-- order placed with that mobile earns a stamp on its own; staff add stamps for
-- counter purchases, and give the reward when the card is full, which uses up
-- that many stamps.
--
--   setting 'marketing.loyalty'  on/off, stamps per reward, the reward
--   loyalty_phone_key(text)      any way of writing a number → '+97338434118'
--   loyalty_cards                one per mobile: name, Apple Wallet pass token
--   loyalty_entries              counter stamps (+n) and rewards given (−n)
--   loyalty_card(phone)          stamps from completed orders + entries
--   admin_loyalty_*              look up, add stamps, give a reward
--   my_loyalty()                 the signed-in customer's own card
--
-- GIFT CARDS. A code with a balance. Staff issue one (sold at the counter),
-- spend from it at the counter, and can void it. Every change is a row in
-- gift_card_moves, so the balance always has a history behind it.
--
-- Who can do what: 'marketing' sets loyalty up and issues or voids gift
-- cards; 'orders' or 'marketing' can stamp, give rewards and spend a gift
-- card — the counter's everyday jobs.

-- ── Loyalty ─────────────────────────────────────────────────────────────────

insert into public.site_settings (key, value, is_public)
values ('marketing.loyalty', '{"enabled": false, "stamps_needed": 9, "reward": "A free drink of your choice"}'::jsonb, true)
on conflict (key) do nothing;

-- Digits only; 00 → international; a bare 8-digit number is Bahraini. Null
-- when it can't be a phone number, so orders typed with junk simply don't
-- match a card.
create or replace function public.loyalty_phone_key(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  d text := regexp_replace(coalesce(p_phone, ''), '[^0-9]', '', 'g');
begin
  if d like '00%' then d := substr(d, 3); end if;
  if length(d) = 8 then d := '973' || d; end if;
  if length(d) not between 10 and 15 then return null; end if;
  return '+' || d;
end;
$$;

grant execute on function public.loyalty_phone_key(text) to anon, authenticated;

create index if not exists orders_loyalty_phone_idx on public.orders (public.loyalty_phone_key(customer_phone))
  where status = 'completed';

create or replace function public.loyalty_phone(p_phone text)
returns text
language plpgsql
immutable
set search_path = ''
as $$
declare
  v text := public.loyalty_phone_key(p_phone);
begin
  if v is null then
    raise exception 'Enter the customer''s mobile number.' using errcode = '22023';
  end if;
  return v;
end;
$$;

revoke all on function public.loyalty_phone(text) from public, anon, authenticated;

create table if not exists public.loyalty_cards (
  phone       text primary key check (phone ~ '^\+[0-9]{10,15}$'),
  name        text not null default '' check (char_length(name) <= 120),
  pass_token  uuid not null unique default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null default auth.uid()
);

create table if not exists public.loyalty_entries (
  id          bigint generated always as identity primary key,
  phone       text not null references public.loyalty_cards(phone) on delete cascade,
  delta       integer not null check (delta <> 0 and delta between -100 and 100),
  kind        text not null check (kind in ('stamp', 'reward')),
  note        text not null default '' check (char_length(note) <= 200),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null default auth.uid()
);

create index if not exists loyalty_entries_phone_idx on public.loyalty_entries (phone, created_at desc);

alter table public.loyalty_cards enable row level security;
alter table public.loyalty_entries enable row level security;
revoke all on public.loyalty_cards from public, anon, authenticated;
revoke all on public.loyalty_entries from public, anon, authenticated;

drop policy if exists loyalty_cards_staff_read on public.loyalty_cards;
create policy loyalty_cards_staff_read on public.loyalty_cards
  for select to authenticated
  using ((select public.staff_can('orders')) or (select public.staff_can('marketing')));

drop policy if exists loyalty_entries_staff_read on public.loyalty_entries;
create policy loyalty_entries_staff_read on public.loyalty_entries
  for select to authenticated
  using ((select public.staff_can('orders')) or (select public.staff_can('marketing')));

grant select on public.loyalty_cards, public.loyalty_entries to authenticated;

create or replace trigger loyalty_cards_audit after insert or update or delete on public.loyalty_cards
  for each row execute function public.audit_row();
create or replace trigger loyalty_entries_audit after insert or update or delete on public.loyalty_entries
  for each row execute function public.audit_row();

create or replace function public.loyalty_settings()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'enabled', coalesce((v ->> 'enabled')::boolean, false),
    'stamps_needed', least(greatest(coalesce((v ->> 'stamps_needed')::integer, 9), 2), 50),
    'reward', coalesce(nullif(btrim(v ->> 'reward'), ''), 'A free drink'))
  from (select coalesce((select value from public.site_settings where key = 'marketing.loyalty'), '{}'::jsonb) as v) s;
$$;

revoke all on function public.loyalty_settings() from public, anon, authenticated;

-- Stamps for one mobile: one per completed order, plus counter stamps, minus
-- rewards given. Never below zero.
create or replace function public.loyalty_card(p_phone text)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with earned as (
    select count(*)::integer as n from public.orders o
    where public.loyalty_phone_key(o.customer_phone) = p_phone and o.status = 'completed'
  ),
  entries as (
    select coalesce(sum(l.delta) filter (where l.kind = 'stamp'), 0)::integer as stamps,
           coalesce(-sum(l.delta) filter (where l.kind = 'reward'), 0)::integer as used,
           count(*) filter (where l.kind = 'reward')::integer as rewards
    from public.loyalty_entries l where l.phone = p_phone
  ),
  s as (select public.loyalty_settings() as v)
  select jsonb_build_object(
    'phone', p_phone,
    'from_orders', earned.n,
    'from_counter', entries.stamps,
    'rewards_given', entries.rewards,
    'stamps', greatest(earned.n + entries.stamps - entries.used, 0),
    'needed', (s.v ->> 'stamps_needed')::integer,
    'reward', s.v ->> 'reward',
    'enabled', (s.v ->> 'enabled')::boolean)
  from earned, entries, s;
$$;

revoke all on function public.loyalty_card(text) from public, anon, authenticated;

create or replace function public.require_counter()
returns void
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (public.staff_can('orders') or public.staff_can('marketing')) then
    raise exception 'You don''t have access to this.' using errcode = '42501';
  end if;
end;
$$;

revoke all on function public.require_counter() from public, anon, authenticated;

-- Make the card if this is the first time (and fill in a name if one is given).
create or replace function public.loyalty_ensure_card(p_phone text, p_name text)
returns void
language sql
security definer
set search_path = ''
as $$
  insert into public.loyalty_cards (phone, name)
  values (p_phone, left(btrim(coalesce(p_name, '')), 120))
  on conflict (phone) do update
    set name = case when btrim(coalesce(p_name, '')) = '' then public.loyalty_cards.name
                    else left(btrim(p_name), 120) end;
$$;

revoke all on function public.loyalty_ensure_card(text, text) from public, anon, authenticated;

create or replace function public.admin_loyalty_lookup(p_phone text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_card  public.loyalty_cards;
begin
  perform public.require_counter();
  v_phone := public.loyalty_phone(p_phone);
  select * into v_card from public.loyalty_cards where phone = v_phone;
  return public.loyalty_card(v_phone) || jsonb_build_object(
    'has_card', v_card.phone is not null,
    'pass_token', v_card.pass_token,
    'name', coalesce(nullif(v_card.name, ''), (
      select o.customer_name from public.orders o
      where public.loyalty_phone_key(o.customer_phone) = v_phone
      order by o.created_at desc limit 1)),
    'since', v_card.created_at,
    'history', coalesce((
      select jsonb_agg(h order by h.at desc) from (
        select coalesce(o.completed_at, o.status_changed_at, o.created_at) as at, 'order' as kind, 1 as delta,
               'MTL-' || upper(substring(replace(o.id::text, '-', '') from 1 for 6)) as note
        from public.orders o
        where public.loyalty_phone_key(o.customer_phone) = v_phone and o.status = 'completed'
        union all
        select l.created_at, l.kind, l.delta, l.note from public.loyalty_entries l where l.phone = v_phone
        order by 1 desc limit 40) h), '[]'::jsonb));
end;
$$;

revoke all on function public.admin_loyalty_lookup(text) from public, anon;
grant execute on function public.admin_loyalty_lookup(text) to authenticated;

-- Make or rename a card without stamping it (for the Wallet pass).
create or replace function public.admin_loyalty_save_card(p_phone text, p_name text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  perform public.require_counter();
  v_phone := public.loyalty_phone(p_phone);
  perform public.loyalty_ensure_card(v_phone, p_name);
  return public.admin_loyalty_lookup(v_phone);
end;
$$;

revoke all on function public.admin_loyalty_save_card(text, text) from public, anon;
grant execute on function public.admin_loyalty_save_card(text, text) to authenticated;

create or replace function public.admin_loyalty_stamp(p_phone text, p_count integer, p_note text, p_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
begin
  perform public.require_counter();
  v_phone := public.loyalty_phone(p_phone);
  if p_count is null or p_count not between 1 and 20 then
    raise exception 'Add between 1 and 20 stamps at a time.' using errcode = '22023';
  end if;
  perform public.loyalty_ensure_card(v_phone, p_name);
  insert into public.loyalty_entries (phone, delta, kind, note)
  values (v_phone, p_count, 'stamp', left(coalesce(btrim(p_note), ''), 200));
  return public.admin_loyalty_lookup(v_phone);
end;
$$;

revoke all on function public.admin_loyalty_stamp(text, integer, text, text) from public, anon;
grant execute on function public.admin_loyalty_stamp(text, integer, text, text) to authenticated;

create or replace function public.admin_loyalty_reward(p_phone text, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_card  jsonb;
  v_need  integer;
begin
  perform public.require_counter();
  v_phone := public.loyalty_phone(p_phone);
  -- One reward at a time per card, even if two people tap at once.
  perform pg_advisory_xact_lock(hashtext('loyalty:' || v_phone));
  v_card := public.loyalty_card(v_phone);
  v_need := (v_card ->> 'needed')::integer;
  if (v_card ->> 'stamps')::integer < v_need then
    raise exception 'Not enough stamps for a reward yet.' using errcode = '22023';
  end if;
  perform public.loyalty_ensure_card(v_phone, null);
  insert into public.loyalty_entries (phone, delta, kind, note)
  values (v_phone, -v_need, 'reward', left(coalesce(btrim(p_note), ''), 200));
  return public.admin_loyalty_lookup(v_phone);
end;
$$;

revoke all on function public.admin_loyalty_reward(text, text) from public, anon;
grant execute on function public.admin_loyalty_reward(text, text) to authenticated;

-- Every card, fullest first: who has a reward waiting, and who's close.
create or replace function public.admin_loyalty_cards()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  perform public.require_counter();
  return coalesce((
    select jsonb_agg(r.c order by (r.c ->> 'stamps')::integer desc, r.c ->> 'phone')
    from (
      select g.c from (
        select public.loyalty_card(x.phone) || jsonb_build_object(
                 'name', coalesce(nullif(max(c.name), ''), max(x.name)),
                 'has_card', bool_or(c.phone is not null),
                 'last_visit', max(x.at)) as c
        from (
          select public.loyalty_phone_key(o.customer_phone) as phone, o.customer_name as name,
                 coalesce(o.completed_at, o.created_at) as at
          from public.orders o
          where o.status = 'completed' and public.loyalty_phone_key(o.customer_phone) is not null
          union all
          select l.phone, null, l.created_at from public.loyalty_entries l
          union all
          select k.phone, null, k.created_at from public.loyalty_cards k
        ) x
        left join public.loyalty_cards c on c.phone = x.phone
        group by x.phone
      ) g
      order by (g.c ->> 'stamps')::integer desc
      limit 500
    ) r), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_loyalty_cards() from public, anon;
grant execute on function public.admin_loyalty_cards() to authenticated;

-- The signed-in customer's own card, by the mobile on their profile. Makes
-- the card on first look so the account page can offer the Wallet pass.
create or replace function public.my_loyalty()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_phone text;
  v_name  text;
begin
  if auth.uid() is null or not (public.loyalty_settings() ->> 'enabled')::boolean then
    return null;
  end if;
  select public.loyalty_phone_key(p.phone), p.full_name into v_phone, v_name
  from public.profiles p where p.id = auth.uid();
  if v_phone is null then
    return jsonb_build_object('needs_phone', true) || (public.loyalty_settings() - 'enabled');
  end if;
  perform public.loyalty_ensure_card(v_phone, null);
  update public.loyalty_cards set name = left(btrim(coalesce(v_name, '')), 120)
  where phone = v_phone and name = '' and btrim(coalesce(v_name, '')) <> '';
  return public.loyalty_card(v_phone)
    || jsonb_build_object('pass_token', (select pass_token from public.loyalty_cards where phone = v_phone));
end;
$$;

revoke all on function public.my_loyalty() from public, anon;
grant execute on function public.my_loyalty() to authenticated;

-- What the Apple Wallet pass shows, for the loyalty-pass edge function only.
create or replace function public.loyalty_pass(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select public.loyalty_card(c.phone) || jsonb_build_object('name', c.name, 'pass_token', c.pass_token)
  from public.loyalty_cards c where c.pass_token = p_token;
$$;

revoke all on function public.loyalty_pass(uuid) from public, anon, authenticated;
grant execute on function public.loyalty_pass(uuid) to service_role;

-- The customer's own card page (bymantel.com/wallet?t=<token>): live stamps,
-- with the middle of the number hidden in case the link is passed on.
create or replace function public.loyalty_card_public(p_token uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
           'name', c.name,
           'phone', regexp_replace(c.phone, '^(\+\d{3}\d{2})\d{2}(\d{4})$', '\1••\2'),
           'stamps', (k ->> 'stamps')::integer,
           'needed', (k ->> 'needed')::integer,
           'reward', k ->> 'reward',
           'enabled', (k ->> 'enabled')::boolean,
           'rewards_given', (k ->> 'rewards_given')::integer)
  from public.loyalty_cards c, lateral (select public.loyalty_card(c.phone) as k) x
  where c.pass_token = p_token;
$$;

revoke all on function public.loyalty_card_public(uuid) from public;
grant execute on function public.loyalty_card_public(uuid) to anon, authenticated;

-- ── Gift cards ──────────────────────────────────────────────────────────────

create table if not exists public.gift_cards (
  code             text primary key check (code ~ '^MTL-[A-Z0-9]{4}-[A-Z0-9]{4}$'),
  initial_amount   numeric(10,3) not null check (initial_amount > 0 and initial_amount <= 1000),
  balance          numeric(10,3) not null check (balance >= 0),
  status           text not null default 'active' check (status in ('active', 'void')),
  recipient_name   text not null default '' check (char_length(recipient_name) <= 120),
  recipient_email  text not null default '' check (char_length(recipient_email) <= 254),
  from_name        text not null default '' check (char_length(from_name) <= 120),
  message          text not null default '' check (char_length(message) <= 500),
  paid_by          text not null default 'cash' check (paid_by in ('cash', 'card', 'transfer', 'benefitpay', 'free')),
  expires_on       date,
  void_reason      text,
  created_at       timestamptz not null default now(),
  created_by       uuid references auth.users(id) on delete set null default auth.uid()
);

create table if not exists public.gift_card_moves (
  id          bigint generated always as identity primary key,
  code        text not null references public.gift_cards(code) on delete cascade,
  amount      numeric(10,3) not null check (amount <> 0),
  kind        text not null check (kind in ('issue', 'spend', 'refund', 'void')),
  note        text not null default '' check (char_length(note) <= 200),
  balance     numeric(10,3) not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) on delete set null default auth.uid()
);

create index if not exists gift_card_moves_code_idx on public.gift_card_moves (code, created_at desc);

alter table public.gift_cards enable row level security;
alter table public.gift_card_moves enable row level security;
revoke all on public.gift_cards from public, anon, authenticated;
revoke all on public.gift_card_moves from public, anon, authenticated;

drop policy if exists gift_cards_staff_read on public.gift_cards;
create policy gift_cards_staff_read on public.gift_cards
  for select to authenticated
  using ((select public.staff_can('orders')) or (select public.staff_can('marketing')));

drop policy if exists gift_card_moves_staff_read on public.gift_card_moves;
create policy gift_card_moves_staff_read on public.gift_card_moves
  for select to authenticated
  using ((select public.staff_can('orders')) or (select public.staff_can('marketing')));

grant select on public.gift_cards, public.gift_card_moves to authenticated;

create or replace trigger gift_cards_audit after insert or update or delete on public.gift_cards
  for each row execute function public.audit_row();

create or replace function public.admin_gift_card_issue(p_data jsonb)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_amount numeric := round(coalesce((p_data ->> 'amount')::numeric, 0), 3);
  v_code   text;
  v_chars  text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_paid   text := coalesce(nullif(p_data ->> 'paid_by', ''), 'cash');
  i        integer;
begin
  perform public.require_staff('marketing');
  if v_amount <= 0 or v_amount > 1000 then
    raise exception 'Enter an amount between BD 0.001 and BD 1000.' using errcode = '22023';
  end if;
  if v_paid not in ('cash', 'card', 'transfer', 'benefitpay', 'free') then
    v_paid := 'cash';
  end if;
  -- MTL-XXXX-XXXX from 32 unambiguous characters (no 0/O, 1/I); retry on the
  -- rare clash.
  loop
    v_code := 'MTL-';
    for i in 1..8 loop
      v_code := v_code || substr(v_chars, 1 + (get_byte(extensions.gen_random_bytes(1), 0) % 32), 1);
      if i = 4 then v_code := v_code || '-'; end if;
    end loop;
    exit when not exists (select 1 from public.gift_cards where code = v_code);
  end loop;

  insert into public.gift_cards (code, initial_amount, balance, recipient_name, recipient_email, from_name, message, paid_by, expires_on)
  values (
    v_code, v_amount, v_amount,
    left(btrim(coalesce(p_data ->> 'recipient_name', '')), 120),
    left(lower(btrim(coalesce(p_data ->> 'recipient_email', ''))), 254),
    left(btrim(coalesce(p_data ->> 'from_name', '')), 120),
    left(btrim(coalesce(p_data ->> 'message', '')), 500),
    v_paid,
    coalesce(nullif(p_data ->> 'expires_on', '')::date, ((now() at time zone 'Asia/Bahrain')::date + interval '1 year')::date));
  insert into public.gift_card_moves (code, amount, kind, note, balance)
  values (v_code, v_amount, 'issue', 'Paid by ' || v_paid, v_amount);
  return v_code;
end;
$$;

revoke all on function public.admin_gift_card_issue(jsonb) from public, anon;
grant execute on function public.admin_gift_card_issue(jsonb) to authenticated;

create or replace function public.admin_gift_card_spend(p_code text, p_amount numeric, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card   public.gift_cards;
  v_amount numeric := round(coalesce(p_amount, 0), 3);
begin
  perform public.require_counter();
  select * into v_card from public.gift_cards where code = upper(btrim(coalesce(p_code, ''))) for update;
  if v_card.code is null then
    raise exception 'No gift card with that code.' using errcode = '22023';
  end if;
  if v_card.status <> 'active' then
    raise exception 'This gift card was voided.' using errcode = '22023';
  end if;
  if v_card.expires_on is not null and v_card.expires_on < (now() at time zone 'Asia/Bahrain')::date then
    raise exception 'This gift card has expired.' using errcode = '22023';
  end if;
  if v_amount <= 0 then
    raise exception 'Enter the amount to take off the card.' using errcode = '22023';
  end if;
  if v_amount > v_card.balance then
    raise exception 'That is more than the card has left.' using errcode = '22023';
  end if;
  update public.gift_cards set balance = balance - v_amount where code = v_card.code;
  insert into public.gift_card_moves (code, amount, kind, note, balance)
  values (v_card.code, -v_amount, 'spend', left(coalesce(btrim(p_note), ''), 200), v_card.balance - v_amount);
  return (select to_jsonb(g) from public.gift_cards g where g.code = v_card.code);
end;
$$;

revoke all on function public.admin_gift_card_spend(text, numeric, text) from public, anon;
grant execute on function public.admin_gift_card_spend(text, numeric, text) to authenticated;

create or replace function public.admin_gift_card_void(p_code text, p_reason text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_card public.gift_cards;
begin
  perform public.require_staff('marketing');
  select * into v_card from public.gift_cards where code = upper(btrim(coalesce(p_code, ''))) for update;
  if v_card.code is null or v_card.status <> 'active' then
    raise exception 'That gift card isn''t active.' using errcode = '22023';
  end if;
  update public.gift_cards set status = 'void', void_reason = nullif(left(btrim(coalesce(p_reason, '')), 200), ''), balance = 0
  where code = v_card.code;
  if v_card.balance > 0 then
    insert into public.gift_card_moves (code, amount, kind, note, balance)
    values (v_card.code, -v_card.balance, 'void', left(coalesce(btrim(p_reason), ''), 200), 0);
  end if;
end;
$$;

revoke all on function public.admin_gift_card_void(text, text) from public, anon;
grant execute on function public.admin_gift_card_void(text, text) to authenticated;
