# Mantel design system rules

These rules are drawn from the live website's own code (`src/styles/tokens.css`,
`src/styles/margiela.css`) and apply to **everything**: the public site and
the staff dashboard (`src/admin/admin.css`). The dashboard is a tool, so it is
allowed larger hit targets and more status colour — but it speaks the same
visual language. When in doubt, look at the cart drawer and the newsletter
form on the home page: they are the site's most "tool-like" surfaces.

## 1. Colour

| Token | Value | Use |
|---|---|---|
| paper | `#F6F5F2` | the ground, everywhere |
| card surface | `#FCFBF9` | raised panels (checkout summary, dashboard cards) |
| ink | `#171310` | all primary text, primary buttons, active states |
| ink muted | `#766E66` | secondary text, labels, captions (the AA-passing muted) |
| line | `#D9D4CB` | section hairlines, card and input borders |
| line soft | `#E8E4DC` | row dividers inside a list |
| brand (heart red) | `#9A1C1F` | accents only: errors, alerts, the cart badge, focus rings |

- The red is **never** a button fill, a background or a hover state. It marks
  something that needs attention.
- There is no gradient, no shadow on flat content, no pure white and no pure
  black.
- The website is light-only. The dashboard may offer a dark mode for the bar
  at night, but **light is the default**.

## 2. Type

Two families, both self-hosted (`src/styles/fonts.css`):

- **EB Garamond** — the voice. Page and section titles, weight 500,
  letter-spacing `-0.035em`, line-height ~1. Body copy at 17–18px.
- **Fira Mono** — the apparatus. Every label, overline, button, nav item,
  badge, price column and form field: 10–12px, weight 500, UPPERCASE,
  letter-spacing `0.08em–0.12em`.

Rules:
- Overline above every title: mono, uppercase, muted, e.g. `01 — Orders`.
- Titles end with a full stop on the website ("Objects.", "About Us."); the
  dashboard keeps that for page titles.
- Numbers that line up use `font-variant-numeric: tabular-nums`.
- Prices print with three decimals: `BD 1.500`.
- Arabic: no uppercase and no letter-spacing (they break Arabic script); the
  system Arabic face takes over automatically because neither family has
  Arabic glyphs.

## 3. Shape and space

- **Square corners.** Radius is `0` for buttons, inputs, cards, drawers and
  badges. The only round things are status dots.
- **Hairlines, not boxes.** Separate with 1px `line` rules. Lists are rows
  divided by `line soft`.
- Spacing steps: 8, 16, 24, 40, 64, 96px. Gutter: `clamp(20px, 5vw, 80px)`.

## 4. Components

| Component | Rule |
|---|---|
| Primary button | ink fill, paper text, mono uppercase 10–11px, square, hover = opacity 0.82 |
| Secondary button | transparent, 1px `line` border, muted text; hover = ink border + ink text |
| Text link | mono uppercase with a trailing `↗` (outbound) or `→` (onward); hover = opacity 0.56 |
| Input | ruled, not boxed: transparent, no radius, 1px ink **bottom** border; 16px so iOS doesn't zoom |
| Textarea | 1px `line` border all round, square |
| Label | mono uppercase 10px, muted, `0.12em` tracking |
| Focus ring | 2px heart red, offset 4–5px |
| Badge | mono uppercase 10px, square, 1px border; state colour only when it means something |
| Drawer / panel | paper ground, hairline edge, header with mono overline + serif title |
| Nav | mono uppercase 10–11px, hover = opacity; the wordmark "Mantel." in serif with a tiny mono line under it |

## 5. Status colour (dashboard only)

State is always carried by **words and colour together**, never colour alone:

| State | Colour |
|---|---|
| good / on the website | muted green `#3E5E3F` on `#E7EDE4` |
| waiting / sold out | ochre `#7A5200` on `#F6EDD8` |
| needs attention / error | heart red `#9A1C1F` on `#F4E6E4` |
| neutral / hidden / archived | ink muted on paper |

## 6. Voice

- Plain words a café manager would use: "Hidden", "Sold out today",
  "On the website" — never "is_available = false".
- Buttons say exactly what happens: "Save changes", "Mark ready".
- Errors say what went wrong and what to do next.
