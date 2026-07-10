create extension if not exists pgcrypto;

create table public.menu_items (
  id           uuid primary key default gen_random_uuid(),
  name         text not null unique,
  description  text not null default '',
  price        numeric(10,3) not null check (price >= 0),
  category     text not null check (category in ('coffee', 'food')),
  image_url    text,
  is_available boolean not null default true,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index menu_items_category_idx on public.menu_items(category);

create table public.orders (
  id             uuid primary key default gen_random_uuid(),
  customer_name  text not null default 'Guest',
  customer_email text,
  status         text not null default 'received'
                 check (status in ('received','preparing','ready','completed','cancelled')),
  subtotal       numeric(10,3) not null check (subtotal >= 0),
  created_at     timestamptz not null default now()
);

create table public.order_items (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  menu_item_id  uuid references public.menu_items(id) on delete set null,
  item_name     text not null,
  item_price    numeric(10,3) not null check (item_price >= 0),
  quantity      integer not null check (quantity > 0),
  created_at    timestamptz not null default now()
);
create index order_items_order_id_idx on public.order_items(order_id);

-- RLS: menu_items readable by anyone, writable by no one (anon key is public/client-side)
alter table public.menu_items enable row level security;
create policy "menu_items_public_select" on public.menu_items for select using (is_available = true);

-- RLS: orders/order_items insert-only for anon, no select policy at all
-- (client must generate the UUID and never call .select() after insert, or PostgREST
-- has nothing to hand back — see App.tsx changes)
-- ⚠ SUPERSEDED by 003_secure_order_placement.sql: the insert policies below are
-- dropped there and all ordering goes through the place_order() RPC instead.
-- On a fresh database, run this file, then 002, then 003.
alter table public.orders enable row level security;
create policy "orders_public_insert" on public.orders for insert with check (true);

alter table public.order_items enable row level security;
create policy "order_items_public_insert" on public.order_items for insert with check (true);

-- Grants: RLS controls which ROWS are visible once a table is reachable, but the
-- anon/authenticated roles also need explicit table-level access, or the table
-- can be unreachable via the Data API even with correct RLS policies above.
grant usage on schema public to anon, authenticated;
grant select on public.menu_items to anon, authenticated;
grant insert on public.orders to anon, authenticated;
grant insert on public.order_items to anon, authenticated;
