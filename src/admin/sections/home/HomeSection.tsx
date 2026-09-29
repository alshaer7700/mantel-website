import { ArrowRight, Coffee, Globe, Inbox, PauseCircle, Receipt } from "lucide-react";
import { useLang, useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync, useInterval } from "@/admin/lib/useAsync";
import { ago, bahrainToday, money } from "@/admin/lib/format";
import { db, run, type Result } from "@/admin/lib/db";
import { Button } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, Loading, PageHeader, Stat } from "@/admin/ui/layout";
import { useToast } from "@/admin/ui/overlays";
import { NEXT_STEP, STATUS, fetchBoard, fetchOrders, setOrderStatus } from "@/admin/sections/orders/api";

type Msg = { id: string; first_name: string; last_name: string; message: string; created_at: string; status: string };

function greeting(): string {
  const hour = Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bahrain", hour: "numeric", hour12: false }).format(new Date()));
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function HomeSection() {
  const t = useT();
  const { lang } = useLang();
  const toast = useToast();
  const { me, can, navigate, counts, refreshCounts } = useAdmin();
  const board = useAsync(() => (can("orders") ? fetchBoard() : Promise.resolve({ ok: true as const, value: null })), []);
  const today = useAsync(
    () => (can("orders")
      ? fetchOrders({ statuses: ["received", "preparing", "ready", "completed"], from: bahrainToday(), to: bahrainToday(), query: "", source: "", limit: 1, offset: 0 })
      : Promise.resolve({ ok: true as const, value: null })),
    [],
  );
  const messages = useAsync<Msg[]>(
    (): Promise<Result<Msg[]>> => (can("messages")
      ? run<Msg[]>(db.from("contact_messages").select("id, first_name, last_name, message, created_at, status").eq("status", "new").order("created_at", { ascending: false }).limit(4))
      : Promise.resolve({ ok: true, value: [] })),
    [],
  );

  useInterval(() => {
    void board.reload();
    void today.reload();
  }, 20000);

  const active = board.data?.active ?? [];
  const preparing = active.filter((o) => o.status === "preparing" || o.status === "ready").length;

  return (
    <>
      <PageHeader
        overline={new Intl.DateTimeFormat(lang === "ar" ? "ar-BH-u-nu-latn" : "en-GB", { timeZone: "Asia/Bahrain", weekday: "long", day: "numeric", month: "long" }).format(new Date())}
        title={`${t(greeting())}, ${me.display_name}.`}
        subtitle={t("Here's what needs you right now.")}
      />

      {can("orders") && (
        <div className="adm-grid-4">
          <Stat label={t("New orders")} value={counts.new_orders} alert={counts.new_orders > 0} note={counts.new_orders > 0 ? t("Waiting to be started") : t("All caught up")} onClick={() => navigate("orders")} />
          <Stat label={t("In progress")} value={preparing} note={t("Preparing or ready")} onClick={() => navigate("orders")} />
          <Stat label={t("Today's sales")} value={today.data ? money(today.data.revenue) : "—"} note={today.data ? t("{n} orders", { n: today.data.total }) : ""} onClick={() => navigate("orders", "all")} />
          {can("messages") && (
            <Stat label={t("Unread messages")} value={counts.unread_messages} alert={counts.unread_messages > 0} note={t("From the contact form")} onClick={() => navigate("messages")} />
          )}
        </div>
      )}

      <div className="adm-grid-2">
        {can("orders") && (
          <Card
            title={t("Waiting now")}
            actions={<Button size="sm" variant="ghost" onClick={() => navigate("orders")}>{t("Open the board")} <ArrowRight size={14} className="adm-flip-rtl" /></Button>}
          >
            {board.loading && !board.data ? (
              <Loading />
            ) : active.length === 0 ? (
              <EmptyState icon={<Receipt size={28} />} title={t("No open orders")} body={t("New orders will appear here and on the board.")} />
            ) : (
              <div className="adm-list">
                {active.slice(0, 6).map((o) => {
                  const next = NEXT_STEP[o.status];
                  return (
                    <div key={o.id} className="adm-list-row">
                      <button type="button" className="adm-list-main" style={{ all: "unset", cursor: "pointer", flex: 1, minWidth: 0, display: "grid", gap: 2 }} onClick={() => navigate("orders", o.id)}>
                        <span className="adm-list-title">{o.reference} · {o.customer_name}</span>
                        <span className="adm-list-meta">{o.items.map((i) => `${i.quantity}× ${i.name}`).join(", ")} · {ago(o.created_at)}</span>
                      </button>
                      <span className="adm-list-side">
                        <Badge tone={STATUS[o.status].tone}>{t(STATUS[o.status].label)}</Badge>
                        {next && (
                          <Button
                            size="sm"
                            onClick={async () => {
                              const r = await setOrderStatus(o.id, next.to);
                              if (!r.ok) return toast.error(r.error);
                              toast.ok(t("{ref} is now “{status}”", { ref: o.reference, status: t(STATUS[next.to].label) }));
                              await board.reload();
                              refreshCounts();
                            }}
                          >
                            {t(next.label)}
                          </Button>
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        )}

        {can("messages") && (
          <Card
            title={t("New messages")}
            actions={<Button size="sm" variant="ghost" onClick={() => navigate("messages")}>{t("All messages")} <ArrowRight size={14} className="adm-flip-rtl" /></Button>}
          >
            {(messages.data ?? []).length === 0 ? (
              <EmptyState icon={<Inbox size={28} />} title={t("Nothing unread")} />
            ) : (
              <div className="adm-list">
                {(messages.data ?? []).map((m) => (
                  <button key={m.id} type="button" className="adm-list-row" onClick={() => navigate("messages", m.id)}>
                    <span className="adm-list-main">
                      <span className="adm-list-title">{`${m.first_name} ${m.last_name}`.trim()}</span>
                      <span className="adm-list-meta">{m.message.slice(0, 90)}{m.message.length > 90 ? "…" : ""}</span>
                    </span>
                    <span className="adm-muted adm-small">{ago(m.created_at)}</span>
                  </button>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      <Card title={t("Quick actions")}>
        <div className="adm-grid-3">
          {can("catalog") && <Button icon={<Coffee size={16} />} onClick={() => navigate("menu", "new")}>{t("Add a menu item")}</Button>}
          {can("catalog") && <Button icon={<Coffee size={16} />} onClick={() => navigate("menu")}>{t("Mark something sold out")}</Button>}
          {can("settings") && <Button icon={<PauseCircle size={16} />} onClick={() => navigate("settings")}>{t("Pause online orders")}</Button>}
          {can("content") && <Button icon={<Globe size={16} />} onClick={() => navigate("website")}>{t("Edit website pages")}</Button>}
          {can("orders") && <Button icon={<Receipt size={16} />} onClick={() => navigate("orders", "all")}>{t("Find an order")}</Button>}
        </div>
      </Card>
    </>
  );
}
