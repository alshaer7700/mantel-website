-- 034 — Invoices, receipts and letters, numbered INV-MTL-001, REC-MTL-001,
-- LTR-MTL-001.
--
-- 033's invoices table becomes `documents` with a `kind`, and each kind has
-- its own counter. Nothing had been issued yet when this ran, so the old
-- INV-YEAR-0001 numbering and its counter are simply replaced.
--
--   invoice  draft → issued → paid (or void)       bill-to, lines, VAT, due date
--   receipt  draft → issued (or void)              received from, lines, how paid
--   letter   draft → issued (or void)              recipient, subject, body

alter table if exists public.invoices rename to documents;
alter index if exists invoices_created_idx rename to documents_created_idx;
alter index if exists invoices_order_idx rename to documents_order_idx;

alter table public.documents
  add column if not exists kind text not null default 'invoice' check (kind in ('invoice', 'receipt', 'letter')),
  add column if not exists subject text not null default '' check (length(subject) <= 200),
  add column if not exists body text not null default '' check (length(body) <= 20000),
  add column if not exists payment_method text check (payment_method in ('cash', 'card', 'transfer', 'benefitpay', 'other')),
  add column if not exists reference text not null default '' check (length(reference) <= 100),
  add column if not exists related_id uuid references public.documents (id) on delete set null;

create index if not exists documents_kind_idx on public.documents (kind, created_at desc);

drop policy if exists invoices_staff_read on public.documents;
drop policy if exists documents_staff_read on public.documents;
create policy documents_staff_read on public.documents
  for select to authenticated
  using ((select public.staff_can('payments')));

drop trigger if exists invoices_audit on public.documents;
drop trigger if exists documents_audit on public.documents;
create trigger documents_audit after insert or update or delete on public.documents
  for each row execute function public.audit_row();

drop table if exists public.invoice_counters;
create table if not exists public.document_counters (
  kind  text primary key check (kind in ('invoice', 'receipt', 'letter')),
  last  integer not null default 0
);
alter table public.document_counters enable row level security;
revoke all on public.document_counters from anon, authenticated;

update public.site_settings
set value = (value - 'prefix') || jsonb_build_object(
  'code', 'MTL',
  'invoice_prefix', 'INV',
  'receipt_prefix', 'REC',
  'letter_prefix', 'LTR',
  'letter_signoff', 'Kind regards,',
  'letter_signature', 'Mantel')
where key = 'payments.invoices' and not (value ? 'code');

drop function if exists public.admin_save_invoice(uuid, jsonb);
drop function if exists public.admin_issue_invoice(uuid);
drop function if exists public.admin_set_invoice_status(uuid, text, text);
drop function if exists public.admin_delete_invoice(uuid);
drop function if exists public.admin_invoice_from_order(uuid);

create or replace function public.admin_save_document(p_id uuid, p_kind text, p_data jsonb)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_id     uuid := p_id;
  v_kind   text := p_kind;
  v_lines  jsonb;
  v_rate   numeric;
  v_sub    numeric;
  v_status text;
  v_pay    text := nullif(p_data ->> 'payment_method', '');
begin
  perform public.require_staff('payments');

  if v_id is not null then
    select status, kind into v_status, v_kind from public.documents where id = v_id for update;
    if not found then
      raise exception 'That document no longer exists. Refresh the page.' using errcode = 'P0001';
    end if;
    if v_status <> 'draft' then
      raise exception 'Issued documents can''t be changed. Void it and make a new one instead.' using errcode = 'P0001';
    end if;
  elsif v_kind not in ('invoice', 'receipt', 'letter') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;

  if v_kind = 'letter' then
    v_lines := '[]'::jsonb;
    v_rate := 0;
  else
    v_lines := public.invoice_clean_lines(p_data -> 'lines');
    v_rate := least(greatest(coalesce((p_data ->> 'vat_rate')::numeric, 0), 0), 100);
  end if;
  select coalesce(round(sum(round((l ->> 'quantity')::numeric * (l ->> 'unit_price')::numeric, 3)), 3), 0)
    into v_sub from jsonb_array_elements(v_lines) l;
  if v_kind <> 'receipt' or v_pay is null or v_pay not in ('cash', 'card', 'transfer', 'benefitpay', 'other') then
    v_pay := case when v_kind = 'receipt' then 'cash' else null end;
  end if;

  if v_id is null then
    insert into public.documents (kind, order_id, related_id, bill_to, lines, vat_rate, subtotal, vat, total,
                                  notes, issue_date, due_date, subject, body, payment_method, reference)
    values (
      v_kind,
      nullif(p_data ->> 'order_id', '')::uuid,
      nullif(p_data ->> 'related_id', '')::uuid,
      coalesce(p_data -> 'bill_to', '{}'::jsonb),
      v_lines, v_rate, v_sub, round(v_sub * v_rate / 100, 3), v_sub + round(v_sub * v_rate / 100, 3),
      left(coalesce(p_data ->> 'notes', ''), 2000),
      nullif(p_data ->> 'issue_date', '')::date,
      case when v_kind = 'invoice' then nullif(p_data ->> 'due_date', '')::date end,
      left(coalesce(p_data ->> 'subject', ''), 200),
      left(coalesce(p_data ->> 'body', ''), 20000),
      v_pay,
      left(coalesce(p_data ->> 'reference', ''), 100))
    returning id into v_id;
  else
    update public.documents set
      bill_to = coalesce(p_data -> 'bill_to', '{}'::jsonb),
      lines = v_lines,
      vat_rate = v_rate,
      subtotal = v_sub,
      vat = round(v_sub * v_rate / 100, 3),
      total = v_sub + round(v_sub * v_rate / 100, 3),
      notes = left(coalesce(p_data ->> 'notes', ''), 2000),
      issue_date = nullif(p_data ->> 'issue_date', '')::date,
      due_date = case when v_kind = 'invoice' then nullif(p_data ->> 'due_date', '')::date end,
      subject = left(coalesce(p_data ->> 'subject', ''), 200),
      body = left(coalesce(p_data ->> 'body', ''), 20000),
      payment_method = v_pay,
      reference = left(coalesce(p_data ->> 'reference', ''), 100),
      updated_at = now()
    where id = v_id;
  end if;
  return v_id;
end;
$$;

-- Gives the next number for the kind (INV-MTL-001) and freezes the
-- letterhead and settings onto the document, so a reprint looks the same.
create or replace function public.admin_issue_document(p_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_doc    public.documents;
  v_seq    integer;
  v_prefix text;
  v_code   text;
  v_number text;
  v_set    jsonb;
  v_head   jsonb;
  v_today  date := (now() at time zone 'Asia/Bahrain')::date;
begin
  perform public.require_staff('payments');
  select * into v_doc from public.documents where id = p_id for update;
  if not found then
    raise exception 'That document no longer exists. Refresh the page.' using errcode = 'P0001';
  end if;
  if v_doc.status <> 'draft' then
    return v_doc.number;
  end if;
  if coalesce(btrim(v_doc.bill_to ->> 'name'), '') = '' then
    raise exception 'Add who it is for before issuing it.' using errcode = 'P0001';
  end if;
  if v_doc.kind = 'letter' and btrim(v_doc.body) = '' then
    raise exception 'Write the letter before issuing it.' using errcode = 'P0001';
  end if;
  if v_doc.kind <> 'letter' and jsonb_array_length(v_doc.lines) = 0 then
    raise exception 'Add at least one line before issuing it.' using errcode = 'P0001';
  end if;

  select value into v_set from public.site_settings where key = 'payments.invoices';
  select value into v_head from public.site_settings where key = 'letterhead';
  v_code := coalesce(nullif(regexp_replace(upper(coalesce(v_set ->> 'code', 'MTL')), '[^A-Z0-9]', '', 'g'), ''), 'MTL');
  v_prefix := coalesce(nullif(regexp_replace(upper(coalesce(v_set ->> (v_doc.kind || '_prefix'), '')), '[^A-Z0-9]', '', 'g'), ''),
                       case v_doc.kind when 'invoice' then 'INV' when 'receipt' then 'REC' else 'LTR' end);

  insert into public.document_counters (kind, last) values (v_doc.kind, 1)
  on conflict (kind) do update set last = public.document_counters.last + 1
  returning last into v_seq;

  v_number := v_prefix || '-' || v_code || '-' ||
              case when v_seq < 1000 then lpad(v_seq::text, 3, '0') else v_seq::text end;

  update public.documents set
    number = v_number,
    status = 'issued',
    issue_date = coalesce(issue_date, v_today),
    due_date = case when kind = 'invoice'
                    then coalesce(due_date, coalesce(issue_date, v_today) + coalesce((v_set ->> 'due_days')::integer, 7))
               end,
    letterhead = v_head,
    settings = v_set,
    updated_at = now()
  where id = p_id;
  return v_number;
end;
$$;

create or replace function public.admin_set_document_status(p_id uuid, p_status text, p_reason text default null)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_status text;
  v_kind   text;
begin
  perform public.require_staff('payments');
  if p_status not in ('issued', 'paid', 'void') then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  select status, kind into v_status, v_kind from public.documents where id = p_id for update;
  if not found then
    raise exception 'That document no longer exists. Refresh the page.' using errcode = 'P0001';
  end if;
  if v_status = 'draft' then
    raise exception 'Issue it first.' using errcode = 'P0001';
  end if;
  if v_status = 'void' then
    raise exception 'A voided document can''t be changed.' using errcode = 'P0001';
  end if;
  if p_status = 'paid' and v_kind <> 'invoice' then
    raise exception 'invalid status' using errcode = '22023';
  end if;
  update public.documents set
    status = p_status,
    paid_at = case when p_status = 'paid' then now() when p_status = 'issued' then null else paid_at end,
    void_reason = case when p_status = 'void' then left(coalesce(p_reason, ''), 300) else void_reason end,
    updated_at = now()
  where id = p_id;
  return true;
end;
$$;

create or replace function public.admin_delete_document(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('payments');
  delete from public.documents where id = p_id and status = 'draft';
  if not found then
    raise exception 'Only drafts can be deleted. Void an issued document instead.' using errcode = 'P0001';
  end if;
  return true;
end;
$$;

-- An invoice or receipt filled in from an order: the customer and every line.
create or replace function public.admin_document_from_order(p_order_id uuid, p_kind text)
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
  if p_kind not in ('invoice', 'receipt') then
    raise exception 'invalid kind' using errcode = '22023';
  end if;
  select * into v_o from public.orders where id = p_order_id;
  if not found then
    raise exception 'That order no longer exists.' using errcode = 'P0001';
  end if;
  select id into v_id from public.documents
  where order_id = p_order_id and kind = p_kind and status <> 'void'
  order by created_at desc limit 1;
  if v_id is not null then
    return v_id;
  end if;
  select value into v_set from public.site_settings where key = 'payments.invoices';
  return public.admin_save_document(null, p_kind, jsonb_build_object(
    'order_id', v_o.id,
    'bill_to', jsonb_build_object('name', v_o.customer_name, 'email', coalesce(v_o.customer_email, ''), 'phone', coalesce(v_o.customer_phone, '')),
    'lines', coalesce((select jsonb_agg(jsonb_build_object('description', i.item_name, 'quantity', i.quantity, 'unit_price', i.item_price) order by i.item_name)
                       from public.order_items i where i.order_id = v_o.id), '[]'::jsonb),
    'vat_rate', case when coalesce((v_set ->> 'vat_registered')::boolean, false) then coalesce((v_set ->> 'vat_rate')::numeric, 10) else 0 end,
    'payment_method', case when v_o.payment_method = 'card' then 'card' else 'cash' end,
    'reference', 'MTL-' || upper(left(replace(v_o.id::text, '-', ''), 6)),
    'notes', coalesce(v_set ->> 'default_notes', '')));
end;
$$;

-- A receipt for an issued invoice: same customer, lines and VAT.
create or replace function public.admin_receipt_from_invoice(p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inv  public.documents;
  v_id   uuid;
begin
  perform public.require_staff('payments');
  select * into v_inv from public.documents where id = p_id and kind = 'invoice';
  if not found then
    raise exception 'That document no longer exists. Refresh the page.' using errcode = 'P0001';
  end if;
  if v_inv.status not in ('issued', 'paid') then
    raise exception 'Issue the invoice first.' using errcode = 'P0001';
  end if;
  select id into v_id from public.documents where related_id = p_id and kind = 'receipt' and status <> 'void' limit 1;
  if v_id is not null then
    return v_id;
  end if;
  return public.admin_save_document(null, 'receipt', jsonb_build_object(
    'related_id', v_inv.id,
    'order_id', v_inv.order_id,
    'bill_to', v_inv.bill_to,
    'lines', v_inv.lines,
    'vat_rate', v_inv.vat_rate,
    'payment_method', 'cash',
    'reference', coalesce(v_inv.number, ''),
    'notes', ''));
end;
$$;

revoke all on function public.admin_save_document(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.admin_issue_document(uuid) from public, anon, authenticated;
revoke all on function public.admin_set_document_status(uuid, text, text) from public, anon, authenticated;
revoke all on function public.admin_delete_document(uuid) from public, anon, authenticated;
revoke all on function public.admin_document_from_order(uuid, text) from public, anon, authenticated;
revoke all on function public.admin_receipt_from_invoice(uuid) from public, anon, authenticated;
grant execute on function public.admin_save_document(uuid, text, jsonb) to authenticated;
grant execute on function public.admin_issue_document(uuid) to authenticated;
grant execute on function public.admin_set_document_status(uuid, text, text) to authenticated;
grant execute on function public.admin_delete_document(uuid) to authenticated;
grant execute on function public.admin_document_from_order(uuid, text) to authenticated;
grant execute on function public.admin_receipt_from_invoice(uuid) to authenticated;
