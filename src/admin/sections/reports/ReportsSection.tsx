import { useMemo, useState } from "react";
import { BarChart3, Printer } from "lucide-react";
import { useLang, useT } from "@/admin/i18n";
import { useAsync } from "@/admin/lib/useAsync";
import { bahrainToday, money, num, weekdayName } from "@/admin/lib/format";
import type { ExportSpec } from "@/admin/lib/letterhead";
import { ExportButton } from "@/admin/ui/ExportButton";
import { db, rpc, run } from "@/admin/lib/db";
import { Button, Chips, TextField } from "@/admin/ui/controls";
import { Card, EmptyState, LoadError, Loading, PageHeader, Stat } from "@/admin/ui/layout";
import { BarChart, BarList, Heatmap } from "@/admin/sections/reports/charts";

type Report = {
  from: string;
  to: string;
  totals: { orders: number; revenue: number; average: number; items: number; refunds: number; cancelled: number; not_collected: number; cash: number };
  previous: { orders: number; revenue: number };
  by_day: { day: string; orders: number; revenue: number }[];
  top_items: { name: string; quantity: number; revenue: number }[];
  slow_items: { name: string; quantity: number }[];
  by_hour: { dow: number; hour: number; orders: number }[];
  by_category: { category: string; revenue: number; quantity: number }[];
  by_source: { source: string; orders: number; revenue: number }[];
  customers: { new: number; returning: number; guests: number };
};

type Preset = "today" | "yesterday" | "7" | "30" | "month" | "custom";

const n = (v: unknown) => Number(v ?? 0);

function rangeFor(preset: Preset, custom: { from: string; to: string }): { from: string; to: string } {
  const today = bahrainToday();
  switch (preset) {
    case "today": return { from: today, to: today };
    case "yesterday": return { from: bahrainToday(-1), to: bahrainToday(-1) };
    case "7": return { from: bahrainToday(-6), to: today };
    case "30": return { from: bahrainToday(-29), to: today };
    case "month": return { from: `${today.slice(0, 8)}01`, to: today };
    case "custom": return custom;
  }
}

function change(now: number, before: number): string | null {
  if (!before) return null;
  const pct = Math.round(((now - before) / before) * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export function ReportsSection() {
  const t = useT();
  const { lang } = useLang();
  const [preset, setPreset] = useState<Preset>("7");
  const [custom, setCustom] = useState({ from: bahrainToday(-13), to: bahrainToday() });
  const range = rangeFor(preset, custom);
  const valid = range.from && range.to && range.from <= range.to;
  const report = useAsync(
    () => (valid ? rpc<Report>("admin_report", { p_from: range.from, p_to: range.to }) : Promise.resolve({ ok: true as const, value: null as unknown as Report })),
    [range.from, range.to],
  );
  const r = report.data;
  const cats = useAsync(() => run<{ label: string; label_ar: string | null }[]>(db.from("menu_categories").select("label, label_ar")), []);
  const catLabel = (label: string) => {
    const ar = lang === "ar" ? cats.data?.find((c) => c.label === label)?.label_ar : null;
    return ar || t(label);
  };

  const shortDate = useMemo(() => {
    const f = new Intl.DateTimeFormat(lang === "ar" ? "ar-BH-u-nu-latn" : "en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
    return (d: string) => f.format(new Date(`${d}T00:00:00Z`));
  }, [lang]);
  const longDate = useMemo(() => {
    const f = new Intl.DateTimeFormat(lang === "ar" ? "ar-BH-u-nu-latn" : "en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });
    return (d: string) => f.format(new Date(`${d}T00:00:00Z`));
  }, [lang]);

  const revenue = n(r?.totals.revenue);
  const prevRevenue = n(r?.previous.revenue);
  const orders = n(r?.totals.orders);
  const oneDay = range.from === range.to;
  const shortMoney = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v % 1 === 0 ? String(v) : v.toFixed(1));

  const exportSpec = (): ExportSpec => {
    const fmt = (d: string) => new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
    const rr = r!;
    return {
      title: "Sales report",
      subtitle: `${fmt(range.from)} – ${fmt(range.to)} · ${rr.totals.orders} orders · BD ${n(rr.totals.revenue).toFixed(3)} after refunds · cash BD ${n(rr.totals.cash).toFixed(3)}`,
      filename: `mantel-sales-${range.from}-to-${range.to}`,
      sections: [
        {
          heading: "Sales by day",
          columns: [
            { key: "date", label: "Day", weight: 2 },
            { key: "orders", label: "Orders", weight: 1, align: "right" },
            { key: "sales", label: "Sales", weight: 1.4, align: "right" },
          ],
          rows: rr.by_day.map((d) => ({ date: fmt(d.day), orders: d.orders, sales: `BD ${n(d.revenue).toFixed(3)}` })),
        },
        {
          heading: "Best sellers",
          columns: [
            { key: "item", label: "Item", weight: 3 },
            { key: "sold", label: "Sold", weight: 1, align: "right" },
            { key: "sales", label: "Sales", weight: 1.4, align: "right" },
          ],
          rows: rr.top_items.map((i) => ({ item: i.name, sold: i.quantity, sales: `BD ${n(i.revenue).toFixed(3)}` })),
        },
      ],
    };
  };

  return (
    <>
      <PageHeader
        overline={t("05 — How it's going")}
        title={t("Reports.")}
        subtitle={t("Sales, best sellers and your busiest hours. Cancelled orders are left out.")}
        help={t("All times are Bahrain time. Refunds are taken off the sales totals.")}
        actions={(
          <>
            <Button icon={<Printer size={16} />} onClick={() => window.print()} disabled={!r}>{t("Print")}</Button>
            <ExportButton spec={exportSpec} disabled={!r || !orders} label={t("Download for the accountant")} />
          </>
        )}
      />

      <div className="adm-spread">
        <Chips
          label={t("Period")}
          value={preset}
          onChange={setPreset}
          options={[
            { value: "today", label: t("Today") },
            { value: "yesterday", label: t("Yesterday") },
            { value: "7", label: t("Last 7 days") },
            { value: "30", label: t("Last 30 days") },
            { value: "month", label: t("This month") },
            { value: "custom", label: t("Choose dates") },
          ]}
        />
        {preset === "custom" && (
          <div className="adm-row">
            <TextField label={t("From")} type="date" value={custom.from} max={custom.to} onChange={(v) => setCustom({ ...custom, from: v })} />
            <TextField label={t("To")} type="date" value={custom.to} min={custom.from} max={bahrainToday()} onChange={(v) => setCustom({ ...custom, to: v })} />
          </div>
        )}
      </div>

      {!valid ? (
        <EmptyState title={t("Choose a start date before the end date")} />
      ) : report.loading && !r ? (
        <Loading />
      ) : report.error ? (
        <LoadError message={report.error} onRetry={report.reload} />
      ) : r && (
        <div className="adm-stack" style={{ gap: 16 }}>
          <div className="adm-grid-4">
            <Stat
              label={t("Sales")}
              value={money(revenue)}
              note={change(revenue, prevRevenue) ? t("{change} vs the period before", { change: change(revenue, prevRevenue)! }) : t("After refunds")}
            />
            <Stat label={t("Orders")} value={num(orders)} note={change(orders, n(r.previous.orders)) ? t("{change} vs the period before", { change: change(orders, n(r.previous.orders))! }) : undefined} />
            <Stat label={t("Average order")} value={money(r.totals.average)} note={t("{n} items sold", { n: num(n(r.totals.items)) })} />
            <Stat label={t("Cash to count")} value={money(r.totals.cash)} note={oneDay ? t("Paid in cash at pickup") : t("Cash over the whole period")} />
          </div>

          {orders === 0 ? (
            <EmptyState icon={<BarChart3 size={32} />} title={t("No sales in this period")} body={t("Try a longer period.")} />
          ) : (
            <>
              {!oneDay && (
                <Card title={t("Sales by day")} subtitle={`${longDate(range.from)} – ${longDate(range.to)}`}>
                  <BarChart
                    ariaLabel={t("Sales by day")}
                    format={shortMoney}
                    data={r.by_day.map((d) => ({
                      key: d.day,
                      label: shortDate(d.day),
                      value: n(d.revenue),
                      tip: (
                        <>
                          <strong>{longDate(d.day)}</strong>
                          <span>{money(d.revenue)} · {t("{n} orders", { n: d.orders })}</span>
                        </>
                      ),
                    }))}
                  />
                  <details className="adm-details">
                    <summary>{t("Show as a table")}</summary>
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead><tr><th>{t("Day")}</th><th className="adm-num">{t("Orders")}</th><th className="adm-num">{t("Sales")}</th></tr></thead>
                        <tbody>
                          {r.by_day.map((d) => (
                            <tr key={d.day}><td>{longDate(d.day)}</td><td className="adm-num">{d.orders}</td><td className="adm-num">{money(d.revenue)}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </Card>
              )}

              <div className="adm-grid-2">
                <Card title={t("Best sellers")} subtitle={t("By number sold")}>
                  <BarList
                    format={(v) => num(v)}
                    rows={r.top_items.slice(0, 10).map((i) => ({ key: i.name, label: i.name, value: n(i.quantity), note: money(i.revenue) }))}
                  />
                </Card>
                <Card title={t("Sales by category")}>
                  <BarList
                    format={(v) => money(v)}
                    rows={r.by_category.map((c) => ({
                      key: c.category,
                      label: catLabel(c.category),
                      value: n(c.revenue),
                      note: `${Math.round((n(c.revenue) / Math.max(1, r.by_category.reduce((s, x) => s + n(x.revenue), 0))) * 100)}%`,
                    }))}
                  />
                </Card>
              </div>

              <Card title={t("Busiest hours")} subtitle={t("Orders by day of the week and hour. Darker means busier.")}>
                <Heatmap
                  cells={r.by_hour}
                  emptyLabel={t("Busiest hours")}
                  dayLabel={(dow) => weekdayName(dow).slice(0, lang === "ar" ? 12 : 3)}
                  tip={(c) => t("{day} {hour}:00 — {n} orders", { day: weekdayName(c.dow), hour: String(c.hour).padStart(2, "0"), n: c.orders })}
                />
              </Card>

              <div className="adm-grid-3">
                <Card title={t("Customers")}>
                  <BarList
                    format={(v) => num(v)}
                    rows={[
                      { key: "new", label: t("First order"), value: n(r.customers.new) },
                      { key: "returning", label: t("Came back"), value: n(r.customers.returning) },
                      { key: "guests", label: t("No email given"), value: n(r.customers.guests) },
                    ]}
                  />
                </Card>
                <Card title={t("Where orders came from")}>
                  <BarList
                    format={(v) => num(v)}
                    rows={r.by_source.map((s) => ({ key: s.source, label: t(s.source === "online" ? "Website" : s.source === "phone" ? "Phone" : "Walk-in"), value: n(s.orders), note: money(s.revenue) }))}
                  />
                </Card>
                <Card title={t("Problems")}>
                  <BarList
                    format={(v) => num(v)}
                    rows={[
                      { key: "cancelled", label: t("Cancelled"), value: n(r.totals.cancelled) },
                      { key: "not_collected", label: t("Not collected"), value: n(r.totals.not_collected) },
                    ]}
                  />
                  {n(r.totals.refunds) > 0 && <p className="adm-small adm-muted" style={{ marginTop: 10 }}>{t("Refunded: {amount}", { amount: money(r.totals.refunds) })}</p>}
                </Card>
              </div>

              {r.slow_items.length > 0 && (
                <Card title={t("Slow movers")} subtitle={t("On the menu but sold once or not at all in this period.")}>
                  <p>{r.slow_items.map((i) => (i.quantity ? `${i.name} (${i.quantity})` : i.name)).join(" · ")}</p>
                </Card>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
