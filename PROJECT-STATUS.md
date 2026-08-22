# MANTEL Website — Project Status & Handoff

_Last updated: 4 July 2026. Written for continuing work in a new Claude Code chat._

## What this project is
Café website for **Mantel Coffee (Bahrain)**, exported from Figma Make.
- **Location:** `/Users/nayefalshaer/Downloads/MANTEL/`
- **Stack:** Vite 6 + React 18 + Tailwind 4. Almost all app code lives in **one file: `src/app/App.tsx`**.
- **Figma source:** https://www.figma.com/design/9MFmarDgTs8SuZDGBd3epf/MANTEL

## How to run it
```bash
cd /Users/nayefalshaer/Downloads/MANTEL
npm run dev        # dev server → http://localhost:5173
npm run build      # production bundle → dist/ (deploy this folder to go live)
```
⚠️ Never open `index.html` directly from Finder (`file://`) — it's a Vite app and shows a blank page without the server.

## Key files
| File | What it holds |
|---|---|
| `src/app/App.tsx` | The whole site: nav, sidebar, search, cart, account, home/menu/contact pages, prices |
| `src/styles/theme.css` | Colors + font variables (`--font-display`, `--font-body`, blush `#f2a8c4`) |
| `src/styles/fonts.css` | Google Fonts import + `@font-face` for the Mantel brand font |
| `src/assets/` | `Mantel-By-UglyDave-01.otf` (active) and `-02.otf` (unused) |
| `src/imports/Logo-1.png.PNG` | The red heart on the home page |

## Everything done in this session
1. **Built & ran the site** — installed deps, dev server on port 5173, production build passing.
2. **Replaced the heart image** with the new artwork from `~/Downloads/HEART.zip` (downscaled 5788px → 2000px).
3. **Brand font** — added `@font-face "Mantel"`; now using **Mantel-By-UglyDave-01.otf** for the ENTIRE site (display + body). Figtree is the fallback.
4. **Nav/sidebar changes** — sidebar links restyled in brand font; added **"Pick Up — order before you reach"** nav item (goes to menu).
5. **Footer** — now reads **© 2026, Mantel** in brand font (shared component, all pages).
6. **Functional Search** — panel under nav, live-filters all menu items, result click jumps to the right menu category, Esc closes.
7. **Functional Cart** — "+" buttons on menu items, badge count on bag icon, right-side "Pick Up" drawer with qty +/-, subtotal, and **Order for Pick Up** (submits order via FormSubmit). Persists in `localStorage` (`mantel-cart`).
8. **Functional Account** — panel saving name+email to `localStorage` (`mantel-profile`); greets user, pre-fills contact form and orders; sign-out clears it.
9. **Functional Send (contact form)** — POSTs to `https://formsubmit.co/ajax/naiffuad31@gmail.com` with sending/success/error states. Orders use the same endpoint (subject "MANTEL pick-up order").
10. **Currency → Bahraini Dinar** — all prices are now `BD x.xxx` (3 decimals/fils), converted to realistic Bahrain café prices; cart math updated.

## ⚠️ Action items for the owner
- [ ] **Activate FormSubmit:** check naiffuad31@gmail.com for an email from FormSubmit and click the activation link. Until then, form/order submissions return success but are NOT delivered.
- [x] **Real menu loaded** — the invented placeholder items (Mantel Latte, Crimson Cortado …) are gone. `supabase/006` adds the five real headings (Coffee, Not Coffee, Aqua, Sandwiches, Desserts) plus ingredient and nutrition columns; `supabase/007` loads the actual items. Both still need applying in the Supabase SQL editor.
- [ ] **Confirm eleven missing prices** — Spanish Latte, Latte / Cappuccino, Salted Cardamom Latte, Salted Caramel Latte, V60, Cold Brew, Water, Sparkling Water, Cinnamon Bun, Crêpe and Waffle were cropped out of the source menu. They are loaded but hidden (`is_available = false`), so they do not appear on the site until a price is set. Publish one with:
  `update public.menu_items set price = 2.400, is_available = true where name = 'Spanish Latte';`
- [ ] **Fill in ingredients and nutrition** — every item currently has an empty description and no calorie/macro figures, so the menu shows names and prices only. Filling `description`, `ingredients`, `calories`, `protein_g`, `carbs_g` and `fat_g` makes a row tap-to-expand on the site; a row with no data stays a plain line.
- [x] Instagram links point to the real profile (`https://www.instagram.com/bymantel/`).

## Ideas / not yet done
- Real "Our Story" page (the home OUR STORY button currently goes to Contact — likely a leftover to fix).
- Move project out of `~/Downloads` into `~/Documents/PROJECTS/`.
- Deploy `dist/` (Netlify/Vercel) when ready to go live.
- Menu item photos, opening hours, location/map section.

## Environment notes
- Preview/dev server config saved in the WORK AREA `.claude/launch.json` as `mantel-figma`.
- VS Code: use `open -a "Visual Studio Code" <folder>` or install the `code` shell command (⌘⇧P → "Install 'code' command in PATH").
- There is a SEPARATE older "mantel-website" project and a Sevenly Heart project in `~/Documents/PROJECTS/` — this Figma export is the current one.
