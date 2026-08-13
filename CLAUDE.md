# MANTEL website

Coffee shop site for Mantel (Muharraq, Bahrain). Browse the menu, order for
pick-up.

## Stack

**Vite + React 18 + Tailwind v4 + Supabase**, deployed on Netlify.

This is a Figma Make export, so it can look Next.js-shaped at a glance — it
isn't. There is no App Router, no `app/layout.tsx`, and no `next/font`.

- Entry: `index.html` → `src/main.tsx` → `src/app/App.tsx` (single-file page
  router driven by a `page` state variable, not a routing library)
- Styles: `src/styles/index.css` imports `fonts.css` → `tailwind.css` →
  `theme.css`. Design tokens and base typography live in `theme.css`.
- Data: `menu_items` in Supabase, read through `src/lib/supabaseClient.ts`
- Build: `npm run build` → `dist`. Needs `VITE_SUPABASE_URL` and
  `VITE_SUPABASE_ANON_KEY` (set in the Netlify UI; locally use a gitignored
  `.env.local`) or the client throws at import time.

## Typography

**Read `guidelines/FONTS.md` before changing any font.** It documents the
one-place wiring (`--font-app` → `--font-sans` in `@theme inline`), the emoji
`unicode-range` fix that keeps flag emoji from being swallowed by the webfont,
how the italic-as-default setup works, and how to verify a change locally.

Current face: EB Garamond Italic, self-hosted from `src/assets/fonts/`.

## Sandbox notes

Outbound requests to `netlify.app` and `supabase.co` are blocked by the proxy
(403 / `ERR_TUNNEL_CONNECTION_FAILED`), so deploy previews can't be loaded and
the app can't reach Supabase from inside a session. Verify by building and
serving `dist/` locally with the preinstalled Chromium
(`/opt/pw-browsers/chromium`); use the Supabase MCP tools to inspect data.

Deploy-preview URLs inject a Netlify collaboration bar at the bottom of the
page — a gray band that is not part of this site.
