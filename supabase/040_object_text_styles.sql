-- 040 — Font and size for a product's own text (Retail shop).
--
-- Keyed by field — name, description, story, care, collection — each
-- { font?, size? } exactly as Website pages stores its "_styles"
-- (src/lib/content/pages.ts: TEXT_FONTS, size as a percentage of the
-- design's own size). The website ignores anything it doesn't recognise.

alter table public.objects add column if not exists text_styles jsonb not null default '{}'::jsonb;

alter table public.objects drop constraint if exists objects_text_styles_object;
alter table public.objects add constraint objects_text_styles_object check (jsonb_typeof(text_styles) = 'object');
