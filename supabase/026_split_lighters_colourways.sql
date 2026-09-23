-- 026: split the Lighters product into two separate, purchasable colourways.
--
-- The two lighters are physically distinct objects (leopard print,
-- checkerboard print), not two faces of one lighter — ObjectSlides used to
-- step through both prints under a single "Lighters" card, which meant a
-- customer could only ever add "whichever face the slider happened to be on"
-- rather than choose a colour. src/app/content/retail.ts now lists them as
-- two products, lighters-leopard and lighters-checkerboard; each needs its
-- own row here so fetchObjects() can resolve a real backendId for both
-- (App.tsx matches a RETAIL_PRODUCTS entry to a row by name).
--
-- Safe to re-run: the rename only matches while a row is still named
-- 'Lighters', and the insert upserts on the unique name constraint from 013.

update public.objects
set name = 'Lighters - Leopard'
where name = 'Lighters';

insert into public.objects (name, spec, description, price, art_key, is_available, sort_order)
values
  ('Lighters - Checkerboard', 'Pocket lighter', 'A small object with a little ceremony.', 3.000, 'lighter', true, 5)
on conflict (name) do update set
  spec = excluded.spec,
  description = excluded.description,
  price = excluded.price,
  art_key = excluded.art_key,
  is_available = excluded.is_available,
  sort_order = excluded.sort_order;

-- Match Sticks and Custom Bags shift down one to leave sort_order in sequence.
-- Cosmetic only: the storefront's display order comes from RETAIL_PRODUCTS in
-- retail.ts, not this column.
update public.objects set sort_order = 6 where name = 'Match Sticks';
update public.objects set sort_order = 7 where name = 'Custom Bags';
