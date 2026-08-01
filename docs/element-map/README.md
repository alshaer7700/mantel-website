# MANTEL — Visual Element Map

Annotated screenshots of every surface on the site, with each element's ID from
[`TYPOGRAPHY-ELEMENT-MAP.md`](../../TYPOGRAPHY-ELEMENT-MAP.md) drawn onto it.

Use these to point at something on screen and read off its ID, then look that ID
up in the map to see its current type values and fill in the font decision.

| # | Image | Surface | Element IDs |
|---|---|---|---|
| 01 | `01-home.png` | Home | `NAV-01…09` `HOME-01…03` `FOOT-01/03/04` |
| 02 | `02-header-locale.png` | Header, locale popover open | `NAV-10` `NAV-11` |
| 03 | `03-sidebar.png` | Sidebar drawer | `SIDE-01…09` |
| 04 | `04-search.png` | Search panel with results | `SRCH-01/02/04/05/06` |
| 05 | `05-account.png` | Account panel, signed out | `ACCT-05…09` |
| 06 | `06-cart-drawer.png` | Cart drawer | `CART-01…07` `LINE-01…05` |
| 07 | `07-menu-categories.png` | Menu, category select | `MENU-03` `MENU-04` |
| 08 | `08-menu-list.png` | Menu, item list | `MENU-05` `MENU-06` `MITEM-01…03` |
| 09 | `09-order.png` | Order Before Reach, browse | `ORD-01/02/05` `OITEM-01…04` |
| 10 | `10-order-bag.png` | Order Before Reach, bag + checkout | `ORD-07…16` `LINE-01/02/04` |
| 11 | `11-contact.png` | Contact | `CONT-01…08` |
| 12 | `12-faq.png` | FAQ, one answer open | `FAQ-01…04` |
| 13 | `13-newsletter.png` | Newsletter | `NEWS-01…05` |
| 14 | `14-policy.png` | Policy pages (Privacy shown) | `POL-01…04` |

## Reading the annotations

- **Solid outline** — the element's box, tinted in its category colour.
- **Chip** — the element ID, connected to its box by a dashed leader line when
  it can't sit adjacent.
- **Colour** — the typography category (A–M). The legend along the bottom of
  each image lists only the categories present on that surface.
- **Bottom-left black chip** — which surface the image shows.

## What isn't shown

- **`DOC-01` / `DOC-02`** — the tab title and meta description. Not rendered on
  the page.
- **Empty, loading, and error states** — `MENU-01/02`, `ORD-03/04/08/09/14`,
  `CONT-07`, `SRCH-03`, `CART-03/04`, `NEWS-03/06`, `SYS-01…03`. These only
  appear on failure or on an empty bag, so they can't be captured alongside the
  populated states. Their values are recorded in the map.
- **`ACCT-01…04`** — the signed-in account panel. Mutually exclusive with the
  signed-out state shown in image 05.

## Notes on what's in the screenshots

Menu and cart contents are **stubbed fixtures**, not live data — the prices and
item names exist only to make the rows render. Real menu data comes from
Supabase at runtime.

## Regenerating

These were captured from a production build at 1280×1000, 2× DPR, with the
Supabase menu response stubbed and a seeded cart. If the markup changes, the
locators in the generator may need updating — each one is matched by role,
`aria-label`, or exact text.
