-- 036 — Newsletters: write one in the dashboard, send it to subscribers.
--
--   newsletter_subscribers.token   a private link token per subscriber, used
--                                  in every newsletter's unsubscribe link
--   newsletter_campaigns           drafts and sent newsletters
--   newsletter_unsubscribe()       public: the unsubscribe link's action
--   admin_newsletter_start()       staff: begins a send (or a test) and hands
--                                  the newsletter-send function what it needs;
--                                  a newsletter can only be sent once
--   admin_newsletter_finish()      staff: records how the send went
--
-- Sending itself happens in the newsletter-send edge function, which calls
-- these as the signed-in staff member, so the 'marketing' permission decides
-- who can send.

alter table public.newsletter_subscribers
  add column if not exists token uuid not null default gen_random_uuid();

create unique index if not exists newsletter_subscribers_token_idx
  on public.newsletter_subscribers (token);

create table if not exists public.newsletter_campaigns (
  id            uuid primary key default gen_random_uuid(),
  subject       text not null default '' check (char_length(subject) <= 200),
  preheader     text not null default '' check (char_length(preheader) <= 200),
  heading       text not null default '' check (char_length(heading) <= 200),
  body          text not null default '' check (char_length(body) <= 20000),
  image_url     text not null default '',
  button_label  text not null default '' check (char_length(button_label) <= 60),
  button_url    text not null default '' check (char_length(button_url) <= 500),
  status        text not null default 'draft' check (status in ('draft', 'sending', 'sent', 'failed')),
  recipients    integer not null default 0,
  sent_count    integer not null default 0,
  failed_count  integer not null default 0,
  last_error    text,
  test_sent_at  timestamptz,
  sent_at       timestamptz,
  sent_by       uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  created_by    uuid references auth.users(id) on delete set null default auth.uid(),
  updated_at    timestamptz not null default now()
);

alter table public.newsletter_campaigns enable row level security;
revoke all on public.newsletter_campaigns from public, anon, authenticated;

drop policy if exists newsletter_campaigns_staff on public.newsletter_campaigns;
create policy newsletter_campaigns_staff on public.newsletter_campaigns
  for all to authenticated
  using ((select public.staff_can('marketing')))
  with check ((select public.staff_can('marketing')) and status = 'draft');

grant select, insert, update, delete on public.newsletter_campaigns to authenticated;

-- A sent newsletter is a record of what went out: it can't be edited or deleted.
create or replace function public.newsletter_campaigns_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    if old.status <> 'draft' then
      raise exception 'A sent newsletter can''t be deleted.' using errcode = '42501';
    end if;
    return old;
  end if;
  if old.status <> 'draft' and current_setting('mantel.newsletter_send', true) is distinct from 'on' then
    raise exception 'A sent newsletter can''t be changed.' using errcode = '42501';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists newsletter_campaigns_guard on public.newsletter_campaigns;
create trigger newsletter_campaigns_guard before update or delete on public.newsletter_campaigns
  for each row execute function public.newsletter_campaigns_guard();

drop trigger if exists newsletter_campaigns_audit on public.newsletter_campaigns;
create trigger newsletter_campaigns_audit after insert or update or delete on public.newsletter_campaigns
  for each row execute function public.audit_row();

-- ── The unsubscribe link ────────────────────────────────────────────────────

create or replace function public.newsletter_unsubscribe(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_email text;
begin
  update public.newsletter_subscribers
  set status = 'unsubscribed'
  where token = p_token
  returning email into v_email;

  if v_email is null then
    return jsonb_build_object('ok', false);
  end if;
  -- Enough of the address to recognise it, not enough to harvest it.
  return jsonb_build_object('ok', true, 'email',
    left(split_part(v_email, '@', 1), 2) || '•••@' || split_part(v_email, '@', 2));
end;
$$;

revoke all on function public.newsletter_unsubscribe(uuid) from public;
grant execute on function public.newsletter_unsubscribe(uuid) to anon, authenticated;

-- ── Sending ─────────────────────────────────────────────────────────────────

create or replace function public.admin_newsletter_start(p_id uuid, p_test boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_c public.newsletter_campaigns;
  v_count integer;
  v_email text;
begin
  perform public.require_staff('marketing');

  select * into v_c from public.newsletter_campaigns where id = p_id for update;
  if v_c.id is null then
    raise exception 'That newsletter no longer exists.' using errcode = 'P0002';
  end if;
  if btrim(v_c.subject) = '' or (btrim(v_c.heading) = '' and btrim(v_c.body) = '') then
    raise exception 'Give the newsletter a subject and some words first.' using errcode = '22023';
  end if;

  if p_test then
    select email into v_email from auth.users where id = auth.uid();
    perform set_config('mantel.newsletter_send', 'on', true);
    update public.newsletter_campaigns set test_sent_at = now() where id = p_id;
    return jsonb_build_object('campaign', to_jsonb(v_c), 'to', v_email);
  end if;

  -- A failed send (nothing went out) can be tried again; a sent one can't.
  if v_c.status not in ('draft', 'failed') then
    raise exception 'This newsletter has already been sent.' using errcode = '22023';
  end if;

  select count(*) into v_count from public.newsletter_subscribers where status = 'active';
  if v_count = 0 then
    raise exception 'There are no subscribers to send to yet.' using errcode = '22023';
  end if;

  perform set_config('mantel.newsletter_send', 'on', true);
  update public.newsletter_campaigns
  set status = 'sending', recipients = v_count, sent_by = auth.uid(), sent_at = now()
  where id = p_id;

  return jsonb_build_object('campaign', to_jsonb(v_c), 'recipients', v_count);
end;
$$;

revoke all on function public.admin_newsletter_start(uuid, boolean) from public, anon;
grant execute on function public.admin_newsletter_start(uuid, boolean) to authenticated;

create or replace function public.admin_newsletter_finish(p_id uuid, p_sent integer, p_failed integer, p_error text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('marketing');
  perform set_config('mantel.newsletter_send', 'on', true);
  update public.newsletter_campaigns
  set status = case when p_sent = 0 then 'failed' else 'sent' end,
      sent_count = greatest(p_sent, 0),
      failed_count = greatest(p_failed, 0),
      last_error = nullif(left(coalesce(p_error, ''), 500), '')
  where id = p_id and status = 'sending';
end;
$$;

revoke all on function public.admin_newsletter_finish(uuid, integer, integer, text) from public, anon;
grant execute on function public.admin_newsletter_finish(uuid, integer, integer, text) to authenticated;
