import { useEffect, useRef, useState } from "react";
import { PolicyPage } from "@/app/components/PolicyPage";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FAQ_ITEMS } from "@/app/content/legal";
import { Instagram, Search, ShoppingBag, User } from "lucide-react";
import { fetchMenu, groupByCategory } from "@/lib/api/menu";
import { Home } from "@/app/pages/Home";
import { Objects } from "@/app/pages/Objects";
import { RETAIL_PRODUCTS } from "@/app/content/retail";
import { fetchObjects } from "@/lib/api/objects";
import { CartDrawer, type CheckoutDetails } from "@/app/components/cart/CartDrawer";
import type { CartLine, CartProduct, RetailProduct } from "@/app/content/retail";
import { placeOrder, type PlaceOrderResult } from "@/lib/api/orders";
import { EditorialFooter } from "@/app/components/EditorialFooter";
import { Cafe } from "@/app/pages/Cafe";
import { PickUp } from "@/app/pages/PickUp";
import { Story } from "@/app/pages/Story";
import { ContactUs, type ContactForm } from "@/app/pages/ContactUs";
import { AdminDashboard } from "@/app/pages/AdminDashboard";
import { useScrolled } from "@/app/hooks/useScrolled";
import { SearchOverlay } from "@/app/components/SearchOverlay";
import { AccountPanel } from "@/app/components/account/AccountPanel";
import { getSession, onAuthChange, fetchProfile } from "@/lib/api/auth";
import type { Session } from "@supabase/supabase-js";
import type { Page, MenuCategory, MenuItem } from "@/app/types";
import { pathFor, routeFor } from "@/lib/routes";
import { ORDERING_OPEN } from "@/lib/constants";
import { formErrorMessage, submitContactMessage } from "@/lib/api/forms";
import { useDialogFocus } from "@/app/hooks/useDialogFocus";

const CART_STORAGE_KEY = "mantel-cart-v1";
const SITE_ORIGIN = "https://bymantel.com";

const SEO_BY_PAGE: Record<Page, { title: string; description: string }> = {
  home: { title: "Mantel — Hidd, Kingdom of Bahrain", description: "Mantel is a café and small house of objects in Hidd, Bahrain. Coffee poured at the counter, candles and small things chosen to be used and kept." },
  menu: { title: "Menu — Mantel Bahrain", description: "Coffee, food, aqua, sandwiches, and desserts served at Mantel in Hidd, Bahrain." },
  pickup: { title: "Order Before Reach — Mantel Bahrain", description: "Order ahead for pick-up at Mantel in Hidd, Bahrain — add what you want and collect it at the counter." },
  objects: { title: "Retail — Mantel Bahrain", description: "Small objects for the ritual around coffee: matcha powder, candles, candle sticks, lighters, matches, and more from Mantel." },
  story: { title: "About Us — Mantel Bahrain", description: "The story of Mantel, a café and small house of objects in Hidd, Kingdom of Bahrain." },
  contact: { title: "Contact Us — Mantel Bahrain", description: "Contact Mantel in Bahrain for café, retail, wholesale, press, and customer-care enquiries." },
  faq: { title: "FAQ — Mantel Bahrain", description: "Answers to common questions about Mantel café, pickup, retail objects, and customer care." },
  privacy: { title: "Privacy — Mantel Bahrain", description: "Mantel’s privacy information and customer data practices." },
  terms: { title: "Terms — Mantel Bahrain", description: "Mantel’s terms of service for café and retail interactions." },
  refund: { title: "Refund Policy — Mantel Bahrain", description: "Mantel’s refund and cancellation information." },
  admin: { title: "Staff Dashboard — Mantel", description: "Protected Mantel staff operations dashboard." },
};

/*
 * A menu_items row and an objects row already meet server-side, in the
 * `sellables` view place_order reads from (supabase/009) — a menu item's own
 * id IS the id that view and the RPC expect, unlike a retail product, which
 * only gets a usable backendId once matched against the fetched objects list.
 */
function menuItemToCartProduct(item: MenuItem): CartProduct {
  return {
    id: item.id,
    backendId: item.id,
    name: item.name,
    price: item.price,
    image: item.image_url,
  };
}

function updateMeta(attribute: "name" | "property", key: string, content: string) {
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
}

export default function App() {
  // Boot from the URL, not from a hardcoded "home", so a deep link or a
  // refresh lands where it says it does.
  const [page, setPage] = useState<Page>(() => routeFor(window.location.pathname).page);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  useDialogFocus(sidebarOpen, sidebarRef, () => setSidebarOpen(false));
  const [cartOpen, setCartOpen] = useState(false);
  const [cartLines, setCartLines] = useState<CartLine[]>([]);
  const [retailProducts, setRetailProducts] = useState<RetailProduct[]>(RETAIL_PRODUCTS);
  const [retailLoading, setRetailLoading] = useState(true);
  const [retailError, setRetailError] = useState(false);
  const [cartHydrated, setCartHydrated] = useState(false);
  const [menuCategory, setMenuCategory] = useState<MenuCategory>(
    () => routeFor(window.location.pathname).menuCategory,
  );
  const [form, setForm] = useState<ContactForm>({ name: "", lastName: "", email: "", phone: "", comment: "" });
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");

  /* ── menu data (from Supabase) ── */
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [menuError, setMenuError] = useState(false);

  useEffect(() => {
    let live = true;
    fetchObjects().then((result) => {
      if (!live) return;
      if (result.ok) {
        const byName = new Map(result.objects.map((object) => [object.name.toLowerCase(), object]));
        const byAlias = new Map([
          ["matcha powder", "matcha refill"],
          ["candles", "scented candle"],
          ["match sticks", "safety matches"],
          ["lighters", "cold brew"],
        ]);
        const merged = RETAIL_PRODUCTS.map((product) => {
          const source = byName.get(product.name.toLowerCase()) ?? byName.get(byAlias.get(product.name.toLowerCase()) ?? "");
          return source
            ? { ...product, backendId: source.id, price: Number(source.price), description: source.description || product.description }
            : product;
        });
        setRetailProducts(merged);
      } else {
        setRetailError(true);
      }
      setRetailLoading(false);
    });
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

  useEffect(() => {
    // Waits on both catalogs: a cart saved with a café line would otherwise
    // rehydrate before menuItems arrives and silently drop that line.
    if (retailLoading || menuLoading) return;
    try {
      const saved = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "null");
      if (Array.isArray(saved)) {
        const productsById = new Map<string, CartProduct>();
        for (const product of retailProducts) productsById.set(product.id, product);
        for (const item of menuItems) productsById.set(item.id, menuItemToCartProduct(item));
        const restored = saved.flatMap((entry) => {
          if (!entry || typeof entry.productId !== "string") return [];
          const product = productsById.get(entry.productId);
          const quantity = Number(entry.quantity);
          if (!product || !Number.isInteger(quantity) || quantity < 1) return [];
          return [{ product, quantity: Math.min(quantity, 50) }];
        });
        setCartLines(restored);
      }
    } catch {
      // A blocked or malformed localStorage value should never stop the store.
    }
    setCartHydrated(true);
  }, [retailLoading, retailProducts, menuLoading, menuItems]);

  useEffect(() => {
    if (!cartHydrated) return;
    try {
      window.localStorage.setItem(
        CART_STORAGE_KEY,
        JSON.stringify(cartLines.map((line) => ({ productId: line.product.id, quantity: line.quantity }))),
      );
    } catch {
      // Persistence is an enhancement; checkout still works when storage is blocked.
    }
  }, [cartLines, cartHydrated]);

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

  useEffect(() => {
    const seo = SEO_BY_PAGE[page];
    const canonicalPath = pathFor(page, page === "menu" ? menuCategory : null);
    const canonicalUrl = `${SITE_ORIGIN}${canonicalPath === "/" ? "/" : canonicalPath}`;
    document.title = seo.title;
    updateMeta("name", "description", seo.description);
    updateMeta("name", "robots", page === "admin" ? "noindex,nofollow" : "index,follow");
    updateMeta("property", "og:title", seo.title);
    updateMeta("property", "og:description", seo.description);
    updateMeta("property", "og:url", canonicalUrl);
    updateMeta("property", "og:site_name", "Mantel");
    const canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (canonical) canonical.href = canonicalUrl;
  }, [page, menuCategory]);

  useEffect(() => {
    const overlayOpen = sidebarOpen || searchOpen || accountOpen || cartOpen;
    const previousOverflow = document.body.style.overflow;
    if (overlayOpen) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen, searchOpen, accountOpen, cartOpen]);

  /*
   * Props for anything that navigates. These are real anchors with real hrefs,
   * so they can be copied, bookmarked, opened in a new tab and read by
   * crawlers. The click handler only takes over the plain left-click —
   * modified clicks fall through to the browser so ⌘-click still opens a tab.
   */
  const addToCart = (product: CartProduct) => {
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

  const submitCartOrder = async (details: CheckoutDetails): Promise<PlaceOrderResult> => {
    const missingBackendId = cartLines.find((line) => !line.product.backendId);
    if (missingBackendId) {
      return { ok: false, error: { kind: "unknown", message: "This item is not available for ordering yet." } };
    }
    const result = await placeOrder({
      lines: cartLines.map((line) => ({ menuItemId: line.product.backendId as string, qty: line.quantity })),
      customerName: details.customerName,
      customerEmail: details.customerEmail || null,
      customerPhone: details.customerPhone || null,
      paymentMethod: "cash",
    });
    if (result.ok) setCartLines([]);
    return result;
  };

  const linkTo = (p: Page, category: MenuCategory = null) => ({
    href: pathFor(p, category),
    onClick: (e: React.MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0) return;
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      goTo(p, category);
    },
  });

  // Anti-abuse for the public Contact RPC: the hidden honeypot drops obvious
  // automated submissions, while the RPC applies server-side validation and
  // rate limits. The client cooldown keeps the send button from being hammered.
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
    if (honeypot.trim()) {
      setSent(true);
      setSending(false);
      return;
    }
    const result = await submitContactMessage({
      firstName: form.name,
      lastName: form.lastName,
      email: form.email,
      phone: form.phone,
      message: form.comment,
    });
    if (!result.ok) {
      setSendError(formErrorMessage(result.error));
    } else {
      lastSentAt.current = Date.now();
      setSent(true);
    }
    setSending(false);
  };


  // 22px wordmark + the 7px sub-line under it, centred in the 20px of vertical
  // padding the header spec asks for. The hero reads this to size its stage.
  const navHeight = "58px";
  /* Contracted: the wordmark alone, at 16px, with the locality line collapsed. */
  const SCROLLED_NAV_HEIGHT = "54px";

  /* Footer rendering lives in EditorialFooter so all routes share the same editorial shell. */

  return (
    <div className="bg-background text-foreground font-mono font-normal min-h-screen">

      <a className="editorial-skip-link" href="#main-content">Skip to content</a>

      {/* ══ NAV ══ */}
      <header className="editorial-nav">
        <div className="editorial-nav-inner">
          <div className="editorial-nav-left">
            <button
              onClick={() => setSidebarOpen((open) => !open)}
              className="editorial-mobile-trigger"
                            aria-label={sidebarOpen ? "Close navigation" : "Open navigation"}
              aria-expanded={sidebarOpen}
              aria-controls="mantel-mobile-drawer"
              >

              <span className="sr-only">{sidebarOpen ? "Close navigation" : "Open navigation"}</span>
              <span aria-hidden="true">☰</span>
            </button>
            <nav className="editorial-nav-primary" aria-label="Primary">
              <a {...linkTo("menu")} className="editorial-nav-link">Menu</a>
              <a {...linkTo("pickup")} className="editorial-nav-link">Pick Up</a>
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
              aria-expanded={searchOpen}
              aria-controls="mantel-search-overlay"
            >
              <Search size={16} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => { setAccountOpen((value) => !value); setSearchOpen(false); }}
              className="editorial-nav-action"
              aria-label="Account"
              aria-expanded={accountOpen}
              aria-controls="mantel-account-panel"
            >
              <User size={16} strokeWidth={1.5} className="sm:hidden" />
              <span>Account</span>
            </button>
            <button
              type="button"
              className="editorial-nav-action editorial-nav-icon relative"
              aria-label={`Cart${cartCount > 0 ? `, ${cartCount} item${cartCount === 1 ? "" : "s"}` : ""}`}
              aria-expanded={cartOpen}
              aria-controls="mantel-cart-drawer"
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
        id="mantel-mobile-drawer"
        ref={sidebarRef}
        className={`fixed inset-0 z-[70] bg-background flex flex-col transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mantel-mobile-drawer-title"
        tabIndex={-1}
      >
        <div className="editorial-sidebar-header">
          <button
            type="button"
            className="editorial-sidebar-close"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation"
          >
            Close
          </button>
          <a {...linkTo("home")} className="editorial-sidebar-wordmark" aria-label="Mantel home" id="mantel-mobile-drawer-title">
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
            {...linkTo("pickup")}
          >
            Pick Up
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
            id="mantel-search-overlay"
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
            id="mantel-account-panel"
            session={session}

          recovering={recovering}
          navHeight={scrolled ? SCROLLED_NAV_HEIGHT : navHeight}
          onClose={() => { setAccountOpen(false); setRecovering(false); }}
        />
      )}

      <CartDrawer
        id="mantel-cart-drawer"
        open={cartOpen}
        lines={cartLines}
        orderingOpen={ORDERING_OPEN}
        onClose={() => setCartOpen(false)}
        onIncrement={incrementCart}
        onDecrement={decrementCart}
        onRemove={removeFromCart}
        onCheckout={submitCartOrder}
      />

      {page === "home" && (
        <main id="main-content" className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1">
            <Home linkTo={linkTo} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {/* ══ MENU PAGE ══ */}
      {page === "menu" && (
        <main id="main-content" className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <Cafe linkTo={linkTo} sections={sections} category={menuCategory} loading={menuLoading} error={menuError} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {/* ══ PICK UP / ORDER BEFORE REACH PAGE ══ */}
      {page === "pickup" && (
        <main id="main-content" className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <PickUp
              linkTo={linkTo}
              sections={sections}
              loading={menuLoading}
              error={menuError}
              cartLines={cartLines}
              onAdd={(item) => addToCart(menuItemToCartProduct(item))}
              onIncrement={incrementCart}
              onDecrement={decrementCart}
            />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {/* ══ OBJECTS PAGE ══ */}
      {page === "objects" && (
        <main id="main-content" className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1">
            <Objects linkTo={linkTo} products={retailProducts} loading={retailLoading} error={retailError} cartLines={cartLines} onAdd={addToCart} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {page === "story" && (
        <main id="main-content" className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1 px-[var(--pad)]">
            <Story linkTo={linkTo} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {page === "contact" && (
        <main id="main-content" className="editorial-page-shell min-h-screen flex flex-col" style={{ paddingTop: navHeight }}>
          <div className="flex-1">
            <ContactUs
              linkTo={linkTo}
              form={form}
              setForm={setForm}
              honeypot={honeypot}
              setHoneypot={setHoneypot}
              sent={sent}
              sending={sending}
              sendError={sendError}
              submitContact={submitContact}
            />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </main>
      )}

      {page === "admin" && (
        <div className="flex flex-col min-h-screen" style={{ paddingTop: navHeight }}>
          <div className="flex-1">
            <AdminDashboard session={session} onRequireSignIn={() => setAccountOpen(true)} />
          </div>
          <EditorialFooter linkTo={linkTo} />
        </div>
      )}

      {/* ══ FAQ PAGE ══ */}
      {page === "faq" && (
        <main id="main-content" className="min-h-screen flex flex-col" style={{ paddingTop: navHeight }}>
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
        <main id="main-content" className="min-h-screen flex flex-col" style={{ paddingTop: navHeight }}>
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
