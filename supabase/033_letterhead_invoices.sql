-- 033 — Letterhead and invoices.
--
--   site_settings 'letterhead'         the café letterhead (name, CR, address,
--                                      logo, footer email + Instagram), edited
--                                      in the dashboard and used by the order
--                                      email, invoices and the Word download
--   site_settings 'payments.invoices'  numbering prefix, VAT, bank details,
--                                      default terms and notes
--   invoices                           drafts get no number; issuing assigns
--                                      the next one in sequence, so issued
--                                      numbers never have gaps. Issued
--                                      invoices are voided, never deleted.

insert into public.site_settings (key, value, is_public) values
  ('letterhead', jsonb_build_object(
     'name', 'MANTEL.',
     'cr_number', '197765-1',
     'address', 'SHOP 114D, BLDG 114, ROAD 16, BLOCK 111, HIDD, KINGDOM OF BAHRAIN',
     'logo_url', 'https://bymantel.com/heart.webp',
     'email', 'hello@bymantel.com',
     'instagram', 'bymantel'), false),
  ('payments.invoices', jsonb_build_object(
     'prefix', 'INV',
     'vat_registered', false,
     'vat_number', '',
     'vat_rate', 10,
     'due_days', 7,
     'bank_details', '',
     'default_notes', 'Thank you.'), false)
on conflict (key) do nothing;

create table if not exists public.invoice_counters (
  year  integer primary key,
  last  integer not null default 0
);
alter table public.invoice_counters enable row level security;
revoke all on public.invoice_counters from anon, authenticated;

create table if not exists public.invoices (
  id           uuid primary key default gen_random_uuid(),
  number       text unique,
  status       text not null default 'draft' check (status in ('draft', 'issued', 'paid', 'void')),
  issue_date   date,
  due_date     date,
  order_id     uuid references public.orders (id) on delete set null,
  bill_to      jsonb not null default '{}'::jsonb,
  lines        jsonb not null default '[]'::jsonb check (jsonb_typeof(lines) = 'array'),
  vat_rate     numeric(5, 2) not null default 0 check (vat_rate between 0 and 100),
  subtotal     numeric(12, 3) not null default 0,
  vat          numeric(12, 3) not null default 0,
  total        numeric(12, 3) not null default 0,
  notes        text not null default '' check (length(notes) <= 2000),
  letterhead   jsonb,
  settings     jsonb,
  paid_at      timestamptz,
  void_reason  text,
  created_by   uuid default auth.uid(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists invoices_created_idx on public.invoices (created_at desc);
create index if not exists invoices_order_idx on public.invoices (order_id);

alter table public.invoices enable row level security;

drop policy if exists invoices_staff_read on public.invoices;
create policy invoices_staff_read on public.invoices
  for select to authenticated
  using ((select public.staff_can('payments')));

-- All writes go through the functions below, which keep totals and numbers right.
revoke insert, update, delete on public.invoices from anon, authenticated;
grant select on public.invoices to authenticated;

drop trigger if exists invoices_audit on public.invoices;
create trigger invoices_audit after insert or update or delete on public.invoices
  for each row execute function public.audit_row();

-- Totals are always computed here, never trusted from the browser.
create or replace function public.invoice_clean_lines(p_lines jsonb)
returns jsonb
language sql
immutable
set search_path = ''
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'description', left(btrim(coalesce(l ->> 'description', '')), 300),
           'quantity', round(greatest(coalesce((l ->> 'quantity')::numeric, 0), 0), 3),
           'unit_price', round(greatest(coalesce((l ->> 'unit_price')::numeric, 0), 0), 3))
         order by ord), '[]'::jsonb)
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) with ordinality as x(l, ord)
  where btrim(coalesce(l ->> 'description', '')) <> ''
$$;

create or replace function public.admin_save_invoice(p_id uuid, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid := p_id;
  v_lines  jsonb;
  v_rate   numeric;
  v_sub    numeric;
  v_status text;
begin
  perform public.require_staff('payments');

  if v_id is not null then
    select status into v_status from public.invoices where id = v_id for update;
    if not found then
      raise exception 'That invoice no longer exists. Refresh the page.' using errcode = 'P0001';
    end if;
    if v_status <> 'draft' then
      raise exception 'Issued invoices can''t be changed. Void it and make a new one instead.' using errcode = 'P0001';
    end if;
  end if;

  v_lines := public.invoice_clean_lines(p_data -> 'lines');
  v_rate := least(greatest(coalesce((p_data ->> 'vat_rate')::numeric, 0), 0), 100);
  select coalesce(round(sum(round((l ->> 'quantity')::numeric * (l ->> 'unit_price')::numeric, 3)), 3), 0)
    into v_sub from jsonb_array_elements(v_lines) l;

  if v_id is null then
    insert into public.invoices (order_id, bill_to, lines, vat_rate, subtotal, vat, total, notes, issue_date, due_date)
    values (
      nullif(p_data ->> 'order_id', '')::uuid,
      coalesce(p_data -> 'bill_to', '{}'::jsonb),
      v_lines, v_rate, v_sub, round(v_sub * v_rate / 100, 3), v_sub + round(v_sub * v_rate / 100, 3),
      left(coalesce(p_data ->> 'notes', ''), 2000),
      nullif(p_data ->> 'issue_date', '')::date,
      nullif(p_data ->> 'due_date', '')::date)
    returning id into v_id;
  else
    update public.invoices set
      bill_to = coalesce(p_data -> 'bill_to', '{}'::jsonb),
      lines = v_lines,
      vat_rate = v_rate,
      subtotal = v_sub,
      vat = round(v_sub * v_rate / 100, 3),
      total = v_sub + round(v_sub * v_rate / 100, 3),
      notes = left(coalesce(p_data ->> 'notes', ''), 2000),
      issue_date = nullif(p_data ->> 'issue_date', '')::date,
      due_date = nullif(p_data ->> 'due_date', '')::date,
      updated_at = now()
    where id = v_id;
  end if;
  return v_id;
end;
$$;

-- Assigns the next number (PREFIX-YEAR-0001), freezes the letterhead and
-- invoice settings onto the invoice so a reprint years later looks the same.
create or replace function public.admin_issue_invoice(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv    public.invoices;
  v_year   integer;
  v_seq    integer;
  v_prefix text;
  v_number text;
  v_set    jsonb;
  v_head   jsonb;
begin
  perform public.require_staff('payments');
  select * into v_inv from public.invoices where id = p_id for update;
  if not found then
    raise exception 'That invoice no longer exists. Refresh the page.' using errcode = 'P0001';
  end if;
  if v_inv.status <> 'draft' then
    return v_inv.number;
  end if;
  if jsonb_array_length(v_inv.lines) = 0 then
    raise exception 'Add at least one line before issuing the invoice.' using errcode = 'P0001';
  end if;
  if coalesce(btrim(v_inv.bill_to ->> 'name'), '') = '' then
    raise exception 'Add who the invoice is for before issuing it.' using errcode = 'P0001';
  end if;

  select value into v_set from public.site_settings where key = 'payments.invoices';
  select value into v_head from public.site_settings where key = 'letterhead';
  v_prefix := coalesce(nullif(regexp_replace(upper(coalesce(v_set ->> 'prefix', 'INV')), '[^A-Z0-9]', '', 'g'), ''), 'INV');
  v_year := extract(year from coalesce(v_inv.issue_date, (now() at time zone 'Asia/Bahrain')::date))::integer;

  insert into public.invoice_counters (year, last) values (v_year, 1)
  on conflict (year) do update set last = public.invoice_counters.last + 1
  returning last into v_seq;

  v_number := v_prefix || '-' || v_year || '-' || lpad(v_seq::text, 4, '0');

  update public.invoices set
    number = v_number,
    status = 'issued',
    issue_date = coalesce(issue_date, (now() at time zone 'Asia/Bahrain')::date),
    due_date = coalesce(due_date, coalesce(issue_date, (now() at time zone 'Asia/Bahrain')::date)
                                 + coalesce((v_set ->> 'due_days')::integer, 7)),
    letterhead = v_head,
    settings = v_set,
    updated_at = now()
  where id = p_id;
  return v_number;
end;
$$;

create or replace function public.admin_set_invoice_status(p_id uuid, p_status text, p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
begin
  perform public.require_staff('payments');
  if p_status not in ('issued', 'paid', 'void') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  select status into v_status from public.invoices where id = p_id for update;
  if not found then
    raise exception 'That invoice no longer exists. Refresh the page.' using errcode = 'P0001';
  end if;
  if v_status = 'draft' then
    raise exception 'Issue the invoice first.' using errcode = 'P0001';
  end if;
  if v_status = 'void' then
    raise exception 'A voided invoice can''t be changed.' using errcode = 'P0001';
  end if;
  update public.invoices set
    status = p_status,
    paid_at = case when p_status = 'paid' then now() when p_status = 'issued' then null else paid_at end,
    void_reason = case when p_status = 'void' then left(coalesce(p_reason, ''), 300) else void_reason end,
    updated_at = now()
  where id = p_id;
  return true;
end;
$$;

create or replace function public.admin_delete_invoice(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('payments');
  delete from public.invoices where id = p_id and status = 'draft';
  if not found then
    raise exception 'Only drafts can be deleted. Void an issued invoice instead.' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

-- A draft filled in from an order: the customer and every line.
create or replace function public.admin_invoice_from_order(p_order_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_o    public.orders;
  v_set  jsonb;
  v_id   uuid;
begin
  perform public.require_staff('payments');
  select * into v_o from public.orders where id = p_order_id;
  if not found then
    raise exception 'That order no longer exists.' using errcode = 'P0001';
  end if;
  select id into v_id from public.invoices where order_id = p_order_id and status <> 'void' order by created_at desc limit 1;
  if v_id is not null then
    return v_id;
  end if;
  select value into v_set from public.site_settings where key = 'payments.invoices';
  return public.admin_save_invoice(null, jsonb_build_object(
    'order_id', v_o.id,
    'bill_to', jsonb_build_object('name', v_o.customer_name, 'email', coalesce(v_o.customer_email, ''), 'phone', coalesce(v_o.customer_phone, '')),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('description', i.item_name, 'quantity', i.quantity, 'unit_price', i.item_price) order by i.item_name)
                       from public.order_items i where i.order_id = v_o.id), '[]'::jsonb),
    'vat_rate', case when coalesce((v_set ->> 'vat_registered')::boolean, false) then coalesce((v_set ->> 'vat_rate')::numeric, 10) else 0 end,
    'notes', coalesce(v_set ->> 'default_notes', '')));
end;
$$;

revoke all on function public.invoice_clean_lines(jsonb) from public, anon, authenticated;
revoke all on function public.admin_save_invoice(uuid, jsonb) from public, anon, authenticated;
revoke all on function public.admin_issue_invoice(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_invoice_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_invoice(uuid) from public, anon, authenticated;
revoke all on function public.admin_invoice_from_order(uuid) from public, anon, authenticated;
grant execute on function public.admin_save_invoice(uuid, jsonb) to authenticated;
grant execute on function public.admin_issue_invoice(uuid) to authenticated;
grant execute on function public.admin_set_invoice_status(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_invoice(uuid) to authenticated;
grant execute on function public.admin_invoice_from_order(uuid) to authenticated;
