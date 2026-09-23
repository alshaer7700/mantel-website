-- 027: split Custom Bags into two purchasable prints, same shape as 026.
--
-- The two totes are physically distinct objects (Mantel wordmark print, red
-- heart print), not two faces of one bag — ObjectSlides used to step through
-- both prints under a single "Custom Bags" card, which meant a customer
-- could only ever add "whichever face the card happened to be showing," not
-- choose a print. src/app/content/retail.ts now lists them as two products,
-- custom-bags-mantel and custom-bags-heart; each needs its own row here so
-- fetchObjects() can resolve a real backendId for both.
--
-- Safe to re-run: the rename only matches while a row is still named
-- 'Custom Bags', and the insert upserts on the unique name constraint from 013.

update public.objects
set name = 'Custom Bags - Mantel'
where name = 'Custom Bags';

insert into public.objects (name, spec, description, price, art_key, is_available, sort_order)
values
  ('Custom Bags - Heart', 'Reusable bag', 'Made for the things you take with you.', 6.500, 'bag', true, 8)
on conflict (name) do update set
  spec = excluded.spec,
  description = excluded.description,
  price = excluded.price,
  art_key = excluded.art_key,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order;
