-- Explicitly document the internal rate-limit table’s public read boundary.
create policy order_ip_events_no_public_read
  on public.order_ip_events
  for select
  to anon, authenticated
  using (false);
