-- 039 — A 360° spin for retail products (perfumes first).
--
-- An ordered set of photos taken all the way round the object, the same
-- distance and light, evenly spaced (24 or 36 is usual). The website shows
-- the first as the front and turns through the rest when the product is
-- tapped or dragged. Separate from `images` (the shelf's front/back slides)
-- so a product can have either or both. Readable through the existing
-- table-wide grants.

alter table public.objects add column if not exists spin_images text[] not null default '{}';

alter table public.objects drop constraint if exists objects_spin_images_count;
alter table public.objects add constraint objects_spin_images_count check (cardinality(spin_images) <= 72);
