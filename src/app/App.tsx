import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { PolicyPage } from "@/app/components/PolicyPage";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FAQ_ITEMS } from "@/app/content/legal";
import { ChevronDown, Search, User } from "lucide-react";
import { fetchMenu, groupByCategory } from "@/lib/api/menu";
import { fetchObjects, type ShopObject } from "@/lib/api/objects";
import { Shelf } from "@/app/components/Shelf";
import { SpecCard } from "@/app/components/objects/SpecCard";
import { Home } from "@/app/pages/Home";
import { Cafe } from "@/app/pages/Cafe";
import { Story } from "@/app/pages/Story";
import { useScrolled } from "@/app/hooks/useScrolled";
import { SearchOverlay } from "@/app/components/SearchOverlay";
import { NavDrawer } from "@/app/components/NavDrawer";
import { AccountPanel } from "@/app/components/account/AccountPanel";
import { getSession, onAuthChange, fetchProfile } from "@/lib/api/auth";
import type { Session } from "@supabase/supabase-js";
import type { Page, MenuCategory, MenuItem } from "@/app/types";
import { pathFor, routeFor } from "@/lib/routes";
import { CONTACT_ENDPOINT } from "@/lib/constants";

// Served from public/ rather than bundled: a brand asset with its own stable
// URL, re-exported clean from the 5788px original with the tip on the centre
// axis. The pill CTAs that used to sit on it are gone, and with them the two
// rounded-button constants that dressed them.
const heartArtwork = "/heart.webp";
import wordmark from "@/imports/logos-05.webp";

// Still worn by the account panel and the contact form's send button, neither
// of which the redesign phases touch. The homepage pills that shared this
// vocabulary are gone; these retire when those surfaces get their own pass.
const HEART_BUTTON_CLASS =
  "rounded-full bg-heart-red text-heart-red-foreground tracking-[0.16em] uppercase " +
  "hover:opacity-90 transition-opacity " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heart-red";

// Header nav link — Fira Mono 13 / 400 / 0.08em / uppercase, straight off the
// typography table. Every value is a token; none is written as a literal here.
const HEADER_TYPE_CLASS =
  "font-mono font-normal text-[length:var(--fs-nav)] tracking-[var(--ls-nav)] uppercase whitespace-nowrap";
const HEADER_LINK_CLASS =
  `${HEADER_TYPE_CLASS} text-[color:var(--ink)] hover:opacity-60 transition-opacity ` +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 " +
  "focus-visible:outline-[color:var(--brand)]";

export default function App() {
  // Boot from the URL, not from a hardcoded "home", so a deep link or a
  // refresh lands where it says it does.
  const [page, setPage] = useState<Page>(() => routeFor(window.location.pathname).page);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuCategory, setMenuCategory] = useState<MenuCategory>(
    () => routeFor(window.location.pathname).menuCategory,
  );
  const [form, setForm] = useState({ name: "", email: "", phone: "", comment: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  /* ── menu data (from Supabase) ── */
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);

  useEffect(() => {
    let live = true;
    fetchMenu().then((result) => {
      if (!live) return;
      if (result.ok) setMenuItems(result.items);
      else setMenuError(true);
      setMenuLoading(false);
    });
    /* React 18 StrictMode mounts effects twice in development; without this
       the second response can land after the first and set state on a
       component the first pass already tore down. */
    return () => {
      live = false;
    };
  }, []);

  /* ── objects (the retail shelf) ── */
  const [objects, setObjects] = useState<ShopObject[]>([]);
  const [objectsLoading, setObjectsLoading] = useState(true);

  useEffect(() => {
    let live = true;
    fetchObjects().then((result) => {
      if (!live) return;
      if (result.ok) setObjects(result.objects);
      setObjectsLoading(false);
    });
    return () => {
      live = false;
    };
  }, []);

  const sections = groupByCategory(menuItems);
  const allItems = menuItems;

  /* ── search ── */
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const results = query.trim()
    ? allItems.filter((i) =>
        `${i.name} ${i.desc} ${i.ingredients ?? ""}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
    : [];


  /* ── account (persisted) ── */
  const [accountOpen, setAccountOpen] = useState(false);

  /* ── nav locale pill ── */
  const [localeOpen, setLocaleOpen] = useState(false);

  /* The header contracts once the page moves — see useScrolled. */
  const scrolled = useScrolled();

  /*
   * A real session, not the localStorage name-and-email the panel used to
   * keep. That was never an account — it authenticated nobody and guarded
   * nothing — and calling it one in the UI was the misleading part.
   */
  const [session, setSession] = useState<Session | null>(null);

  /*
   * True when the page was opened from a password-reset link. Supabase turns
   * the token in the URL into a session and reports PASSWORD_RECOVERY; without
   * catching it, the link just silently signs the visitor in and shows a
   * profile form, which is not what they clicked.
   */
  const [recovering, setRecovering] = useState(false);

  useEffect(() => {
    getSession().then(setSession);
    return onAuthChange((s) => {
      setSession(s);
      if (window.location.hash.includes("type=recovery")) {
        setRecovering(true);
        setAccountOpen(true);
      }
    });
  }, []);

  /* A signed-in customer's stored details pre-fill the contact form, which is
     what the localStorage version was really for. */
  useEffect(() => {
    if (!session?.user) return;
    let live = true;
    fetchProfile(session.user.id).then((p) => {
      if (!live || !p) return;
      setForm((f) => ({
        ...f,
        name: f.name || p.full_name,
        email: f.email || session.user.email || "",
      }));
    });
    return () => {
      live = false;
    };
  }, [session]);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setSearchOpen(false);
        setAccountOpen(false);
        setLocaleOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* Everything a navigation closes, regardless of what triggered it. */
  const settle = (p: Page, category: MenuCategory = null) => {
    setPage(p);
    setMenuCategory(category);
    setSidebarOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
    setLocaleOpen(false);
    window.scrollTo(0, 0);
  };

  const goTo = (p: Page, category: MenuCategory = null) => {
    const next = pathFor(p, category);
    if (window.location.pathname !== next) {
      window.history.pushState({}, "", next);
    }
    settle(p, category);
  };

  /* Back and Forward move through the site instead of leaving it. */
  useEffect(() => {
    const onPop = () => {
      const r = routeFor(window.location.pathname);
      settle(r.page, r.menuCategory);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  /* Correct the address bar to the canonical form of whatever the path
     resolved to — a trailing slash, odd casing, an unknown category or an
     unknown path all end up pointing at the page actually being rendered.
     replaceState keeps the uncorrected URL out of history, so Back doesn't
     return to it. */
  useEffect(() => {
    const r = routeFor(window.location.pathname);
    const canonical = pathFor(r.page, r.menuCategory);
    if (window.location.pathname !== canonical) {
      window.history.replaceState({}, "", canonical);
    }
  }, []);

  /*
   * Props for anything that navigates. These are real anchors with real hrefs,
   * so they can be copied, bookmarked, opened in a new tab and read by
   * crawlers. The click handler only takes over the plain left-click —
   * modified clicks fall through to the browser so ⌘-click still opens a tab.
   */
  const linkTo = (p: Page, category: MenuCategory = null) => ({
    href: pathFor(p, category),
    onClick: (e: React.MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      goTo(p, category);
    },
  });

  // Anti-abuse for the FormSubmit relay (its captcha can't render over AJAX):
  // a hidden honeypot field bots tend to fill — FormSubmit silently discards
  // any submission where _honey is non-empty — plus a short client cooldown
  // so the send button can't be hammered.
  const [honeypot, setHoneypot] = useState("");
  const lastSentAt = useRef(0);
  const CONTACT_COOLDOWN_MS = 30_000;

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Date.now() - lastSentAt.current < CONTACT_COOLDOWN_MS) {
      setSendError("Please wait a moment before sending again.");
      return;
    }
    setSending(true);
    setSendError("");
    try {
      const res = await fetch(CONTACT_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          name: form.name.trim().slice(0, 120),
          email: form.email.trim().slice(0, 254),
          phone: form.phone.trim().slice(0, 40),
          comment: form.comment.trim().slice(0, 2000),
          _honey: honeypot,
          _subject: "MANTEL website contact",
          _captcha: "false",
          _template: "table",
        }),
      });
      if (!res.ok) throw new Error(`status ${res.status}`);
      lastSentAt.current = Date.now();
      setSent(true);
    } catch {
      setSendError("Couldn't send right now — please try again in a moment.");
    } finally {
      setSending(false);
    }
  };


  // 22px wordmark + the 7px sub-line under it, centred in the 20px of vertical
  // padding the header spec asks for. The hero reads this to size its stage.
  const navHeight = "70px";
  /* Contracted: the wordmark alone, at 16px, with the locality line collapsed. */
  const SCROLLED_NAV_HEIGHT = "52px";

  /* ── shared footer ── */
  /* Three columns above a centred strip. It used to be three centred lines of
     near-identical size — three orphans with no grouping and nothing leading.
     Grouping under mono titles gives each link a reason to be where it is.
     Exactly three type levels: column title, link, copyright. */
  const footerLink =
    "font-serif font-normal text-[length:var(--fs-foot-link)] text-[color:var(--ink)] " +
    "block mb-[14px] w-fit hover:opacity-60 transition-opacity " +
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 " +
    "focus-visible:outline-[color:var(--brand)]";
  const footerTitle =
    "font-mono text-[length:var(--fs-foot-title)] font-[number:var(--fw-foot-title)] " +
    "tracking-[var(--ls-foot-title)] uppercase text-[color:var(--ink)] mb-[var(--s-3)]";

  const footer = (
    /* 96px of clearance above the footer on every page. */
    <footer className="mt-[var(--s-6)]">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(3,minmax(0,1fr))] gap-[var(--s-4)] max-w-[1000px] mx-auto px-[var(--s-3)] pb-[var(--s-4)]">
        {/* The mark, as the design direction places it: wordmark with the
            heart set at its baseline. The heart used to BE the home page; it
            belongs here and on the order confirmation. */}
        <div className="flex items-end gap-[0.7rem]">
          <img
            src={wordmark}
            alt="Mantel."
            className="h-[clamp(2rem,5.4vw,3.3rem)] w-auto"
          />
          <ImageWithFallback
            src={heartArtwork}
            alt=""
            aria-hidden="true"
            className="h-[clamp(1.1rem,2.6vw,1.55rem)] w-auto mb-[0.3rem]"
          />
        </div>
        <div>
          <h4 className={footerTitle}>Contact</h4>
          <p className="font-serif font-normal text-[length:var(--fs-foot-link)] text-[color:var(--ink)] mb-[14px]">
            Hidd, Kingdom of Bahrain
          </p>
          <a {...linkTo("contact")} className={footerLink}>Get in touch</a>
        </div>
        <div>
          <h4 className={footerTitle}>Information</h4>
          <a {...linkTo("menu")} className={footerLink}>Menu</a>
          <a {...linkTo("objects")} className={footerLink}>Objects</a>
          <a {...linkTo("story")} className={footerLink}>Our Story</a>
          <a {...linkTo("faq")} className={footerLink}>FAQ</a>
          <a {...linkTo("privacy")} className={footerLink}>Privacy policy</a>
          <a {...linkTo("terms")} className={footerLink}>Terms of service</a>
          <a {...linkTo("refund")} className={footerLink}>Refund policy</a>
        </div>
        <div>
          <h4 className={footerTitle}>Follow</h4>
          <a
            href="https://www.instagram.com/bymantel/"
            target="_blank"
            rel="noopener noreferrer"
            className={footerLink}
          >
            Instagram
          </a>
        </div>
      </div>
      <div className="border-t border-[color:var(--line-soft)] py-[var(--s-4)] px-[var(--s-3)] text-center font-mono font-normal text-[length:var(--fs-copyright)] tracking-[var(--ls-copyright)] text-[color:var(--ink-muted)]">
        © 2026, Mantel
      </div>
    </footer>
  );

  return (
    <div className="bg-background text-foreground font-mono font-normal min-h-screen">

      {/* ══ NAV ══ */}
      <nav
        className={`fixed top-0 inset-x-0 z-50 bg-[color:var(--bg)] transition-[height,border-color] duration-[400ms] ease-[cubic-bezier(.16,.84,.44,1)] ${
          /* No rule at the top: the header is part of the page until the page
             starts moving under it, and only then does it need separating. */
          scrolled ? "border-b border-[color:var(--line-soft)]" : "border-b border-transparent"
        }`}
        style={{ height: scrolled ? SCROLLED_NAV_HEIGHT : navHeight }}
      >
        {/* Three columns, equal outer tracks — that is what keeps the wordmark
            optically centred no matter how long the nav or the tools get. */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-center h-full px-[var(--s-3)] lg:px-[var(--s-4)]">
          {/* Left: nav on desktop, hamburger below 1024px */}
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col gap-[5px] p-1 hover:opacity-60 transition-opacity lg:hidden"
              aria-label="Open navigation"
            >
              <span className="block w-[18px] h-px bg-foreground" />
              <span className="block w-[18px] h-px bg-foreground" />
              <span className="block w-[18px] h-px bg-foreground" />
            </button>
            <nav className="hidden lg:flex items-center gap-[28px]" aria-label="Primary">
              <a {...linkTo("menu")} className={HEADER_LINK_CLASS}>Menu</a>
              <a {...linkTo("objects")} className={HEADER_LINK_CLASS}>Objects</a>
              <a {...linkTo("story")} className={HEADER_LINK_CLASS}>Our Story</a>
              <a {...linkTo("contact")} className={HEADER_LINK_CLASS}>Contact</a>
            </nav>
          </div>

          {/* Centre: identity */}
          <a
            {...linkTo("home")}
            className="justify-self-center text-center leading-[1.15] hover:opacity-80 transition-opacity"
          >
            <span
              className="block font-serif font-medium tracking-[var(--ls-logo)] text-[color:var(--ink)] transition-[font-size] duration-[400ms] ease-[cubic-bezier(.16,.84,.44,1)]"
              style={{ fontSize: scrolled ? "16px" : "var(--fs-logo)" }}
            >
              Mantel.
            </span>
            {/* The locality line is the part that goes. It earns its place on
                arrival and becomes noise once someone is reading. Collapsed by
                max-height rather than unmounted, so the wordmark glides up
                instead of jumping. */}
            <span
              aria-hidden={scrolled}
              className={`block font-mono font-normal text-[7px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)] overflow-hidden transition-[max-height,opacity] duration-[400ms] ease-[cubic-bezier(.16,.84,.44,1)] ${
                scrolled ? "max-h-0 opacity-0" : "max-h-[12px] opacity-100"
              }`}
            >
              Bahrain
            </span>
          </a>

          {/* Right: tools */}
          <div className="justify-self-end flex items-center gap-[var(--s-2)] lg:gap-[20px] text-foreground/70">
            {/* Locale pill — single locale for now (Bahrain / BD / English),
                shown as a dropdown to match the reference layout */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => { setLocaleOpen((v) => !v); setSearchOpen(false); setAccountOpen(false); }}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                aria-label="Country and language"
              >
                <span className="font-mono text-[14px] leading-none">🇧🇭</span>
                <span className={HEADER_TYPE_CLASS}>BD / EN</span>
                <ChevronDown
                  size={12}
                  strokeWidth={1.5}
                  className={`transition-transform duration-200 ${localeOpen ? "rotate-180" : ""}`}
                />
              </button>
              {/* w-72, not w-56: Fira Mono sets much wider than the old
                  proportional face, and the locale line wrapped at w-56. */}
              {localeOpen && (
                <div className="absolute right-0 top-full mt-3 w-72 bg-background border border-border rounded-2xl shadow-lg px-5 py-4 z-50">
                  <p className="font-mono font-normal text-sm text-foreground">🇧🇭 Bahrain — BD · English</p>
                  <p className="font-mono font-normal text-[11px] text-muted-foreground mt-1.5">
                    More regions and languages coming soon.
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSearchOpen((v) => !v); setAccountOpen(false); setLocaleOpen(false); }}
              className="hover:text-foreground transition-colors"
              aria-label="Search"
            >
              <Search size={17} strokeWidth={1.5} className="lg:hidden" />
              <span className={`hidden lg:inline ${HEADER_TYPE_CLASS}`}>Search</span>
            </button>
            <button
              onClick={() => {
                setAccountOpen((v) => !v);
                setSearchOpen(false);
                setLocaleOpen(false);
              }}
              className="hover:text-foreground transition-colors"
              aria-label="Account"
            >
              <User size={17} strokeWidth={1.5} className="lg:hidden" />
              <span className={`hidden lg:inline ${HEADER_TYPE_CLASS}`}>Account</span>
            </button>
          </div>
        </div>
      </nav>


      {/* ══ SIDEBAR ══ */}
      {/* Full-screen below 1024px, on the reference's pattern — see NavDrawer. */}
      <NavDrawer
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onSearch={() => { setSidebarOpen(false); setSearchOpen(true); }}
        linkTo={linkTo}
        navHeight={scrolled ? SCROLLED_NAV_HEIGHT : navHeight}
      />

      {/* ══ SEARCH PANEL ══ */}
      {searchOpen && (
        <SearchOverlay
          query={query}
          setQuery={setQuery}
          results={results}
          allItems={allItems}
          inputRef={searchInputRef}
          navHeight={scrolled ? SCROLLED_NAV_HEIGHT : navHeight}
          onClose={() => { setSearchOpen(false); setQuery(""); }}
          onPickCategory={(c) => { goTo("menu", c); setQuery(""); }}
        />
      )}

      {/* ══ ACCOUNT PANEL ══ */}
      {accountOpen && (
        <AccountPanel
          session={session}
          recovering={recovering}
          navHeight={scrolled ? SCROLLED_NAV_HEIGHT : navHeight}
          onClose={() => { setAccountOpen(false); setRecovering(false); }}
        />
      )}


      {page === "home" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <Home sections={sections} objects={objects} linkTo={linkTo} />
          </div>
          {footer}
        </main>
      )}

      {/* ══ MENU PAGE ══ */}
      {page === "menu" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <Cafe sections={sections} category={menuCategory} loading={menuLoading} error={menuError} />
          </div>
          {footer}
        </main>
      )}


      {/* ══ OUR STORY ══ */}
      {/* ══ OBJECTS PAGE ══ */}
      {page === "objects" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)] pt-[var(--s-5)]">
            <Shelf tag="Objects" note="Made in small runs">
              <div className="grid grid-cols-1 sm:grid-cols-2 items-baseline gap-[var(--s-2)] pt-[var(--s-2)] pb-[var(--s-4)]">
                <h1 className="font-serif text-[clamp(1.9rem,5vw,3.4rem)] leading-[0.94] tracking-[-0.018em] m-0 text-[color:var(--ink)]">
                  Objects.
                </h1>
                <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)] sm:justify-self-end">
                  Collect in store
                </span>
              </div>

              {objectsLoading ? (
                <p className="font-mono text-[length:var(--fs-price)] text-[color:var(--ink-muted)] py-[var(--s-5)]">
                  Loading…
                </p>
              ) : objects.length === 0 ? (
                /* The table is real and empty: 009 created it, and the object
                   list lands hidden at price 0 until prices are confirmed
                   (objects_available_has_price). Saying so plainly beats an
                   empty grid that reads as a broken page. */
                <div className="py-[var(--s-5)] max-w-[46ch]">
                  <p className="font-serif text-[length:var(--fs-item)] text-[color:var(--ink)] mb-[var(--s-2)]">
                    The shelf is being set.
                  </p>
                  <p className="font-mono text-[length:var(--fs-desc)] text-[color:var(--ink-muted)] leading-[1.6]">
                    Candles, matches, lighters and whole beans — in store now, on this page shortly.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-[var(--s-3)] pb-[var(--s-5)]">
                  {objects.map((o) => (
                    <SpecCard key={o.id} object={o} onAdd={() => {}} />
                  ))}
                </div>
              )}
            </Shelf>
          </div>
          {footer}
        </main>
      )}

      {page === "story" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <Story linkTo={linkTo} />
          </div>
          {footer}
        </main>
      )}

      {page === "contact" && (
        <main
          className="min-h-screen flex flex-col"
          style={{ paddingTop: navHeight }}
        >
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 pt-14 pb-16">
            <h1
              className="font-serif font-semibold mb-12"
              style={{ fontSize: "clamp(2.1rem, 5.5vw, 3.1rem)", lineHeight: 1.1, color: "#3a0d1e" }}
            >
              Contact
            </h1>

            {sent ? (
              <div className="py-12 text-center">
                <p className="font-mono font-normal text-muted-foreground text-sm tracking-wide">
                  Thank you — we{"'"}ll be in touch soon.
                </p>
              </div>
            ) : (
              <form onSubmit={submitContact} className="flex flex-col gap-3">
                {/* Honeypot — visually hidden and skipped by keyboard/screen
                    readers; humans never fill it, spam bots usually do, and
                    FormSubmit discards submissions where it's non-empty. */}
                <input
                  type="text"
                  name="_honey"
                  value={honeypot}
                  onChange={(e) => setHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  aria-hidden="true"
                  className="absolute -left-[9999px] h-0 w-0 opacity-0"
                />
                {/* Name + Email row */}
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Name"
                    maxLength={120}
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    className="flex-1 min-w-0 rounded-full border border-border bg-background px-5 py-3 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="flex-1 min-w-0 rounded-full border border-border bg-background px-5 py-3 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>

                {/* Phone */}
                <input
                  type="tel"
                  placeholder="Phone number"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rounded-full border border-border bg-background px-5 py-3 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                />

                {/* Comment */}
                <textarea
                  placeholder="Comment"
                  rows={5}
                  maxLength={2000}
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  className="rounded-3xl border border-border bg-background px-5 py-4 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors resize-none"
                />

                {sendError && <p className="font-mono font-normal text-xs text-destructive">{sendError}</p>}
                <div className="mt-1">
                  <button
                    type="submit"
                    disabled={sending}
                    className={`px-9 py-3 font-serif font-normal text-base disabled:opacity-60 ${HEART_BUTTON_CLASS}`}
                  >
                    {sending ? "Sending…" : "Send"}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Newsletter + footer */}
          <div className="border-t border-border">
            <NewsletterSignup />
          </div>
          {footer}
        </main>
      )}

      {/* ══ FAQ PAGE ══ */}
      {page === "faq" && (
        <main className="min-h-screen flex flex-col" style={{ paddingTop: navHeight }}>
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-14">
            <h1 className="font-serif font-semibold text-5xl mb-12">FAQ</h1>
            <FaqAccordion items={FAQ_ITEMS} />
          </div>
          <NewsletterSignup />
          {footer}
        </main>
      )}

      {/* ══ POLICY PAGES ══ */}
      {(page === "privacy" || page === "terms" || page === "refund") && (
        <main className="min-h-screen flex flex-col" style={{ paddingTop: navHeight }}>
          <PolicyPage
            doc={
              page === "privacy"
                ? PRIVACY_POLICY
                : page === "terms"
                  ? TERMS_OF_SERVICE
                  : REFUND_POLICY
            }
          />
          {footer}
        </main>
      )}
    </div>
  );
}
