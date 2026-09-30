import { useMemo, useState } from "react";
import { Mail, Megaphone } from "lucide-react";
import { useT } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { useAsync } from "@/admin/lib/useAsync";
import { bahrainToday, dateOnly } from "@/admin/lib/format";
import { ExportButton } from "@/admin/ui/ExportButton";
import { db, run } from "@/admin/lib/db";
import { Chips, SearchInput, Toggle } from "@/admin/ui/controls";
import { EmptyState, LoadError, Loading, PageHeader, Stat, Tabs } from "@/admin/ui/layout";
import { useToast } from "@/admin/ui/overlays";
import { NewslettersPanel } from "@/admin/sections/marketing/NewslettersPanel";

type Subscriber = { email: string; status: "active" | "unsubscribed"; subscribed_at: string };

type Tab = "subscribers" | "campaigns" | "promos" | "loyalty";

export function MarketingSection() {
  const t = useT();
  const { rest, navigate } = useAdmin();
  const tab = (["subscribers", "campaigns", "promos", "loyalty"].includes(rest[0] ?? "") ? rest[0] : "subscribers") as Tab;
  /* One newsletter open: it brings its own header. */
  if (tab === "campaigns" && rest[1]) return <NewslettersPanel />;
  return (
    <>
      <PageHeader overline={t("03 — Keep in touch")} title={t("Marketing.")} subtitle={t("Your subscribers and the newsletters you send them, promo codes, loyalty and gift cards.")} />
      <Tabs
        label={t("Marketing sections")}
        value={tab}
        onChange={(v) => navigate("marketing", v === "subscribers" ? null : v)}
        tabs={[
          { value: "subscribers", label: t("Subscribers") },
          { value: "campaigns", label: t("Newsletters") },
          { value: "promos", label: t("Promo codes") },
          { value: "loyalty", label: t("Loyalty & gift cards") },
        ]}
      />
      {tab === "subscribers" ? <Subscribers /> : tab === "campaigns" ? <NewslettersPanel /> : <EmptyState icon={<Megaphone size={32} />} title={t("This screen is being built")} body={t("It will appear here in the next update.")} />}
    </>
  );
}

function Subscribers() {
  const t = useT();
  const toast = useToast();
  const subs = useAsync(() => run<Subscriber[]>(db.from("newsletter_subscribers").select("email, status, subscribed_at").order("subscribed_at", { ascending: false })), []);
  const [filter, setFilter] = useState<"active" | "unsubscribed" | "all">("active");
  const [query, setQuery] = useState("");

  const list = useMemo(() => (subs.data ?? []).filter((s) => {
    if (filter !== "all" && s.status !== filter) return false;
    return !query.trim() || s.email.includes(query.trim().toLowerCase());
  }), [subs.data, filter, query]);

  const active = (subs.data ?? []).filter((s) => s.status === "active").length;
  const thisMonth = (subs.data ?? []).filter((s) => s.status === "active" && s.subscribed_at.slice(0, 7) === bahrainToday().slice(0, 7)).length;

  const setStatus = async (s: Subscriber, on: boolean) => {
    const status = on ? "active" : "unsubscribed";
    subs.setData((all) => (all ?? []).map((x) => (x.email === s.email ? { ...x, status } : x)));
    const r = await run(db.from("newsletter_subscribers").update({ status }).eq("email", s.email));
    if (!r.ok) {
      subs.setData((all) => (all ?? []).map((x) => (x.email === s.email ? s : x)));
      return toast.error(r.error);
    }
    toast.ok(on ? t("{email} will receive the newsletter", { email: s.email }) : t("{email} unsubscribed", { email: s.email }));
  };

  return (
    <div className="adm-stack" style={{ gap: 16 }}>
      <div className="adm-grid-4">
        <Stat label={t("Subscribers")} value={active} note={t("Receiving the newsletter")} />
        <Stat label={t("New this month")} value={thisMonth} />
      </div>
      <div className="adm-spread">
        <Chips
          label={t("Show")}
          value={filter}
          onChange={setFilter}
          options={[
            { value: "active", label: t("Subscribed") },
            { value: "unsubscribed", label: t("Unsubscribed") },
            { value: "all", label: t("All") },
          ]}
        />
        <div className="adm-row">
          <SearchInput value={query} onChange={setQuery} placeholder={t("Search emails")} />
          <ExportButton
            disabled={!list.length}
            spec={() => ({
              title: "Newsletter subscribers",
              subtitle: `${list.length} ${filter === "active" ? "subscribed" : filter === "unsubscribed" ? "unsubscribed" : "in total"}`,
              filename: `mantel-subscribers-${bahrainToday()}`,
              sections: [{
                columns: [
                  { key: "email", label: "Email", weight: 3 },
                  { key: "status", label: "Status", weight: 1.2 },
                  { key: "subscribed", label: "Since", weight: 1.4 },
                ],
                rows: list.map((s) => ({ email: s.email, status: s.status === "active" ? "Subscribed" : "Unsubscribed", subscribed: dateOnly(s.subscribed_at) })),
              }],
            })}
          />
        </div>
      </div>
      {subs.loading && !subs.data ? (
        <Loading />
      ) : subs.error ? (
        <LoadError message={subs.error} onRetry={subs.reload} />
      ) : list.length === 0 ? (
        <EmptyState icon={<Mail size={32} />} title={t("No subscribers here yet")} body={t("People who sign up on the home page appear here.")} />
      ) : (
        <div className="adm-list">
          {list.map((s) => (
            <div key={s.email} className="adm-list-row">
              <span className="adm-list-main">
                <span className="adm-list-title" dir="ltr" style={{ textAlign: "start" }}>{s.email}</span>
                <span className="adm-list-meta">{t("Since {date}", { date: dateOnly(s.subscribed_at) })}</span>
              </span>
              <Toggle label={<span className="sr-only">{t("Subscribed")}</span>} checked={s.status === "active"} onChange={(v) => setStatus(s, v)} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
