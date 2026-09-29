import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { ExternalLink, LogOut, Menu as MenuIcon, Moon, Search, Sun, Monitor, Languages } from "lucide-react";
import "@/admin/admin.css";
import { supabase } from "@/lib/supabaseClient";
import { LangContext, setActiveLang, translate, useLang, useT, type Lang } from "@/admin/i18n";
import { AdminContext, roleLabel, type Counts, type Me } from "@/admin/context";
import { SECTIONS, adminPath, sectionFromPath, type Area, type SectionId } from "@/admin/nav";
import { rpc } from "@/admin/lib/db";
import { useInterval } from "@/admin/lib/useAsync";
import { ConfirmProvider, PortalRootContext, ToastProvider } from "@/admin/ui/overlays";
import { Button, IconButton } from "@/admin/ui/controls";
import { Loading } from "@/admin/ui/layout";
import { SignInGate, NotStaffGate, RecoveryGate } from "@/admin/gates/SignIn";
import { TwoStepGate } from "@/admin/gates/TwoStep";
import { CounterLock, useCounterLock } from "@/admin/gates/CounterLock";
import { CommandPalette } from "@/admin/ui/CommandPalette";
import { SectionView } from "@/admin/sections";

const LANG_KEY = "mantel-admin-lang";
const THEME_KEY = "mantel-admin-theme";

function readLocal<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  try {
    const v = window.localStorage.getItem(key);
    return v && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Preference only. */
  }
}

const EMPTY_COUNTS: Counts = { new_orders: 0, active_orders: 0, unread_messages: 0, low_stock: 0, open_alerts: 0 };

export default function AdminApp() {
  const [lang, setLangState] = useState<Lang>(() => readLocal<Lang>(LANG_KEY, ["en", "ar"], "en"));
  const [theme, setThemeState] = useState<"system" | "light" | "dark">(() => readLocal(THEME_KEY, ["system", "light", "dark"] as const, "system"));
  const [systemDark, setSystemDark] = useState(() => window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false);
  const [portalRoot, setPortalRoot] = useState<HTMLDivElement | null>(null);

  setActiveLang(lang);

  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mq) return;
    const onChange = () => setSystemDark(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const setLang = useCallback((next: Lang) => {
    setActiveLang(next);
    setLangState(next);
    writeLocal(LANG_KEY, next);
    void rpc("admin_set_my_preferences", { p_language: next, p_display_name: null });
  }, []);

  const setTheme = useCallback((next: "system" | "light" | "dark") => {
    setThemeState(next);
    writeLocal(THEME_KEY, next);
  }, []);

  const dark = theme === "dark" || (theme === "system" && systemDark);

  /* The dashboard is an installable app on the counter tablet: its own
     manifest, title and theme colour while it is on screen. */
  useEffect(() => {
    const manifest = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    const previousManifest = manifest?.href;
    if (manifest) manifest.href = "/admin.webmanifest";
    const themeMeta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const previousTheme = themeMeta?.content;
    if (themeMeta) themeMeta.content = dark ? "#14110E" : "#F6F5F2";
    document.documentElement.lang = lang;
    return () => {
      if (manifest && previousManifest) manifest.href = previousManifest;
      if (themeMeta && previousTheme) themeMeta.content = previousTheme;
      document.documentElement.lang = "en";
    };
  }, [dark, lang]);

  return (
    <LangContext.Provider value={{ lang, setLang }}>
      <div className="adm" dir={lang === "ar" ? "rtl" : "ltr"} data-theme={dark ? "dark" : "light"} ref={setPortalRoot}>
        <PortalRootContext.Provider value={portalRoot}>
          <ToastProvider>
            <ConfirmProvider>
              <AuthGate lang={lang} setLang={setLang} theme={theme} setTheme={setTheme} />
            </ConfirmProvider>
          </ToastProvider>
        </PortalRootContext.Provider>
      </div>
    </LangContext.Provider>
  );
}

type GateProps = {
  lang: Lang;
  setLang: (l: Lang) => void;
  theme: "system" | "light" | "dark";
  setTheme: (t: "system" | "light" | "dark") => void;
};

function AuthGate({ lang, setLang, theme, setTheme }: GateProps) {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [recovering, setRecovering] = useState(false);
  const [me, setMe] = useState<Me | null | undefined>(undefined);
  const [meError, setMeError] = useState("");

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecovering(true);
      if (event === "SIGNED_OUT") setMe(undefined);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const loadMe = useCallback(async () => {
    const result = await rpc<Me | null>("admin_me");
    if (!result.ok) {
      setMeError(result.error);
      setMe(null);
      return;
    }
    setMeError("");
    setMe(result.value);
    const saved = (() => {
      try {
        return window.localStorage.getItem(LANG_KEY);
      } catch {
        return null;
      }
    })();
    if (result.value && !saved && result.value.language !== lang) setLang(result.value.language);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (userId) void loadMe();
  }, [userId, loadMe]);

  if (session === undefined) return <div className="adm-gate"><Loading /></div>;
  if (recovering && session) return <RecoveryGate onDone={() => setRecovering(false)} />;
  if (!session) return <SignInGate lang={lang} setLang={setLang} />;
  if (me === undefined) return <div className="adm-gate"><Loading /></div>;
  if (me === null) return <NotStaffGate email={session.user.email ?? ""} error={meError} onRetry={loadMe} />;
  if (me.require_2fa && me.aal !== "aal2") return <TwoStepGate onVerified={loadMe} />;

  return <Shell me={me} reloadMe={loadMe} theme={theme} setTheme={setTheme} />;
}

function Shell({ me, reloadMe, theme, setTheme }: { me: Me; reloadMe: () => Promise<void>; theme: "system" | "light" | "dark"; setTheme: (t: "system" | "light" | "dark") => void }) {
  const t = useT();
  const { lang, setLang } = useLang();
  const [location, setLocation] = useState(() => sectionFromPath(window.location.pathname));
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [counts, setCounts] = useState<Counts>(EMPTY_COUNTS);
  const counter = useCounterLock(me);

  const can = useCallback((area: Area | null) => area === null || Boolean(me.permissions[area]), [me]);

  const navigate = useCallback((section: SectionId, ...rest: (string | null | undefined)[]) => {
    const path = adminPath(section, ...rest);
    if (window.location.pathname !== path) window.history.pushState({}, "", path);
    setLocation(sectionFromPath(path));
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    const onPop = () => setLocation(sectionFromPath(window.location.pathname));
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const refreshCounts = useCallback(() => {
    void rpc<Counts>("admin_counts").then((r) => {
      if (r.ok && r.value) setCounts({ ...EMPTY_COUNTS, ...r.value });
    });
  }, []);

  useEffect(() => refreshCounts(), [refreshCounts]);
  useInterval(refreshCounts, 30000);

  /* Signs out a shared device after the idle time set under Team → Security. */
  const lastActive = useRef(Date.now());
  useEffect(() => {
    const bump = () => { lastActive.current = Date.now(); };
    const events = ["pointerdown", "keydown", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, bump, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);
  useInterval(() => {
    if (me.idle_minutes > 0 && Date.now() - lastActive.current > me.idle_minutes * 60000) {
      void supabase.auth.signOut();
    }
  }, 30000, me.idle_minutes > 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setPaletteOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo(() => ({
    me,
    can,
    section: location.section,
    rest: location.rest,
    navigate,
    counts,
    refreshCounts,
    reloadMe,
    theme,
    setTheme,
  }), [me, can, location, navigate, counts, refreshCounts, reloadMe, theme, setTheme]);

  const visible = SECTIONS.filter((s) => can(s.area) && s.id !== "account");
  const allowed = can(SECTIONS.find((s) => s.id === location.section)?.area ?? null);

  useEffect(() => {
    const label = SECTIONS.find((s) => s.id === location.section)?.label ?? "Today";
    document.title = `${translate(lang, label)} — ${translate(lang, "Mantel staff")}`;
  }, [location.section, lang]);

  const countFor = (id: SectionId) =>
    id === "orders" ? counts.new_orders : id === "messages" ? counts.unread_messages : id === "retail" ? counts.low_stock : id === "health" ? counts.open_alerts : 0;

  let lastGroup: string | null = "__start";

  return (
    <AdminContext.Provider value={value}>
      <div className="adm-shell">
        {menuOpen && <div className="adm-backdrop" onClick={() => setMenuOpen(false)} />}
        <aside className={`adm-sidebar ${menuOpen ? "is-open" : ""}`} aria-label={t("Dashboard navigation")}>
          <a className="adm-brand" href="/admin" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
            <strong>Mantel.</strong>
            <span>{t("Staff")}</span>
          </a>
          <button type="button" className="adm-nav-item" onClick={() => setPaletteOpen(true)} style={{ border: "1px solid var(--a-line)", marginBottom: 6 }}>
            <Search size={18} aria-hidden="true" />
            <span>{t("Search")}</span>
            <span className="adm-kbd" style={{ marginInlineStart: "auto" }}>/</span>
          </button>
          <nav className="adm-nav">
            {visible.map((s) => {
              const header = s.group !== lastGroup && s.group ? <p key={`g-${s.group}`} className="adm-nav-group">{t(s.group)}</p> : null;
              lastGroup = s.group;
              const Icon = s.icon;
              const count = countFor(s.id);
              return (
                <div key={s.id} style={{ display: "contents" }}>
                  {header}
                  <a
                    href={adminPath(s.id)}
                    className="adm-nav-item"
                    aria-current={location.section === s.id ? "page" : undefined}
                    onClick={(e) => {
                      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                      e.preventDefault();
                      navigate(s.id);
                    }}
                  >
                    <Icon size={18} aria-hidden="true" />
                    <span>{t(s.label)}</span>
                    {count > 0 && <span className="adm-nav-count" aria-label={t("{n} need attention", { n: count })}>{count}</span>}
                  </a>
                </div>
              );
            })}
          </nav>
          <div className="adm-sidebar-foot">
            <a
              href={adminPath("account")}
              className="adm-nav-item"
              aria-current={location.section === "account" ? "page" : undefined}
              onClick={(e) => { e.preventDefault(); navigate("account"); }}
            >
              <span className="adm-user">
                <strong>{me.display_name}</strong>
                <span>{t(roleLabel(me.role))}</span>
              </span>
            </a>
            <div className="adm-row" style={{ gap: 4, paddingInline: 4 }}>
              <IconButton label={lang === "ar" ? "English" : "العربية"} onClick={() => setLang(lang === "ar" ? "en" : "ar")}>
                <Languages size={18} />
              </IconButton>
              <IconButton
                label={t("Theme: {mode}", { mode: t(theme === "system" ? "Automatic" : theme === "dark" ? "Dark" : "Light") })}
                onClick={() => setTheme(theme === "system" ? "light" : theme === "light" ? "dark" : "system")}
              >
                {theme === "dark" ? <Moon size={18} /> : theme === "light" ? <Sun size={18} /> : <Monitor size={18} />}
              </IconButton>
              <a className="adm-icon-btn" href="/" target="_blank" rel="noopener noreferrer" aria-label={t("Open the website")} title={t("Open the website")}>
                <ExternalLink size={18} />
              </a>
              {me.has_pin && counter.available && (
                <Button size="sm" variant="ghost" onClick={counter.lock}>{t("Lock")}</Button>
              )}
              <IconButton label={t("Sign out")} onClick={() => void supabase.auth.signOut()} style={{ marginInlineStart: "auto" }}>
                <LogOut size={18} className="adm-flip-rtl" />
              </IconButton>
            </div>
          </div>
        </aside>

        <div className="adm-main">
          <header className="adm-topbar">
            <IconButton label={t("Open menu")} onClick={() => setMenuOpen(true)}><MenuIcon size={20} /></IconButton>
            <a className="adm-brand" href="/admin" onClick={(e) => { e.preventDefault(); navigate("home"); }}>
              <strong style={{ fontSize: 20 }}>Mantel.</strong>
              <span>{t("Staff")}</span>
            </a>
            <IconButton label={t("Search")} onClick={() => setPaletteOpen(true)} style={{ marginInlineStart: "auto" }}><Search size={20} /></IconButton>
            {counts.new_orders > 0 && (
              <button type="button" className="adm-badge adm-badge-danger" onClick={() => navigate("orders")} style={{ cursor: "pointer" }}>
                {t("{n} new", { n: counts.new_orders })}
              </button>
            )}
          </header>
          <main className="adm-content" id="main-content">
            {allowed ? <SectionView section={location.section} /> : <NoAccess />}
          </main>
        </div>
      </div>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      {counter.locked && <CounterLock me={me} onUnlocked={counter.unlock} />}
    </AdminContext.Provider>
  );
}

function NoAccess() {
  const t = useT();
  return (
    <div className="adm-empty">
      <strong>{t("Your role doesn't include this section")}</strong>
      <p>{t("Ask an admin to change what your role can do under Team → Permissions.")}</p>
    </div>
  );
}
