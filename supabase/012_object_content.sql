-- 012: the real objects.
--
-- Four products, taken from the owner's packaging mockups rather than
-- invented. The prototype's list (Candle No. 4, Safety matches, Brass lighter,
-- Whole bean 250g) was placeholder and is not used: there is no lighter, and
-- there is a cold brew and a matcha refill it never had.
--
-- ⚠ EVERY ROW LANDS HIDDEN, AT PRICE 0. No price has been confirmed for any of
--   them, and objects_available_has_price (009) makes an unpriced row
--   unpublishable by construction. The Objects page will keep saying "The
--   shelf is being set" until someone prices them. That is the guard rail
--   doing its job, not a bug.
--
--   To publish one, set its price and flip it in the same statement:
--     update public.objects
--        set price = 4.500, is_available = true
--      where name = 'Scented Candle';
--   Doing it the other way round fails the constraint, loudly.
--
-- SPECS ARE ONLY WHAT THE PACKAGING ACTUALLY SAYS. Where a figure was not
-- legible in the mockup — the matcha net weight, the match count — the field
-- is left empty rather than guessed. An invented weight on a product page is
-- a claim about a physical good, and those are worse than a blank.
--
-- Apply by pasting into the Supabase SQL editor. Safe to re-run: keyed on
-- name, and ON CONFLICT deliberately leaves price and is_available ALONE so
-- re-running never un-publishes something already priced and live.
-- Apply order on a fresh database: schema.sql → 002 → … → 011 → 012.

insert into public.objects (name, spec, description, price, art_key, is_available, sort_order)
values
  (
    'Scented Candle',
    'Scented candle · 165g / 5.8oz',
    'Compounded in Bahrain.',
    0, 'candle', false, 1
  ),
  (
    'Safety Matches',
    'Matchbox',
    -- The manifesto, printed on the box. Reproduced here because it is the
    -- product: the text is why someone keeps the box.
    'Every "Mantel" starts the same. What makes a "Mantel" different is never '
    || 'its shape alone, but everything that gathers around it. It simply '
    || 'continues to collect what life leaves behind. The rest is waiting to '
    || 'catch fire.',
    0, 'matches', false, 2
  ),
  (
    'Matcha Refill',
    'Matcha refill',
    'Shade-grown and stone-ground.',
    0, 'bag', false, 3
  ),
  (
    'Cold Brew',
    'Cold brew · 8oz / 250ml',
    -- The label mockup reads "PURE. BLACK. ALANCED." — a missing B. Corrected
    -- here rather than reproduced; the packaging is the thing to fix.
    '100% Arabica, slowly cold brewed. Pure. Black. Balanced.',
    0, 'bottle', false, 4
  )
on conflict (name) do update set
  spec        = excluded.spec,
  description = excluded.description,
  art_key     = excluded.art_key,
  sort_order  = excluded.sort_order;
  -- price and is_available intentionally absent: see the header.

-- Verification: four rows, all hidden, none priced.
select name, spec, price, is_available, art_key
from public.objects
order by sort_order;
