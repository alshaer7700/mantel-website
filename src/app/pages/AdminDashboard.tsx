import { useCallback, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  fetchAdminDashboard,
  updateAdminContactStatus,
  updateAdminMenuAvailability,
  updateAdminNewsletterStatus,
  updateAdminObjectAvailability,
  updateAdminOrderStatus,
  type AdminDashboardData,
} from "@/lib/api/admin";
import { messageFor, type AppError } from "@/lib/api/errors";
import { BarChart3, Check, ChevronDown, ExternalLink, RefreshCw, ShieldAlert } from "lucide-react";

export type AdminDashboardProps = {
  session: Session | null;
  onRequireSignIn: () => void;
};

type View = "overview" | "orders" | "catalog" | "messages" | "newsletter";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; data: AdminDashboardData }
  | { status: "error"; error: AppError };

const ORDER_STATUSES = ["received", "preparing", "ready", "completed", "cancelled"] as const;
const MESSAGE_STATUSES = ["new", "read", "resolved"] as const;
const NEWSLETTER_STATUSES = ["active", "unsubscribed"] as const;

function money(value: number): string {
  return `BD ${value.toFixed(3)}`;
}

function date(value: string | null): string {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? "—"
    : new Intl.DateTimeFormat("en-BH", { dateStyle: "medium", timeStyle: "short" }).format(parsed);
}

function label(value: string): string {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function AdminDashboard({ session, onRequireSignIn }: AdminDashboardProps) {
  const [view, setView] = useState<View>("overview");
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string>("");

  const load = useCallback(async () => {
    setLoadState({ status: "loading" });
    const result = await fetchAdminDashboard();
    setLoadState(result.ok ? { status: "ready", data: result.value } : { status: "error", error: result.error });
  }, []);

  useEffect(() => {
    if (session) void load();
    else setLoadState({ status: "error", error: { kind: "forbidden" } });
  }, [load, session]);

  const runAction = useCallback(async (key: string, action: () => Promise<{ ok: true; value: boolean } | { ok: false; error: AppError }>) => {
    setBusyKey(key);
    setActionError("");
    const result = await action();
    if (!result.ok) setActionError(messageFor(result.error));
    else await load();
    setBusyKey(null);
  }, [load]);

  const viewTitle = useMemo(() => ({
    overview: "Overview",
    orders: "Orders",
    catalog: "Catalog",
    messages: "Contact messages",
    newsletter: "Newsletter",
  }[view]), [view]);

  if (!session) {
    return (
      <main className="mantel-admin-shell" id="main-content">
        <section className="mantel-admin-gate">
          <ShieldAlert size={28} strokeWidth={1.2} aria-hidden="true" />
          <p className="editorial-overline">Staff area</p>
          <h1>Sign in to continue.</h1>
          <p>This area is reserved for the Mantel team. Customer accounts cannot access operational data.</p>
          <button type="button" className="mantel-admin-primary" onClick={onRequireSignIn}>Open account</button>
        </section>
      </main>
    );
  }

  if (loadState.status === "loading") {
    return (
      <main className="mantel-admin-shell" id="main-content" aria-busy="true">
        <section className="mantel-admin-loading"><RefreshCw size={18} className="mantel-admin-spin" aria-hidden="true" /> Loading staff dashboard…</section>
      </main>
    );
  }

  if (loadState.status === "error") {
    const forbidden = loadState.error.kind === "forbidden";
    return (
      <main className="mantel-admin-shell" id="main-content">
        <section className="mantel-admin-gate">
          <ShieldAlert size={28} strokeWidth={1.2} aria-hidden="true" />
          <p className="editorial-overline">Staff area</p>
          <h1>{forbidden ? "Access is restricted." : "We could not load the dashboard."}</h1>
          <p>{forbidden ? "This signed-in account is not listed as an active Mantel staff member." : messageFor(loadState.error)}</p>
          <div className="mantel-admin-actions">
            <button type="button" className="mantel-admin-primary" onClick={() => void load()}>Try again</button>
            <a className="mantel-admin-secondary" href="/">Back to Mantel <ExternalLink size={13} aria-hidden="true" /></a>
          </div>
        </section>
      </main>
    );
  }

  const data = loadState.data;

  return (
    <main className="mantel-admin-shell" id="main-content">
      <div className="mantel-admin-header">
        <div>
          <p className="editorial-overline">Mantel / staff</p>
          <h1>{viewTitle}</h1>
          <p className="mantel-admin-email">{session.user.email ?? "Signed-in staff"}</p>
        </div>
        <div className="mantel-admin-header-actions">
          <button type="button" className="mantel-admin-icon-action" onClick={() => void load()} aria-label="Refresh dashboard">
            <RefreshCw size={16} aria-hidden="true" />
          </button>
          <a className="mantel-admin-secondary" href="/">Back to Mantel <ExternalLink size={13} aria-hidden="true" /></a>
        </div>
      </div>

      <nav className="mantel-admin-tabs" aria-label="Staff dashboard sections">
        {(["overview", "orders", "catalog", "messages", "newsletter"] as View[]).map((item) => (
          <button key={item} type="button" className={view === item ? "is-active" : ""} onClick={() => setView(item)}>
            {item === "messages" ? "Messages" : label(item)}
          </button>
        ))}
      </nav>

      {actionError && <p className="mantel-admin-alert" role="alert">{actionError}</p>}

      {view === "overview" && (
        <section aria-labelledby="admin-summary-title">
          <h2 id="admin-summary-title" className="sr-only">Dashboard summary</h2>
          <div className="mantel-admin-summary-grid">
            <SummaryCard label="All orders" value={data.summary.orders} detail={`${data.summary.received} received`} />
            <SummaryCard label="In preparation" value={data.summary.preparing} detail={`${data.summary.ready} ready for pickup`} />
            <SummaryCard label="Unread messages" value={data.summary.unreadMessages} detail="Needs a response" />
            <SummaryCard label="Active subscribers" value={data.summary.activeSubscribers} detail={`${data.summary.availableObjects} objects available`} />
          </div>
          <div className="mantel-admin-overview-grid">
            <AdminTable title="Latest orders" empty="No orders yet." showAll={() => setView("orders")}>
              {data.orders.slice(0, 5).map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.customer_name}</strong><small>{date(order.created_at)}</small></td>
                  <td>{money(order.subtotal)}</td>
                  <td><StatusPill status={order.status} /></td>
                </tr>
              ))}
            </AdminTable>
            <AdminTable title="Latest messages" empty="No messages yet." showAll={() => setView("messages")}>
              {data.messages.slice(0, 5).map((message) => (
                <tr key={message.id}>
                  <td><strong>{message.first_name} {message.last_name}</strong><small>{message.email}</small></td>
                  <td>{date(message.created_at)}</td>
                  <td><StatusPill status={message.status} /></td>
                </tr>
              ))}
            </AdminTable>
          </div>
        </section>
      )}

      {view === "orders" && (
        <section className="mantel-admin-panel" aria-labelledby="orders-title">
          <div className="mantel-admin-panel-heading"><div><p className="editorial-overline">Pickup operations</p><h2 id="orders-title">Orders</h2></div><span>{data.orders.length} shown</span></div>
          {data.orders.length ? (
            <div className="mantel-admin-table-wrap"><table className="mantel-admin-table"><caption className="sr-only">Mantel orders</caption><thead><tr><th>Customer</th><th>Contact</th><th>Total</th><th>Status</th><th>Created</th></tr></thead><tbody>
              {data.orders.map((order) => (
                <tr key={order.id}>
                  <td><strong>{order.customer_name}</strong><small>{order.id.slice(0, 8)}</small></td>
                  <td><span>{order.customer_email ?? "No email"}</span><small>{order.customer_phone ?? "No phone"}</small></td>
                  <td>{money(order.subtotal)}</td>
                  <td><select value={order.status} disabled={busyKey === `order-${order.id}`} aria-label={`Update order for ${order.customer_name}`} onChange={(event) => void runAction(`order-${order.id}`, () => updateAdminOrderStatus(order.id, event.target.value))}>{ORDER_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></td>
                  <td>{date(order.created_at)}</td>
                </tr>
              ))}
            </tbody></table></div>
          ) : <EmptyState text="No orders have been placed yet." />}
        </section>
      )}

      {view === "catalog" && (
        <section className="mantel-admin-catalog" aria-labelledby="catalog-title">
          <div className="mantel-admin-panel-heading"><div><p className="editorial-overline">Availability controls</p><h2 id="catalog-title">Catalog</h2></div><span>Changes publish immediately</span></div>
          <CatalogGroup title="Retail objects" items={data.objects} busyKey={busyKey} onToggle={(id, value) => void runAction(`object-${id}`, () => updateAdminObjectAvailability(id, value))} />
          <CatalogGroup title="Menu items" items={data.menu} busyKey={busyKey} onToggle={(id, value) => void runAction(`menu-${id}`, () => updateAdminMenuAvailability(id, value))} />
        </section>
      )}

      {view === "messages" && (
        <section className="mantel-admin-panel" aria-labelledby="messages-title">
          <div className="mantel-admin-panel-heading"><div><p className="editorial-overline">Client care</p><h2 id="messages-title">Contact messages</h2></div><span>{data.messages.length} shown</span></div>
          {data.messages.length ? <div className="mantel-admin-message-list">{data.messages.map((message) => <article key={message.id} className="mantel-admin-message"><div className="mantel-admin-message-head"><div><h3>{message.first_name} {message.last_name}</h3><a href={`mailto:${message.email}`}>{message.email}</a>{message.phone && <a href={`tel:${message.phone}`}>{message.phone}</a>}</div><select value={message.status} disabled={busyKey === `message-${message.id}`} aria-label={`Update message status from ${message.first_name} ${message.last_name}`} onChange={(event) => void runAction(`message-${message.id}`, () => updateAdminContactStatus(message.id, event.target.value))}>{MESSAGE_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div><p>{message.message}</p><time dateTime={message.created_at}>{date(message.created_at)}</time></article>)}</div> : <EmptyState text="No Contact messages have been received." />}
        </section>
      )}

      {view === "newsletter" && (
        <section className="mantel-admin-panel" aria-labelledby="newsletter-title">
          <div className="mantel-admin-panel-heading"><div><p className="editorial-overline">Audience</p><h2 id="newsletter-title">Newsletter</h2></div><span>{data.newsletter.length} shown</span></div>
          {data.newsletter.length ? <div className="mantel-admin-subscriber-list">{data.newsletter.map((subscriber) => <div key={subscriber.email} className="mantel-admin-subscriber"><div><strong>{subscriber.email}</strong><small>Subscribed {date(subscriber.subscribed_at)}</small></div><select value={subscriber.status} disabled={busyKey === `subscriber-${subscriber.email}`} aria-label={`Update newsletter status for ${subscriber.email}`} onChange={(event) => void runAction(`subscriber-${subscriber.email}`, () => updateAdminNewsletterStatus(subscriber.email, event.target.value))}>{NEWSLETTER_STATUSES.map((status) => <option key={status} value={status}>{label(status)}</option>)}</select></div>)}</div> : <EmptyState text="No newsletter subscribers yet." />}
        </section>
      )}
    </main>
  );
}

function SummaryCard({ label: title, value, detail }: { label: string; value: number; detail: string }) {
  return <article className="mantel-admin-summary-card"><BarChart3 size={17} strokeWidth={1.3} aria-hidden="true" /><p>{title}</p><strong>{value}</strong><small>{detail}</small></article>;
}

function StatusPill({ status }: { status: string }) {
  return <span className={`mantel-admin-status status-${status}`}>{label(status)}</span>;
}

function AdminTable({ title, empty, showAll, children }: { title: string; empty: string; showAll: () => void; children: React.ReactNode }) {
  return <section className="mantel-admin-panel"><div className="mantel-admin-panel-heading"><h2>{title}</h2><button type="button" onClick={showAll}>View all <ChevronDown size={13} aria-hidden="true" /></button></div><div className="mantel-admin-table-wrap"><table className="mantel-admin-table"><tbody>{children}</tbody></table>{!children && <EmptyState text={empty} />}</div></section>;
}

function EmptyState({ text }: { text: string }) {
  return <p className="mantel-admin-empty"><Check size={16} aria-hidden="true" /> {text}</p>;
}

type CatalogItem = { id: string; name: string; description: string; price: number; is_available: boolean };

function CatalogGroup({ title, items, busyKey, onToggle }: { title: string; items: CatalogItem[]; busyKey: string | null; onToggle: (id: string, value: boolean) => void }) {
  return <section className="mantel-admin-catalog-group"><div className="mantel-admin-panel-heading"><h2>{title}</h2><span>{items.length} items</span></div><div className="mantel-admin-catalog-list">{items.map((item) => <div key={item.id} className={`mantel-admin-catalog-row ${item.is_available ? "" : "is-off"}`}><div><strong>{item.name}</strong><small>{item.description || "No description"} · {money(item.price)}</small></div><button type="button" className="mantel-admin-toggle" aria-pressed={item.is_available} disabled={busyKey === `${title === "Retail objects" ? "object" : "menu"}-${item.id}`} onClick={() => onToggle(item.id, !item.is_available)}><span aria-hidden="true" />{item.is_available ? "Available" : "Hidden"}</button></div>)}</div></section>;
}
