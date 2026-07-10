alter table public.orders
  add column payment_method text not null default 'cash'
  check (payment_method in ('cash', 'card'));