import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { MenuItemRow } from "@/app/components/MenuItemRow";
import { OrderItemRow } from "@/app/components/OrderItemRow";
import { CartLineItem } from "@/app/components/CartLineItem";
import { PolicyPage } from "@/app/components/PolicyPage";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FAQ_ITEMS } from "@/app/content/legal";
import { ChevronDown, Instagram, Search, ShoppingBag, User, X } from "lucide-react";
import logoHeart from "@/imports/Logo-1.webp";
import logoWordmark from "@/imports/logos-05.webp";
import { supabase } from "@/lib/supabaseClient";
import { loadCart, loadProfile } from "@/lib/storage";
import { formatBD, CATEGORY_LABELS } from "@/lib/format";
import type { Page, MenuCategory, MenuItem, CartItem, Profile } from "@/app/types";
import { CONTACT_ENDPOINT } from "@/lib/constants";

// Shared style for primary CTAs across Homepage / Menu / Pickup, per ux-changes.md:
// solid white background (matching --background), foreground text for contrast,
// a visible border since white-on-white has no edge otherwise, smaller than the
// original size, with a focus-visible ring for keyboard accessibility.
const BRAND_BUTTON_CLASS =
  "rounded-full border-2 border-black bg-transparent text-foreground " +
  "font-display tracking-[0.16em] uppercase hover:bg-foreground/10 transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

// Heart-red CTA style for Menu / Pickup / Contact buttons — the homepage heart
// buttons stay white (BRAND_BUTTON_CLASS) since they sit ON the red heart and
// need contrast against it; buttons elsewhere sit on the plain white page, so
// heart-red gives them brand-colored contrast there instead.
const HEART_BUTTON_CLASS =
  "rounded-full bg-heart-red text-heart-red-foreground font-display tracking-[0.16em] uppercase " +
  "hover:opacity-90 transition-opacity " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heart-red";

export default function App() {
  const [page, setPage] = useState<Page>("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuCategory, setMenuCategory] = useState<MenuCategory>(null);
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

  /* ── cart (persisted) ── */
  const [cartOpen, setCartOpen] = useState(false);
  // Loaded through a sanitizer — localStorage is user-editable, so the shape
  // and bounds of every line are validated before reaching state.
  const [cart, setCart] = useState<CartItem[]>(() => loadCart("mantel-cart-v2"));
  const [orderStatus, setOrderStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  // Card-only for now — the "Order for Pick Up" button stays disabled until
  // the real payment gateway is wired in; kept as state for when it isn't.
  const [paymentMethod] = useState<"card">("card");
  const cartCount = cart.reduce((n, x) => n + x.qty, 0);
  const subtotal = cart.reduce((n, x) => n + x.price * x.qty, 0);

  /* ── account (persisted) ── */
  const [accountOpen, setAccountOpen] = useState(false);

  /* ── small popovers: footer "Terms and Policies" + nav locale pill ── */
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const [localeOpen, setLocaleOpen] = useState(false);

  const [profile, setProfile] = useState<Profile | null>(() => loadProfile("mantel-profile"));
  const [profileDraft, setProfileDraft] = useState<Profile>({ name: "", email: "" });

  useEffect(() => {
    localStorage.setItem("mantel-cart-v2", JSON.stringify(cart));
  }, [cart]);

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
        setCartOpen(false);
        setPoliciesOpen(false);
        setLocaleOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const goTo = (p: Page) => {
    setPage(p);
    setMenuCategory(null);
    setSidebarOpen(false);
    setSearchOpen(false);
    setAccountOpen(false);
    setCartOpen(false);
    setPoliciesOpen(false);
    setLocaleOpen(false);
    window.scrollTo(0, 0);
    if (p === "order") setOrderStatus("idle");
  };

  const addToCart = (item: MenuItem) =>
    setCart((c) => {
      const found = c.find((x) => x.id === item.id);
      return found
        ? c.map((x) => (x.id === item.id ? { ...x, qty: x.qty + 1 } : x))
        : [...c, { id: item.id, name: item.name, price: item.price, qty: 1 }];
    });

  const changeQty = (id: string, delta: number) =>
    setCart((c) =>
      c.flatMap((x) =>
        x.id === id ? (x.qty + delta <= 0 ? [] : [{ ...x, qty: x.qty + delta }]) : [x],
      ),
    );

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

  const placeOrder = async () => {
    setOrderStatus("sending");
    try {
      // Server-priced, atomic order placement (supabase/003) — the client only
      // sends item ids and quantities; prices, names, and the subtotal are
      // resolved from menu_items inside the database, so cart tampering can't
      // change what an order costs.
      const { error } = await supabase.rpc("place_order", {
        items: cart.map((x) => ({ menu_item_id: x.id, qty: x.qty })),
        customer_name: profile?.name || "Guest",
        customer_email: profile?.email || null,
        payment_method: paymentMethod,
      });
      if (error) throw error;

      // Best-effort owner notification — a failed email shouldn't undo an
      // already-recorded order; the Supabase row is the durable record.
      try {
        await fetch(CONTACT_ENDPOINT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Accept: "application/json" },
          body: JSON.stringify({
            name: profile?.name || "Guest",
            email: profile?.email || "",
            order: cart.map((x) => `${x.qty} × ${x.name} (${formatBD(x.price)})`).join(" | "),
            total: formatBD(subtotal),
            _subject: "MANTEL pick-up order",
            _captcha: "false",
            _template: "table",
          }),
        });
      } catch (emailErr) {
        console.warn("Order saved but notification email failed:", emailErr);
      }

      setOrderStatus("sent");
      setCart([]);
    } catch {
      setOrderStatus("error");
    }
  };

  const navHeight = "57px";

  /* ── shared footer ── */
  const footer = (
    <footer className="flex flex-col items-center gap-4 pb-10 pt-6">
      <a
        href="https://www.instagram.com/mantelbh/"
        target="_blank"
        rel="noopener noreferrer"
        className="text-foreground/60 hover:text-foreground transition-colors"
        aria-label="Instagram"
      >
        <Instagram size={20} strokeWidth={1.5} />
      </a>

      {/* Terms and Policies — trigger + upward popover, per the reference */}
      <div className="relative">
        {policiesOpen && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white border border-border rounded-2xl shadow-lg py-2 z-50">
            {(
              [
                ["Privacy policy", "privacy"],
                ["Terms of service", "terms"],
                ["Refund policy", "refund"],
                ["FAQ", "faq"],
                ["Contact information", "contact"],
              ] as [string, Page][]
            ).map(([label, target]) => (
              <button
                key={target}
                onClick={() => goTo(target)}
                className="w-full text-left px-5 py-2 text-sm hover:bg-foreground/5 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setPoliciesOpen((v) => !v)}
          className="text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Terms and Policies
        </button>
      </div>

      <p className="font-display text-[13px] text-muted-foreground tracking-wide">© 2026, Mantel</p>
    </footer>
  );

  return (
    <div className="bg-white text-foreground font-body min-h-screen">

      {/* ══ NAV ══ */}
      <nav
        className="fixed top-0 inset-x-0 z-50 bg-white border-b border-border"
        style={{ height: navHeight }}
      >
        <div className="flex items-center justify-between h-full px-5 md:px-8">
          {/* Left: hamburger + wordmark */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex flex-col gap-[5px] p-1 hover:opacity-60 transition-opacity"
              aria-label="Open navigation"
            >
              <span className="block w-[18px] h-px bg-foreground" />
              <span className="block w-[18px] h-px bg-foreground" />
              <span className="block w-[18px] h-px bg-foreground" />
            </button>
            <button onClick={() => goTo("home")} className="hover:opacity-80 transition-opacity">
              <ImageWithFallback
                src={logoWordmark}
                alt="Mantel"
                className="h-[26px] w-auto object-contain"
              />
            </button>
          </div>

          {/* Right: icons */}
          <div className="flex items-center gap-4 text-foreground/70">
            {/* Locale pill — single locale for now (Bahrain / BD / English),
                shown as a dropdown to match the reference layout */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => { setLocaleOpen((v) => !v); setSearchOpen(false); setAccountOpen(false); setCartOpen(false); }}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                aria-label="Country and language"
              >
                <span className="text-[14px] leading-none">🇧🇭</span>
                <span className="text-[12px] tracking-wide">BD / EN</span>
                <ChevronDown
                  size={12}
                  strokeWidth={1.5}
                  className={`transition-transform duration-200 ${localeOpen ? "rotate-180" : ""}`}
                />
              </button>
              {localeOpen && (
                <div className="absolute right-0 top-full mt-3 w-56 bg-white border border-border rounded-2xl shadow-lg px-5 py-4 z-50">
                  <p className="text-sm text-foreground">🇧🇭 Bahrain — BD · English</p>
                  <p className="text-[11px] text-muted-foreground mt-1.5">
                    More regions and languages coming soon.
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => { setSearchOpen((v) => !v); setAccountOpen(false); setCartOpen(false); setLocaleOpen(false); }}
              className="hover:text-foreground transition-colors"
              aria-label="Search"
            >
              <Search size={17} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => {
                setAccountOpen((v) => !v);
                setSearchOpen(false);
                setCartOpen(false);
                setLocaleOpen(false);
                if (profile) setProfileDraft(profile);
              }}
              className="hover:text-foreground transition-colors"
              aria-label="Account"
            >
              <User size={17} strokeWidth={1.5} />
            </button>
            <button
              onClick={() => { setCartOpen((v) => !v); setSearchOpen(false); setAccountOpen(false); setLocaleOpen(false); setOrderStatus("idle"); }}
              className="relative hover:text-foreground transition-colors"
              aria-label="Cart"
            >
              <ShoppingBag size={17} strokeWidth={1.5} />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 rounded-full bg-heart-red text-heart-red-foreground text-[9px] leading-[15px] text-center font-medium">
                  {cartCount}
                </span>
              )}
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
          <ImageWithFallback
            src={logoWordmark}
            alt="Mantel"
            className="h-[21px] w-auto object-contain"
          />
          <div className="w-[18px]" />
        </div>

        {/* Drawer links */}
        <nav className="flex flex-col px-5 pt-7 gap-5 flex-1">
          <button
            className="text-left font-display text-2xl text-foreground hover:opacity-50 transition-opacity"
            onClick={() => goTo("menu")}
          >
            Menu
          </button>
          <button
            className="text-left font-display text-2xl text-foreground hover:opacity-50 transition-opacity"
            onClick={() => goTo("contact")}
          >
            Contact
          </button>
          <button
            className="text-left font-display text-2xl text-foreground hover:opacity-50 transition-opacity"
            onClick={() => goTo("home")}
          >
            Our Story
          </button>
          <button
            className="text-left group"
            onClick={() => goTo("order")}
          >
            <span className="block font-display text-2xl text-foreground group-hover:opacity-50 transition-opacity">
              Pick Up
            </span>
            <span className="block font-body text-[11px] tracking-wide text-muted-foreground mt-0.5">
              order before you reach
            </span>
          </button>
          <button
            className="text-left font-display text-2xl text-foreground hover:opacity-50 transition-opacity"
            onClick={() => goTo("faq")}
          >
            FAQ
          </button>
        </nav>

        {/* Drawer footer */}
        <div className="px-5 pb-6">
          <a
            href="https://www.instagram.com/mantelbh/"
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
                className="flex-1 rounded-full border border-border bg-white px-5 py-2.5 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
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
                  <p className="py-4 text-sm text-muted-foreground">No matches — try “latte” or “croissant”.</p>
                ) : (
                  results.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        goTo("menu");
                        setMenuCategory(item.category);
                        setQuery("");
                      }}
                      className="w-full py-3 flex justify-between items-center gap-4 text-left hover:opacity-60 transition-opacity"
                    >
                      <span>
                        <span className="block text-[14px] font-medium">{item.name}</span>
                        <span className="block text-[11px] tracking-[0.14em] uppercase text-muted-foreground mt-0.5">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      </span>
                      <span className="text-[13px] shrink-0">{formatBD(item.price)}</span>
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
              <p className="font-display text-xl">Hi, {profile.name}</p>
              <p className="text-xs text-muted-foreground -mt-2">{profile.email}</p>
              <p className="text-xs text-muted-foreground">
                Your details pre-fill the contact form and pick-up orders on this device.
              </p>
              <button
                onClick={() => { setProfile(null); setProfileDraft({ name: "", email: "" }); }}
                className="self-start text-[11px] tracking-[0.14em] uppercase text-muted-foreground hover:text-foreground transition-colors"
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
              <p className="font-display text-xl mb-1">Your details</p>
              <input
                type="text"
                placeholder="Name"
                required
                maxLength={120}
                value={profileDraft.name}
                onChange={(e) => setProfileDraft((d) => ({ ...d, name: e.target.value }))}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
              />
              <input
                type="email"
                placeholder="Email"
                required
                maxLength={254}
                value={profileDraft.email}
                onChange={(e) => setProfileDraft((d) => ({ ...d, email: e.target.value }))}
                className="rounded-full border border-border bg-white px-4 py-2 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
              />
              <button
                type="submit"
                className={`mt-1 px-6 py-2 text-sm self-start ${HEART_BUTTON_CLASS}`}
              >
                Save
              </button>
              <p className="text-[11px] text-muted-foreground">
                Saved on this device only — used to pre-fill forms and orders.
              </p>
            </form>
          )}
        </div>
      )}

      {/* ══ CART DRAWER ══ */}
      {/* Quick-glance view of the bag, separate from the full "Order Before
          Reach" page (reachable via the sidebar's Pick Up link) */}
      <div
        className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${
          cartOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={() => setCartOpen(false)}
      />
      <div
        className={`fixed top-0 right-0 z-50 h-full bg-white flex flex-col transition-transform duration-300 ease-in-out ${
          cartOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ width: "320px", maxWidth: "90vw" }}
      >
        <div
          className="flex items-center justify-between px-5 border-b border-border shrink-0"
          style={{ height: navHeight }}
        >
          <p className="font-display text-xl">Your Bag</p>
          <button
            onClick={() => setCartOpen(false)}
            className="hover:opacity-60 transition-opacity"
            aria-label="Close cart"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {orderStatus === "sent" ? (
            <p className="text-sm text-muted-foreground pt-6 text-center">
              Order received — it{"'"}ll be ready when you reach. 💌
            </p>
          ) : cart.length === 0 ? (
            <p className="text-sm text-muted-foreground pt-6 text-center">
              Your bag is empty — add something from Order Before Reach.
            </p>
          ) : (
            <div className="divide-y divide-border">
              {cart.map((x) => (
                <CartLineItem key={x.id} item={x} onChangeQty={changeQty} />
              ))}
            </div>
          )}
        </div>

        {cart.length > 0 && orderStatus !== "sent" && (
          <div className="px-5 pb-6 pt-4 border-t border-border shrink-0 flex flex-col gap-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium">{formatBD(subtotal)}</span>
            </div>
            <button
              onClick={() => goTo("order")}
              className={`w-full py-2.5 text-sm ${HEART_BUTTON_CLASS}`}
            >
              Go to Order Before Reach
            </button>
          </div>
        )}
      </div>

      {/* ══ HOME PAGE ══ */}
      {page === "home" && (
        <main className="relative h-screen overflow-hidden">
          {/* Heart fills the full space below the nav — footer is overlaid
              below (not a flex sibling), so it no longer eats into the
              heart's available height */}
          <div
            className="absolute inset-x-0 bottom-0 flex items-center justify-center"
            style={{ top: navHeight }}
          >
            <div className="relative flex items-center justify-center h-full w-full">
              <ImageWithFallback
                src={logoHeart}
                alt="Mantel heart"
                className="h-full w-auto object-contain"
              />
              {/* Overlaid buttons — nudged slightly left of dead-center.
                  Sized down on phones so they stay inside the smaller heart. */}
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 sm:gap-3 -translate-x-2 sm:-translate-x-4">
                <button
                  onClick={() => goTo("contact")}
                  className={`px-4 py-1.5 text-xs sm:px-6 sm:py-2 sm:text-base ${BRAND_BUTTON_CLASS}`}
                >
                  Our Story
                </button>
                <button
                  onClick={() => goTo("menu")}
                  className={`px-4 py-1.5 text-xs sm:px-6 sm:py-2 sm:text-base ${BRAND_BUTTON_CLASS}`}
                >
                  Menu
                </button>
              </div>
            </div>
          </div>
          <div className="absolute bottom-0 inset-x-0">
            {footer}
          </div>
        </main>
      )}

      {/* ══ MENU PAGE ══ */}
      {page === "menu" && (
        <main
          className="flex flex-col min-h-screen"
          style={{ paddingTop: navHeight }}
        >
          {menuLoading ? (
            <div className="flex-1 flex items-center justify-center py-24">
              <p className="text-sm text-muted-foreground">Loading menu…</p>
            </div>
          ) : menuError ? (
            <div className="flex-1 flex items-center justify-center py-24">
              <p className="text-sm text-muted-foreground">
                Couldn{"'"}t load the menu right now — please try again shortly.
              </p>
            </div>
          ) : menuCategory === null ? (
            /* Category selection — two blush pills centered in whitespace */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
              <button
                onClick={() => setMenuCategory("coffee")}
                className={`px-6 py-2 text-sm ${HEART_BUTTON_CLASS}`}
              >
                {CATEGORY_LABELS.coffee}
              </button>
              <button
                onClick={() => setMenuCategory("food")}
                className={`px-6 py-2 text-sm ${HEART_BUTTON_CLASS}`}
              >
                {CATEGORY_LABELS.food}
              </button>
            </div>
          ) : (
            /* Menu items list */
            <div className="flex-1 max-w-xl mx-auto w-full px-6 py-14">
              <button
                onClick={() => setMenuCategory(null)}
                className="text-[11px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10 flex items-center gap-2"
              >
                ← Back
              </button>
              <h2 className="font-display text-2xl font-semibold mb-8">
                {CATEGORY_LABELS[menuCategory]}
              </h2>
              <div className="divide-y divide-border">
                {(menuCategory === "coffee" ? coffeeItems : foodItems).map((item) => (
                  <MenuItemRow key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}
          {footer}
        </main>
      )}

      {/* ══ ORDER BEFORE REACH PAGE ══ */}
      {/* All ordering (browse-and-add, cart, payment, checkout) lives only
          here, per ux-changes.md — the Menu page above is display-only. */}
      {page === "order" && (
        <main
          className="flex flex-col min-h-screen"
          style={{ paddingTop: navHeight }}
        >
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 py-14">
            <h1 className="font-display text-3xl font-semibold mb-2">Order Before Reach</h1>
            <p className="text-sm text-muted-foreground mb-10">order before you reach</p>

            {menuLoading ? (
              <p className="text-sm text-muted-foreground py-12 text-center">Loading menu…</p>
            ) : menuError ? (
              <p className="text-sm text-muted-foreground py-12 text-center">
                Couldn{"'"}t load the menu right now — please try again shortly.
              </p>
            ) : (
              <>
                {/* Browse + add */}
                <section className="mb-12">
                  <h2 className="font-display text-xl font-semibold mb-4">
                    {CATEGORY_LABELS.coffee}
                  </h2>
                  <div className="divide-y divide-border mb-10">
                    {coffeeItems.map((item) => (
                      <OrderItemRow key={item.id} item={item} onAdd={addToCart} />
                    ))}
                  </div>
                  <h2 className="font-display text-xl font-semibold mb-4">
                    {CATEGORY_LABELS.food}
                  </h2>
                  <div className="divide-y divide-border">
                    {foodItems.map((item) => (
                      <OrderItemRow key={item.id} item={item} onAdd={addToCart} />
                    ))}
                  </div>
                </section>

                {/* Cart + checkout */}
                <section className="border-t border-border pt-8">
                  <h2 className="font-display text-xl font-semibold mb-4">Your Bag</h2>

                  {orderStatus === "sent" ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Order received — it{"'"}ll be ready when you reach. 💌
                    </p>
                  ) : cart.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-6 text-center">
                      Your bag is empty — add something above.
                    </p>
                  ) : (
                    <>
                      <div className="divide-y divide-border mb-4">
                        {cart.map((x) => (
                          <CartLineItem key={x.id} item={x} onChangeQty={changeQty} />
                        ))}
                      </div>

                      <div className="flex flex-col gap-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-medium">{formatBD(subtotal)}</span>
                        </div>

                        {/* Payment method — card-only; disabled until the
                            payment gateway your company is building is
                            wired in */}
                        <div className="flex flex-col gap-1.5">
                          <span className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground">
                            Payment
                          </span>
                          <button
                            type="button"
                            disabled
                            title="Card payment is coming soon"
                            className="w-full py-2 rounded-full border border-border text-xs text-muted-foreground/50 cursor-not-allowed"
                          >
                            Card — Coming Soon
                          </button>
                        </div>

                        {orderStatus === "error" && (
                          <p className="text-xs text-destructive">
                            Couldn{"'"}t place the order — please try again.
                          </p>
                        )}
                        <button
                          onClick={placeOrder}
                          disabled
                          className={`w-full py-2.5 text-sm disabled:opacity-60 ${HEART_BUTTON_CLASS}`}
                        >
                          Ordering Opens Soon
                        </button>
                        <p className="text-[11px] text-muted-foreground text-center">
                          Online ordering is launching shortly — check back soon.
                        </p>
                      </div>
                    </>
                  )}
                </section>
              </>
            )}
          </div>
          {footer}
        </main>
      )}

      {/* ══ CONTACT PAGE ══ */}
      {page === "contact" && (
        <main
          className="min-h-screen flex flex-col"
          style={{ paddingTop: navHeight }}
        >
          <div className="flex-1 max-w-2xl w-full mx-auto px-6 pt-14 pb-16">
            <h1
              className="font-display font-bold italic mb-14"
              style={{ fontSize: "clamp(2.8rem, 8vw, 4.5rem)", lineHeight: 1.05, color: "#3a0d1e" }}
            >
              Contact
            </h1>

            {sent ? (
              <div className="py-12 text-center">
                <p className="text-muted-foreground text-sm tracking-wide">
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
                    className="flex-1 min-w-0 rounded-full border border-border bg-white px-5 py-3 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="flex-1 min-w-0 rounded-full border border-border bg-white px-5 py-3 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>

                {/* Phone */}
                <input
                  type="tel"
                  placeholder="Phone number"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rounded-full border border-border bg-white px-5 py-3 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                />

                {/* Comment */}
                <textarea
                  placeholder="Comment"
                  rows={5}
                  maxLength={2000}
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  className="rounded-3xl border border-border bg-white px-5 py-4 text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors resize-none"
                />

                {sendError && <p className="text-xs text-destructive">{sendError}</p>}
                <div className="mt-1">
                  <button
                    type="submit"
                    disabled={sending}
                    className={`px-9 py-3 text-sm disabled:opacity-60 ${HEART_BUTTON_CLASS}`}
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
            <h1 className="font-display text-5xl font-semibold mb-12">FAQ</h1>
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
