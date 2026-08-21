import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { MenuItemRow } from "@/app/components/MenuItemRow";
import { PolicyPage } from "@/app/components/PolicyPage";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FAQ_ITEMS } from "@/app/content/legal";
import { ArrowLeft, ChevronDown, Instagram, Search, User, X } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { loadProfile } from "@/lib/storage";
import { formatBD, CATEGORY_LABELS } from "@/lib/format";
import type { Page, MenuCategory, MenuItem, Profile } from "@/app/types";
import { pathFor, routeFor } from "@/lib/routes";
import { CONTACT_ENDPOINT } from "@/lib/constants";

// Served from public/ rather than bundled: a brand asset with its own stable
// URL, re-exported clean from the 5788px original with the tip on the centre
// axis. The pill CTAs that used to sit on it are gone, and with them the two
// rounded-button constants that dressed them.
const heartArtwork = "/heart.webp";

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
    supabase
      .from("menu_items")
      .select("id, name, desc:description, price, category, image_url, is_available, sort_order")
      .order("category")
      .order("sort_order")
      .then(({ data, error }) => {
        if (error) setMenuError(true);
        else setMenuItems((data as MenuItem[]) ?? []);
        setMenuLoading(false);
      });
  }, []);

  const coffeeItems = menuItems.filter((i) => i.category === "coffee");
  const foodItems = menuItems.filter((i) => i.category === "food");
  const allItems = menuItems;

  /* ── search ── */
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const results = query.trim()
    ? allItems.filter((i) =>
        `${i.name} ${i.desc}`.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : [];


  /* ── account (persisted) ── */
  const [accountOpen, setAccountOpen] = useState(false);

  /* ── nav locale pill ── */
  const [localeOpen, setLocaleOpen] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(() => loadProfile("mantel-profile"));
  const [profileDraft, setProfileDraft] = useState<Profile>({ name: "", email: "" });

  useEffect(() => {
    if (profile) localStorage.setItem("mantel-profile", JSON.stringify(profile));
    else localStorage.removeItem("mantel-profile");
  }, [profile]);

  /* saved profile pre-fills the contact form */
  useEffect(() => {
    if (profile) setForm((f) => ({ ...f, name: f.name || profile.name, email: f.email || profile.email }));
  }, [profile]);

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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-[var(--s-4)] max-w-[1000px] mx-auto px-[var(--s-3)] pb-[var(--s-4)]">
        <div>
          <h4 className={footerTitle}>Contact</h4>
          <p className="font-serif font-normal text-[length:var(--fs-foot-link)] text-[color:var(--ink)] mb-[14px]">
            Al Hidd, Bahrain
          </p>
          <a {...linkTo("contact")} className={footerLink}>Get in touch</a>
        </div>
        <div>
          <h4 className={footerTitle}>Information</h4>
          <a {...linkTo("menu")} className={footerLink}>Menu</a>
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
      <div className="border-t border-[color:var(--line)] py-[var(--s-4)] px-[var(--s-3)] text-center font-mono font-normal text-[length:var(--fs-copyright)] tracking-[var(--ls-copyright)] text-[color:var(--ink-muted)]">
        © 2026, Mantel
      </div>
    </footer>
  );

  return (
    <div className="bg-white text-foreground font-mono font-normal min-h-screen">

      {/* ══ NAV ══ */}
      <nav
        className="fixed top-0 inset-x-0 z-50 bg-[color:var(--bg)] border-b border-[color:var(--line)]"
        style={{ height: navHeight }}
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
              <a {...linkTo("story")} className={HEADER_LINK_CLASS}>Our Story</a>
              <a {...linkTo("contact")} className={HEADER_LINK_CLASS}>Contact</a>
            </nav>
          </div>

          {/* Centre: identity */}
          <a
            {...linkTo("home")}
            className="justify-self-center text-center leading-[1.15] hover:opacity-80 transition-opacity"
          >
            <span className="block font-serif font-medium text-[length:var(--fs-logo)] tracking-[var(--ls-logo)] text-[color:var(--ink)]">
              Mantel.
            </span>
            <span className="block font-mono font-normal text-[7px] tracking-[0.2em] uppercase text-[color:var(--ink-muted)]">
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
                <div className="absolute right-0 top-full mt-3 w-72 bg-white border border-border rounded-2xl shadow-lg px-5 py-4 z-50">
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
                if (profile) setProfileDraft(profile);
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
      {/* Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Drawer */}
      <div
        className={`fixed top-0 left-0 z-50 h-full bg-white flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ width: "185px" }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-5 border-b border-border shrink-0"
          style={{ height: navHeight }}
        >
          <button
            onClick={() => setSidebarOpen(false)}
            className="hover:opacity-60 transition-opacity"
            aria-label="Close"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
          <span className="font-serif font-semibold text-[24px] leading-none tracking-[-0.01em] text-foreground">
            Mantel.
          </span>
          <div className="w-[18px]" />
        </div>

        {/* Drawer links */}
        <nav className="flex flex-col px-5 pt-7 gap-5 flex-1">
          <a
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            {...linkTo("menu")}
          >
            Menu
          </a>
          <a
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            {...linkTo("contact")}
          >
            Contact
          </a>
          <a
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            {...linkTo("story")}
          >
            Our Story
          </a>
          <a
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            {...linkTo("faq")}
          >
            FAQ
          </a>
        </nav>

        {/* Drawer footer */}
        <div className="px-5 pb-6">
          <a
            href="https://www.instagram.com/bymantel/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
            <Instagram size={18} strokeWidth={1.5} />
          </a>
        </div>
      </div>

      {/* ══ SEARCH PANEL ══ */}
      {searchOpen && (
        <div
          className="fixed inset-x-0 z-50 bg-white border-b border-border shadow-sm"
          style={{ top: navHeight }}
        >
          <div className="max-w-xl mx-auto px-6 py-5">
            <div className="flex items-center gap-3">
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search the menu…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="flex-1 rounded-full border border-border bg-white px-5 py-2.5 font-mono font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
              />
              <button
                onClick={() => { setSearchOpen(false); setQuery(""); }}
                className="text-foreground/60 hover:text-foreground transition-colors"
                aria-label="Close search"
              >
                <X size={18} strokeWidth={1.5} />
              </button>
            </div>
            {query.trim() && (
              <div className="mt-4 max-h-72 overflow-y-auto divide-y divide-border">
                {results.length === 0 ? (
                  <p className="py-4 font-mono font-normal text-sm text-muted-foreground">No matches — try “latte” or “croissant”.</p>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        goTo("menu", item.category);
                        setQuery("");
                      }}
                      className="w-full py-3 flex justify-between items-center gap-4 text-left hover:opacity-60 transition-opacity"
                    >
                      <span>
                        <span className="block font-mono font-medium text-[14px]">{item.name}</span>
                        <span className="block font-mono font-normal text-[11px] tracking-[0.14em] uppercase text-muted-foreground mt-0.5">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </span>
                      <span className="font-mono font-normal text-[13px] tabular-nums shrink-0">{formatBD(item.price)}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══ ACCOUNT PANEL ══ */}
      {accountOpen && (
        <div
          className="fixed right-4 z-50 w-72 bg-white border border-border rounded-3xl shadow-lg p-5"
          style={{ top: `calc(${navHeight} + 10px)` }}
        >
          {profile ? (
            <div className="flex flex-col gap-3">
              <p className="font-mono font-medium text-lg">Hi, {profile.name}</p>
              <p className="font-mono font-normal text-xs text-muted-foreground -mt-2">{profile.email}</p>
              <p className="font-mono font-normal text-xs text-muted-foreground">
                Your details pre-fill the contact form on this device.
              </p>
              <button
                onClick={() => { setProfile(null); setProfileDraft({ name: "", email: "" }); }}
                className="self-start font-serif font-medium text-[12px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors"
              >
                Sign out
              </button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (profileDraft.name.trim() && profileDraft.email.trim()) {
                  setProfile({ name: profileDraft.name.trim(), email: profileDraft.email.trim() });
                }
              }}
              className="flex flex-col gap-2.5"
            >
              <p className="font-mono font-medium text-lg mb-1">Your details</p>
              <input
                type="text"
                placeholder="Name"
                required
                maxLength={120}
                value={profileDraft.name}
                onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))}
                className="rounded-full border border-border bg-white px-4 py-2 font-mono font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                required
                maxLength={254}
                value={profileDraft.email}
                onChange={(e) => setProfileDraft((d) => ({ ...d, email: e.target.value }))}
                className="rounded-full border border-border bg-white px-4 py-2 font-mono font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
              />
              <button
                type="submit"
                className={`mt-1 px-6 py-2 font-serif font-medium text-base self-start ${HEART_BUTTON_CLASS}`}
              >
                Save
              </button>
              <p className="font-mono font-normal text-[11px] text-muted-foreground">
                Saved on this device only — used to pre-fill the contact form.
              </p>
            </form>
          )}
        </div>
      )}


      {page === "home" && (
        /* The stage is the viewport minus the header; the footer is a flex
           sibling below it, in the page flow, not glued under the artwork. */
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div
            className="flex flex-col items-center justify-center gap-[var(--s-4)] px-[var(--s-3)]"
            style={{ height: `calc(100vh - ${navHeight})` }}
          >
            {/* Nothing sits on the artwork. The heart is the campaign image:
                65% of the stage on desktop, 50% on phones where the caption
                and link take a larger share of the height. */}
            <ImageWithFallback
              src={heartArtwork}
              alt="Mantel heart"
              className="h-[50%] sm:h-[65%] w-auto max-w-full object-contain"
            />
            <div className="flex flex-col items-center gap-[var(--s-2)]">
              <p className="font-serif font-normal text-[length:var(--fs-hero-caption)] text-[color:var(--ink)] text-center">
                Specialty coffee, Al Hidd
              </p>
              {/* A ruled link, not a pill. Same treatment as every other CTA. */}
              <a
                {...linkTo("menu")}
                className="font-mono font-normal text-[length:var(--fs-hero-link)] tracking-[var(--ls-hero-link)] uppercase text-[color:var(--ink)] border-b border-[color:var(--ink)] pb-[3px] hover:opacity-60 transition-opacity focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--brand)]"
              >
                View menu
              </a>
            </div>
          </div>
          {footer}
        </main>
      )}

      {/* ══ MENU PAGE ══ */}
      {page === "menu" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          {menuLoading ? (
            <div className="flex-1 flex items-center justify-center py-[var(--s-6)]">
              <p className="font-mono font-normal text-[length:var(--fs-price)] text-[color:var(--ink-muted)]">Loading menu…</p>
            </div>
          ) : menuError ? (
            <div className="flex-1 flex items-center justify-center py-[var(--s-6)]">
              <p className="font-mono font-normal text-[length:var(--fs-price)] text-[color:var(--ink-muted)]">
                Couldn{"'"}t load the menu right now — please try again shortly.
              </p>
            </div>
          ) : (
            /* Every category on one page, one heading each. The chooser is
               gone: with fourteen items, making someone pick a category before
               seeing anything was a gate, not navigation. /menu/coffee still
               resolves and narrows to that category, so the links already in
               the wild keep working. */
            <div className="flex-1 w-full max-w-[620px] mx-auto px-[var(--s-3)] py-[var(--s-6)]">
              {menuCategory && (
                <a
                  {...linkTo("menu")}
                  className="font-mono font-normal text-[length:var(--fs-hero-link)] tracking-[var(--ls-hero-link)] uppercase text-[color:var(--ink-muted)] hover:text-[color:var(--ink)] transition-colors mb-[var(--s-4)] flex items-center gap-[var(--s-1)] w-fit"
                >
                  <ArrowLeft size={13} strokeWidth={1.75} />
                  Full menu
                </a>
              )}

              {/* "BD" once, at the top — it used to repeat on all fourteen rows. */}
              <p className="font-mono font-normal text-[length:var(--fs-copyright)] tracking-[var(--ls-copyright)] text-[color:var(--ink-muted)] text-center mb-[var(--s-4)]">
                Prices in BD
              </p>

              {([["coffee", coffeeItems], ["food", foodItems]] as [Exclude<MenuCategory, null>, MenuItem[]][])
                .filter(([key, items]) => items.length > 0 && (!menuCategory || menuCategory === key))
                .map(([key, items], i) => (
                  <section key={key}>
                    {/* The only rule on the page, and only between categories. */}
                    {i > 0 && <hr className="border-0 border-t border-[color:var(--line)] my-[var(--s-5)]" />}
                    <h2 className="font-serif font-medium text-[length:var(--fs-heading)] text-[color:var(--ink)] text-center mb-[var(--s-5)]">
                      {CATEGORY_LABELS[key]}
                    </h2>
                    {items.map((item) => (
                      <MenuItemRow key={item.id} item={item} />
                    ))}
                  </section>
                ))}
            </div>
          )}
          {footer}
        </main>
      )}


      {/* ══ OUR STORY ══ */}
      {page === "story" && (
        <main
          className="min-h-screen flex flex-col"
          style={{ paddingTop: navHeight }}
        >
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 pt-14 pb-16">
            <h1
              className="font-serif font-semibold mb-12"
              style={{ fontSize: "clamp(2.1rem, 5.5vw, 3.1rem)", lineHeight: 1.1, color: "#3a0d1e" }}
            >
              Our Story
            </h1>
            {/* The route, the layout and the one factual line are real. The
                account of how Mantel started is the owner's to write — this
                stays deliberately short rather than inventing a history. */}
            <p className="font-serif font-normal text-[17px] leading-relaxed">
              Mantel is a specialty coffee shop in Al Hidd, Bahrain.
            </p>
            <a
              {...linkTo("menu")}
              className="inline-block mt-10 font-mono font-normal text-[12px] tracking-[0.12em] uppercase border-b border-foreground pb-[3px] hover:opacity-60 transition-opacity"
            >
              View menu
            </a>
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
                    className="flex-1 min-w-0 rounded-full border border-border bg-white px-5 py-3 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="flex-1 min-w-0 rounded-full border border-border bg-white px-5 py-3 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>

                {/* Phone */}
                <input
                  type="tel"
                  placeholder="Phone number"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rounded-full border border-border bg-white px-5 py-3 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                />

                {/* Comment */}
                <textarea
                  placeholder="Comment"
                  rows={5}
                  maxLength={2000}
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  className="rounded-3xl border border-border bg-white px-5 py-4 font-serif font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors resize-none"
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
