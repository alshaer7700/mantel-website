import { useState } from "react";
import { CheckCircle2, Download, HeartPulse, RefreshCw } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync } from "@/admin/lib/useAsync";
import { ago, bahrainToday, dateTime, downloadFile, num } from "@/admin/lib/format";
import { rpc } from "@/admin/lib/db";
import { Button } from "@/admin/ui/controls";
import { Badge, Card, EmptyState, LoadError, Loading, Notice, PageHeader, Stat } from "@/admin/ui/layout";
import { useToast } from "@/admin/ui/overlays";

type Alert = {
  fingerprint: string;
  event_type: string;
  route: string | null;
  severity: string;
  status: "open" | "acknowledged" | "resolved";
  first_seen_at: string;
  last_seen_at: string;
  occurrences: number;
};

type Email = { id: number; created_at: string; kind: string; recipient: string; subject: string | null; status: string; error: string | null };

type Health = {
  alerts: Alert[];
  errors_7d: number;
  emails: Email[];
  notification_calls: { at: string; status: number | null; error: string | null }[];
  busy_devices: { device: string; orders: number; last: string }[];
  counts: { orders: number; menu_items: number; objects: number; customers: number; subscribers: number; photos: number };
};

const EVENT_LABEL: Record<string, string> = {
  error: "A page hit an error in a visitor's browser",
  "unhandled-rejection": "Something failed to load in a visitor's browser",
  performance: "A page was slow to load",
};

export function HealthSection() {
  const t = useT();
  const toast = useToast();
  const { refreshCounts } = useAdmin();
  const health = useAsync(() => rpc<Health>("admin_health"), []);
  const [backingUp, setBackingUp] = useState(false);

  const setStatus = async (a: Alert, status: Alert["status"]) => {
    health.setData((h) => (h ? { ...h, alerts: h.alerts.map((x) => (x.fingerprint === a.fingerprint ? { ...x, status } : x)) } : h));
    const r = await rpc("admin_set_alert_status", { p_fingerprint: a.fingerprint, p_status: status });
    if (!r.ok) {
      await health.reload();
      return toast.error(r.error);
    }
    refreshCounts();
    toast.ok(status === "resolved" ? t("Marked as fixed") : t("Marked as seen"));
  };

  const backup = async () => {
    setBackingUp(true);
    const r = await rpc<unknown>("admin_export_all");
    setBackingUp(false);
    if (!r.ok) return toast.error(r.error);
    downloadFile(`mantel-backup-${bahrainToday()}.json`, JSON.stringify(r.value, null, 2), "application/json");
    toast.ok(t("Backup downloaded. Keep it somewhere safe."));
  };

  if (health.loading && !health.data) return <><Header /><Loading /></>;
  if (health.error) return <><Header /><LoadError message={health.error} onRetry={health.reload} /></>;
  const h = health.data!;
  const open = h.alerts.filter((a) => a.status !== "resolved");
  const failedEmails = h.emails.filter((e) => e.status === "failed");
  const failedCalls = h.notification_calls.filter((c) => c.error || (c.status !== null && c.status >= 400));

  return (
    <>
      <Header
        actions={(
          <>
            <Button icon={<RefreshCw size={16} />} onClick={health.reload} loading={health.loading}>{t("Check again")}</Button>
            <Button icon={<Download size={16} />} onClick={backup} loading={backingUp}>{t("Download a backup")}</Button>
          </>
        )}
      />

      {open.length === 0 && failedEmails.length === 0 && failedCalls.length === 0 ? (
        <Notice tone="ok" title={t("Everything looks healthy")}>{t("No open problems, and emails are going out.")}</Notice>
      ) : (
        <Notice tone="warn" title={t("{n} things need a look", { n: open.length + (failedEmails.length ? 1 : 0) + (failedCalls.length ? 1 : 0) })}>
          {t("Details are below. If something keeps happening, send a screenshot of this page to your developer.")}
        </Notice>
      )}

      <div className="adm-grid-4">
        <Stat label={t("Open problems")} value={open.length} alert={open.length > 0} />
        <Stat label={t("Errors in 7 days")} value={num(h.errors_7d)} note={t("Seen in visitors' browsers")} />
        <Stat label={t("Emails sent")} value={num(h.emails.length)} note={failedEmails.length ? t("{n} failed", { n: failedEmails.length }) : t("Recent, none failed")} alert={failedEmails.length > 0} />
        <Stat label={t("Busy devices today")} value={h.busy_devices.length} note={t("3 or more orders from one device")} />
      </div>

      <Card title={t("Problems")} subtitle={t("Errors the website reported by itself. Similar errors are grouped.")}>
        {h.alerts.length === 0 ? (
          <EmptyState icon={<CheckCircle2 size={28} />} title={t("No problems reported")} />
        ) : (
          <div className="adm-list">
            {h.alerts.map((a) => (
              <div key={a.fingerprint} className="adm-list-row">
                <span className="adm-list-main">
                  <span className="adm-list-title">{t(EVENT_LABEL[a.event_type] ?? a.event_type)}</span>
                  <span className="adm-list-meta">
                    {a.route ? `${a.route} · ` : ""}{t("{n} times", { n: a.occurrences })} · {t("last {when}", { when: ago(a.last_seen_at) })}
                  </span>
                </span>
                <span className="adm-list-side">
                  <Badge tone={a.status === "open" ? (a.severity === "critical" ? "danger" : "warn") : a.status === "resolved" ? "ok" : "neutral"}>
                    {a.status === "open" ? t("Open") : a.status === "resolved" ? t("Fixed") : t("Seen")}
                  </Badge>
                  {a.status === "open" && <Button size="sm" variant="ghost" onClick={() => setStatus(a, "acknowledged")}>{t("Mark as seen")}</Button>}
                  {a.status !== "resolved" ? (
                    <Button size="sm" onClick={() => setStatus(a, "resolved")}>{t("Mark as fixed")}</Button>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setStatus(a, "open")}>{t("Reopen")}</Button>
                  )}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>

      <div className="adm-grid-2">
        <Card title={t("Emails")} subtitle={t("Order confirmations and other emails the website sent.")}>
          {h.emails.length === 0 ? (
            <p className="adm-muted">{t("No emails sent yet.")}</p>
          ) : (
            <div className="adm-list">
              {h.emails.slice(0, 12).map((e) => (
                <div key={e.id} className="adm-list-row">
                  <span className="adm-list-main">
                    <span className="adm-list-title">{e.subject || e.kind}</span>
                    <span className="adm-list-meta"><span dir="ltr">{e.recipient}</span> · {dateTime(e.created_at)}{e.error ? ` · ${e.error}` : ""}</span>
                  </span>
                  <Badge tone={e.status === "sent" ? "ok" : e.status === "failed" ? "danger" : "neutral"}>{e.status === "sent" ? t("Sent") : e.status === "failed" ? t("Failed") : t("Skipped")}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card title={t("New-order alerts")} subtitle={t("The messages the website sends out when an order comes in.")}>
          {h.notification_calls.length === 0 ? (
            <p className="adm-muted">{t("Nothing sent recently.")}</p>
          ) : (
            <div className="adm-list">
              {h.notification_calls.slice(0, 12).map((c, i) => {
                const ok = !c.error && c.status !== null && c.status < 400;
                return (
                  <div key={`${c.at}-${i}`} className="adm-list-row">
                    <span className="adm-list-main">
                      <span className="adm-list-title">{dateTime(c.at)}</span>
                      {!ok && <span className="adm-list-meta">{c.error ?? t("Answered with code {code}", { code: c.status ?? "—" })}</span>}
                    </span>
                    <Badge tone={ok ? "ok" : "danger"}>{ok ? t("Delivered") : t("Failed")}</Badge>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {h.busy_devices.length > 0 && (
        <Card title={t("Busy devices today")} subtitle={t("One device placing many orders can be a prank. Check these orders before preparing them.")}>
          <div className="adm-list">
            {h.busy_devices.map((d) => (
              <div key={d.device} className="adm-list-row">
                <span className="adm-list-main">
                  <span className="adm-list-title">{t("Device {id}", { id: d.device })}</span>
                  <span className="adm-list-meta">{t("last {when}", { when: ago(d.last) })}</span>
                </span>
                <Badge tone="warn">{t("{n} orders", { n: d.orders })}</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title={t("What's stored")} subtitle={t("The backup file contains all of this.")}>
        <div className="adm-grid-3">
          <Stat label={t("Orders")} value={num(h.counts.orders)} />
          <Stat label={t("Customers")} value={num(h.counts.customers)} />
          <Stat label={t("Newsletter subscribers")} value={num(h.counts.subscribers)} />
          <Stat label={t("Menu items")} value={num(h.counts.menu_items)} />
          <Stat label={t("Retail products")} value={num(h.counts.objects)} />
          <Stat label={t("Photos")} value={num(h.counts.photos)} />
        </div>
      </Card>
    </>
  );
}

function Header({ actions }: { actions?: React.ReactNode }) {
  const t = useT();
  return (
    <PageHeader
      overline={t("07 — Under the hood")}
      title={t("Site health.")}
      subtitle={t("Whether the website is working, and a backup button for peace of mind.")}
      actions={actions}
      help={<><HeartPulse size={14} aria-hidden="true" /> {t("The website reports its own errors here automatically. You don't need to do anything unless something is marked open.")}</>}
    />
  );
}
