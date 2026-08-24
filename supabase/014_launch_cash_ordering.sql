-- Launch the secure cash-on-pickup path.
-- The RPC resolves product identity and prices server-side, validates customer
-- details, applies rate limits, and records the signed-in user when present.
-- Card payments remain disabled until a real payment gateway is integrated.

alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders drop constraint if exists orders_payment_method_cash_only;
alter table public.orders add constraint orders_payment_method_cash_only
  check (payment_method = 'cash');

grant execute on function
  public.place_order(jsonb, text, text, text, text, timestamptz)
  to anon, authenticated;
