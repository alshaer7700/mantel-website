import { useEffect, useRef, useState } from "react";
import { PolicyPage } from "@/app/components/PolicyPage";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FAQ_ITEMS } from "@/app/content/legal";
import { Instagram, Search, ShoppingBag, User } from "lucide-react";
import { fetchMenu, groupByCategory } from "@/lib/api/menu";
import { Home } from "@/app/pages/Home";
import { Objects } from "@/app/pages/Objects";
import { CartDrawer } from "@/app/components/cart/CartDrawer";
import type { CartLine, RetailProduct } from "@/app/content/retail";
import { EditorialFooter } from "@/app/components/EditorialFooter";
import { Cafe } from "@/app/pages/Cafe";
import { Story } from "@/app/pages/Story";
import { useScrolled } from "@/app/hooks/useScrolled";
import { SearchOverlay } from "@/app/components/SearchOverlay";
import { AccountPanel } from "@/app/components/account/AccountPanel";
import { getSession, onAuthChange, fetchProfile } from "@/lib/api/auth";
import type { Session } from "@supabase/supabase-js";
import type { Page, MenuCategory, MenuItem } from "@/app/types";
import { pathFor, routeFor } from "@/lib/routes";
import { CONTACT_ENDPOINT } from "@/lib/constants";

// Still worn by the account panel and the contact form's send button, neither
// of which the redesign phases touch. The homepage pills that shared this
// vocabulary are gone; these retire when those surfaces get their own pass.
const HEART_BUTTON_CLASS =
  "rounded-full bg-heart-red text-heart-red-foreground tracking-[0.16em] uppercase " +
  "hover:opacity-90 transition-opacity " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heart-red";

export default function App() {
  // Boot from the URL, not from a hardcoded "home", so a deep link or a
  // refresh lands where it says it does.
  const [page, setPage] = useState<Page>(() => routeFor(window.location.pathname).page);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
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
        setCartOpen(false);
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
    setCartOpen(false);
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
  const addToCart = (product: RetailProduct) => {
    setCartLines((current) => {
      const existing = current.find((line) => line.product.id === product.id);
      if (existing) {
        return current.map((line) =>
          line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
        );
      }
      return [...current, { product, quantity: 1 }];
    });
    setCartOpen(true);
  };

  const incrementCart = (productId: string) => {
    setCartLines((current) => current.map((line) =>
      line.product.id === productId ? { ...line, quantity: line.quantity + 1 } : line,
    ));
  };

  const decrementCart = (productId: string) => {
    setCartLines((current) => current.flatMap((line) => {
      if (line.product.id !== productId) return [line];
      return line.quantity > 1 ? [{ ...line, quantity: line.quantity - 1 }] : [];
    }));
  };

  const removeFromCart = (productId: string) => {
    setCartLines((current) => current.filter((line) => line.product.id !== productId));
  };

  const cartCount = cartLines.reduce((total, line) => total + line.quantity, 0);

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
  const navHeight = "58px";
  /* Contracted: the wordmark alone, at 16px, with the locality line collapsed. */
  const SCROLLED_NAV_HEIGHT = "54px";

  /* Footer rendering lives in EditorialFooter so all routes share the same editorial shell. */

  return (
    <div className="bg-background text-foreground font-mono font-normal min-h-screen">

      {/* ══ NAV ══ */}
      <header className="editorial-nav">
        <div className="editorial-nav-inner">
          <div className="editorial-nav-left">
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="editorial-mobile-trigger"
              aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
            >
              <span className="sr-only">Open navigation</span>
              <span aria-hidden="true">☰</span>
            </button>
            <nav className="editorial-nav-primary" aria-label="Primary">
              <a {...linkTo("menu")} className="editorial-nav-link">Menu</a>
              <a {...linkTo("objects")} className="editorial-nav-link">Retail</a>
              <a {...linkTo("story")} className="editorial-nav-link">About Us</a>
            </nav>
          </div>

          <a {...linkTo("home")} className="editorial-wordmark" aria-label="Mantel home">
            Mantel.
            <small>Bahrain</small>
          </a>

          <div className="editorial-nav-tools">
            <button
              onClick={() => { setSearchOpen((value) => !value); setAccountOpen(false); }}
              className="editorial-nav-action editorial-nav-icon"
              aria-label="Search"
            >
              <Search size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => { setAccountOpen((value) => !value); setSearchOpen(false); }}
              className="editorial-nav-action"
              aria-label="Account"
            >
              <User size={16} strokeWidth={1.5} className="sm:hidden" />
              <span>Account</span>
            </button>
            <button
              type="button"
              className="editorial-nav-action editorial-nav-icon relative"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} item${cartCount === 1 ? "" : "s"}` : ""}`}
              onClick={() => { setCartOpen(true); setSidebarOpen(false); setSearchOpen(false); setAccountOpen(false); }}
            >
              <ShoppingBag size={16} strokeWidth={1.5} />
              {cartCount > 0 && <span className="editorial-cart-badge">{cartCount}</span>}
            </button>
          </div>
        </div>
      </header>


      {/* ══ SIDEBAR ══ */}
      {/* Overlay */}
      <div
        className={`fixed left-0 right-0 bottom-0 top-[var(--editorial-nav-h)] z-40 bg-black/20 transition-opacity duration-300 ${
          sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      {/* Drawer */}
      <div
        className={`fixed inset-0 z-[70] bg-background flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Mantel navigation"
      >
        <div className="editorial-sidebar-header">
          <button
            type="button"
            className="editorial-sidebar-close"
            onClick={() => setSidebarOpen(false)}
          >
            Close
          </button>
          <a {...linkTo("home")} className="editorial-sidebar-wordmark" aria-label="Mantel home">
            Mantel.
            <small>Bahrain</small>
          </a>
          <div className="editorial-sidebar-tools">
            <button
              type="button"
              onClick={() => { setSidebarOpen(false); setSearchOpen(true); setAccountOpen(false); }}
              aria-label="Search"
            >
              <Search size={19} strokeWidth={1.4} />
            </button>
            <button
              type="button"
              onClick={() => { setSidebarOpen(false); setAccountOpen(true); setSearchOpen(false); }}
              aria-label="Account"
            >
              <User size={19} strokeWidth={1.4} />
            </button>
            <button
              type="button"
              onClick={() => { setSidebarOpen(false); setCartOpen(true); }}
              aria-label="Cart"
            >
              <ShoppingBag size={19} strokeWidth={1.4} />
            </button>
          </div>
        </div>

        {/* Drawer links */}
        <nav className="editorial-sidebar-links">
          <a
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            {...linkTo("menu")}
          >
            Menu
          </a>
          <a
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            {...linkTo("objects")}
          >
            Retail
          </a>
          <a
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            {...linkTo("story")}
          >
            About Us
          </a>
        </nav>

        {/* Drawer footer */}
        <div className="editorial-sidebar-footer">
          <a
            href="https://www.instagram.com/bymantel?igsi=MTk3NDhxZGVuNWFucA=="
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/60 hover:text-foreground transition-colors"
          >
                          <Instagram size={18} strokeWidth={1.4} />

          </a>
        </div>
      </div>

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

      <CartDrawer
        open={cartOpen}
        lines={cartLines}
        onClose={() => setCartOpen(false)}
        onIncrement={incrementCart}
        onDecrement={decrementCart}
        onRemove={removeFromCart}
      />

      {page === "home" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1">
            <Home linkTo={linkTo} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {/* ══ MENU PAGE ══ */}
      {page === "menu" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <Cafe sections={sections} category={menuCategory} loading={menuLoading} error={menuError} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}


      {/* ══ OBJECTS PAGE ══ */}
      {page === "objects" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1">
            <Objects linkTo={linkTo} cartLines={cartLines} onAdd={addToCart} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {page === "story" && (
        <main className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <Story linkTo={linkTo} />
          </div>
          <EditorialFooter linkTo={linkTo} />
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
          <EditorialFooter linkTo={linkTo} />
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
          <EditorialFooter linkTo={linkTo} />
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
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}
    </div>
  );
}
