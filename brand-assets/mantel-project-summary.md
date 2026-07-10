# Mantel — Project Summary

**Business:** Mantel — a curbside/drive-thru coffee shop in Muharraq, Bahrain
**Owner:** Nayef (entrepreneur, MIS student, building and managing solo)

---

## 1. Project Scope

Nayef submitted a master-prompt brief asking for a full digital ecosystem:

1. Customer Website
2. Database Infrastructure
3. Authentication System
4. Admin Dashboard
5. Financial Dashboard
6. POS Integration
7. Inventory Integration
8. Analytics System
9. Reporting System
10. Business Documentation

The brief calls for enterprise-level architecture from day one: RBAC (Owner, Partner, Manager, Staff, Customer), Row Level Security, audit logging, a "Master Register" system that auto-ingests business documents, and a phased 11-part delivery plan (Requirements → Business Architecture → System Architecture → Database Design → UI/UX → Development Roadmap → Financial Integration → Dashboard Architecture → Testing → Deployment → Maintenance).

**Working approach agreed:** rather than generating all 11 phases speculatively in one pass, work incrementally — start with design/branding (since that's the immediate need) and expand phase-by-phase as decisions firm up.

---

## 2. Tech Stack Discussion

| Layer | Brief's ask | Decision status |
|---|---|---|
| Frontend | Next.js, React, TypeScript | Agreed |
| Backend | Supabase (brief) vs. custom Node.js (Nayef's earlier direction) | **Leaning hybrid**: Supabase for DB/Auth/Row Level Security (strongest security option, managed patching, less custom attack surface), thin custom Node.js layer only for things Supabase can't do (e.g. PayTabs/Telr payment callback orchestration, POS-specific logic). Not yet formally locked — to be finalized at System Architecture phase. |
| Database | PostgreSQL via Supabase | Agreed |
| Auth | Supabase Auth, RBAC, RLS | Agreed direction |
| Hosting | TBD — Netlify Drop suggested for quick free launch; Shopify suggested as a longer-term e-commerce option with real payment processing | Open |
| Version control | GitHub | Agreed |
| API | REST | Agreed |

**Security rationale for Supabase-leaning hybrid:** managed auth/session handling, parameterized queries by default, native Postgres Row Level Security enforced at the database layer (protects even if app code has bugs), less custom code for Nayef to maintain solo.

---

## 3. Brand Assets (in hand)

- **Wordmark logo** — hand-drawn "MANTEL" in black ink on transparent/white background
- **Heart icon** — hand-painted red heart mark, used as the brand's signature motif
- **Custom typeface** — `Mantel-By-UglyDave` (two OTF weights), a handwritten/brush-style display font used for headings and the wordmark

Design direction from Nayef: **no product/lifestyle photography** — the site should stay illustrative/typographic, using the heart mark and brand color blocks instead of photos.

---

## 4. Design Reference: Sevenly Heart (sevenlyheart.shop)

Nayef specified this site as the direct structural reference — "same as the inspiration," not just loosely inspired.

Confirmed structural pattern to replicate for Mantel:

- **Header:** hamburger menu + wordmark logo top-left; country/currency selector, search, account, cart icons top-right
- **Hero:** the brand's signature icon (heart, for Sevenly Heart) shown large and centered, filling most of the viewport, in place of a photo
- Two thin, pill-shaped outlined buttons stacked vertically in the center of the hero icon (Sevenly Heart uses "LOVE" / "MENU" — Mantel's equivalent is **"MENU" / "ORDER"**)
- A slide counter (e.g. "1 / 2") below the hero for a multi-image/slide hero
- Instagram icon, centered, below the hero area
- **Footer:** "Country/region" and "Language" as separate pill-style dropdown selectors, plus copyright line ("© 2026, [Brand] · Powered by Shopify")
- Overall aesthetic: white background, black ink linework, generous white space, minimal color — Parisian/minimal editorial feel

---

## 5. Mockup Iteration History

1. **v1 (dark theme):** Full-screen dark hero, heart mark as a faded background watermark, gradient backgrounds. **Rejected** — Nayef wants white, not dark.
2. **v2 (white theme, original layout):** White background, centered logo, cream hero block with heart icon in the corner, brand-font headline, featured product placeholder cards. Closer, but not matching Sevenly Heart's actual structure.
3. **v3 (current — matches Sevenly Heart structure):** Logo + hamburger top-left, nav icons top-right, giant centered heart-mark hero with stacked "MENU" / "ORDER" pill buttons, slide counter, Instagram icon, footer with Country/region and Language pill dropdowns. **This is the direction to build forward from.**

No photography used in any version, per Nayef's instruction.

---

## 6. Open Questions / Next Decisions

- Final confirmation on the **v3 layout** — any further tweaks to spacing, pill button copy, or icon choices?
- **Backend architecture lock-in**: confirm hybrid Supabase + Node.js approach at System Architecture phase
- **Hosting decision**: Netlify Drop (quick/free) vs. Shopify (longer-term commerce + payments) vs. custom deployment
- Menu content: drinks, sandwiches, categories, nutritional info — not yet supplied
- Retail product line (lighters, tin candles, candle sticks, match sticks, ceramic cups) — architecture should anticipate but not build yet, per brief
- Order Before Reach (pre-order/pickup) page — "Coming Soon" placeholder for now, architecture to anticipate later build
- Contact page fields confirmed: Name, Email, Phone Number, Comment, Submit
- Finance system: Nayef has existing Capital Tracker and Master Register spreadsheets; integration/auto-ingestion approach not yet scoped

---

## 7. Files Delivered So Far

- Interactive HTML/CSS homepage mockups (v1 dark, v2 white/original, v3 Sevenly-Heart-structured) — shown inline in chat, not yet exported as standalone files or real Next.js code
- This summary document

**Not yet built:** actual Next.js project code, database schema/ERD, auth system, admin dashboard, POS integration, or any of the later-phase deliverables from the original brief.
