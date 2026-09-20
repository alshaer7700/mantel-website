# Changing the site typeface

Runbook for swapping the font used across the whole site. Written after the
EB Garamond Italic migration (PRs #1 and #2) so the next change doesn't have
to rediscover any of this.

## Stack facts you need first

- **This is Vite + React 18 + Tailwind v4.** It is *not* Next.js, despite the
  Figma Make export having some Next-ish shape. There is no `app/layout.tsx`
  and `next/font` does not exist here — don't reach for it.
- Fonts are **self-hosted**, not loaded from Google Fonts. Files live in
  `src/assets/fonts/` and Vite hashes/bundles them automatically.
- Styles entry is `src/styles/index.css`, which imports, in order:
  `fonts.css` → `tailwind.css` → `theme.css`.

## The three files that matter

Everything font-related lives in exactly three places. Don't touch components.

> **This section was rewritten after the Space Grotesk migration.** It used to
> describe a single `--font-app` variable defined in `fonts.css`. That variable
> no longer exists: the stacks moved to `tokens.css` so every custom property
> lives in one file, and the site now carries three faces with three distinct
> jobs rather than one face for everything.

### 1. `src/styles/fonts.css` — the fonts themselves

`@font-face` rules only, next to the files they load. Always
`font-display: swap`.

### 2. `src/styles/tokens.css` — the stacks

`--font-grotesk` (Space Grotesk — everything), `--font-serif` (EB Garamond —
the wordmark only), `--font-mono` (Fira Mono — the staff dashboard only), and
`--font-emoji`, which sits LAST in all three stacks so a flag or symbol glyph
falls through to the system emoji font instead of a random face.

### 3. `src/styles/theme.css` — the wiring

Inside `@theme inline`, each stack is republished as a Tailwind utility
(`font-grotesk`, `font-serif`, `font-mono`), and:

```css
--font-sans: var(--font-grotesk);
```

`--font-sans` is the important one: Tailwind v4 feeds it into
`--default-font-family`, which is what unstyled body text, buttons and inputs
inherit. Point it at the wrong stack and every unstyled element on the site
changes face.

## Procedure

1. Drop the font files in `src/assets/fonts/` with clean names
   (`FamilyName-Weight.ttf`). WOFF2 is preferred if available — roughly half
   the size of TTF.
2. Rewrite the `@font-face` blocks in `fonts.css` for the weights you actually
   need. Always `font-display: swap`.
3. Update `--font-app` in `fonts.css` with the new family name plus fallbacks.
4. Leave `theme.css` alone — it already points at `--font-app`.
5. Build and verify (see below).

**Do not** change font sizes, weights, line heights, or letter spacing while
doing a font swap. Those live in `theme.css` under `@layer base` and are a
separate concern.

## Gotchas that cost real time

### Emoji get hijacked by the font

EB Garamond ships its own glyphs for the regional-indicator codepoints
(U+1F1E6–U+1F1FF) that flag emoji are built from — dashed boxes with letters
in them. Because the webfont is first in the stack and *has* those glyphs, the
browser used them, and the 🇧🇭 in the nav locale pill rendered as boxed "B H".

The fix, kept in `fonts.css`, is on **every** `@font-face` rule:

```css
unicode-range: U+0000-1F1E5, U+1F200-10FFFF;
```

plus emoji fonts appended to the fallback stack in `--font-app`. If you swap
fonts, **carry both of these over** — most text fonts have this problem.

Check any new font with:

```python
from fontTools.ttLib import TTFont
cmap = TTFont('path/to/font.ttf').getBestCmap()
print(sum(1 for c in cmap if 0x1F1E6 <= c <= 0x1F1FF))  # >0 means you need the unicode-range
```

### Checking a new face for the emoji problem — worked example

Space Grotesk was checked this way before it shipped, and came back clean
(0 regional-indicator glyphs), which is why its `@font-face` rule carries no
`unicode-range`:

```python
from fontTools.ttLib import TTFont
f = TTFont('src/assets/fonts/SpaceGrotesk-Variable.woff2')
cmap = f.getBestCmap()
print(sum(1 for c in cmap if 0x1F1E6 <= c <= 0x1F1FF))   # 0 → no range needed
print('variable:', 'fvar' in f)                           # True
feats = {r.FeatureTag for r in f['GSUB'].table.FeatureList.FeatureRecord}
print('tnum:', 'tnum' in feats)                           # True → tabular figures
```

`tnum` is worth checking on any replacement: it is what lets prices and order
references line up without a second, monospaced family.

### Variable fonts from Google's css2 endpoint

The css2 response lists each weight you asked for as its own `@font-face` rule.
If the `src:` url is **the same** across those rules, the face is variable and
the file answers the whole range — register it once with
`font-weight: 300 700` rather than three times. Space Grotesk is like this.

### Making an italic font the default

The site currently uses EB Garamond *Italic* as the everyday face. To do that
without touching a single component, each italic file is registered **twice**:
once under `font-style: normal` (so all normal text renders italic) and once
under `font-style: italic` (so the one `italic`-classed element in App.tsx
doesn't get a synthetic slant applied on top of an already-italic face).

If you move to a normal upright font, collapse those back to single
declarations.

### Script coverage

The site is English-only in the codebase today — there is **no Arabic text
anywhere** in `src/`, `public/`, or the Supabase `menu_items` rows. EB Garamond
has no Arabic glyphs, and neither did the fonts it replaced, so nothing
regressed. **If Arabic content is ever added, a companion Arabic face is
required** (Noto Naskh Arabic pairs well with a Garamond); otherwise it falls
back to whatever the browser picks.

### CSP

`public/_headers` carries the CSP that Netlify serves. Self-hosted fonts need
`font-src 'self'`, which is already present. There are no Google Fonts entries
left to remove; the copy that still had them lived in `vercel.json`, deleted
when the site consolidated onto Netlify.

## Verifying a font change

### Build + inspect the compiled CSS

```bash
npm run build
grep -oE -- "--default-font-family:[^;]+" dist/assets/*.css   # should resolve to var(--font-app)
grep -c "@font-face" dist/assets/*.css                        # matches the number you declared
grep -o "googleapis\|OldFontName" dist/assets/*.css           # should find nothing
```

Note: the build needs `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` or
`supabaseClient.ts` throws. On Netlify these are set in the UI. Locally,
create a gitignored `.env.local` (any dummy value works for a font-only build).

### Look at it in a real browser

Chromium and Playwright are preinstalled in the Claude Code sandbox:

```bash
cd dist && python3 -m http.server 8123 &
# then, with playwright-core installed in a scratch dir:
chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
```

Useful checks: screenshot the nav, and read back
`getComputedStyle(el).fontFamily` on a flag-emoji element.

**Outbound network is blocked in the sandbox** for `netlify.app` and
`supabase.co` (proxy returns 403 / `ERR_TUNNEL_CONNECTION_FAILED`). So you
cannot load the deploy preview or fetch menu data from inside a session —
verify locally against `dist/` instead, and use the Supabase MCP tools to
check data.

## Deploying

Netlify builds `main` automatically (`npm run build` → `dist`, see
`netlify.toml`). Production URL is
https://curious-madeleine-fa7fed.netlify.app

**Deploy-preview URLs (`deploy-preview-N--*.netlify.app`) inject a Netlify
collaboration bar at the bottom of the window.** It shows up as a full-width
gray band, sometimes with a broken-image or spinner icon (the site's CSP
blocks its external images). It is *not* a bug in the site and visitors never
see it — check the production URL before chasing it.
