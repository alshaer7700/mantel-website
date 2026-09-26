# MANTEL — Security Audit & Production Roadmap

_Audit date: 10 July 2026. Based entirely on the code in this folder and the SQL in `supabase/`. No code was changed._

---

## 0. What the project actually is today

A Vite 6 + React 18 single-page café site (one main file, `src/app/App.tsx`, ~950 lines) with:

| Area | State |
|---|---|
| Menu browsing | **Working** — loaded from Supabase `menu_items` (read-only RLS) |
| Search | **Working** — client-side filter of loaded menu |
| Cart | **Working** — localStorage, UI only |
| Pick-up ordering | **Built but gated** — `place_order` RPC exists and is live; the UI button is disabled ("Ordering Opens Soon") |
| Payments | **Not built** — `payment_method` column exists; card-only UI stub |
| Contact / newsletter | **Working** — Supabase RPC → Edge Function + Resend → `hello@bymantel.com` (FormSubmit removed, see H-2) |
| Accounts | **Local-only** — name+email in localStorage; no real auth |
| Admin | **None** — menu/orders managed via Supabase dashboard |
| Legal pages | **Done** — Privacy / Terms / Refund / FAQ, PDPL-aware |
| Deployment | **Not deployed** — `dist/` builds; no host chosen |
| Version control | **None** — project has no git repo of its own |

Security posture is already better than typical for this stage: migration `003_secure_order_placement.sql` replaced client-priced inserts with a server-priced, SECURITY DEFINER `place_order()` RPC (`search_path` pinned, quantities/lengths validated, atomic), revoked default table grants, and left orders/order_items with **no** anon-readable policies. That was the biggest structural risk and it is handled — **provided 003 is actually applied to the live project** (see C-1).

---

## 1. Security Audit Report

### Critical

**None open.** The one structural critical (client-priced anon inserts into `orders`/`order_items`, plus Supabase-default `GRANT ALL` drift on the live DB) was fixed by `003_secure_order_placement.sql`, which was **applied to the live project and verified on 2026-07-10** (RPC responds; direct anon inserts denied; menu still readable). Keep 003 in version control (see M-5) — on any fresh database, `schema.sql` alone recreates the insecure policies, so the apply order schema → 002 → 003 → 004 → 005 must be preserved.

### High

**H-1 · `place_order` is publicly callable right now, with no rate limiting or bot protection.**
- The "Ordering Opens Soon" button is disabled **client-side only**. Anyone with the anon key (it ships in the JS bundle — that's normal and by design) can call the RPC today and insert unlimited orders. When ordering goes live, bots can flood the kitchen with fake orders.
- **Impact:** DB bloat now; operational chaos + fake-order denial of service at launch.
- **Fix (now):** `revoke execute on function public.place_order from anon, authenticated;` until launch. **Done** in `004_pre_launch_lockdown.sql`.
- **Fix (at launch):** re-grant, fronted by abuse protection — either Cloudflare Turnstile verified inside a Supabase Edge Function that then calls the RPC, or at minimum a per-email/per-interval check inside the function (e.g. reject >3 orders per email per 10 min).
- **Partially done:** `005_order_rate_limit.sql` adds the in-function half — >3 per email / >6 per IP / >60 total, each per 10 min, rejected with SQLSTATE `PT429` (PostgREST → HTTP 429). The per-IP and global limits exist because `customer_email` is nullable: per-email alone is bypassed by omitting the email. IP comes from `cf-connecting-ip`, falling back to the **last** `x-forwarded-for` element (the first is client-controlled and would be a one-header bypass). Counts read committed orders, not attempts — a rejection rolls its own transaction back, so attempts cannot be recorded without an autonomous transaction.
- **Still open — this does not close H-1.** A distributed bot with fresh IPs and fresh emails still lands 60 orders per 10-minute window (verified). The acceptance test below is only met by the Turnstile/Edge Function route; the in-function limits are defence in depth for when the RPC is called directly, and they hold whether or not the Edge Function is bypassed.
- **Priority:** High · **Effort:** Low (revoke) / Medium (Turnstile) · **Acceptance:** RPC call from a bare script fails without a valid captcha token.

**H-2 · Owner's personal Gmail + `_captcha: "false"` shipped in the public bundle.**
- `CONTACT_ENDPOINT` embeds `naiffuad31@gmail.com` in cleartext in the built JS, and every FormSubmit call disables FormSubmit's captcha. Harvesters will find the address; anyone can spam the inbox through the endpoint at zero cost.
- **Impact:** inbox spam/flooding, owner email exposure, and (combined with the client-side order email, M-1) fake "order received" emails.
- **Fix:** use FormSubmit's **random alias** endpoint instead of the raw address (FormSubmit issues one after activation), and remove `_captcha: "false"` (or set `_captcha: "true"`) at least on the newsletter and contact forms. Longer term, replace FormSubmit with a Supabase Edge Function + Resend (keeps the address server-side and adds rate limiting).
- **Priority:** High · **Effort:** Low (alias swap) · **Acceptance:** built `dist/` bundle contains no `@gmail.com` string.
- **Resolved.** FormSubmit and `CONTACT_ENDPOINT` are gone from `src/` entirely — confirmed no `naiffuad`/`formsubmit` string remains anywhere in the app source. The contact form now posts to the `submit_contact_message` RPC, which notifies server-side via `supabase/022_contact_message_notifications.sql` (Edge Function + Resend) to **`hello@bymantel.com`**, the same pattern M-1 uses for orders. No personal address ships in the bundle any more; the Netlify account itself was also moved off the personal Gmail to `hello@bymantel.com`.

**H-3 · Vite has 2 high-severity advisories (dev-server file disclosure family).**
- `npm audit`: arbitrary file read via dev-server WebSocket, `server.fs` bypasses, path traversal in optimized-deps maps. These are **dev-server** issues (production `dist/` is static), but the dev server runs on this machine regularly.
- **Fix:** bump to vite `6.4.3` (`npm audit fix --force` — it stays on Vite 6, verify `npm run build` after).
- **Priority:** High · **Effort:** Low · **Acceptance:** `npm audit` reports 0 high.

### Medium

**M-1 · Order-notification email is sent from the client.**
- After `place_order` succeeds, the browser POSTs the order summary to FormSubmit. A malicious client can send fabricated "order" emails without any DB row, or place real orders while suppressing the email. The DB is correctly treated as the source of truth, but the café will operate off the email.
- **Fix:** move notification server-side — a Supabase Database Webhook or trigger → Edge Function that emails on `orders` insert. Delete the client-side email block in `placeOrder()`.
- **Priority:** Important (blocker for ordering launch) · **Effort:** Medium.
- **Done — `supabase/024_order_notifications.sql` + `supabase/functions/order-notify`.** Trigger on `orders` → pg_net → `order-notify` → Resend → hello@bymantel.com, the same shape as 022. The client-side FormSubmit block was already gone by the time this landed, so there was nothing left to delete; what was missing was any replacement, which is what 024 is.
- One thing to know before changing it: the trigger is a **deferred constraint trigger**, not a plain `after insert`. `place_order` writes the `orders` row and *then* the `order_items` rows, so a plain trigger fires between the two and emails an order with an empty item list. Deferring to commit time is what makes the lines readable — verified on PG16, where the naive version sent 0 items and the deferred one sent the real count.

**M-2 · `customer_email` is unvalidated and unverified.**
- The RPC checks length only — any string ≤254 chars is accepted; nothing proves the email belongs to the customer. When order-confirmation emails exist, this becomes a vector for sending mail to arbitrary addresses.
- **Fix now:** add a format check in the RPC (`customer_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'`). **Fix later:** real accounts (Phase 5) make the email verified.
- **Priority:** Important · **Effort:** Low.

**M-3 · No security headers / CSP planned for deployment.**
- Nothing exists yet because there's no host. When deploying, add headers at the host (Netlify `_headers` / Vercel `vercel.json`): `Content-Security-Policy` (self + `*.supabase.co` + `formsubmit.co` + fonts), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`.
- **Priority:** Important (pre-launch) · **Effort:** Low.

**M-4 · ~50 unused dependencies inflate the supply-chain attack surface.**
- The Figma Make export pins MUI, Emotion, recharts, react-dnd, embla, react-slick, react-hook-form, date-fns, canvas-confetti, etc. The app imports almost none of them. Every unused package is patch-tracking burden and npm-supply-chain exposure, plus most of `src/app/components/ui/` (40+ shadcn files) is dead code — including the only `dangerouslySetInnerHTML` in the project (`ui/chart.tsx`, self-generated CSS, not user input, but simplest to delete).
- **Fix:** prune `package.json` to what's imported (react, react-dom, supabase-js, lucide-react, clsx/tailwind-merge, tailwind); delete unused `ui/` components. Verify build + pages after.
- **Priority:** Important · **Effort:** Medium (half day).

**M-5 · No version control, no migration discipline.**
- The project isn't a git repo (the home-folder repo — itself a known foot-gun with zero commits and thousands of staged files — doesn't count). The SQL files have an implicit apply order (schema → 002 → 003) documented only in comments; schema.sql on its own **recreates the insecure insert policies**. Losing or misordering these files silently reopens the fixed critical.
- **Fix:** `git init` in the project + private GitHub repo (`.gitignore` already excludes `.env.local`); add a `supabase/README` stating the apply order, or consolidate into numbered migrations `001..003`. Separately, delete the accidental `~/.git` repo.
- **Priority:** Important · **Effort:** Low.

**M-6 · Supabase public email signup is still enabled (dashboard setting).**
- The live project's `/auth/v1/settings` shows `disable_signup: false` while the app uses no Supabase Auth at all — strangers could create auth users on the project today. Harmless while no RLS policy references `authenticated` beyond menu reads, but it's an open door that becomes dangerous the moment staff-only policies exist (Phase 3).
- **Fix:** Dashboard → Authentication → Sign In / Up → disable public signups (was attempted 2026-07-10 but blocked on dashboard login; still open). Re-enable deliberately with invite-only staff accounts in Phase 3.
- **Priority:** Important · **Effort:** Low (5 min, dashboard only).

### Low

- **L-1** `menu_items.updated_at` never updates (no trigger). Integrity nit; add a `before update` trigger when building the admin.
- **L-2** localStorage profile stores name/email in plaintext on the device. Acceptable, and the privacy policy discloses it accurately.
- **L-3** Resolved: Instagram links now point to the real profile (`https://www.instagram.com/bymantel/`).
- **L-4** Newsletter has no double opt-in and no durable consent record (emails land in Gmail only). Fine at this scale; revisit before real campaigns (see Privacy).
- **L-5** `menu_items` RLS select policy exposes only `is_available = true` rows — correct — but pricing/menu is fully public by design; no issue, just noting it was checked.

### Checked and not currently applicable

- **SQL injection:** no raw SQL from the client; PostgREST + `jsonb_to_recordset` in a parameterized RPC. Safe.
- **XSS:** React auto-escaping everywhere; no `dangerouslySetInnerHTML`/`innerHTML`/`eval` in app code (only dead shadcn chart.tsx, see M-4); user input is never rendered as HTML.
- **CSRF / session hijacking:** no cookies, no sessions, no auth — nothing to ride or steal yet. Becomes real in Phase 5 (Supabase Auth handles both if PKCE flow + default storage are used).
- **File uploads:** none exist. `image_url` is a text column set by the owner only. When an admin uploader is built, use a Supabase Storage bucket with owner-only write policy and content-type allowlist.
- **Privilege escalation:** no roles exist beyond anon. Grants are minimal post-003.
- **Secrets:** only the anon key is client-side, which is its purpose. **Rule going forward: the `service_role` key must never appear in any `VITE_*` variable or client file — Edge Functions only.**

---

## 2. Privacy Audit Report

**Data collected & where it lives:**

| Data | Collected via | Stored in |
|---|---|---|
| Name, email, phone, message | Contact form | Owner Gmail (via FormSubmit) |
| Name, email, order items, payment method | `place_order` | Supabase Postgres (`orders`, `order_items`) + Gmail copy |
| Email | Newsletter signup | Owner Gmail only |
| Name, email, cart | Account panel / bag | Visitor's own localStorage (on-device) |

**Findings:**

1. **The published privacy policy is accurate** — it matches what the code actually does (rare and good). Keep it in sync as features land.
2. **Personal Gmail is the business data store** for contact/newsletter PII. For PDPL (Bahrain Law 30/2018) data-subject requests ("show/correct/delete my data") there is no practical way to find and delete a subscriber from an inbox. **Recommendation:** before actively mailing subscribers, move the newsletter list into a Supabase table (insert-only RLS) or a proper ESP, and use a business address instead of the personal Gmail.
3. **No data retention policy.** Orders (with names/emails) accumulate forever. **Recommendation:** scheduled job (Supabase `pg_cron`) to null out `customer_name`/`customer_email` on orders older than ~90 days; the financial record survives anonymized.
4. **No deletion workflow.** Define a simple runbook: on request, `delete`/anonymize rows by email in Supabase + delete Gmail threads.
5. **FormSubmit is an undisclosed-jurisdiction third-party processor** receiving PII with captcha disabled. Named in the policy (good). Replacing it with an Edge Function + transactional email provider (H-2/M-1) shrinks the processor list to one.
6. **Supabase region** — check which region the project runs in (Dashboard → Settings → General) and be able to state it; no Bahrain data-residency requirement applies to a café, but PDPL expects you to know where data goes.
7. **No trackers/analytics exist** — policy says so truthfully. If Phase 9 adds analytics, use a cookieless option (Plausible/Fathom) to keep that claim, or update the policy + add a consent banner.

---

## 3. Critical Fixes Required Before Launch

"Launch" split into the two real milestones:

**Before deploying the site at all (browse + contact + newsletter):**
1. Revoke `place_order` execute until ordering launch (H-1, the 1-line version).
2. FormSubmit: confirm activation, switch to the random alias, drop `_captcha:"false"` (H-2).
3. Upgrade Vite (H-3).
4. Disable Supabase public signups in the dashboard (M-6).
5. Security headers at the host (M-3).
6. `git init` + private repo (M-5).

**Before enabling ordering (the disabled button goes live):**
7. Re-grant `place_order` behind Turnstile-in-Edge-Function (H-1 full). In-function rate limiting is already in place (`005_order_rate_limit.sql`); the re-grant is the last line of that file, deliberately left commented out.
8. Server-side order notification via DB webhook/Edge Function; delete the client-side email (M-1).
9. Email format validation in the RPC (M-2).
10. An operational answer to "how does staff see orders?" — email alone is not an ops tool (see Phase 6).

---

## 4. MVP Roadmap (phased, in execution order)

### Phase 0 — Lockdown & Hygiene *(the 10 items above)* — ~1–2 days
Everything in section 3, plus dependency prune (M-4). No feature work until done.

### Phase 1 — Deploy the browse-only site — ✅ DONE 2026-07-11
**Live at https://curious-madeleine-fa7fed.netlify.app** — Netlify, auto-deploys from GitHub `main`, env vars in Netlify UI, headers verified live, menu loading from Supabase confirmed in-browser. Outstanding within this phase: real Instagram URL, custom domain, securityheaders.com grade check after domain.

- **Objective:** site live on a real domain, HTTPS, ordering hidden or "coming soon".
- Host `dist/` on Netlify/Vercel/Cloudflare Pages; set `VITE_*` env vars in host build settings (not committed); custom domain + HSTS; headers file (M-3).
- Real Instagram URL (L-3); confirm contact + newsletter deliver end-to-end.
- **Depends on:** Phase 0 items 1–6. **Effort:** Low. **Priority:** Critical.
- **Acceptance:** public URL, A grade on securityheaders.com, contact form email received.

### Phase 2 — Ordering launch (cash / pay-at-counter first) — ~3–5 days
- **Objective:** real customers can order for pickup **without** waiting on the payment gateway, by launching `payment_method: 'cash'` first (the column and check constraint already support it).
- Turnstile + Edge Function wrapping `place_order` (H-1); server-side notification (M-1); email validation (M-2).
- Order status is already modeled (`received → preparing → ready → completed/cancelled`) — unused so far; staff flow can start as "watch email / Supabase table" but Phase 3 fixes that properly.
- Re-enable the button; add a phone field for pickup contact (schema: nullable `customer_phone`, same validation pattern).
- **Effort:** Medium. **Priority:** Critical for MVP.
- **Acceptance:** a stranger can order; bot script without captcha token fails; café receives server-generated email within seconds.

### Phase 3 — Minimal staff/admin view — ~3–5 days
- **Objective:** staff see and progress orders without the Supabase dashboard.
- Smallest safe version: a `/staff` route gated by **Supabase Auth** (email+password for 1–2 staff accounts), an `is_staff` claim or `staff_users` table, and RLS policies granting `select/update(status)` on orders **only** to those users. Menu CRUD (edit prices/availability) in the same screen — this also finally uses `updated_at` (add trigger, L-1).
- This is deliberately *before* customer accounts: the café needs it on day one of ordering; customers don't.
- **Effort:** Medium/High. **Priority:** Critical within days of Phase 2.
- **Acceptance:** anon role still cannot read any order; staff login can; status changes reflect in DB.

### Phase 4 — Payments (card) — ~1–2 weeks incl. onboarding
- **Objective:** the "Card — Coming Soon" button works.
- **Bahrain reality:** Stripe doesn't operate in Bahrain. The project's own notes (`brand-assets/mantel-project-summary.md`) plan **PayTabs or Telr**; **Tap Payments** and **MyFatoorah** are the other regional candidates. All offer **hosted checkout pages / drop-in widgets** — use them, so card data never touches this codebase or the DB (**PCI SAQ-A scope; do NOT build card forms**).
- Flow: `place_order` (status `received`, `payment_status: 'pending'` — new column) → redirect to hosted checkout → gateway **webhook** to a Supabase Edge Function verifies the signature and marks paid → success/failure pages read the outcome. Never trust the client-side redirect alone; the webhook is the source of truth.
- **Effort:** High (mostly merchant onboarding paperwork). **Priority:** Important, not MVP-blocking (cash flow works from Phase 2).
- **Acceptance:** test-mode payment marks the order paid via webhook only; tampered webhook signature is rejected.

### Phase 5 — Customer accounts — optional, ~1 week
- Supabase Auth (email OTP or magic link suits a café better than passwords); orders gain `user_id uuid references auth.users`; RLS: `select ... using (auth.uid() = user_id)` for order history; profile/address only if delivery ever happens.
- Replaces the localStorage "account" panel; keep guest checkout — never force signup for a coffee.
- **Priority:** Optional for V1. **Acceptance:** user A cannot query user B's orders (test with two accounts).

---

## 5. Feature Roadmap (V2 — after MVP is stable)

| Feature | Notes | Effort |
|---|---|---|
| Product photos | `image_url` column already exists; Supabase Storage bucket, staff-only write policy | Low |
| Our Story page | Currently the button goes to Contact (known leftover) | Low |
| Item variants/modifiers (milk, size) | Needs `menu_item_options` table + RPC change — design before payments if likely soon | Medium |
| Coupons | New table + validation inside `place_order` (server-side only, single-use enforcement) | Medium |
| Loyalty/analytics dashboards | Only with accounts (Phase 5) + consent | High |
| Arabic / multi-locale | The BD/EN pill is already stubbed | Medium |
| SEO/marketing (Phase 9 of the brief) | Meta tags, OG image, sitemap, Google Business profile; cookieless analytics | Low |
| Order-ready SMS/WhatsApp notify | Via gateway/Twilio from the staff view | Medium |

Deliberately **cut from the original 10-phase brief** as not applicable to a 14-item café menu: product recommendations, wishlist, shipping & tax calculation (pickup only; Bahrain has no VAT on these at POS — confirm with accountant), inventory management (availability toggle suffices), customer management CRM.

---

## 6. Production Launch Checklist

**Pre-launch (browse-only):**
- [x] 003 applied + verified live (done 2026-07-10)
- [x] `place_order` execute revoked from anon — 004 applied to live DB 2026-07-10 and verified externally (RPC returns 42501 permission denied; menu reads unaffected). Also live: email regex (M-2) + `updated_at` trigger (L-1)
- [x] Supabase public signups disabled (M-6) — done 2026-07-10, verified live (`/auth/v1/settings` → `disable_signup: true`). Re-enable deliberately as invite-only when staff accounts arrive (Phase 3)
- [x] FormSubmit activated + random alias (H-2) — done 2026-07-10: endpoint now uses the alias, delivery verified, bundle no longer contains the email as an endpoint. Note: the Gmail address still appears as the *displayed* contact in the Privacy/Terms/Refund text — required content; replace with a business address when one exists. `_captcha:false` stays (FormSubmit captcha can't render over AJAX; the alias is the fix)
- [x] Vite 6.4.3, `npm audit`: 0 vulnerabilities (done 2026-07-10)
- [x] Deps pruned to 5 runtime packages; unused `ui/` folder deleted; build passes (done 2026-07-10 — click-test pages before deploy)
- [x] Git repo initialized, initial commit `556eeb2` (2026-07-10) — private remote still to add
- [ ] Host env vars set; `.env.local` never committed (verified untracked in git)
- [ ] Security headers live; securityheaders.com grade A (M-3) — config: `public/_headers` (Netlify, ships in dist)
- [ ] HTTPS + HSTS on custom domain
- [ ] Real Instagram URL
- [ ] Privacy policy re-read against final feature set

**Pre-ordering-launch additions:**
- [ ] Turnstile proven against a bot script (H-1) — in-function rate limit done (005), Turnstile still outstanding
- [x] Server-side order email (M-1) — 024 + order-notify Edge Function; client email code was already gone
- [x] Server-side newsletter-signup email — 025 + newsletter-notify Edge Function; completes the trio with 022 and 024
- [ ] Email regex in RPC (M-2)
- [ ] Staff can see orders (Phase 3, at least v0)
- [ ] Order flood test: 20 rapid orders → rate limit trips (passes on a local PG16 run of the full migration chain — 3 accepted, 17 rejected; re-run against the live project once 005 is applied there)
- [ ] Data retention job scheduled (Privacy #3)

**Post-launch monitoring:**
- [ ] Supabase Dashboard → Reports weekly: API request spikes, error rates
- [ ] Supabase log drains / at minimum check `place_order` exception counts
- [ ] `npm audit` + dependency review monthly (calendar reminder)
- [ ] Uptime check on the domain (UptimeRobot free tier)
- [ ] Review orders table for junk weekly during first month
- [ ] Re-run this audit checklist when Phase 4 (payments) starts — webhook secrets, `payment_status` RLS, refund handling are new attack surface

---

## 7. Master lists

**Recommended execution order:** Phase 0 → 1 (deploy) → 2 (cash ordering) → 3 (staff view) → 4 (card payments) → 5 (accounts) → V2 features.

**Quick wins (< 1 day each):** revoke `place_order`; disable public signups (M-6); Vite upgrade; FormSubmit alias; git init; Instagram URL; headers file; email regex in RPC; `updated_at` trigger.

**Launch blockers:** FormSubmit activation confirmed (forms silently vanish otherwise); hosting + domain; for *ordering*: H-1 abuse protection, M-1 server-side email, staff order visibility.

**MVP =** Phases 0–3 (browse + contact + newsletter + cash pickup ordering + staff view).
**Can wait for V2 =** card payments (Phase 4 — important but not blocking), accounts, photos, variants, coupons, Arabic, SEO polish.
