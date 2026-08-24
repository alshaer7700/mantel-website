# Mantel Website Production Demo

## Purpose

This document demonstrates the `mantel-website-production` workflow on the selected Mantel Coffee storefront repository. The demo preserves the existing Vite + React application and strengthens representative, user-visible flows rather than replacing the app.

## Demo examples

| Example | What it demonstrates | Verification state |
|---|---|---|
| Live search → menu category | A real search overlay with live Supabase-backed menu data, no-results handling, and routeable result selection | Verified with `Americano` → `/menu/coffee` |
| Retail → cart → pickup checkout | Server-hydrated product identity, local cart persistence, quantity controls, subtotal calculation, and an explicit cash-at-counter checkout path | Verified through checkout form; no order submitted |
| Newsletter signup | Secure RPC-backed signup with email validation, honeypot defense, cooldown protection, loading feedback, and safe async error messaging | Verified native validation and backend-unavailable error state with synthetic QA data |
| Editorial contact route | Deep-linkable route with required-field validation, visible field labels, and safe form state handling | Verified empty-submit validation |
| Accessibility shell | Skip link, explicit dialog relationships, expanded-state attributes, modal semantics, and keyboard-visible focus styling | Verified in rendered DOM and browser interaction |

## Verified

The production build passes TypeScript checking, Vite bundling, and whitespace validation. The browser preview rendered the homepage, `/objects`, `/contact`, and the deep-linked `/menu/coffee` route with the real public Supabase client configuration. The menu loaded live catalog content including Coffee items and prices in Bahraini dinar. The Retail route loaded its live-backed catalog and enabled the Add to bag controls only after backend identity hydration completed.

The search overlay opened from the header, displayed live browse categories and menu items, filtered `Americano`, and routed the selected result to `/menu/coffee`. The Retail route added Matcha Powder to the bag, updated the header badge to one item, opened the cart drawer, rendered the subtotal, and exposed the pickup checkout form. The checkout form was opened and then closed without submitting an order.

The newsletter form blocked an invalid address with native browser validation. A synthetic valid address using the `.invalid.example` domain reached the backend boundary and rendered the safe error message, “Couldn’t reach us just now. Check your connection and try again.” No real newsletter or contact record was created by the QA run, and no order was submitted. The Contact route blocked an empty submit at the required field boundary.

## Issues

The local preview initially rendered blank because the repository intentionally throws when `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` is absent. The preview was corrected with a sandbox-only `.env.local` using the Mantel project’s public client configuration; this file remains ignored and is not part of the commit.

The browser automation viewport used for interactive verification was 896 × 900. A separate shell-level headless screenshot attempt could not reach the browser’s localhost namespace, so the attached visual artifacts are the browser-generated previews rather than the failed shell screenshots. Production deployment still requires the real public environment variables in the hosting provider.

## Fixes applied

The homepage newsletter form now uses the existing `subscribeNewsletter` RPC wrapper instead of a local-only success toggle. It has an accessible email label, a bounded input, a hidden honeypot, a 30-second client cooldown, disabled sending state, role-based success and error feedback, and safe mapping of backend errors.

The app shell now includes a skip-to-content link. Header controls expose `aria-expanded` and `aria-controls`, while the mobile navigation, search overlay, account panel, and cart drawer have stable identifiers. The cart drawer is marked as a modal dialog, and the new focus-visible rules keep keyboard navigation visible without changing the editorial visual language.

## Remaining ambiguity

A live payment gateway is not present in this repository. The verified checkout path is intentionally limited to pickup with payment at the counter, and the QA run did not create a real order. The menu’s hidden items that lack prices remain unavailable by design until the owner publishes authoritative prices. A final production deployment check should be run against the hosting provider’s configured environment variables and the deployed domain.

## Commands run

| Check | Result |
|---|---|
| `npm install --no-audit --no-fund` | Pass |
| `npm run typecheck` | Pass |
| `npm run build` | Pass |
| `git diff --check` | Pass |

## Artifacts

- `home-desktop.webp` — browser-rendered homepage
- `search-open.webp` — search overlay open
- `search-to-menu.webp` — live result routed to `/menu/coffee`
- `cart-open.webp` — live cart drawer with one item
- `newsletter-error.webp` — safe async newsletter error state
