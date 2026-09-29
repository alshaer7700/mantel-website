import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Bell, BellOff, ChevronDown, Plus, Receipt } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync, useInterval } from "@/admin/lib/useAsync";
import { ago, bahrainToday, dateTime, minutesSince, money, timeOnly } from "@/admin/lib/format";
import type { ExportSpec } from "@/admin/lib/letterhead";
import { ExportButton } from "@/admin/ui/ExportButton";
import { askNotificationPermission, chime, notify, setSoundEnabled, soundEnabled } from "@/admin/lib/alerts";
import { Button, Checkbox, Chips, SearchInput } from "@/admin/ui/controls";
import { Badge, EmptyState, LoadError, Loading, PageHeader, Tabs } from "@/admin/ui/layout";
import { useToast } from "@/admin/ui/overlays";
import {
  NEXT_STEP,
  STATUS,
  bulkOrderStatus,
  fetchBoard,
  fetchOrders,
  setOrderStatus,
  type Order,
  type OrderStatus,
} from "@/admin/sections/orders/api";
import { OrderDrawer } from "@/admin/sections/orders/OrderDrawer";
import { ManualOrderModal } from "@/admin/sections/orders/ManualOrder";

type Tab = "board" | "all";

export function OrdersSection() {
  const t = useT();
  const { rest, navigate, refreshCounts } = useAdmin();
  const tab: Tab = rest[0] === "all" ? "all" : "board";
  const openId = rest[0] && rest[0] !== "all" ? rest[0] : rest[1] ?? null;
  const [manualOpen, setManualOpen] = useState(false);
  const [version, setVersion] = useState(0);

  const changed = useCallback(() => {
    setVersion((v) => v + 1);
    refreshCounts();
  }, [refreshCounts]);

  return (
    <>
      <PageHeader
        overline={t("01 — Pick-up")}
        title={t("Orders.")}
        subtitle={t("New orders appear here by themselves. Tap an order to see everything in it.")}
        actions={<Button variant="primary" icon={<Plus size={16} />} onClick={() => setManualOpen(true)}>{t("Add phone or walk-in order")}</Button>}
      />
      <Tabs
        label={t("Orders view")}
        value={tab}
        onChange={(v) => navigate("orders", v === "all" ? "all" : null)}
        tabs={[
          { value: "board", label: t("Live board") },
          { value: "all", label: t("All orders") },
        ]}
      />
      {tab === "board" ? (
        <BoardView version={version} onOpen={(id) => navigate("orders", id)} onChanged={changed} />
      ) : (
        <HistoryView version={version} onOpen={(id) => navigate("orders", "all", id)} onChanged={changed} />
      )}
      <OrderDrawer
        orderId={openId}
        onClose={() => navigate("orders", tab === "all" ? "all" : null)}
        onChanged={changed}
      />
      <ManualOrderModal open={manualOpen} onClose={() => setManualOpen(false)} onCreated={(id) => { setManualOpen(false); changed(); navigate("orders", id); }} />
    </>
  );
}

/* ── Live board ──────────────────────────────────────────────────────────── */

const COLUMNS: { status: OrderStatus; title: string; empty: string }[] = [
  { status: "received", title: "New", empty: "No new orders." },
  { status: "preparing", title: "Preparing", empty: "Nothing being made." },
  { status: "ready", title: "Ready for pickup", empty: "Nothing waiting on the counter." },
];

function BoardView({ version, onOpen, onChanged }: { version: number; onOpen: (id: string) => void; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const board = useAsync(fetchBoard, [version]);
  const seen = useRef<Set<string> | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(new Set());
  const [sound, setSound] = useState(soundEnabled());
  const [busy, setBusy] = useState<string | null>(null);
  const [doneOpen, setDoneOpen] = useState(false);
  const [, tick] = useState(0);

  useInterval(() => { void board.reload(); }, 15000);
  useInterval(() => tick((n) => n + 1), 30000);

  /* Chime and notify for orders that weren't here on the last look. */
  useEffect(() => {
    const active = board.data?.active;
    if (!active) return;
    const ids = new Set(active.map((o) => o.id));
    if (seen.current) {
      const arrived = active.filter((o) => o.status === "received" && !seen.current!.has(o.id));
      if (arrived.length) {
        chime();
        notify(t("New order"), arrived.map((o) => `${o.reference} · ${o.customer_name}`).join("\n"));
        setFresh((f) => new Set([...f, ...arrived.map((o) => o.id)]));
        onChanged();
      }
    }
    seen.current = ids;
  }, [board.data, t, onChanged]);

  const newCount = board.data?.active.filter((o) => o.status === "received").length ?? 0;
  useEffect(() => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    document.title = newCount > 0 ? `(${newCount}) ${base}` : base;
    return () => {
      document.title = document.title.replace(/^\(\d+\)\s*/, "");
    };
  }, [newCount]);

  const advance = async (o: Order, to: OrderStatus) => {
    setBusy(o.id);
    const r = await setOrderStatus(o.id, to);
    setBusy(null);
    if (!r.ok) return toast.error(r.error);
    setFresh((f) => {
      const next = new Set(f);
      next.delete(o.id);
      return next;
    });
    toast.ok(t("{ref} is now “{status}”", { ref: o.reference, status: t(STATUS[to].label) }), async () => {
      await setOrderStatus(o.id, o.status);
      await board.reload();
      onChanged();
    });
    await board.reload();
    onChanged();
  };

  const toggleSound = async () => {
    const next = !sound;
    setSoundEnabled(next);
    setSound(next);
    if (next) {
      chime();
      await askNotificationPermission();
    }
  };

  if (board.loading && !board.data) return <Loading />;
  if (board.error && !board.data) return <LoadError message={board.error} onRetry={board.reload} />;
  const data = board.data!;

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <div className="adm-spread">
        <span className="adm-muted adm-small">{t("Updates every 15 seconds.")}</span>
        <Button size="sm" variant={sound ? "secondary" : "primary"} icon={sound ? <Bell size={14} /> : <BellOff size={14} />} onClick={toggleSound}>
          {sound ? t("Sound on") : t("Turn on sound for new orders")}
        </Button>
      </div>
      <div className="adm-board">
        {COLUMNS.map((col) => {
          const orders = data.active.filter((o) => o.status === col.status);
          return (
            <section key={col.status} className="adm-board-col" aria-label={t(col.title)}>
              <div className="adm-board-col-head">
                <h2 className="adm-overline" style={{ color: "var(--a-ink)" }}>{t(col.title)}</h2>
                <Badge tone={col.status === "received" && orders.length ? "danger" : "neutral"}>{orders.length}</Badge>
              </div>
              {orders.length === 0 && <p className="adm-muted adm-small" style={{ padding: "8px 4px" }}>{t(col.empty)}</p>}
              {orders.map((o) => (
                <Ticket key={o.id} order={o} fresh={fresh.has(o.id)} busy={busy === o.id} onOpen={() => onOpen(o.id)} onAdvance={advance} />
              ))}
            </section>
          );
        })}
      </div>

      {data.done_today.length > 0 && (
        <div className="adm-stack">
          <button type="button" className="adm-btn adm-btn-ghost" style={{ justifySelf: "start" }} onClick={() => setDoneOpen((o) => !o)} aria-expanded={doneOpen}>
            <ChevronDown size={14} style={{ transform: doneOpen ? "rotate(180deg)" : undefined }} />
            {t("Finished today ({n})", { n: data.done_today.length })}
          </button>
          {doneOpen && (
            <div className="adm-list">
              {data.done_today.map((o) => (
                <button key={o.id} type="button" className="adm-list-row" onClick={() => onOpen(o.id)}>
                  <span className="adm-list-main">
                    <span className="adm-list-title">{o.reference} · {o.customer_name}</span>
                    <span className="adm-list-meta">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</span>
                  </span>
                  <span className="adm-list-side">
                    <span className="adm-num">{money(o.subtotal)}</span>
                    <Badge tone={STATUS[o.status].tone}>{t(STATUS[o.status].label)}</Badge>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Ticket({ order, fresh, busy, onOpen, onAdvance }: { order: Order; fresh: boolean; busy: boolean; onOpen: () => void; onAdvance: (o: Order, to: OrderStatus) => void }) {
  const t = useT();
  const next = NEXT_STEP[order.status];
  const waited = minutesSince(order.created_at);
  const late = order.status !== "ready" && (order.pickup_at ? new Date(order.pickup_at).getTime() < Date.now() : waited > 20);
  return (
    <article className={`adm-ticket ${fresh || order.status === "received" ? "is-new" : ""} ${late ? "is-late" : ""}`}>
      <button type="button" onClick={onOpen} style={{ all: "unset", cursor: "pointer", display: "grid", gap: 8 }}>
        <div className="adm-ticket-head">
          <span className="adm-ticket-ref">{order.reference}</span>
          <span className="adm-muted adm-small" title={dateTime(order.created_at)}>{ago(order.created_at)}</span>
        </div>
        <strong style={{ fontSize: 19, fontWeight: 500 }}>{order.customer_name}</strong>
        <ul className="adm-ticket-items">
          {order.items.map((i, k) => <li key={k}><span className="adm-num">{i.quantity}×</span> {i.name}</li>)}
        </ul>
        {order.notes && <p className="adm-ticket-note">{order.notes}</p>}
        <div className="adm-spread adm-small">
          <span className={late ? "adm-strong" : "adm-muted"} style={late ? { color: "var(--a-warn)" } : undefined}>
            {order.pickup_at ? t("Pick-up {time}", { time: timeOnly(order.pickup_at) }) : t("As soon as ready")}
          </span>
          <span className="adm-num">{money(order.subtotal)}</span>
        </div>
      </button>
      {next && (
        <Button variant={order.status === "received" ? "primary" : "secondary"} block loading={busy} onClick={() => onAdvance(order, next.to)}>
          {t(next.label)}
        </Button>
      )}
    </article>
  );
}

/* ── All orders ──────────────────────────────────────────────────────────── */

type StatusFilter = "all" | "open" | OrderStatus;

function HistoryView({ version, onOpen, onChanged }: { version: number; onOpen: (id: string) => void; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const [status, setStatus] = useState<StatusFilter>("all");
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [source, setSource] = useState("");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const PAGE = 50;

  useEffect(() => {
    const id = window.setTimeout(() => setDebounced(query), 300);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => setPage(0), [status, debounced, from, to, source]);

  const statuses: OrderStatus[] = useMemo(
    () => (status === "all" ? [] : status === "open" ? ["received", "preparing", "ready"] : [status]),
    [status],
  );

  const orders = useAsync(
    () => fetchOrders({ statuses, from: from || null, to: to || null, query: debounced, source, limit: PAGE, offset: page * PAGE }),
    [statuses, from, to, debounced, source, page, version],
  );

  const setRange = (days: number | null) => {
    if (days === null) {
      setFrom("");
      setTo("");
    } else {
      setFrom(bahrainToday(-days));
      setTo(bahrainToday());
    }
  };

  const exportSpec = async (): Promise<ExportSpec> => {
    const rows: Record<string, unknown>[] = [];
    let revenue = 0;
    for (let offset = 0; offset < 5000; offset += 200) {
      const r = await fetchOrders({ statuses, from: from || null, to: to || null, query: debounced, source, limit: 200, offset });
      if (!r.ok) throw new Error(r.error);
      if (offset === 0) revenue = r.value.revenue;
      for (const o of r.value.rows) {
        rows.push({
          reference: o.reference,
          date: dateTime(o.created_at),
          customer: o.customer_name,
          email: o.customer_email ?? "",
          phone: o.customer_phone ?? "",
          status: STATUS[o.status].label,
          source: o.source,
          items: o.items.map((i) => `${i.quantity}× ${i.name}`).join(", "),
          total: `BD ${o.subtotal.toFixed(3)}`,
          refunded: o.refunded_amount ? `BD ${o.refunded_amount.toFixed(3)}` : "",
          payment: o.payment_method,
        });
      }
      if (r.value.rows.length < 200) break;
    }
    const period = from || to ? `${from || "…"} to ${to || "…"}` : "All dates";
    return {
      title: "Orders",
      subtitle: `${period} · ${rows.length} orders · BD ${Number(revenue).toFixed(3)} after refunds`,
      filename: `mantel-orders-${bahrainToday()}`,
      sections: [{
        columns: [
          { key: "reference", label: "Order", weight: 1.3 },
          { key: "date", label: "Placed", weight: 1.3 },
          { key: "customer", label: "Customer", weight: 1.4 },
          { key: "items", label: "Items", weight: 3 },
          { key: "total", label: "Total", weight: 1.2, align: "right" },
          { key: "status", label: "Status", weight: 1.1 },
          { key: "email", label: "Email", wordless: true },
          { key: "phone", label: "Phone", wordless: true },
          { key: "source", label: "Source", wordless: true },
          { key: "refunded", label: "Refunded", wordless: true },
          { key: "payment", label: "Payment", wordless: true },
        ],
        rows,
      }],
    };
  };

  const bulk = async (to: OrderStatus) => {
    const ids = [...selected];
    const r = await bulkOrderStatus(ids, to);
    if (!r.ok) return toast.error(r.error);
    setSelected(new Set());
    toast.ok(t("{n} orders updated", { n: r.value }));
    await orders.reload();
    onChanged();
  };

  const data = orders.data;
  const pages = data ? Math.max(1, Math.ceil(data.total / PAGE)) : 1;

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <Chips<StatusFilter>
        label={t("Status")}
        value={status}
        onChange={setStatus}
        options={[
          { value: "all", label: t("All") },
          { value: "open", label: t("Open") },
          { value: "completed", label: t("Collected") },
          { value: "cancelled", label: t("Cancelled") },
          { value: "not_collected", label: t("Not collected") },
        ]}
      />
      <div className="adm-row" style={{ alignItems: "flex-end" }}>
        <SearchInput value={query} onChange={setQuery} placeholder={t("Order number, name, email, phone or item")} />
        <label className="adm-field" style={{ width: 160 }}>
          <span className="adm-label">{t("From")}</span>
          <input type="date" className="adm-input" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label className="adm-field" style={{ width: 160 }}>
          <span className="adm-label">{t("To")}</span>
          <input type="date" className="adm-input" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <label className="adm-field" style={{ width: 160 }}>
          <span className="adm-label">{t("Where from")}</span>
          <select className="adm-select" value={source} onChange={(e) => setSource(e.target.value)}>
            <option value="">{t("Everywhere")}</option>
            <option value="online">{t("Website")}</option>
            <option value="phone">{t("Phone")}</option>
            <option value="walk-in">{t("Walk-in")}</option>
          </select>
        </label>
      </div>
      <div className="adm-spread">
        <div className="adm-row">
          <Button size="sm" variant="ghost" onClick={() => setRange(0)}>{t("Today")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setRange(6)}>{t("Last 7 days")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setRange(29)}>{t("Last 30 days")}</Button>
          <Button size="sm" variant="ghost" onClick={() => setRange(null)}>{t("Any time")}</Button>
        </div>
        <ExportButton spec={exportSpec} disabled={!data?.total} />
      </div>

      {selected.size > 0 && (
        <div className="adm-notice">
          <div><strong>{t("{n} selected", { n: selected.size })}</strong></div>
          <div className="adm-row">
            <Button size="sm" onClick={() => bulk("completed")}>{t("Mark collected")}</Button>
            <Button size="sm" onClick={() => bulk("ready")}>{t("Mark ready")}</Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>{t("Clear")}</Button>
          </div>
        </div>
      )}

      {orders.loading && !data ? (
        <Loading />
      ) : orders.error ? (
        <LoadError message={orders.error} onRetry={orders.reload} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState icon={<Receipt size={32} />} title={t("No orders match")} body={t("Try another filter, or clear the search.")} />
      ) : (
        <>
          <p className="adm-muted adm-small">
            {t("{n} orders · {total} after refunds (cancelled not counted)", { n: data.total, total: money(data.revenue) })}
          </p>
          <div className="adm-table-wrap">
            <table className="adm-table adm-cards adm-cards-orders">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><span className="sr-only">{t("Select")}</span></th>
                  <th>{t("Order")}</th>
                  <th>{t("Customer")}</th>
                  <th>{t("Items")}</th>
                  <th>{t("Total")}</th>
                  <th>{t("Status")}</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((o) => (
                  <tr key={o.id} className="is-clickable" onClick={() => onOpen(o.id)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        label={<span className="sr-only">{o.reference}</span>}
                        checked={selected.has(o.id)}
                        onChange={(v) => setSelected((s) => {
                          const next = new Set(s);
                          if (v) next.add(o.id);
                          else next.delete(o.id);
                          return next;
                        })}
                      />
                    </td>
                    <td><strong className="adm-num">{o.reference}</strong><br /><span className="adm-muted adm-small">{dateTime(o.created_at)}</span></td>
                    <td>{o.customer_name}<br /><span className="adm-muted adm-small" dir="ltr">{o.customer_email ?? o.customer_phone ?? ""}</span></td>
                    <td className="adm-small" style={{ maxWidth: 280 }}>{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")}</td>
                    <td className="adm-num">{money(o.subtotal)}{o.refunded_amount > 0 && <><br /><span className="adm-small" style={{ color: "var(--a-brand)" }}>−{money(o.refunded_amount)}</span></>}</td>
                    <td><Badge tone={STATUS[o.status].tone}>{t(STATUS[o.status].label)}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {pages > 1 && (
            <div className="adm-row" style={{ justifyContent: "center" }}>
              <Button size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t("Newer")}</Button>
              <span className="adm-muted adm-small">{t("Page {p} of {n}", { p: page + 1, n: pages })}</span>
              <Button size="sm" disabled={page >= pages - 1} onClick={() => setPage((p) => p + 1)}>{t("Older")}</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
