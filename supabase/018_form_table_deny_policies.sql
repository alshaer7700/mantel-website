-- Make the public read boundary explicit. The write path remains the two
-- SECURITY DEFINER RPCs; no anon or authenticated table grants are present.

create policy contact_messages_no_public_read
  on public.contact_messages
  for select
  to anon, authenticated
  using (false);

create policy newsletter_subscribers_no_public_read
  on public.newsletter_subscribers
  for select
  to anon, authenticated
  using (false);
