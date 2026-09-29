import { useEffect, useMemo, useRef, useState } from "react";
import { Coffee, CornerDownLeft, Receipt, Search, ShoppingBag, User, Inbox } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { SECTIONS, type SectionId } from "@/admin/nav";
import { rpc } from "@/admin/lib/db";
import { Modal } from "@/admin/ui/overlays";

type Hit = { kind: "order" | "customer" | "menu" | "object" | "message"; id: string; title: string; subtitle: string };

const KIND_ICON = { order: Receipt, customer: User, menu: Coffee, object: ShoppingBag, message: Inbox } as const;
const KIND_TARGET: Record<Hit["kind"], SectionId> = { order: "orders", customer: "customers", menu: "menu", object: "retail", message: "messages" };

/*
 * One search box for everything: screens ("opening hours", "promo codes"),
 * and records — an order by its MTL reference or the customer's name, a
 * customer by email, a menu item or product by name.
 */
export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useT();
  const { navigate, can } = useAdmin();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHits([]);
      setActive(0);
      window.setTimeout(() => input.current?.focus(), 30);
    }
  }, [open]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      return;
    }
    const id = window.setTimeout(() => {
      void rpc<Hit[]>("admin_search", { p_query: q }).then((r) => setHits(r.ok ? r.value ?? [] : []));
    }, 220);
    return () => window.clearTimeout(id);
  }, [query]);

  const screens = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SECTIONS.filter((s) => can(s.area)).filter((s) => {
      if (!q) return true;
      const label = t(s.label).toLowerCase();
      return label.includes(q) || s.label.toLowerCase().includes(q) || s.keywords.includes(q);
    }).slice(0, q ? 5 : 15);
  }, [query, can, t]);

  const results: { key: string; icon: React.ReactNode; title: string; subtitle: string; go: () => void }[] = [
    ...hits.filter((h) => can(h.kind === "order" ? "orders" : h.kind === "customer" ? "customers" : h.kind === "message" ? "messages" : "catalog")).map((h) => {
      const Icon = KIND_ICON[h.kind];
      return {
        key: `${h.kind}-${h.id}`,
        icon: <Icon size={18} aria-hidden="true" />,
        title: h.title,
        subtitle: h.subtitle,
        go: () => navigate(KIND_TARGET[h.kind], h.id),
      };
    }),
    ...screens.map((s) => {
      const Icon = s.icon;
      return {
        key: `screen-${s.id}`,
        icon: <Icon size={18} aria-hidden="true" />,
        title: t(s.label),
        subtitle: t("Open screen"),
        go: () => navigate(s.id),
      };
    }),
  ];

  const choose = (index: number) => {
    const r = results[index];
    if (!r) return;
    onClose();
    r.go();
  };

  return (
    <Modal open={open} onClose={onClose} title={t("Search")}>
      <div className="adm-input-affix">
        <span><Search size={16} /></span>
        <input
          ref={input}
          className="adm-input"
          value={query}
          placeholder={t("Order number, customer, item or screen…")}
          aria-label={t("Search")}
          onChange={(e) => { setQuery(e.target.value); setActive(0); }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
            if (e.key === "Enter") { e.preventDefault(); choose(active); }
          }}
        />
      </div>
      <div className="adm-list" role="listbox" aria-label={t("Results")}>
        {results.length === 0 ? (
          <p className="adm-muted" style={{ padding: 16 }}>{t("Nothing found. Try an order number like MTL-1A2B3C, a name, or an email.")}</p>
        ) : (
          results.map((r, i) => (
            <button
              key={r.key}
              type="button"
              role="option"
              aria-selected={i === active}
              className="adm-list-row"
              style={i === active ? { background: "var(--a-surface-2)" } : undefined}
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(i)}
            >
              <span className="adm-thumb" style={{ width: 36, height: 36 }}>{r.icon}</span>
              <span className="adm-list-main">
                <span className="adm-list-title">{r.title}</span>
                <span className="adm-list-meta">{r.subtitle}</span>
              </span>
              {i === active && <CornerDownLeft size={16} className="adm-muted" aria-hidden="true" />}
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
