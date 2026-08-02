import { useEffect, useRef, useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { MenuItemRow } from "@/app/components/MenuItemRow";
import { PolicyPage } from "@/app/components/PolicyPage";
import { FaqAccordion } from "@/app/components/FaqAccordion";
import { NewsletterSignup } from "@/app/components/NewsletterSignup";
import { PRIVACY_POLICY, TERMS_OF_SERVICE, REFUND_POLICY, FAQ_ITEMS } from "@/app/content/legal";
import { ArrowLeft, ChevronDown, Instagram, Search, User, X } from "lucide-react";
import logoHeart from "@/imports/Logo-1.webp";
import { supabase } from "@/lib/supabaseClient";
import { loadProfile } from "@/lib/storage";
import { formatBD, CATEGORY_LABELS } from "@/lib/format";
import type { Page, MenuCategory, MenuItem, Profile } from "@/app/types";
import { CONTACT_ENDPOINT } from "@/lib/constants";

// Shared style for primary CTAs across Homepage / Menu / Pickup, per ux-changes.md:
// solid white background (matching --background), foreground text for contrast,
// a visible border since white-on-white has no edge otherwise, smaller than the
// original size, with a focus-visible ring for keyboard accessibility.
// The families are deliberately NOT baked into these two constants: most
// buttons are Fira Mono Medium, but the Menu category pills are EB Garamond
// Regular. Tailwind can't resolve two competing `font-*` utilities in one
// class string, so each call site names its own family + weight.
const BRAND_BUTTON_CLASS =
  "rounded-full border-2 border-black bg-transparent text-foreground " +
  "tracking-[0.16em] uppercase hover:bg-foreground/10 transition-colors " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground";

// Heart-red CTA style for Menu / Pickup / Contact buttons — the homepage heart
// buttons stay white (BRAND_BUTTON_CLASS) since they sit ON the red heart and
// need contrast against it; buttons elsewhere sit on the plain white page, so
// heart-red gives them brand-colored contrast there instead.
const HEART_BUTTON_CLASS =
  "rounded-full bg-heart-red text-heart-red-foreground tracking-[0.16em] uppercase " +
  "hover:opacity-90 transition-opacity " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-heart-red";

// Intrinsic size of the heart artwork. The canvas is padded on the left so the
// heart's tip lands at exactly 50% width — the tip, the CTAs and the footer
// then share one vertical axis.
const HEART_W = 1515;
const HEART_H = 1540;

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


  /* ── account (persisted) ── */
  const [accountOpen, setAccountOpen] = useState(false);

  /* ── small popovers: footer "Terms and Policies" + nav locale pill ── */
  const [policiesOpen, setPoliciesOpen] = useState(false);
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
    setPoliciesOpen(false);
    setLocaleOpen(false);
    window.scrollTo(0, 0);
  };

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

  /* The heart is object-contained, so its rendered height is whichever of the
     available height / width-derived height is smaller. The CTA stack sits at
     62% of the ARTWORK height (see the note by the markup), which is 12% of
     that height below the centre — measured here rather than expressed as a
     CSS percentage, because a percentage would resolve against the element box
     and that box is letterboxed whenever width is the binding constraint. */
  const heartBoxRef = useRef<HTMLDivElement>(null);
  const [heartH, setHeartH] = useState(0);
  // Keyed on `page`: the observed element only exists while the home page is
  // mounted, so the effect has to re-attach every time we come back to it.
  // With an empty dep list it observed the first instance only — leaving home
  // fired a 0x0 measurement and returning never re-measured, so the CTAs
  // dropped to the heart's geometric centre, which is inside the cleft.
  useEffect(() => {
    const el = heartBoxRef.current;
    if (!el) return;
    const measure = (w: number, h: number) => {
      if (w > 0 && h > 0) setHeartH(Math.min(h, w * (HEART_H / HEART_W)));
    };
    measure(el.clientWidth, el.clientHeight);
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      measure(width, height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [page]);

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
                className="w-full text-left px-5 py-2 font-serif font-normal text-[15px] hover:bg-foreground/5 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        )}
        <button
          onClick={() => setPoliciesOpen((v) => !v)}
          className="font-serif font-normal text-[15px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Terms and Policies
        </button>
      </div>

      <p className="font-serif font-normal text-[15px] text-muted-foreground tracking-wide">© 2026, Mantel</p>
    </footer>
  );

  return (
    <div className="bg-white text-foreground font-mono font-normal min-h-screen">

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
            <button
              onClick={() => goTo("home")}
              className="font-serif font-semibold text-[30px] leading-none tracking-[-0.01em] text-foreground hover:opacity-80 transition-opacity"
            >
              Mantel.
            </button>
          </div>

          {/* Right: icons */}
          <div className="flex items-center gap-4 text-foreground/70">
            {/* Locale pill — single locale for now (Bahrain / BD / English),
                shown as a dropdown to match the reference layout */}
            <div className="relative hidden sm:block">
              <button
                onClick={() => { setLocaleOpen((v) => !v); setSearchOpen(false); setAccountOpen(false); }}
                className="flex items-center gap-1.5 hover:text-foreground transition-colors"
                aria-label="Country and language"
              >
                <span className="font-mono text-[14px] leading-none">🇧🇭</span>
                <span className="font-mono font-medium text-[12px] tracking-wide">BD / EN</span>
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
              <Search size={17} strokeWidth={1.5} />
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
              <User size={17} strokeWidth={1.5} />
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
          <button
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            onClick={() => goTo("menu")}
          >
            Menu
          </button>
          <button
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            onClick={() => goTo("contact")}
          >
            Contact
          </button>
          <button
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
            onClick={() => goTo("home")}
          >
            Our Story
          </button>
          <button
            className="text-left font-serif font-normal text-2xl text-foreground hover:opacity-50 transition-opacity"
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
                        goTo("menu");
                        setMenuCategory(item.category);
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
        <main
          className="flex flex-col h-screen overflow-hidden"
          style={{ paddingTop: navHeight }}
        >
          {/* Heart and CTAs are one unit, centred in the space that is left
              once the footer has taken its own height — the footer is a flex
              sibling here, not an overlay, so nothing runs underneath it.
              The artwork is cropped to its own edges (no transparent padding),
              so object-contain centres the heart itself and the wrapper shrinks
              to the image box; the buttons then centre on the heart with no
              nudge. */}
          <div className="flex-1 min-h-0 flex px-6 py-4">
            <div
              ref={heartBoxRef}
              className="relative flex-1 min-h-0 flex items-center justify-center"
            >
            {/* max-* with auto width/height lets the image size itself: its box
                then equals the rendered artwork at every viewport. No wrapper
                can do this — a div with aspect-ratio fits only whichever axis
                happens to bind, so it letterboxes on the other one. */}
            <ImageWithFallback
              src={logoHeart}
              alt="Mantel heart"
              className="block max-h-full max-w-full w-auto h-auto"
            />
              {/* Placed on the heart's OPTICAL centre, not the box centre. A
                  heart is notched at the top and pointed at the bottom, so the
                  bounding-box centre lands in the cleft. Measured off the
                  artwork's alpha: the notch reaches down to 43.9% of the
                  height, and sweeping the CTA box against the alpha shows it
                  still clips at 56% (97.8% covered) and is fully inside from
                  58% down. 62% is the smallest value that stays fully inside
                  at 360px too, where the stack is a much larger share of the
                  heart (22.7% of its height vs 15.4% at desktop).
                  The canvas is padded so the heart's tip sits at 50% width, so
                  tip, CTAs and footer all share one vertical axis.
                  Sized down on phones so they stay inside the smaller heart. */}
            <div
              className="absolute left-1/2 top-1/2 flex flex-col items-center gap-2 sm:gap-3"
              style={{ transform: `translate(-50%, calc(-50% + ${heartH * 0.12}px))` }}
            >
                <button
                  onClick={() => goTo("contact")}
                  className={`px-4 py-1.5 font-mono font-medium text-xs sm:px-6 sm:py-2 sm:text-base ${BRAND_BUTTON_CLASS}`}
                >
                  Our Story
                </button>
                <button
                  onClick={() => goTo("menu")}
                  className={`px-4 py-1.5 font-mono font-medium text-xs sm:px-6 sm:py-2 sm:text-base ${BRAND_BUTTON_CLASS}`}
                >
                Menu
              </button>
              </div>
            </div>
          </div>
          {footer}
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
              <p className="font-mono font-normal text-sm text-muted-foreground">Loading menu…</p>
            </div>
          ) : menuError ? (
            <div className="flex-1 flex items-center justify-center py-24">
              <p className="font-mono font-normal text-sm text-muted-foreground">
                Couldn{"'"}t load the menu right now — please try again shortly.
              </p>
            </div>
          ) : menuCategory === null ? (
            /* Category selection — two blush pills centered in whitespace */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24">
              <button
                onClick={() => setMenuCategory("coffee")}
                className={`px-6 py-2 font-serif font-normal text-base ${HEART_BUTTON_CLASS}`}
              >
                {CATEGORY_LABELS.coffee}
              </button>
              <button
                onClick={() => setMenuCategory("food")}
                className={`px-6 py-2 font-serif font-normal text-base ${HEART_BUTTON_CLASS}`}
              >
                {CATEGORY_LABELS.food}
              </button>
            </div>
          ) : (
            /* Menu items list */
            <div className="flex-1 max-w-xl mx-auto w-full px-6 py-14">
              <button
                onClick={() => setMenuCategory(null)}
                className="font-serif font-medium text-[12px] tracking-[0.18em] uppercase text-muted-foreground hover:text-foreground transition-colors mb-10 flex items-center gap-2"
              >
                <ArrowLeft size={13} strokeWidth={1.75} />
                Back
              </button>
              <h2 className="font-serif font-normal text-3xl mb-8">
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
                    className="flex-1 min-w-0 rounded-full border border-border bg-white px-5 py-3 font-mono font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                  <input
                    type="email"
                    placeholder="Email *"
                    required
                    maxLength={254}
                    value={form.email}
                    onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                    className="flex-1 min-w-0 rounded-full border border-border bg-white px-5 py-3 font-mono font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                  />
                </div>

                {/* Phone */}
                <input
                  type="tel"
                  placeholder="Phone number"
                  maxLength={40}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="rounded-full border border-border bg-white px-5 py-3 font-mono font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors"
                />

                {/* Comment */}
                <textarea
                  placeholder="Comment"
                  rows={5}
                  maxLength={2000}
                  value={form.comment}
                  onChange={(e) => setForm((f) => ({ ...f, comment: e.target.value }))}
                  className="rounded-3xl border border-border bg-white px-5 py-4 font-mono font-normal text-sm placeholder:text-muted-foreground outline-none focus:border-foreground/40 transition-colors resize-none"
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
