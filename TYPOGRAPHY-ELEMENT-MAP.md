# MANTEL — Complete Element Map

_Mapped 1 August 2026 against commit `663333e`. Companion to `TYPOGRAPHY-AUDIT.md`._

Every text and glyph element on the site, with a stable ID, its exact source
location, what it renders as today, and an empty slot for the font decision.

**110 elements across 18 surfaces.** 91 carry type; 19 are icons or images.

---

## How to use this

**As a decision sheet.** Every element has its own row and its own ID, so any
one of them can be assigned a font independently of the rest. Fill the
`ASSIGN` column.

**As a design system.** The `Cat` column groups elements into the 13 categories
from `TYPOGRAPHY-AUDIT.md` §3. Assigning by category covers all 110 elements in
13 decisions instead of 110, and is what the tokens in §8 of the audit expect.
Use per-element assignment only for the exceptions you actually want.

**As a prompt.** §5 is the same registry as JSON, and §6 is a ready prompt
template that consumes it.

### ID scheme

`SURFACE-NN`. Surface prefixes are stable; numbers are assigned top-to-bottom
in render order and never reused. New elements append to their surface.

### Reading the columns

- **Cat** — category A–M from `TYPOGRAPHY-AUDIT.md` §3. `—` = not type.
- **Size** — computed px at desktop. `→` marks a breakpoint change.
- **W / LH / LS** — weight, line-height, letter-spacing.
- **Tr** — text-transform. `UC` = uppercase.
- **Brief** — the matching `T##` from `mantel_font.md`, where one exists.
- ⚠ — flagged in the audit's findings (F1–F11).
- All type is **EB Garamond Italic 400 unless noted** (finding F1).
- `muted` = `#888888`, which fails WCAG AA at 3.54:1 (finding F2).

---

## 1. Global surfaces

### 1.1 Header — `src/app/App.tsx:298-384`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NAV-01 | Hamburger | — | 310 | — | 18×1px ×3 | — | — | — | — | T07 | |
| NAV-02 | Wordmark | `Mantel.` | 315 | A | 26px tall | — | — | — | — | T01 | ⚠ PNG, not text (F5) |
| NAV-03 | Flag glyph | `🇧🇭` | 333 | — | 14px | — | 1 | — | — | — | system emoji |
| NAV-04 | Locale label | `BD / EN` | 334 | E | 12px | 400 | 1.5 | 0.025em | — | T02 | |
| NAV-05 | Locale chevron | — | 335 | — | 12px | — | — | — | — | — | |
| NAV-06 | Search icon | — | 355 | — | 17px | — | — | — | — | T03 | |
| NAV-07 | Account icon | — | 368 | — | 17px | — | — | — | — | T04 | |
| NAV-08 | Cart icon | — | 375 | — | 17px | — | — | — | — | T05 | |
| NAV-09 | Cart count badge | `{n}` | 377 | M | **9px** ⚠F10 | 500 | 15px | — | — | T06 | |
| NAV-10 | Locale popover line | `🇧🇭 Bahrain — BD · English` | 343 | F | 14px | 400 | 1.5 | — | — | — | |
| NAV-11 | Locale popover note | `More regions and languages coming soon.` | 344 | I | 11px | 400 | 1.5 | — | — | — | muted |

### 1.2 Sidebar drawer — `src/app/App.tsx:395-471`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SIDE-01 | Close icon | — | 411 | — | 18px | — | — | — | — | — | |
| SIDE-02 | Drawer wordmark | `Mantel.` | 413 | A | 21px tall | — | — | — | — | — | ⚠ PNG (F5) |
| SIDE-03 | Nav link | `Menu` | 424 | E | 24px | 400 | 1.5 | — | — | — | |
| SIDE-04 | Nav link | `Contact` | 430 | E | 24px | 400 | 1.5 | — | — | — | |
| SIDE-05 | Nav link | `Our Story` | 436 | E | 24px | 400 | 1.5 | — | — | — | |
| SIDE-06 | Nav link | `Pick Up` | 445 | E | 24px | 400 | 1.5 | — | — | — | |
| SIDE-07 | Nav sub-label | `order before you reach` | 448 | I | 11px | 400 | 1.5 | 0.025em | — | — | muted |
| SIDE-08 | Nav link | `FAQ` | 453 | E | 24px | 400 | 1.5 | — | — | — | |
| SIDE-09 | Instagram icon | — | 468 | — | 18px | — | — | — | — | — | |

### 1.3 Footer — `src/app/App.tsx:247-292` _(renders on every page)_

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FOOT-01 | Instagram icon | — | 256 | — | 20px | — | — | — | — | T35 | |
| FOOT-02 | Policy popover item ×5 | `Privacy policy` … `Contact information` | 275 | J | 14px | 400 | 1.5 | — | — | — | |
| FOOT-03 | Policies trigger | `Terms and Policies` | 284 | J | 13px | 400 | 1.5 | — | — | T36 | muted |
| FOOT-04 | Copyright | `© 2026, Mantel` | 290 | K | 13px | 400 | 1.5 | 0.025em | — | T37 | muted |

### 1.4 Newsletter — `src/app/components/NewsletterSignup.tsx` _(renders on Contact and FAQ)_

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| NEWS-01 | Feature heading | `New Sips, First Look.` | 47 | D | 36px → 48px @md | 600 | 1 | — | — | T26 | |
| NEWS-02 | Description | `Be the first to know when new drinks land at Mantel.` | 50 | F | 14px | 400 | 1.5 | — | — | T27 | muted |
| NEWS-03 | Success message | `You're on the list. 💌` | 54 | I | 14px | 400 | 1.5 | — | — | — | muted |
| NEWS-04 | Email field | ph. `Email address` | 72 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | T28 | |
| NEWS-05 | Submit arrow | — | 81 | — | 20px | — | — | — | — | T29 | |
| NEWS-06 | Error message | `Couldn't sign you up right now…` | 89 | I | 12px | 400 | 1.5 | — | — | — | destructive |

---

## 2. Page surfaces

### 2.1 Home — `src/app/App.tsx:655-692`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| HOME-01 | Heart artwork | — | 665 | — | full height | — | — | — | — | T08 | `Logo-1.png.PNG` |
| HOME-02 | Primary CTA | `Our Story` | 675 | G | 12px → 16px @sm | 400 | 1.5 | 0.16em | UC | T09 | |
| HOME-03 | Secondary CTA | `Menu` | 681 | G | 12px → 16px @sm | 400 | 1.5 | 0.16em | UC | T10 | |

### 2.2 Menu — `src/app/App.tsx:695-747`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MENU-01 | Loading state | `Loading menu…` | 702 | I | 14px | 400 | 1.5 | — | — | — | muted |
| MENU-02 | Error state | `Couldn't load the menu right now…` | 706 | I | 14px | 400 | 1.5 | — | — | — | muted |
| MENU-03 | Category pill | `Coffee & Espresso` | 715 | G | 14px | 400 | 1.5 | 0.16em | UC | — | |
| MENU-04 | Category pill | `Food & Pastries` | 721 | G | 14px | 400 | 1.5 | 0.16em | UC | — | |
| MENU-05 | Back link | `← Back` | 731 | L | 11px | 400 | 1.5 | 0.18em | UC | — | muted ⚠F6 |
| MENU-06 | Category heading | `{category}` | 735 | C | 24px | 600 | 1.5 | — | — | — | |

### 2.3 Menu item row — `src/app/components/MenuItemRow.tsx` _(repeats per item)_

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| MITEM-01 | Item name | `{name}` | 9 | F | 15px | 500 | 1.5 | — | — | — | |
| MITEM-02 | Item description | `{desc}` | 10 | F | 14px | 400 | 1.5 | — | — | — | muted |
| MITEM-03 | Item price | `BD 0.000` | 12 | M | 14px | 400 | 1.5 | — | — | — | ⚠ italic (F1) |

### 2.4 Order Before Reach — `src/app/App.tsx:752-856`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ORD-01 | Page heading | `Order Before Reach` | 758 | B | 30px | 600 | 1.5 | — | — | — | ⚠ not fluid (F9) |
| ORD-02 | Subline | `order before you reach` | 759 | I | 14px | 400 | 1.5 | — | — | — | muted |
| ORD-03 | Loading state | `Loading menu…` | 762 | I | 14px | 400 | 1.5 | — | — | — | muted |
| ORD-04 | Error state | `Couldn't load the menu right now…` | 764 | I | 14px | 400 | 1.5 | — | — | — | muted |
| ORD-05 | Section heading | `Coffee & Espresso` | 771 | C | 20px | 600 | 1.5 | — | — | — | |
| ORD-06 | Section heading | `Food & Pastries` | 779 | C | 20px | 600 | 1.5 | — | — | — | |
| ORD-07 | Section heading | `Your Bag` | 791 | C | 20px | 600 | 1.5 | — | — | — | |
| ORD-08 | Order-sent message | `Order received — it'll be ready when you reach. 💌` | 794 | I | 14px | 400 | 1.5 | — | — | — | muted |
| ORD-09 | Empty bag | `Your bag is empty — add something above.` | 798 | I | 14px | 400 | 1.5 | — | — | — | muted |
| ORD-10 | Subtotal label | `Subtotal` | 811 | F | 14px | 400 | 1.5 | — | — | — | muted |
| ORD-11 | Subtotal value | `BD 0.000` | 812 | M | 14px | 500 | 1.5 | — | — | — | ⚠ italic (F1) |
| ORD-12 | Payment label | `Payment` | 819 | L | 11px | 400 | 1.5 | 0.14em | UC | — | muted ⚠F6 |
| ORD-13 | Payment option (disabled) | `Card — Coming Soon` | 828 | G | 12px | 400 | 1.5 | — | — | — | `muted/50` |
| ORD-14 | Order error | `Couldn't place the order…` | 833 | I | 12px | 400 | 1.5 | — | — | — | destructive |
| ORD-15 | Checkout CTA (disabled) | `Ordering Opens Soon` | 842 | G | 14px | 400 | 1.5 | 0.16em | UC | — | |
| ORD-16 | Launch note | `Online ordering is launching shortly…` | 844 | I | 11px | 400 | 1.5 | — | — | — | muted |

### 2.5 Order item row — `src/app/components/OrderItemRow.tsx` _(repeats per item)_

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| OITEM-01 | Item name | `{name}` | 17 | F | 15px | 500 | 1.5 | — | — | — | |
| OITEM-02 | Item description | `{desc}` | 18 | F | 14px | 400 | 1.5 | — | — | — | muted |
| OITEM-03 | Item price | `BD 0.000` | 21 | M | 14px | 400 | 1.5 | — | — | — | ⚠ italic (F1) |
| OITEM-04 | Add-to-bag icon | — | 27 | — | 14px | — | — | — | — | — | |

### 2.6 Contact — `src/app/App.tsx:859-954`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CONT-01 | Page heading | `Contact` | 869 | B | `clamp(2.8rem, 8vw, 4.5rem)` | 700 | 1.05 | — | — | T20 | ⚠ colour `#3a0d1e` (F7) |
| CONT-02 | Success message | `Thank you — we'll be in touch soon.` | 874 | F | 14px | 400 | 1.5 | 0.025em | — | — | muted |
| CONT-03 | Name field | ph. `Name` | 897 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | T21 | |
| CONT-04 | Email field | ph. `Email *` | 905 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | T22 | |
| CONT-05 | Phone field | ph. `Phone number` | 917 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | T23 | |
| CONT-06 | Comment field | ph. `Comment` | 926 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | T24 | 5 rows |
| CONT-07 | Send error | `Couldn't send right now…` | 934 | I | 12px | 400 | 1.5 | — | — | — | destructive |
| CONT-08 | Submit button | `Send` / `Sending…` | 941 | G | 14px | 400 | 1.5 | 0.16em | UC | T25 | |

### 2.7 FAQ — `src/app/App.tsx:957-966`, `src/app/components/FaqAccordion.tsx`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FAQ-01 | Page heading | `FAQ` | 960 | B | **48px fixed** ⚠F9 | 600 | 1 | — | — | T11 | |
| FAQ-02 | Question ×6 | `WHAT IS ORDER BEFORE REACH?` … | Acc:23 | L | 13px | 400 | 1.5 | 0.08em | UC | T12,T14–T18 | ⚠F6 |
| FAQ-03 | Toggle chevron | — | Acc:24 | — | 16px | — | — | — | — | T19 | rotates 180° |
| FAQ-04 | Answer | `{answer}` | Acc:29 | F | 14px | 400 | 1.625 | — | — | T13 | muted |

_Question and answer strings live in `src/app/content/legal.ts:137-163`._

### 2.8 Policy pages — `src/app/components/PolicyPage.tsx` _(Privacy / Terms / Refund)_

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| POL-01 | Document title | `Privacy Policy` / `Terms of Service` / `Refund Policy` | 10 | B | **36px fixed** ⚠F9 | 600 | 1.5 | — | — | — | |
| POL-02 | Updated date | `Last updated 10 July 2026` | 11 | L | 11px | 400 | 1.5 | 0.14em | UC | — | muted ⚠F6 |
| POL-03 | Section heading ×7–8 | `What we collect` … | 18 | L | 12px | 400 | 1.5 | 0.18em | UC | — | ⚠F6 |
| POL-04 | Body paragraph | prose | 24 | F | 14px | 400 | 1.625 | — | — | — | muted ⚠F2 |

_Content in `src/app/content/legal.ts:8-131`. Longest reading surface on the site._

---

## 3. Overlay surfaces

### 3.1 Search panel — `src/app/App.tsx:474-526`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SRCH-01 | Search field | ph. `Search the menu…` | 484 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | — | |
| SRCH-02 | Close icon | — | 494 | — | 18px | — | — | — | — | — | |
| SRCH-03 | Empty state | `No matches — try "latte" or "croissant".` | 500 | I | 14px | 400 | 1.5 | — | — | — | muted |
| SRCH-04 | Result name | `{name}` | 513 | F | 14px | 500 | 1.5 | — | — | — | |
| SRCH-05 | Result category | `Coffee & Espresso` | 514 | L | 11px | 400 | 1.5 | 0.14em | UC | — | muted ⚠F6 |
| SRCH-06 | Result price | `BD 0.000` | 518 | M | 13px | 400 | 1.5 | — | — | — | ⚠ italic (F1) |

### 3.2 Account panel — `src/app/App.tsx:529-589`

Two states. Signed in:

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ACCT-01 | Greeting | `Hi, {name}` | 536 | C | 20px | 500 | 1.75 | — | — | — | |
| ACCT-02 | Email line | `{email}` | 537 | I | 12px | 400 | 1.5 | — | — | — | muted |
| ACCT-03 | Explainer | `Your details pre-fill the contact form…` | 538 | I | 12px | 400 | 1.5 | — | — | — | muted |
| ACCT-04 | Sign-out | `Sign out` | 545 | L | 11px | 400 | 1.5 | 0.14em | UC | — | muted ⚠F6 |

Signed out:

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ACCT-05 | Modal heading | `Your details` | 558 | C | 20px | 500 | 1.75 | — | — | T30 | |
| ACCT-06 | Name field | ph. `Name` | 561 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | T31 | |
| ACCT-07 | Email field | ph. `Email` | 570 | H | **14px** ⚠F3 | 400 | 1.5 | — | — | T32 | |
| ACCT-08 | Save button | `Save` | 581 | G | 14px | 400 | 1.5 | 0.16em | UC | T33 | |
| ACCT-09 | Helper text | `Saved on this device only…` | 583 | I | 11px | 400 | 1.5 | — | — | T34 | muted |

### 3.3 Cart drawer — `src/app/App.tsx:600-652`

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CART-01 | Drawer heading | `Your Bag` | 610 | C | 20px | 500 | 1.75 | — | — | — | |
| CART-02 | Close icon | — | 616 | — | 18px | — | — | — | — | — | |
| CART-03 | Order-sent message | `Order received — it'll be ready when you reach. 💌` | 622 | I | 14px | 400 | 1.5 | — | — | — | muted |
| CART-04 | Empty state | `Your bag is empty — add something from Order Before Reach.` | 626 | I | 14px | 400 | 1.5 | — | — | — | muted |
| CART-05 | Subtotal label | `Subtotal` | 641 | F | 14px | 400 | 1.5 | — | — | — | muted |
| CART-06 | Subtotal value | `BD 0.000` | 642 | M | 14px | 500 | 1.5 | — | — | — | ⚠ italic (F1) |
| CART-07 | Drawer CTA | `Go to Order Before Reach` | 648 | G | 14px | 400 | 1.5 | 0.16em | UC | — | |

### 3.4 Cart line item — `src/app/components/CartLineItem.tsx` _(repeats; used in 3.3 and 2.4)_

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| LINE-01 | Item name | `{name}` | 16 | F | 14px | 500 | 1.5 | — | — | — | truncates |
| LINE-02 | Unit price | `BD 0.000` | 17 | M | 12px | 400 | 1.5 | — | — | — | muted ⚠ italic |
| LINE-03 | Decrement icon | — | 25 | — | 12px | — | — | — | — | — | |
| LINE-04 | Quantity value | `{qty}` | 28 | M | 14px | 400 | 1.5 | — | — | — | ⚠ italic (F1) |
| LINE-05 | Increment icon | — | 33 | — | 12px | — | — | — | — | — | |

---

## 4. System surfaces

### 4.1 Error boundary — `src/app/components/ErrorBoundary.tsx`

Renders full-screen when the app crashes. Absent from both prior inventories.

| ID | Element | Text | Line | Cat | Size | W | LH | LS | Tr | Brief | ASSIGN |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SYS-01 | Error heading | `Something went wrong.` | 20 | C | 24px | 400 | 1.5 | — | — | — | |
| SYS-02 | Error explainer | `Please refresh the page…` | 21 | F | 14px | 400 | 1.5 | — | — | — | muted |
| SYS-03 | Reload button | `Reload` | 27 | G | 14px | 400 | 1.5 | 0.16em | UC | — | |

### 4.2 Document-level

| ID | Element | Text | Location | Cat | Notes | ASSIGN |
|---|---|---|---|---|---|---|
| DOC-01 | Browser tab title | `MANTEL` | `index.html:6` | — | not stylable | n/a |
| DOC-02 | Meta description | `MANTEL — specialty coffee in Bahrain…` | `index.html:7` | — | not stylable | n/a |

---

## 5. Machine-readable registry

For prompts, token generation, or scripted checks. `cat` is null for non-type
elements; `assign` is the empty decision slot.

```json
{
  "meta": { "commit": "663333e", "elements": 110, "typeBearing": 91,
            "currentFamily": "EB Garamond Italic 400",
            "categories": "see TYPOGRAPHY-AUDIT.md §3" },
  "elements": [
    {"id":"NAV-01","surface":"header","el":"hamburger","text":null,"src":"App.tsx:310","cat":null,"size":null,"assign":null},
    {"id":"NAV-02","surface":"header","el":"wordmark","text":"Mantel.","src":"App.tsx:315","cat":"A","size":"26px","note":"PNG image","assign":null},
    {"id":"NAV-03","surface":"header","el":"flagGlyph","text":"🇧🇭","src":"App.tsx:333","cat":null,"size":"14px","assign":null},
    {"id":"NAV-04","surface":"header","el":"localeLabel","text":"BD / EN","src":"App.tsx:334","cat":"E","size":"12px","ls":"0.025em","assign":null},
    {"id":"NAV-05","surface":"header","el":"localeChevron","text":null,"src":"App.tsx:335","cat":null,"size":"12px","assign":null},
    {"id":"NAV-06","surface":"header","el":"searchIcon","text":null,"src":"App.tsx:355","cat":null,"size":"17px","assign":null},
    {"id":"NAV-07","surface":"header","el":"accountIcon","text":null,"src":"App.tsx:368","cat":null,"size":"17px","assign":null},
    {"id":"NAV-08","surface":"header","el":"cartIcon","text":null,"src":"App.tsx:375","cat":null,"size":"17px","assign":null},
    {"id":"NAV-09","surface":"header","el":"cartBadge","text":"{n}","src":"App.tsx:377","cat":"M","size":"9px","w":500,"flag":"F10","assign":null},
    {"id":"NAV-10","surface":"header","el":"localePopoverLine","text":"🇧🇭 Bahrain — BD · English","src":"App.tsx:343","cat":"F","size":"14px","assign":null},
    {"id":"NAV-11","surface":"header","el":"localePopoverNote","text":"More regions and languages coming soon.","src":"App.tsx:344","cat":"I","size":"11px","assign":null},

    {"id":"SIDE-01","surface":"sidebar","el":"closeIcon","text":null,"src":"App.tsx:411","cat":null,"size":"18px","assign":null},
    {"id":"SIDE-02","surface":"sidebar","el":"wordmark","text":"Mantel.","src":"App.tsx:413","cat":"A","size":"21px","note":"PNG image","assign":null},
    {"id":"SIDE-03","surface":"sidebar","el":"navLink","text":"Menu","src":"App.tsx:424","cat":"E","size":"24px","assign":null},
    {"id":"SIDE-04","surface":"sidebar","el":"navLink","text":"Contact","src":"App.tsx:430","cat":"E","size":"24px","assign":null},
    {"id":"SIDE-05","surface":"sidebar","el":"navLink","text":"Our Story","src":"App.tsx:436","cat":"E","size":"24px","assign":null},
    {"id":"SIDE-06","surface":"sidebar","el":"navLink","text":"Pick Up","src":"App.tsx:445","cat":"E","size":"24px","assign":null},
    {"id":"SIDE-07","surface":"sidebar","el":"navSubLabel","text":"order before you reach","src":"App.tsx:448","cat":"I","size":"11px","ls":"0.025em","assign":null},
    {"id":"SIDE-08","surface":"sidebar","el":"navLink","text":"FAQ","src":"App.tsx:453","cat":"E","size":"24px","assign":null},
    {"id":"SIDE-09","surface":"sidebar","el":"instagramIcon","text":null,"src":"App.tsx:468","cat":null,"size":"18px","assign":null},

    {"id":"FOOT-01","surface":"footer","el":"instagramIcon","text":null,"src":"App.tsx:256","cat":null,"size":"20px","assign":null},
    {"id":"FOOT-02","surface":"footer","el":"policyPopoverItem","text":"Privacy policy|Terms of service|Refund policy|FAQ|Contact information","src":"App.tsx:275","cat":"J","size":"14px","assign":null},
    {"id":"FOOT-03","surface":"footer","el":"policiesTrigger","text":"Terms and Policies","src":"App.tsx:284","cat":"J","size":"13px","assign":null},
    {"id":"FOOT-04","surface":"footer","el":"copyright","text":"© 2026, Mantel","src":"App.tsx:290","cat":"K","size":"13px","ls":"0.025em","assign":null},

    {"id":"NEWS-01","surface":"newsletter","el":"featureHeading","text":"New Sips, First Look.","src":"NewsletterSignup.tsx:47","cat":"D","size":"36px→48px","w":600,"lh":1,"assign":null},
    {"id":"NEWS-02","surface":"newsletter","el":"description","text":"Be the first to know when new drinks land at Mantel.","src":"NewsletterSignup.tsx:50","cat":"F","size":"14px","assign":null},
    {"id":"NEWS-03","surface":"newsletter","el":"successMessage","text":"You're on the list. 💌","src":"NewsletterSignup.tsx:54","cat":"I","size":"14px","assign":null},
    {"id":"NEWS-04","surface":"newsletter","el":"emailField","text":"Email address","src":"NewsletterSignup.tsx:72","cat":"H","size":"14px","flag":"F3","assign":null},
    {"id":"NEWS-05","surface":"newsletter","el":"submitArrow","text":null,"src":"NewsletterSignup.tsx:81","cat":null,"size":"20px","assign":null},
    {"id":"NEWS-06","surface":"newsletter","el":"errorMessage","text":"Couldn't sign you up right now…","src":"NewsletterSignup.tsx:89","cat":"I","size":"12px","assign":null},

    {"id":"HOME-01","surface":"home","el":"heartArtwork","text":null,"src":"App.tsx:665","cat":null,"assign":null},
    {"id":"HOME-02","surface":"home","el":"primaryCta","text":"Our Story","src":"App.tsx:675","cat":"G","size":"12px→16px","ls":"0.16em","tr":"uppercase","assign":null},
    {"id":"HOME-03","surface":"home","el":"secondaryCta","text":"Menu","src":"App.tsx:681","cat":"G","size":"12px→16px","ls":"0.16em","tr":"uppercase","assign":null},

    {"id":"MENU-01","surface":"menu","el":"loadingState","text":"Loading menu…","src":"App.tsx:702","cat":"I","size":"14px","assign":null},
    {"id":"MENU-02","surface":"menu","el":"errorState","text":"Couldn't load the menu right now…","src":"App.tsx:706","cat":"I","size":"14px","assign":null},
    {"id":"MENU-03","surface":"menu","el":"categoryPill","text":"Coffee & Espresso","src":"App.tsx:715","cat":"G","size":"14px","ls":"0.16em","tr":"uppercase","assign":null},
    {"id":"MENU-04","surface":"menu","el":"categoryPill","text":"Food & Pastries","src":"App.tsx:721","cat":"G","size":"14px","ls":"0.16em","tr":"uppercase","assign":null},
    {"id":"MENU-05","surface":"menu","el":"backLink","text":"← Back","src":"App.tsx:731","cat":"L","size":"11px","ls":"0.18em","tr":"uppercase","flag":"F6","assign":null},
    {"id":"MENU-06","surface":"menu","el":"categoryHeading","text":"{category}","src":"App.tsx:735","cat":"C","size":"24px","w":600,"assign":null},

    {"id":"MITEM-01","surface":"menuItemRow","el":"itemName","text":"{name}","src":"MenuItemRow.tsx:9","cat":"F","size":"15px","w":500,"assign":null},
    {"id":"MITEM-02","surface":"menuItemRow","el":"itemDescription","text":"{desc}","src":"MenuItemRow.tsx:10","cat":"F","size":"14px","assign":null},
    {"id":"MITEM-03","surface":"menuItemRow","el":"itemPrice","text":"BD 0.000","src":"MenuItemRow.tsx:12","cat":"M","size":"14px","assign":null},

    {"id":"ORD-01","surface":"order","el":"pageHeading","text":"Order Before Reach","src":"App.tsx:758","cat":"B","size":"30px","w":600,"flag":"F9","assign":null},
    {"id":"ORD-02","surface":"order","el":"subline","text":"order before you reach","src":"App.tsx:759","cat":"I","size":"14px","assign":null},
    {"id":"ORD-03","surface":"order","el":"loadingState","text":"Loading menu…","src":"App.tsx:762","cat":"I","size":"14px","assign":null},
    {"id":"ORD-04","surface":"order","el":"errorState","text":"Couldn't load the menu right now…","src":"App.tsx:764","cat":"I","size":"14px","assign":null},
    {"id":"ORD-05","surface":"order","el":"sectionHeading","text":"Coffee & Espresso","src":"App.tsx:771","cat":"C","size":"20px","w":600,"assign":null},
    {"id":"ORD-06","surface":"order","el":"sectionHeading","text":"Food & Pastries","src":"App.tsx:779","cat":"C","size":"20px","w":600,"assign":null},
    {"id":"ORD-07","surface":"order","el":"sectionHeading","text":"Your Bag","src":"App.tsx:791","cat":"C","size":"20px","w":600,"assign":null},
    {"id":"ORD-08","surface":"order","el":"orderSentMessage","text":"Order received — it'll be ready when you reach. 💌","src":"App.tsx:794","cat":"I","size":"14px","assign":null},
    {"id":"ORD-09","surface":"order","el":"emptyBag","text":"Your bag is empty — add something above.","src":"App.tsx:798","cat":"I","size":"14px","assign":null},
    {"id":"ORD-10","surface":"order","el":"subtotalLabel","text":"Subtotal","src":"App.tsx:811","cat":"F","size":"14px","assign":null},
    {"id":"ORD-11","surface":"order","el":"subtotalValue","text":"BD 0.000","src":"App.tsx:812","cat":"M","size":"14px","w":500,"assign":null},
    {"id":"ORD-12","surface":"order","el":"paymentLabel","text":"Payment","src":"App.tsx:819","cat":"L","size":"11px","ls":"0.14em","tr":"uppercase","flag":"F6","assign":null},
    {"id":"ORD-13","surface":"order","el":"paymentOptionDisabled","text":"Card — Coming Soon","src":"App.tsx:828","cat":"G","size":"12px","assign":null},
    {"id":"ORD-14","surface":"order","el":"orderError","text":"Couldn't place the order — please try again.","src":"App.tsx:833","cat":"I","size":"12px","assign":null},
    {"id":"ORD-15","surface":"order","el":"checkoutCtaDisabled","text":"Ordering Opens Soon","src":"App.tsx:842","cat":"G","size":"14px","ls":"0.16em","tr":"uppercase","assign":null},
    {"id":"ORD-16","surface":"order","el":"launchNote","text":"Online ordering is launching shortly — check back soon.","src":"App.tsx:844","cat":"I","size":"11px","assign":null},

    {"id":"OITEM-01","surface":"orderItemRow","el":"itemName","text":"{name}","src":"OrderItemRow.tsx:17","cat":"F","size":"15px","w":500,"assign":null},
    {"id":"OITEM-02","surface":"orderItemRow","el":"itemDescription","text":"{desc}","src":"OrderItemRow.tsx:18","cat":"F","size":"14px","assign":null},
    {"id":"OITEM-03","surface":"orderItemRow","el":"itemPrice","text":"BD 0.000","src":"OrderItemRow.tsx:21","cat":"M","size":"14px","assign":null},
    {"id":"OITEM-04","surface":"orderItemRow","el":"addIcon","text":null,"src":"OrderItemRow.tsx:27","cat":null,"size":"14px","assign":null},

    {"id":"CONT-01","surface":"contact","el":"pageHeading","text":"Contact","src":"App.tsx:869","cat":"B","size":"clamp(2.8rem,8vw,4.5rem)","w":700,"lh":1.05,"color":"#3a0d1e","flag":"F7","assign":null},
    {"id":"CONT-02","surface":"contact","el":"successMessage","text":"Thank you — we'll be in touch soon.","src":"App.tsx:874","cat":"F","size":"14px","assign":null},
    {"id":"CONT-03","surface":"contact","el":"nameField","text":"Name","src":"App.tsx:897","cat":"H","size":"14px","flag":"F3","assign":null},
    {"id":"CONT-04","surface":"contact","el":"emailField","text":"Email *","src":"App.tsx:905","cat":"H","size":"14px","flag":"F3","assign":null},
    {"id":"CONT-05","surface":"contact","el":"phoneField","text":"Phone number","src":"App.tsx:917","cat":"H","size":"14px","flag":"F3","assign":null},
    {"id":"CONT-06","surface":"contact","el":"commentField","text":"Comment","src":"App.tsx:926","cat":"H","size":"14px","flag":"F3","assign":null},
    {"id":"CONT-07","surface":"contact","el":"sendError","text":"Couldn't send right now…","src":"App.tsx:934","cat":"I","size":"12px","assign":null},
    {"id":"CONT-08","surface":"contact","el":"submitButton","text":"Send","src":"App.tsx:941","cat":"G","size":"14px","ls":"0.16em","tr":"uppercase","assign":null},

    {"id":"FAQ-01","surface":"faq","el":"pageHeading","text":"FAQ","src":"App.tsx:960","cat":"B","size":"48px","w":600,"flag":"F9","assign":null},
    {"id":"FAQ-02","surface":"faq","el":"question","text":"6 questions","src":"FaqAccordion.tsx:23","cat":"L","size":"13px","ls":"0.08em","tr":"uppercase","flag":"F6","assign":null},
    {"id":"FAQ-03","surface":"faq","el":"toggleChevron","text":null,"src":"FaqAccordion.tsx:24","cat":null,"size":"16px","assign":null},
    {"id":"FAQ-04","surface":"faq","el":"answer","text":"{answer}","src":"FaqAccordion.tsx:29","cat":"F","size":"14px","lh":1.625,"assign":null},

    {"id":"POL-01","surface":"policy","el":"documentTitle","text":"Privacy Policy|Terms of Service|Refund Policy","src":"PolicyPage.tsx:10","cat":"B","size":"36px","w":600,"flag":"F9","assign":null},
    {"id":"POL-02","surface":"policy","el":"updatedDate","text":"Last updated {date}","src":"PolicyPage.tsx:11","cat":"L","size":"11px","ls":"0.14em","tr":"uppercase","flag":"F6","assign":null},
    {"id":"POL-03","surface":"policy","el":"sectionHeading","text":"{heading}","src":"PolicyPage.tsx:18","cat":"L","size":"12px","ls":"0.18em","tr":"uppercase","flag":"F6","assign":null},
    {"id":"POL-04","surface":"policy","el":"bodyParagraph","text":"{prose}","src":"PolicyPage.tsx:24","cat":"F","size":"14px","lh":1.625,"flag":"F2","assign":null},

    {"id":"SRCH-01","surface":"search","el":"searchField","text":"Search the menu…","src":"App.tsx:484","cat":"H","size":"14px","flag":"F3","assign":null},
    {"id":"SRCH-02","surface":"search","el":"closeIcon","text":null,"src":"App.tsx:494","cat":null,"size":"18px","assign":null},
    {"id":"SRCH-03","surface":"search","el":"emptyState","text":"No matches — try \"latte\" or \"croissant\".","src":"App.tsx:500","cat":"I","size":"14px","assign":null},
    {"id":"SRCH-04","surface":"search","el":"resultName","text":"{name}","src":"App.tsx:513","cat":"F","size":"14px","w":500,"assign":null},
    {"id":"SRCH-05","surface":"search","el":"resultCategory","text":"{category}","src":"App.tsx:514","cat":"L","size":"11px","ls":"0.14em","tr":"uppercase","flag":"F6","assign":null},
    {"id":"SRCH-06","surface":"search","el":"resultPrice","text":"BD 0.000","src":"App.tsx:518","cat":"M","size":"13px","assign":null},

    {"id":"ACCT-01","surface":"account","el":"greeting","text":"Hi, {name}","src":"App.tsx:536","cat":"C","size":"20px","w":500,"state":"signedIn","assign":null},
    {"id":"ACCT-02","surface":"account","el":"emailLine","text":"{email}","src":"App.tsx:537","cat":"I","size":"12px","state":"signedIn","assign":null},
    {"id":"ACCT-03","surface":"account","el":"explainer","text":"Your details pre-fill the contact form…","src":"App.tsx:538","cat":"I","size":"12px","state":"signedIn","assign":null},
    {"id":"ACCT-04","surface":"account","el":"signOut","text":"Sign out","src":"App.tsx:545","cat":"L","size":"11px","ls":"0.14em","tr":"uppercase","state":"signedIn","flag":"F6","assign":null},
    {"id":"ACCT-05","surface":"account","el":"modalHeading","text":"Your details","src":"App.tsx:558","cat":"C","size":"20px","w":500,"state":"signedOut","assign":null},
    {"id":"ACCT-06","surface":"account","el":"nameField","text":"Name","src":"App.tsx:561","cat":"H","size":"14px","state":"signedOut","flag":"F3","assign":null},
    {"id":"ACCT-07","surface":"account","el":"emailField","text":"Email","src":"App.tsx:570","cat":"H","size":"14px","state":"signedOut","flag":"F3","assign":null},
    {"id":"ACCT-08","surface":"account","el":"saveButton","text":"Save","src":"App.tsx:581","cat":"G","size":"14px","ls":"0.16em","tr":"uppercase","state":"signedOut","assign":null},
    {"id":"ACCT-09","surface":"account","el":"helperText","text":"Saved on this device only…","src":"App.tsx:583","cat":"I","size":"11px","state":"signedOut","assign":null},

    {"id":"CART-01","surface":"cartDrawer","el":"drawerHeading","text":"Your Bag","src":"App.tsx:610","cat":"C","size":"20px","w":500,"assign":null},
    {"id":"CART-02","surface":"cartDrawer","el":"closeIcon","text":null,"src":"App.tsx:616","cat":null,"size":"18px","assign":null},
    {"id":"CART-03","surface":"cartDrawer","el":"orderSentMessage","text":"Order received — it'll be ready when you reach. 💌","src":"App.tsx:622","cat":"I","size":"14px","assign":null},
    {"id":"CART-04","surface":"cartDrawer","el":"emptyState","text":"Your bag is empty — add something from Order Before Reach.","src":"App.tsx:626","cat":"I","size":"14px","assign":null},
    {"id":"CART-05","surface":"cartDrawer","el":"subtotalLabel","text":"Subtotal","src":"App.tsx:641","cat":"F","size":"14px","assign":null},
    {"id":"CART-06","surface":"cartDrawer","el":"subtotalValue","text":"BD 0.000","src":"App.tsx:642","cat":"M","size":"14px","w":500,"assign":null},
    {"id":"CART-07","surface":"cartDrawer","el":"drawerCta","text":"Go to Order Before Reach","src":"App.tsx:648","cat":"G","size":"14px","ls":"0.16em","tr":"uppercase","assign":null},

    {"id":"LINE-01","surface":"cartLineItem","el":"itemName","text":"{name}","src":"CartLineItem.tsx:16","cat":"F","size":"14px","w":500,"assign":null},
    {"id":"LINE-02","surface":"cartLineItem","el":"unitPrice","text":"BD 0.000","src":"CartLineItem.tsx:17","cat":"M","size":"12px","assign":null},
    {"id":"LINE-03","surface":"cartLineItem","el":"decrementIcon","text":null,"src":"CartLineItem.tsx:25","cat":null,"size":"12px","assign":null},
    {"id":"LINE-04","surface":"cartLineItem","el":"quantityValue","text":"{qty}","src":"CartLineItem.tsx:28","cat":"M","size":"14px","assign":null},
    {"id":"LINE-05","surface":"cartLineItem","el":"incrementIcon","text":null,"src":"CartLineItem.tsx:33","cat":null,"size":"12px","assign":null},

    {"id":"SYS-01","surface":"errorBoundary","el":"errorHeading","text":"Something went wrong.","src":"ErrorBoundary.tsx:20","cat":"C","size":"24px","assign":null},
    {"id":"SYS-02","surface":"errorBoundary","el":"errorExplainer","text":"Please refresh the page…","src":"ErrorBoundary.tsx:21","cat":"F","size":"14px","assign":null},
    {"id":"SYS-03","surface":"errorBoundary","el":"reloadButton","text":"Reload","src":"ErrorBoundary.tsx:27","cat":"G","size":"14px","ls":"0.16em","tr":"uppercase","assign":null},

    {"id":"DOC-01","surface":"document","el":"tabTitle","text":"MANTEL","src":"index.html:6","cat":null,"stylable":false,"assign":null},
    {"id":"DOC-02","surface":"document","el":"metaDescription","text":"MANTEL — specialty coffee in Bahrain…","src":"index.html:7","cat":null,"stylable":false,"assign":null}
  ]
}
```

---

## 6. Prompt template

Paste §5 into the prompt where marked.

```
You are a senior typography and design-systems specialist working on Mantel,
a specialty coffee shop in Muharraq, Bahrain. The site is minimal, editorial,
black-on-white, no photography — the brand's hand-painted red heart and
typography carry the whole design.

Below is the complete element registry for the site. Every element has a
stable id, its category (A–M), and its current rendered values.

<registry>
[ PASTE THE JSON FROM §5 ]
</registry>

CATEGORIES
A Logo/Wordmark · B Display Heading · C Section Heading · D Feature Heading
E Navigation · F Body · G Button · H Input · I Helper · J Footer
K Copyright · L UI Label (uppercase, tracked) · M Numeric/Price

CONSTRAINTS
- Category H must be >= 16px at viewports <= 1024px (iOS zoom).
- Category M must be upright, never italic, with tabular figures.
- Body text colour must reach 4.5:1 on #ffffff.
- Available brand assets: Mantel-By-UglyDave-01/02 (display face, single
  weight 400, complete Latin charset, `liga` only) and EB Garamond.

TASK
For every id in the registry, return: font family, weight, size (desktop /
tablet / mobile), line height, letter spacing, and text transform.
Return one row per id. Do not merge or skip ids.
Flag any element where your assignment differs from its category default,
and say why.
```

---

## 7. Crosswalk — brief `T##` → map ID

The 37 IDs from `mantel_font.md`, and what they map to here.

| Brief | Map ID | Brief | Map ID | Brief | Map ID |
|---|---|---|---|---|---|
| T01 | NAV-02 | T14 | FAQ-02 | T27 | NEWS-02 |
| T02 | NAV-04 | T15 | FAQ-02 | T28 | NEWS-04 |
| T03 | NAV-06 | T16 | FAQ-02 | T29 | NEWS-05 |
| T04 | NAV-07 | T17 | FAQ-02 | T30 | ACCT-05 |
| T05 | NAV-08 | T18 | FAQ-02 | T31 | ACCT-06 |
| T06 | NAV-09 | T19 | FAQ-03 | T32 | ACCT-07 |
| T07 | NAV-01 | T20 | CONT-01 | T33 | ACCT-08 |
| T08 | HOME-01 | T21 | CONT-03 | T34 | ACCT-09 |
| T09 | HOME-02 | T22 | CONT-04 | T35 | FOOT-01 |
| T10 | HOME-03 | T23 | CONT-05 | T36 | FOOT-03 |
| T11 | FAQ-01 | T24 | CONT-06 | T37 | FOOT-04 |
| T12 | FAQ-02 | T25 | CONT-08 | | |
| T13 | FAQ-04 | T26 | NEWS-01 | | |

**T14–T18 collapse into FAQ-02.** The brief lists the six FAQ questions as six
separate elements, but they are one `.map()` over `FAQ_ITEMS`
(`FaqAccordion.tsx:23`) — a single style. Assigning them separately is not
possible without changing the component.

The 37 brief IDs resolve to **32 distinct elements**, so **78 elements in this
map have no brief ID** — the entire commerce surface
(Order Before Reach, cart, cart line items, search results, menu rows), all
policy pages, all loading/error/empty states, the sidebar, and the error
boundary.

---

## 8. Category totals

How many elements each decision covers, if you assign by category:

| Cat | Name | Count | Elements |
|---|---|---|---|
| A | Logo / Wordmark | 2 | NAV-02, SIDE-02 |
| B | Display Heading | 4 | CONT-01, FAQ-01, ORD-01, POL-01 |
| C | Section Heading | 8 | MENU-06, ORD-05/06/07, ACCT-01/05, CART-01, SYS-01 |
| D | Feature Heading | 1 | NEWS-01 |
| E | Navigation | 6 | NAV-04, SIDE-03/04/05/06/08 |
| F | Body | 14 | NAV-10, NEWS-02, MITEM-01/02, OITEM-01/02, ORD-10, CONT-02, FAQ-04, POL-04, SRCH-04, CART-05, LINE-01, SYS-02 |
| G | Button | 10 | HOME-02/03, MENU-03/04, ORD-13/15, CONT-08, ACCT-08, CART-07, SYS-03 |
| H | Input | 8 | CONT-03/04/05/06, ACCT-06/07, SRCH-01, NEWS-04 |
| I | Helper | 20 | NAV-11, SIDE-07, MENU-01/02, ORD-02/03/04/08/09/14/16, CONT-07, ACCT-02/03/09, SRCH-03, CART-03/04, NEWS-03/06 |
| J | Footer | 2 | FOOT-02, FOOT-03 |
| K | Copyright | 1 | FOOT-04 |
| L | UI Label | 7 | MENU-05, ORD-12, FAQ-02, POL-02/03, SRCH-05, ACCT-04 |
| M | Numeric / Price | 8 | NAV-09, MITEM-03, OITEM-03, ORD-11, SRCH-06, CART-06, LINE-02, LINE-04 |
| — | Non-type | 19 | icons, images, `DOC-*` |

`FOOT-02` is a link rendered as a `<button>` — it sits under J, not G.
`NEWS-05` is an icon-only button, so it has no type and counts as non-type.

**Categories I (20), F (14), and G (10) cover 44 of the 91 type-bearing
elements.** Those three decisions are worth making first.

---

## 9. Notes for whoever fills this in

1. **Elements that share a component share a style.** FAQ-02 covers six
   questions; MITEM-* repeat per menu item; LINE-* repeat per cart row;
   POL-* repeat across three documents. Changing one changes all instances.

2. **Two elements are images, not text** — NAV-02 and SIDE-02. They cannot take
   a font assignment until they become live text (finding F5).

3. **Eight elements carry money or counts** (category M) and are currently
   italic with proportional figures. `BD 2.200` in a right-aligned column will
   not align. This is the category most worth overriding away from the display
   face.

4. **Twenty elements are helper/status text** (category I) at 11–14px in
   `#888888`. That is the single largest category, it is the least legible type
   on the site, and it currently fails contrast. Worth deciding deliberately
   rather than inheriting.

5. **The `ASSIGN` column is deliberately empty.** Nothing in this map changes
   the site — it records what is there now so the decisions can be made against
   real values.
