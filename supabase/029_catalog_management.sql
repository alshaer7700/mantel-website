-- 029: everything the menu and the retail shelf need to be run from the
-- dashboard instead of from SQL and code.
--
--   menu_categories         the menu headings, editable (was a check constraint
--                           plus a hardcoded tuple in src/app/types.ts)
--   menu_items  +columns    Arabic, badges, allergens, diet tags, archive,
--                           "sold out today", seasonal dates, daily hours
--   objects     +columns    URL slug, Arabic, product-page copy, photo gallery,
--                           stock count, archive, sold out
--   option_groups/choices   drink options: size, milk, extra shot …
--   catalog_available()     THE availability rule, used by RLS, the sellables
--                           view (so place_order) and the public catalog read
--   public_catalog()        one public read of the whole catalog
--   admin_* RPCs            reorder, duplicate, bulk price, sold out today
--
-- Backwards compatible with the site currently live: its reads still filter
-- on is_available and still get only visible rows, and place_order still
-- reads sellables.is_available.

-- ── Categories ──────────────────────────────────────────────────────────────

create table if not exists public.menu_categories (
  slug       text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 40),
  label      text not null check (length(btrim(label)) between 1 and 60),
  label_ar   text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.menu_categories (slug, label, label_ar, sort_order) values
  ('coffee', 'Coffee', 'قهوة', 1),
  ('not-coffee', 'Non Coffee', 'مشروبات بدون قهوة', 2),
  ('sandwiches', 'Sandwiches', 'ساندويتشات', 3),
  ('desserts', 'Desserts', 'حلويات', 4),
  ('aqua', 'Aqua', 'مياه', 5),
  ('add-ons', 'Add Ons', 'إضافات', 6)
on conflict (slug) do nothing;

alter table public.menu_items drop constraint if exists menu_items_category_check;
alter table public.menu_items drop constraint if exists menu_items_category_fkey;
alter table public.menu_items
  add constraint menu_items_category_fkey
  foreign key (category) references public.menu_categories(slug) on update cascade on delete restrict;

alter table public.menu_categories enable row level security;
revoke all on public.menu_categories from public, anon, authenticated;

drop policy if exists menu_categories_public_read on public.menu_categories;
create policy menu_categories_public_read on public.menu_categories
  for select to anon, authenticated using (is_visible);

drop policy if exists menu_categories_staff_read on public.menu_categories;
create policy menu_categories_staff_read on public.menu_categories
  for select to authenticated using ((select public.is_staff()));

drop policy if exists menu_categories_staff_write on public.menu_categories;
create policy menu_categories_staff_write on public.menu_categories
  for all to authenticated
  using ((select public.staff_can('catalog')))
  with check ((select public.staff_can('catalog')));

grant select on public.menu_categories to anon, authenticated;
grant insert, update, delete on public.menu_categories to authenticated;

-- ── Menu items ──────────────────────────────────────────────────────────────

alter table public.menu_items
  add column if not exists name_ar        text not null default '',
  add column if not exists description_ar text not null default '',
  add column if not exists ingredients_ar text,
  add column if not exists badges         text[] not null default '{}',
  add column if not exists allergens      text[] not null default '{}',
  add column if not exists diet           text[] not null default '{}',
  add column if not exists archived_at    timestamptz,
  add column if not exists sold_out_until timestamptz,
  add column if not exists available_from date,
  add column if not exists available_until date,
  add column if not exists available_start time,
  add column if not exists available_end  time;

-- ── Retail objects ──────────────────────────────────────────────────────────

alter table public.objects
  add column if not exists slug           text,
  add column if not exists name_ar        text not null default '',
  add column if not exists description_ar text not null default '',
  add column if not exists spec_ar        text not null default '',
  add column if not exists story          text not null default '',
  add column if not exists story_ar       text not null default '',
  add column if not exists care           text not null default '',
  add column if not exists care_ar        text not null default '',
  add column if not exists collection     text not null default '',
  add column if not exists collection_ar  text not null default '',
  add column if not exists images         text[] not null default '{}',
  add column if not exists stock_qty      integer check (stock_qty is null or stock_qty >= 0),
  add column if not exists low_stock_at   integer not null default 3 check (low_stock_at >= 0),
  add column if not exists badges         text[] not null default '{}',
  add column if not exists archived_at    timestamptz,
  add column if not exists sold_out_until timestamptz;

-- Slugs for the products already on the shelf match the ids the site uses in
-- /objects/<slug> today (src/app/content/retail.ts), so no link breaks.
update public.objects set slug = case name
    when 'Lighters - Leopard'      then 'lighters-leopard'
    when 'Lighters - Checkerboard' then 'lighters-checkerboard'
    when 'Match Sticks'            then 'match-sticks'
    when 'Candles'                 then 'candles'
    when 'Custom Bags - Heart'     then 'custom-bags-heart'
    when 'Custom Bags - Mantel'    then 'custom-bags-mantel'
    when 'Candle Sticks'           then 'candle-sticks'
    else trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'))
  end
where slug is null;

-- The product-page copy that lived in retail.ts, so the editor opens with it.
update public.objects o set
  story = v.story, care = v.care, collection = v.collection
from (values
  ('lighters-leopard', 'A refillable flame in a pocket-sized case, printed leopard.', 'Refillable. Keep it out of reach of children and away from heat.', 'The leopard colourway — the small object with a little ceremony.'),
  ('lighters-checkerboard', 'A refillable flame in a pocket-sized case, printed checkerboard.', 'Refillable. Keep it out of reach of children and away from heat.', 'The checkerboard colourway — the small object with a little ceremony.'),
  ('match-sticks', 'A box of safety matches under the Mantel label, for the candles and everything else that needs a light.', 'Store somewhere dry, away from the stove.', 'The everyday companion to the candles on the shelf.'),
  ('candles', 'Soy wax in a stamped tin, poured in small batches. Warm wood and dry smoke — the room after the counter closes.', 'Trim the wick to 5mm before each light. Burn for no more than four hours at a time, and keep it away from draughts so the wax burns evenly to the edge of the tin.', 'Soy wax, poured in small batches and finished in the same stamped tin as the rest of the counter shelf.'),
  ('custom-bags-heart', 'Heavy canvas, built for the walk home, printed with a red heart.', 'Machine wash cold, and hang to dry.', 'The red-heart tote — heavy canvas, built for the walk home.'),
  ('custom-bags-mantel', 'Heavy canvas, built for the walk home, printed with the Mantel wordmark.', 'Machine wash cold, and hang to dry.', 'The wordmark tote — heavy canvas, built for the walk home.'),
  ('candle-sticks', 'A pair of cream tapers, cut long enough to burn through an evening at the table.', 'Wipe with a dry cloth. Keep upright, and away from direct heat.', 'Sits alongside the candles — the pair the shelf was built around.')
) as v(slug, story, care, collection)
where o.slug = v.slug and o.story = '';

alter table public.objects alter column slug set not null;
alter table public.objects drop constraint if exists objects_slug_key;
alter table public.objects add constraint objects_slug_key unique (slug);
alter table public.objects drop constraint if exists objects_slug_shape;
alter table public.objects add constraint objects_slug_shape check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 60);

-- ── The availability rule ───────────────────────────────────────────────────

create or replace function public.catalog_available(
  p_is_available   boolean,
  p_archived_at    timestamptz,
  p_sold_out_until timestamptz,
  p_from           date,
  p_until          date,
  p_start          time,
  p_end            time,
  p_stock          integer
)
returns boolean
language sql
stable
set search_path = ''
as $$
  select coalesce(p_is_available, false)
     and p_archived_at is null
     and (p_sold_out_until is null or p_sold_out_until <= now())
     and (p_from  is null or (now() at time zone 'Asia/Bahrain')::date >= p_from)
     and (p_until is null or (now() at time zone 'Asia/Bahrain')::date <= p_until)
     and (
       p_start is null or p_end is null
       or case
            when p_start <= p_end then (now() at time zone 'Asia/Bahrain')::time between p_start and p_end
            else (now() at time zone 'Asia/Bahrain')::time >= p_start or (now() at time zone 'Asia/Bahrain')::time <= p_end
          end
     )
     and (p_stock is null or p_stock > 0);
$$;

grant execute on function public.catalog_available(boolean, timestamptz, timestamptz, date, date, time, time, integer) to anon, authenticated;

-- RLS: the public sees exactly what is orderable right now; staff see all.
drop policy if exists menu_items_public_select on public.menu_items;
create policy menu_items_public_select on public.menu_items
  for select
  using (public.catalog_available(is_available, archived_at, sold_out_until,
                                  available_from, available_until, available_start, available_end, null));

drop policy if exists menu_items_staff_read on public.menu_items;
create policy menu_items_staff_read on public.menu_items
  for select to authenticated using ((select public.is_staff()));

drop policy if exists menu_items_staff_write on public.menu_items;
create policy menu_items_staff_write on public.menu_items
  for all to authenticated
  using ((select public.staff_can('catalog')))
  with check ((select public.staff_can('catalog')));

drop policy if exists objects_public_select on public.objects;
create policy objects_public_select on public.objects
  for select
  using (public.catalog_available(is_available, archived_at, sold_out_until, null, null, null, null, stock_qty));

drop policy if exists objects_staff_read on public.objects;
create policy objects_staff_read on public.objects
  for select to authenticated using ((select public.is_staff()));

drop policy if exists objects_staff_write on public.objects;
create policy objects_staff_write on public.objects
  for all to authenticated
  using ((select public.staff_can('catalog')))
  with check ((select public.staff_can('catalog')));

grant insert, update, delete on public.menu_items to authenticated;
grant insert, update, delete on public.objects to authenticated;

-- place_order prices and validates through this view, so the same rule
-- decides what can be bought.
create or replace view public.sellables
with (security_invoker = false)
as
  select m.id, m.name, m.price,
         public.catalog_available(m.is_available, m.archived_at, m.sold_out_until,
                                  m.available_from, m.available_until, m.available_start, m.available_end, null) as is_available,
         'menu'::text as kind
  from public.menu_items m
  union all
  select o.id, o.name, o.price,
         public.catalog_available(o.is_available, o.archived_at, o.sold_out_until, null, null, null, null, o.stock_qty) as is_available,
         'object'::text as kind
  from public.objects o;

revoke all on public.sellables from public, anon, authenticated;

-- ── Drink options ───────────────────────────────────────────────────────────

create table if not exists public.option_groups (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (length(btrim(name)) between 1 and 60),
  name_ar    text not null default '',
  min_select integer not null default 0 check (min_select between 0 and 10),
  max_select integer not null default 1 check (max_select between 1 and 10),
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  check (min_select <= max_select)
);

create table if not exists public.option_choices (
  id           uuid primary key default gen_random_uuid(),
  group_id     uuid not null references public.option_groups(id) on delete cascade,
  name         text not null check (length(btrim(name)) between 1 and 60),
  name_ar      text not null default '',
  price_delta  numeric(10,3) not null default 0 check (price_delta between -50 and 50),
  is_available boolean not null default true,
  is_default   boolean not null default false,
  sort_order   integer not null default 0,
  created_at   timestamptz not null default now()
);

create index if not exists option_choices_group_idx on public.option_choices (group_id, sort_order);

create table if not exists public.menu_item_option_groups (
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  group_id     uuid not null references public.option_groups(id) on delete cascade,
  sort_order   integer not null default 0,
  primary key (menu_item_id, group_id)
);

do $$
declare
  t text;
begin
  foreach t in array array['option_groups', 'option_choices', 'menu_item_option_groups']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('drop policy if exists %I on public.%I', t || '_public_read', t);
    execute format('create policy %I on public.%I for select to anon, authenticated using (true)', t || '_public_read', t);
    execute format('drop policy if exists %I on public.%I', t || '_staff_write', t);
    execute format('create policy %I on public.%I for all to authenticated using ((select public.staff_can(''catalog''))) with check ((select public.staff_can(''catalog'')))', t || '_staff_write', t);
    execute format('grant select on public.%I to anon, authenticated', t);
    execute format('grant insert, update, delete on public.%I to authenticated', t);
  end loop;
end;
$$;

-- ── Activity log on the new tables ──────────────────────────────────────────

do $$
declare
  t text;
begin
  foreach t in array array['menu_categories', 'option_groups', 'option_choices']
  loop
    execute format('drop trigger if exists %I on public.%I', t || '_audit', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_row()', t || '_audit', t);
  end loop;
end;
$$;

-- ── Public catalog read ─────────────────────────────────────────────────────

create or replace function public.public_catalog()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'categories', coalesce((
      select jsonb_agg(jsonb_build_object('slug', c.slug, 'label', c.label, 'label_ar', c.label_ar) order by c.sort_order, c.label)
      from public.menu_categories c where c.is_visible
    ), '[]'::jsonb),
    'menu', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', m.id, 'name', m.name, 'name_ar', m.name_ar,
               'description', m.description, 'description_ar', m.description_ar,
               'price', m.price, 'category', m.category, 'image_url', m.image_url,
               'sort_order', m.sort_order, 'ingredients', m.ingredients, 'ingredients_ar', m.ingredients_ar,
               'calories', m.calories, 'protein_g', m.protein_g, 'carbs_g', m.carbs_g, 'fat_g', m.fat_g,
               'badges', m.badges, 'allergens', m.allergens, 'diet', m.diet,
               'option_groups', coalesce((
                 select jsonb_agg(g.group_id order by g.sort_order)
                 from public.menu_item_option_groups g where g.menu_item_id = m.id
               ), '[]'::jsonb))
             order by m.sort_order, m.name)
      from public.menu_items m
      join public.menu_categories c on c.slug = m.category and c.is_visible
      where public.catalog_available(m.is_available, m.archived_at, m.sold_out_until,
                                     m.available_from, m.available_until, m.available_start, m.available_end, null)
    ), '[]'::jsonb),
    'option_groups', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', g.id, 'name', g.name, 'name_ar', g.name_ar,
               'min_select', g.min_select, 'max_select', g.max_select,
               'choices', coalesce((
                 select jsonb_agg(jsonb_build_object('id', ch.id, 'name', ch.name, 'name_ar', ch.name_ar,
                                                     'price_delta', ch.price_delta, 'is_default', ch.is_default)
                                  order by ch.sort_order, ch.name)
                 from public.option_choices ch where ch.group_id = g.id and ch.is_available
               ), '[]'::jsonb))
             order by g.sort_order, g.name)
      from public.option_groups g
    ), '[]'::jsonb),
    'objects', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', o.id, 'slug', o.slug, 'name', o.name, 'name_ar', o.name_ar,
               'spec', o.spec, 'spec_ar', o.spec_ar,
               'description', o.description, 'description_ar', o.description_ar,
               'story', o.story, 'story_ar', o.story_ar, 'care', o.care, 'care_ar', o.care_ar,
               'collection', o.collection, 'collection_ar', o.collection_ar,
               'price', o.price, 'image_url', o.image_url, 'images', o.images, 'art_key', o.art_key,
               'badges', o.badges, 'sort_order', o.sort_order,
               'low_stock', o.stock_qty is not null and o.stock_qty <= o.low_stock_at)
             order by o.sort_order, o.name)
      from public.objects o
      where public.catalog_available(o.is_available, o.archived_at, o.sold_out_until, null, null, null, null, o.stock_qty)
    ), '[]'::jsonb)
  );
$$;

revoke all on function public.public_catalog() from public;
grant execute on function public.public_catalog() to anon, authenticated;

-- ── Staff catalog actions ───────────────────────────────────────────────────

-- "Sold out today": hidden until 4am Bahrain time tomorrow, then back by itself.
create or replace function public.next_bahrain_morning()
returns timestamptz
language sql
stable
set search_path = ''
as $$
  select (((now() at time zone 'Asia/Bahrain')::date + 1) + time '04:00') at time zone 'Asia/Bahrain';
$$;

create or replace function public.admin_set_sold_out(p_kind text, p_id uuid, p_sold_out boolean)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_until timestamptz := case when p_sold_out then public.next_bahrain_morning() else null end;
begin
  perform public.require_staff('catalog');
  if p_kind = 'menu' then
    update public.menu_items set sold_out_until = v_until, updated_at = now() where id = p_id;
  elsif p_kind = 'object' then
    update public.objects set sold_out_until = v_until, updated_at = now() where id = p_id;
  else
    raise exception 'unknown item type' using errcode = '22023';
  end if;
  if not found then
    raise exception 'That item no longer exists.' using errcode = 'P0001';
  end if;
  return v_until;
end;
$$;

revoke all on function public.admin_set_sold_out(text, uuid, boolean) from public, anon, authenticated;
grant execute on function public.admin_set_sold_out(text, uuid, boolean) to authenticated;

create or replace function public.admin_reorder(p_kind text, p_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('catalog');
  if p_kind = 'menu' then
    update public.menu_items m set sort_order = x.pos, updated_at = now()
    from unnest(p_ids) with ordinality as x(id, pos) where m.id = x.id;
  elsif p_kind = 'object' then
    update public.objects o set sort_order = x.pos, updated_at = now()
    from unnest(p_ids) with ordinality as x(id, pos) where o.id = x.id;
  elsif p_kind = 'option_group' then
    update public.option_groups g set sort_order = x.pos
    from unnest(p_ids) with ordinality as x(id, pos) where g.id = x.id;
  elsif p_kind = 'option_choice' then
    update public.option_choices c set sort_order = x.pos
    from unnest(p_ids) with ordinality as x(id, pos) where c.id = x.id;
  else
    raise exception 'unknown list' using errcode = '22023';
  end if;
  return true;
end;
$$;

revoke all on function public.admin_reorder(text, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_reorder(text, uuid[]) to authenticated;

create or replace function public.admin_reorder_categories(p_slugs text[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('catalog');
  update public.menu_categories c set sort_order = x.pos
  from unnest(p_slugs) with ordinality as x(slug, pos) where c.slug = x.slug;
  return true;
end;
$$;

revoke all on function public.admin_reorder_categories(text[]) from public, anon, authenticated;
grant execute on function public.admin_reorder_categories(text[]) to authenticated;

create or replace function public.admin_duplicate_item(p_kind text, p_id uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_new uuid := gen_random_uuid();
  v_name text;
  v_n integer := 1;
begin
  perform public.require_staff('catalog');
  if p_kind = 'menu' then
    select name into v_name from public.menu_items where id = p_id;
    if v_name is null then raise exception 'That item no longer exists.' using errcode = 'P0001'; end if;
    while exists (select 1 from public.menu_items where name = v_name || ' (copy' || case when v_n > 1 then ' ' || v_n else '' end || ')') loop
      v_n := v_n + 1;
    end loop;
    insert into public.menu_items (id, name, description, price, category, image_url, is_available, sort_order,
                                   ingredients, calories, protein_g, carbs_g, fat_g, name_ar, description_ar, ingredients_ar,
                                   badges, allergens, diet, available_from, available_until, available_start, available_end)
    select v_new, v_name || ' (copy' || case when v_n > 1 then ' ' || v_n else '' end || ')', description, price, category, image_url, false, sort_order + 1,
           ingredients, calories, protein_g, carbs_g, fat_g, name_ar, description_ar, ingredients_ar,
           badges, allergens, diet, available_from, available_until, available_start, available_end
    from public.menu_items where id = p_id;
    insert into public.menu_item_option_groups (menu_item_id, group_id, sort_order)
    select v_new, group_id, sort_order from public.menu_item_option_groups where menu_item_id = p_id;
  elsif p_kind = 'object' then
    select name into v_name from public.objects where id = p_id;
    if v_name is null then raise exception 'That item no longer exists.' using errcode = 'P0001'; end if;
    while exists (select 1 from public.objects where name = v_name || ' (copy' || case when v_n > 1 then ' ' || v_n else '' end || ')') loop
      v_n := v_n + 1;
    end loop;
    insert into public.objects (id, slug, name, spec, description, price, image_url, art_key, is_available, sort_order,
                                name_ar, description_ar, spec_ar, story, story_ar, care, care_ar, collection, collection_ar,
                                images, stock_qty, low_stock_at, badges)
    select v_new, left(slug, 50) || '-copy-' || substr(replace(v_new::text, '-', ''), 1, 4),
           v_name || ' (copy' || case when v_n > 1 then ' ' || v_n else '' end || ')', spec, description, price, image_url, art_key, false, sort_order + 1,
           name_ar, description_ar, spec_ar, story, story_ar, care, care_ar, collection, collection_ar,
           images, stock_qty, low_stock_at, badges
    from public.objects where id = p_id;
  else
    raise exception 'unknown item type' using errcode = '22023';
  end if;
  return v_new;
end;
$$;

revoke all on function public.admin_duplicate_item(text, uuid) from public, anon, authenticated;
grant execute on function public.admin_duplicate_item(text, uuid) to authenticated;

-- Raise or lower prices by a percentage, rounded to the nearest p_round_to
-- (e.g. 0.050 so BD 1.575 rather than 1.573). Returns how many changed.
create or replace function public.admin_bulk_price(p_kind text, p_category text, p_percent numeric, p_round_to numeric)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_count integer;
  v_round numeric := greatest(coalesce(p_round_to, 0.001), 0.001);
begin
  perform public.require_staff('catalog');
  if p_percent is null or p_percent < -90 or p_percent > 300 then
    raise exception 'Choose a change between -90%% and +300%%.' using errcode = 'P0001';
  end if;
  if p_kind = 'menu' then
    update public.menu_items
    set price = greatest(round(price * (1 + p_percent / 100) / v_round) * v_round, 0),
        updated_at = now()
    where archived_at is null
      and price > 0
      and (p_category is null or p_category = '' or category = p_category);
  elsif p_kind = 'object' then
    update public.objects
    set price = greatest(round(price * (1 + p_percent / 100) / v_round) * v_round, 0),
        updated_at = now()
    where archived_at is null and price > 0;
  else
    raise exception 'unknown item type' using errcode = '22023';
  end if;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

revoke all on function public.admin_bulk_price(text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.admin_bulk_price(text, text, numeric, numeric) to authenticated;

-- Sets which option groups an item offers, in order.
create or replace function public.admin_set_item_options(p_item_id uuid, p_group_ids uuid[])
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.require_staff('catalog');
  delete from public.menu_item_option_groups where menu_item_id = p_item_id;
  insert into public.menu_item_option_groups (menu_item_id, group_id, sort_order)
  select p_item_id, x.id, x.pos::integer from unnest(p_group_ids) with ordinality as x(id, pos);
  return true;
end;
$$;

revoke all on function public.admin_set_item_options(uuid, uuid[]) from public, anon, authenticated;
grant execute on function public.admin_set_item_options(uuid, uuid[]) to authenticated;
