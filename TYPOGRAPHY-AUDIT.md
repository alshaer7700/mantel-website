# MANTEL — Typography Audit & Review System

_Audit date: 1 August 2026. Audited against commit `2d31b91` (branch `main`)._

This document is the answer to `mantel_font.md`. It covers steps 1–7 of the
requested workflow (inventory → categories → layouts → scoring → selection) and
supplies the ready-to-apply token code for steps 8–9, which should only be run
after the team picks a layout in §7.

---

## 1. What is actually shipping today

### 1.1 Font families loaded

| Family | Files | Where declared | Status |
|---|---|---|---|
| EB Garamond (italic cuts only) | `EBGaramond-Italic.ttf`, `-MediumItalic`, `-SemiBoldItalic`, `-BoldItalic` | `src/styles/fonts.css:8-78` | **Active — the only family on the site** |
| Mantel-By-UglyDave-01 | `src/assets/Mantel-By-UglyDave-01.otf` | nowhere | **Unused** |
| Mantel-By-UglyDave-02 | `src/assets/Mantel-By-UglyDave-02.otf` | nowhere | **Unused** |
| Georgia / serif | — | fallback in `--font-app` | Fallback only |

There is exactly **one** typeface rendering on the live site. `--font-app`
(`fonts.css:81`) is aliased three ways in `theme.css:84-86`:

```css
--font-sans:    var(--font-app);   /* → EB Garamond */
--font-display: var(--font-app);   /* → EB Garamond */
--font-body:    var(--font-app);   /* → EB Garamond */
```

So the 22 `font-display` and 2 `font-body` class usages in `src/app/` are
**visually inert** — they compile to the same family. Every bit of hierarchy on
the site is carried by size and weight alone.

### 1.2 Weights actually available

| Family | Weights registered | Weights real? |
|---|---|---|
| EB Garamond | 400, 500, 600, 700 (each ×2, as `normal` and `italic`) | Yes — four separate drawn cuts, all italic designs |
| Mantel-By-UglyDave-01 | — | Single weight only (`usWeightClass: 400`) |
| Mantel-By-UglyDave-02 | — | Single weight only (`usWeightClass: 400`) |

Weight utilities in use across the app: `font-semibold` ×8, `font-medium` ×7,
`font-bold` ×1. Weights 300 and the roman (upright) cuts of EB Garamond are
**not in the repo** — any layout below that wants upright Garamond requires
adding those files.

### 1.3 The brand typeface, inspected

Both OTFs are by **Laura Eddy**, distributed by **TYPEHEIST**
(<https://typeheist.co/>). Technical read of the binaries:

| Property | `-01.otf` | `-02.otf` |
|---|---|---|
| Format | CFF / OpenType (`OTTO`) | CFF / OpenType (`OTTO`) |
| Glyph count | 289 | 315 |
| Mapped characters | 288 | 314 |
| A–Z / a–z / 0–9 | all present | all present |
| Punctuation, currency, `&@%#*()/` | all present | all present |
| OpenType features | `liga` only | `liga` only |
| Kerning (`GPOS`) | present | present |
| Weight class | 400 | 400 |
| File size | 78 KB | 83 KB |

**Verdict:** fully usable for real text, not just a logo — the charset is
complete. But with one weight and no small-caps or stylistic alternates, it can
carry a display role only. It cannot express a hierarchy on its own.

**Metadata defect to be aware of:** both files report the same Full Name
(nameID 4) — `Mantel-By-UglyDave-01` — and their Typographic Family names
(nameID 16) are swapped (`-01.otf` claims `-02`, and `-02.otf` claims `-01`).
Installing both locally will collide in font menus. In CSS this is harmless
because the `@font-face` `font-family` name we declare wins, but designers
working in Figma or Illustrator will hit it. Worth reporting back to TYPEHEIST.

### 1.4 Three conflicting brand type specs exist

| Source | Wordmark | Headings | Body |
|---|---|---|---|
| `brand-assets/mantel_brand_identity*.html` | Cormorant Garamond Light 300 | Playfair Display 400 | Inter 300 / 400 |
| `PROJECT-STATUS.md` §3 | Mantel-By-UglyDave-01 | Mantel-By-UglyDave-01 | Mantel-By-UglyDave-01 (Figtree fallback) |
| **Live site today** | PNG image | EB Garamond Italic | EB Garamond Italic |

None of the three agree. Picking one in §7 is the single highest-value outcome
of this review.

---

## 2. Findings

Ranked by impact. Each is verifiable at the cited location.

### F1 — The entire site renders in italic, including body copy and forms
`src/styles/fonts.css:8-42` registers the four **italic** EB Garamond files
under `font-style: normal`. Every element on the site — legal prose, FAQ
answers, menu descriptions, prices, input placeholders, helper text — renders
in a slanted, calligraphic italic. Extended italic reading measurably slows
comprehension and is a known barrier for dyslexic readers. It also makes the
`BD 2.200` price figures harder to scan in the ordering flow, where accuracy
matters most.

Italic is a beautiful choice for the wordmark and display headings. It is the
wrong default for a checkout.

### F2 — Muted body text fails WCAG AA contrast
`--muted-foreground: #888888` (`theme.css:16`) on `#ffffff` gives a contrast
ratio of **3.54:1**. WCAG 2.1 AA requires **4.5:1** for normal-size text.

This colour carries most of the reading text on the site: FAQ answers
(`FaqAccordion.tsx:29`), all legal prose (`PolicyPage.tsx:24`), menu item
descriptions (`MenuItemRow.tsx:10`), the newsletter description
(`NewsletterSignup.tsx:50`), helper text (`App.tsx:583`), the copyright line
(`App.tsx:290`), and every input placeholder.

**Fix:** `#767676` gives 4.54:1 and is visually near-identical. One token
change in `theme.css:16` repairs every instance.

### F3 — Every form input triggers iOS zoom on focus
All inputs are `text-sm` (14px): contact name/email/phone/comment
(`App.tsx:895-932`), newsletter (`NewsletterSignup.tsx:68`), search
(`App.tsx:481`), profile name/email (`App.tsx:559-576`). Safari on iOS
force-zooms the viewport whenever a focused input has `font-size < 16px`, then
leaves the page zoomed. On a café site where phone is the dominant device and
the contact form is the main conversion path, this is the most damaging
usability defect in the list.

**Fix:** inputs must be ≥ 16px at mobile widths. This is a hard rule in the
proposed token set (§8).

### F4 — 1.72 MB of unsubset TTF font payload
Each EB Garamond file is a full 2,954-glyph TTF at ~440 KB; four are loaded =
**1.72 MB**. The site uses Latin only.

Subsetting to Latin + the punctuation actually used and converting to WOFF2
brings each file to roughly 35–45 KB — about **150 KB total, a ~90% reduction**.
`font-display: swap` is already set correctly, so this is pure transfer weight.

### F5 — The wordmark is an image, not text
T01 renders as `logos-05.png` (`App.tsx:315-319`, `413-417`), not type. It
cannot inherit colour, does not scale with user font-size settings, adds a
network request, and cannot be selected or read as a heading. The brand has a
bespoke typeface sitting unused two directories away that would render it as
live text.

### F6 — No type scale: 14 sizes, 5 tracking values, 2 dead family tokens
Sizes in use: `text-sm` ×38, `text-xs` ×9, `text-[11px]` ×9, `text-2xl` ×7,
`text-xl` ×6, `text-[14px]` ×5, `text-[13px]` ×4, `text-base` ×2, `text-[15px]`
×2, `text-[12px]` ×2, `text-5xl` ×2, `text-4xl` ×2, `text-3xl` ×1, `text-[9px]`
×1 — plus one inline `clamp(2.8rem, 8vw, 4.5rem)`.

The single uppercase micro-label style appears at **five different tracking
values**: `0.08em` (FAQ question), `0.14em` (category, payment label, sign-out),
`0.16em` (buttons), `0.18em` (back link, policy heading), and `tracking-wide`
= `0.025em` (locale pill, copyright). These are all meant to be the same thing.

### F7 — The two "Display Heading" elements are implemented differently
T11 and T20 share a category in the brief but share nothing in code:

| | T11 FAQ Heading | T20 Contact Heading |
|---|---|---|
| Size | `text-5xl` — fixed 48px | `clamp(2.8rem, 8vw, 4.5rem)` — fluid |
| Weight | `font-semibold` (600) | `font-bold` (700) |
| Style | inherited | explicit `italic` |
| Colour | inherited `#1a1a1a` | hardcoded `#3a0d1e` |
| Line height | inherited 1.5 | `1.05` |

`#3a0d1e` (`App.tsx:867`) exists nowhere in the palette — it is not
`--foreground` (`#1a1a1a`) nor `--heart-red` (`#9c1a20`). It is a one-off plum
that appears exactly once on the site.

### F8 — Root font-size is locked in pixels
`html { font-size: var(--font-size) }` with `--font-size: 16px`
(`theme.css:4`, `143-145`) overrides a user who has raised their browser's
default text size. Changing this to `100%` preserves the same rendered size for
everyone else while honouring the preference (WCAG 1.4.4).

### F9 — Almost nothing is responsive
Only two elements change across breakpoints: the newsletter heading
(`text-4xl md:text-5xl`) and the hero CTAs (`text-xs sm:text-base`). The FAQ
heading is 48px at 320px viewport width; policy titles are `text-4xl` (36px) at
every size, so "Terms of Service" wraps awkwardly on a phone.

### F10 — Cart badge at 9px
`App.tsx:377` sets the cart counter to `text-[9px]`. It carries real
information (how many items are in the bag) at a size below any reasonable
legibility floor.

### F11 — Base-layer element styles are effectively dead
`theme.css:147-187` sets `h1`–`h4`, `label`, `button`, `input` defaults. Every
heading in the app overrides them with an explicit `text-*` class, so the base
layer governs almost nothing. It is not harmful, but it is a second, invisible
source of truth that will mislead the next person to touch typography.

### ✅ Done right — worth preserving
- `font-display: swap` on all eight `@font-face` blocks — no invisible-text flash.
- The `unicode-range` carve-out at `fonts.css:14` excludes U+1F1E6–1F1FF so the
  🇧🇭 flag renders in the system emoji font instead of tofu. That is a subtle,
  correct fix.
- `HEART_BUTTON_CLASS` and `BRAND_BUTTON_CLASS` (`App.tsx:23-35`) are already
  shared constants — the right pattern, just under-applied.

---

## 3. Typography categories (refined)

The brief's categories A–K are sound but leave gaps. Below is the working set,
with two additions (L, M) that the site demonstrably needs.

| # | Category | Purpose | Elements |
|---|---|---|---|
| A | **Logo / Wordmark** | The brand signature, one string | T01 |
| B | **Display Heading** | Page-owning headline, one per page | T11, T20, Order/Policy H1s |
| C | **Section Heading** | Divides a page into parts | Menu category H2, Order section H2s |
| D | **Feature Heading** | Promotional/editorial headline inside a section | T26 |
| E | **Navigation Text** | Wayfinding | T02, drawer links |
| F | **Body Text** | Running prose meant to be read | T13, T27, policy paragraphs, item descriptions |
| G | **Button Text** | Actionable controls | T09, T10, T25, T33 |
| H | **Input Text** | What the user types | T21–T24, T28, T31, T32, search |
| I | **Helper Text** | Quiet guidance next to a control | T34, cooldown/error messages |
| J | **Footer Text** | Footer links and utility | T36 |
| K | **Copyright Text** | Legal minimum line | T37 |
| **L** | **UI Label** _(new)_ | Uppercase tracked micro-label — the site's most-repeated style, currently rendered five inconsistent ways (see F6) | T12 (accordion title), category eyebrows, "Payment", "Back", "Sign out", policy sub-headings, "Last updated" |
| **M** | **Numeric / Price** _(new)_ | Money and quantities. Needs tabular figures so column-aligned prices line up, and must not be italic | all `formatBD()` output, subtotal, qty stepper, T06 cart badge |

Category M is the one the brief is missing that matters most — this is a
commerce site, and prices are currently rendered in proportional italic
Garamond.

---

## 4. Complete element inventory — current state

Every value below is read from the code, not inferred. Sizes are the computed
px value. "LS" = letter-spacing. Colour `muted` = `#888888` (fails AA, see F2).

### Header

| ID | Element | Location | Family | Weight | Size | LH | LS | Transform | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T01 | Logo "Mantel." | `App.tsx:315` | — | — | — | — | — | — | **PNG image**, `h-[26px]`; 21px in drawer (`:413`) |
| T02 | Language switcher | `App.tsx:334` | EB Garamond | 400 | 12px | 1.5 | 0.025em | none | flag glyph at 14px (`:333`) |
| T03 | Search icon | `App.tsx:355` | — | — | 17px | — | — | — | lucide, stroke 1.5 |
| T04 | Account icon | `App.tsx:368` | — | — | 17px | — | — | — | lucide, stroke 1.5 |
| T05 | Cart icon | `App.tsx:375` | — | — | 17px | — | — | — | lucide, stroke 1.5 |
| T06 | Cart badge | `App.tsx:377` | EB Garamond | 500 | **9px** | 15px | — | none | ⚠ F10 |
| T07 | Hamburger | `App.tsx:310` | — | — | 18×1px ×3 | — | — | — | 5px gap |

### Hero

| ID | Element | Location | Family | Weight | Size | LH | LS | Transform | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T08 | Heart artwork | `App.tsx:665` | — | — | `h-full` | — | — | — | `Logo-1.png.PNG` |
| T09 | "OUR STORY" | `App.tsx:673` | EB Garamond | 400 | 12px → 16px @sm | 1.5 | 0.16em | uppercase | source text is `Our Story` |
| T10 | "MENU" | `App.tsx:679` | EB Garamond | 400 | 12px → 16px @sm | 1.5 | 0.16em | uppercase | source text is `Menu` |

### FAQ

| ID | Element | Location | Family | Weight | Size | LH | LS | Transform | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T11 | FAQ heading | `App.tsx:960` | EB Garamond | 600 | **48px fixed** | 1 | — | none | ⚠ F7, F9 |
| T12 | FAQ question | `FaqAccordion.tsx:23` | EB Garamond | 400 | 13px | 1.5 | 0.08em | uppercase | Category **L** |
| T13 | FAQ answer | `FaqAccordion.tsx:29` | EB Garamond | 400 | 14px | 1.625 | — | none | `muted` ⚠ F2 |
| T14–T18 | further questions | `FaqAccordion.tsx:23` | — | — | — | — | — | — | same style as T12 |
| T19 | Toggle chevron | `FaqAccordion.tsx:24` | — | — | 16px | — | — | — | rotates 180° on open |

### Contact

| ID | Element | Location | Family | Weight | Size | LH | LS | Transform | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T20 | Contact heading | `App.tsx:865` | EB Garamond | 700 | `clamp(2.8rem, 8vw, 4.5rem)` | 1.05 | — | none | explicit `italic`; colour `#3a0d1e` ⚠ F7 |
| T21 | Name placeholder | `App.tsx:895` | EB Garamond | 400 | **14px** | 1.5 | — | none | ⚠ F3 |
| T22 | Email placeholder | `App.tsx:903` | EB Garamond | 400 | **14px** | 1.5 | — | none | ⚠ F3; label `Email *` |
| T23 | Phone placeholder | `App.tsx:915` | EB Garamond | 400 | **14px** | 1.5 | — | none | ⚠ F3 |
| T24 | Comment textarea | `App.tsx:925` | EB Garamond | 400 | **14px** | 1.5 | — | none | ⚠ F3; 5 rows |
| T25 | SEND button | `App.tsx:936` | EB Garamond | 400 | 14px | 1.5 | 0.16em | uppercase | source text `Send` |

### Newsletter

| ID | Element | Location | Family | Weight | Size | LH | LS | Transform | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T26 | Newsletter heading | `NewsletterSignup.tsx:47` | EB Garamond | 600 | 36px → 48px @md | 1 | — | none | the only correctly responsive heading |
| T27 | Description | `NewsletterSignup.tsx:50` | EB Garamond | 400 | 14px | 1.5 | — | none | `muted` ⚠ F2 |
| T28 | Email placeholder | `NewsletterSignup.tsx:68` | EB Garamond | 400 | **14px** | 1.5 | — | none | ⚠ F3 |
| T29 | Submit arrow | `NewsletterSignup.tsx:77` | — | — | 20px | — | — | — | lucide `ArrowRight` |

### Profile modal

| ID | Element | Location | Family | Weight | Size | LH | LS | Transform | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T30 | "Your details" | `App.tsx:558` | EB Garamond | 500 | 20px | 1.75 | — | none | signed-in variant at `:536` |
| T31 | Name input | `App.tsx:559` | EB Garamond | 400 | **14px** | 1.5 | — | none | ⚠ F3 |
| T32 | Email input | `App.tsx:568` | EB Garamond | 400 | **14px** | 1.5 | — | none | ⚠ F3 |
| T33 | SAVE button | `App.tsx:577` | EB Garamond | 400 | 14px | 1.5 | 0.16em | uppercase | source text `Save` |
| T34 | Helper text | `App.tsx:583` | EB Garamond | 400 | 11px | 1.5 | — | none | `muted` ⚠ F2 |

### Footer

| ID | Element | Location | Family | Weight | Size | LH | LS | Transform | Notes |
|---|---|---|---|---|---|---|---|---|---|
| T35 | Instagram icon | `App.tsx:256` | — | — | 20px | — | — | — | 18px in drawer (`:468`) |
| T36 | Terms and Policies | `App.tsx:282` | EB Garamond | 400 | 13px | 1.5 | — | none | `muted` ⚠ F2; popover items 14px (`:275`) |
| T37 | Copyright | `App.tsx:290` | EB Garamond | 400 | 13px | 1.5 | 0.025em | none | `muted` ⚠ F2 |

---

## 5. Inventory gaps

The brief calls T01–T37 a "Complete Website Element Inventory." It is not — it
covers the marketing surface but omits the entire commerce surface. These
elements also need category assignments before the system can be called
complete:

| Area | Missing elements | Location |
|---|---|---|
| Sidebar drawer | 5 nav links (24px), "order before you reach" subline (11px) | `App.tsx:423-457` |
| Menu page | 2 category pills, "← Back" link, category H2, item name / description / price | `App.tsx:713-741`, `MenuItemRow.tsx` |
| Order Before Reach | H1 "Order Before Reach", subline, 2 section H2s, "Your Bag" H2, subtotal row, "Payment" label, disabled card button, "Ordering Opens Soon", launch note | `App.tsx:757-850` |
| Cart drawer | "Your Bag" heading, empty state, subtotal, "Go to Order Before Reach" CTA | `App.tsx:610-649` |
| Cart line item | name, unit price, qty value | `CartLineItem.tsx` |
| Search panel | input, "No matches" message, result name / category / price | `App.tsx:481-519` |
| Account (signed in) | "Hi, {name}", email, explainer, "Sign out" | `App.tsx:536-546` |
| Policy pages | H1, "Last updated", section H2s, body paragraphs | `PolicyPage.tsx` |
| Locale popover | region line, "More regions…" note | `App.tsx:343-346` |
| Status / error | contact error, order error, cooldown, "Loading menu…", "Order received" | throughout |

**Roughly 35 further elements.** They all map cleanly onto categories A–M, which
is the argument for assigning by category rather than one element at a time.

---

## 6. Candidate typography layouts

Four viable systems. Each assumes the fixes in §2 are applied regardless of
which is chosen.

### Layout A — "Restore the brand" (3 families)

| Role | Family | Weights |
|---|---|---|
| A Logo, B Display | **Mantel-By-UglyDave-01** | 400 |
| C, D Headings | **EB Garamond** roman + italic accent | 400 / 600 |
| E–M everything else | **Inter** | 400 / 500 / 600 |

The bespoke face does what it was commissioned for — wordmark and page
headlines — Garamond keeps the editorial voice in section headings, and Inter
takes all UI, forms, prices, and prose. Needs EB Garamond roman cuts added, plus
Inter.

### Layout B — "Editorial single-serif" (1 family)

| Role | Family | Weights |
|---|---|---|
| Everything | **EB Garamond** roman as default, italic reserved for display and emphasis | 400 / 500 / 600 / 700 |

Closest to today. Fixes F1 by making roman the default and demoting italic to an
accent. One family, smallest payload, but hierarchy still rests entirely on size
and weight, and Garamond's small sizes are weak for UI and price columns.

### Layout C — "Deck-faithful" (3 families)

| Role | Family | Weights |
|---|---|---|
| A Logo | **Cormorant Garamond** Light | 300 |
| B, C, D Headings | **Playfair Display** | 400 |
| E–M | **Inter** | 300 / 400 |

Exactly what `brand-assets/mantel_brand_identity*.html` specifies. Its weakness
is that the deck itself is internally contradictory — it names Cormorant
Garamond Light for the wordmark while describing the wordmark as "chunky
hand-drawn marker with rounded stroke endings," which is the Mantel-By-UglyDave
face, not Cormorant. Following the deck literally means shipping a wordmark that
contradicts the deck's own description.

### Layout D — "Serif display + neutral UI" (2 families)

| Role | Family | Weights |
|---|---|---|
| A, B, C, D | **EB Garamond** roman + italic accent | 400 / 600 |
| E–M | **Inter** | 400 / 500 / 600 |

Layout A minus the bespoke face. Two families, clean split, lowest maintenance.
Leaves the commissioned typeface unused and the wordmark as a PNG.

---

## 7. Scoring

Scored 1–5 against the brief's eight criteria. Higher is better.

| Criterion | A | B | C | D |
|---|---|---|---|---|
| 1. Visual hierarchy | 5 | 2 | 4 | 4 |
| 2. Readability | 5 | 3 | 4 | 5 |
| 3. Premium feel | 5 | 4 | 4 | 4 |
| 4. Brand consistency | 5 | 3 | 2 | 3 |
| 5. Mobile responsiveness | 4 | 4 | 4 | 5 |
| 6. Accessibility | 5 | 3 | 4 | 5 |
| 7. Conversion usability | 5 | 2 | 4 | 5 |
| 8. Modern design standards | 5 | 3 | 3 | 4 |
| **Total (/40)** | **39** | **24** | **29** | **35** |

Rationale on the cells that decide it:

- **Hierarchy** — B scores 2 because one family with no roman/italic contrast is
  exactly today's problem restated; size and weight alone cannot separate five
  heading levels.
- **Brand consistency** — A scores 5 because it is the only layout that uses the
  typeface the business commissioned and paid for. C scores 2 despite matching
  the deck, because the deck contradicts itself (see §6C) and contradicts both
  other spec sources.
- **Conversion usability** — B scores 2: prices, quantities, and form fields stay
  in proportional italic Garamond, which is the worst case for a checkout. A, C,
  D all move numerics to Inter with tabular figures.
- **Mobile** — D edges A because it loads one fewer family; A's third family is a
  78 KB single-weight display face used for roughly six strings, which is a
  modest cost, not a free one.

### Recommendation: **Layout A**, with **D** as the fallback

Layout A wins on the criteria the brief weights most heavily and is the only
option that resolves the brand-asset question instead of deferring it. If the
team decides three families is one too many to maintain, **D** is the clean
retreat — it keeps every accessibility and commerce fix and only gives up the
bespoke wordmark, which can be added later without touching any other token.

**Do not adopt C.** It is the only layout that would require re-litigating the
brand deck first.

---

## 8. Token implementation (apply after §7 is signed off)

This is the concrete code for **Layout A**. It is deliberately not yet applied.

### 8.1 Prerequisites

1. Add **EB Garamond roman** cuts — `Regular`, `SemiBold` (400, 600).
2. Add **Inter** — 400, 500, 600.
3. Subset all faces to Latin + used punctuation and convert to **WOFF2** (F4).
   Keep the `unicode-range` emoji carve-out from `fonts.css:14`.
4. Register `Mantel-By-UglyDave-01.otf` — convert to WOFF2 as well.
5. Confirm the TYPEHEIST licence covers **web embedding**, not desktop only.
   ⚠ This is a blocking legal check before Layout A ships.

### 8.2 Family tokens — `src/styles/fonts.css`

```css
:root {
  --font-brand:   "Mantel", "EB Garamond", Georgia, serif;
  --font-display: "EB Garamond", Georgia, serif;
  --font-ui:      "Inter", system-ui, -apple-system, "Segoe UI", sans-serif;
  --font-emoji:   "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji";
}
```

### 8.3 Scale, tracking, line-height — `src/styles/theme.css`

```css
:root {
  /* Scale — fluid where the element owns a page */
  --text-display-xl: clamp(2.75rem, 8vw, 4.5rem);   /* B  page headline      */
  --text-display-lg: clamp(2rem, 5.5vw, 3rem);      /* D  feature headline   */
  --text-heading-md: 1.5rem;                        /* C  section / nav      */
  --text-heading-sm: 1.25rem;                       /* modal + drawer titles */
  --text-body-lg:    1rem;                          /* H  inputs — see F3    */
  --text-body:       0.9375rem;                     /* item names            */
  --text-body-sm:    0.875rem;                      /* F  prose, G buttons   */
  --text-label:      0.75rem;                       /* L  uppercase label    */
  --text-caption:    0.6875rem;                     /* I/K helper, copyright */

  /* Tracking — one label value replaces the five in F6 */
  --tracking-display: -0.01em;
  --tracking-heading:  0;
  --tracking-body:     0;
  --tracking-label:    0.14em;
  --tracking-button:   0.14em;

  /* Line height */
  --leading-display: 1.05;
  --leading-heading: 1.2;
  --leading-body:    1.6;
  --leading-ui:      1.5;
  --leading-label:   1.4;

  /* Fixes from §2 */
  --font-size: 100%;              /* F8 — was 16px            */
  --muted-foreground: #767676;    /* F2 — was #888888, 4.54:1 */
}
```

### 8.4 Tailwind v4 theme bridge — `src/styles/theme.css`

```css
@theme inline {
  --font-brand:   var(--font-brand);
  --font-display: var(--font-display);
  --font-ui:      var(--font-ui);
  --font-sans:    var(--font-ui);   /* the sensible default */
}
```

This makes `font-brand`, `font-display`, and `font-ui` real, distinct
utilities — unlike today, where all three resolve to the same face (§1.1).

### 8.5 Numeric handling — Category M

```css
.tabular { font-variant-numeric: tabular-nums; font-style: normal; }
```

Apply to every `formatBD()` output, the subtotal, the qty stepper value, and the
cart badge, so price columns align and no money renders in italic.

### 8.6 Per-category responsive spec

| Cat | Family | Weight | Desktop | Tablet ≤1024 | Mobile ≤640 | LH | LS | Transform |
|---|---|---|---|---|---|---|---|---|
| A Logo | brand | 400 | 28px | 26px | 22px | 1 | 0.02em | none |
| B Display | display | 600 | 72px | 56px | 44px | 1.05 | −0.01em | none |
| C Section | display | 600 | 24px | 24px | 20px | 1.2 | 0 | none |
| D Feature | display | 600 | 48px | 40px | 32px | 1.1 | −0.01em | none |
| E Nav | ui | 500 | 24px | 24px | 22px | 1.3 | 0 | none |
| F Body | ui | 400 | 15px | 15px | 15px | 1.6 | 0 | none |
| G Button | ui | 600 | 14px | 14px | 14px | 1.5 | 0.14em | uppercase |
| H Input | ui | 400 | 15px | 16px | **16px** | 1.5 | 0 | none |
| I Helper | ui | 400 | 12px | 12px | 12px | 1.5 | 0 | none |
| J Footer | ui | 400 | 13px | 13px | 13px | 1.5 | 0 | none |
| K Copyright | ui | 400 | 12px | 12px | 12px | 1.5 | 0.02em | none |
| L UI Label | ui | 500 | 12px | 12px | 12px | 1.4 | 0.14em | uppercase |
| M Numeric | ui `tnum` | 500 | 14px | 14px | 14px | 1.5 | 0 | none |

The **16px minimum on Category H at tablet and mobile is non-negotiable** — it
is the fix for F3.

---

## 9. Suggested sequencing

The fixes are independent of the layout decision. Do the first group now.

**Now — no design decision required, low risk:**
1. F2 — `--muted-foreground` → `#767676`.
2. F3 — inputs to 16px at ≤1024px.
3. F8 — root `font-size` → `100%`.
4. F10 — cart badge 9px → 11px.
5. F4 — subset + WOFF2 the existing files (~1.72 MB → ~150 KB).

**After the team picks a layout (§7):**
6. Add the missing font files, register the token set (§8).
7. Migrate elements category by category, starting with L (one tracking value
   replacing five) and M (prices out of italic).
8. Reconcile F7 — one display-heading treatment, and retire `#3a0d1e` or promote
   it to a named palette token.
9. Replace the wordmark PNG with live text (F5) — Layout A only.
10. Delete the dead base-layer rules in `theme.css:147-187` (F11).

---

## 10. Open questions for the team

1. **Licence** — does the TYPEHEIST licence for Mantel-By-UglyDave permit web
   embedding? Blocking for Layout A.
2. **Italic** — is site-wide italic a deliberate brand decision or an artifact of
   only the italic files being available? Ships in every layout as an accent
   either way, but the answer changes how far it extends.
3. **`#3a0d1e`** — is the Contact heading plum an intended brand colour, or a
   leftover? It appears once, at `App.tsx:867`.
4. **The brand deck** — should
   `brand-assets/mantel_brand_identity*.html` be updated to match the chosen
   layout, or is it superseded? Right now it is a fourth conflicting spec.
5. **"Our Story"** — the hero CTA routes to the Contact page (`App.tsx:674`).
   Flagged in `PROJECT-STATUS.md` as a likely bug; noted here because it affects
   what T09 should say.
