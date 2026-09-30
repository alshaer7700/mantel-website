import { useEffect, useState } from "react";
import { CalendarX, Pause, Play, Plus, Trash2 } from "lucide-react";
import { useT, type TFunction } from "@/admin/i18n";
import { useAdmin } from "@/admin/context";
import { getSetting, rpc, saveSetting, type Result } from "@/admin/lib/db";
import { useAsync, useInterval, useUnsavedGuard } from "@/admin/lib/useAsync";
import { bahrainToday, weekdayName } from "@/admin/lib/format";
import { BilingualField, Button, IconButton, MoneyField, NumberField, TextField, Toggle } from "@/admin/ui/controls";
import { ImagePicker } from "@/admin/ui/ImagePicker";
import { Badge, Card, LoadError, Loading, Notice, PageHeader, SaveBar, Tabs } from "@/admin/ui/layout";
import { useConfirm, useToast } from "@/admin/ui/overlays";

/*
 * Shop settings: what the website does on its own, without a developer.
 *
 * Every key here is a public site_settings row the website reads through
 * public_site(). The pause, opening hours, minimum order and item limit are
 * also enforced by place_order in the database (supabase/035), so the website
 * can't take an order the café said it wouldn't.
 */

type Ordering = {
  paused: boolean;
  pause_message: string;
  pause_message_ar: string;
  only_during_hours: boolean;
  min_order: number;
  max_items: number;
  pickup_open: boolean;
  retail_open: boolean;
};

type Day = { day: number; open: string; close: string; closed: boolean };
type Closure = { from: string; to: string; label: string };
type Hours = { week: Day[]; closures: Closure[] };

type Announcement = {
  enabled: boolean;
  text: string;
  text_ar: string;
  link_url: string;
  link_label: string;
  link_label_ar: string;
  starts_at: string | null;
  ends_at: string | null;
};

type Popup = {
  enabled: boolean;
  version: number;
  title: string;
  title_ar: string;
  body: string;
  body_ar: string;
  image: string;
  link_url: string;
  link_label: string;
  link_label_ar: string;
  starts_at: string | null;
  ends_at: string | null;
};

type Maintenance = { enabled: boolean; message: string; message_ar: string };

type Contact = { email: string; phone: string; whatsapp: string; instagram: string; maps_url: string; address: string; address_ar: string };

type Status = {
  open: boolean;
  reason?: "maintenance" | "paused" | "closure" | "hours" | null;
  message?: string;
  next_open?: string | null;
  closes_at?: string | null;
};

const ORDERING: Ordering = { paused: false, pause_message: "", pause_message_ar: "", only_during_hours: false, min_order: 0, max_items: 20, pickup_open: false, retail_open: true };
const HOURS: Hours = {
  week: [0, 1, 2, 3, 4, 5, 6].map((day) => ({ day, open: "07:00", close: "22:00", closed: false })),
  closures: [],
};
const ANNOUNCEMENT: Announcement = { enabled: false, text: "", text_ar: "", link_url: "", link_label: "", link_label_ar: "", starts_at: null, ends_at: null };
const POPUP: Popup = { enabled: false, version: 1, title: "", title_ar: "", body: "", body_ar: "", image: "", link_url: "", link_label: "", link_label_ar: "", starts_at: null, ends_at: null };
const MAINTENANCE: Maintenance = { enabled: false, message: "", message_ar: "" };
const CONTACT: Contact = { email: "", phone: "", whatsapp: "", instagram: "", maps_url: "", address: "", address_ar: "" };

/** Bahrain's week starts on Saturday. */
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

type Tab = "ordering" | "hours" | "website" | "contact" | "maintenance";

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** Bahrain is UTC+3 all year, so a datetime-local value maps to one instant. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  return new Date(ms + 3 * 3600_000).toISOString().slice(0, 16);
}

function fromLocalInput(value: string): string | null {
  return value ? `${value}:00+03:00` : null;
}

function clock(time: string, t: TFunction): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  if (h === 0 && m === 0) return t("midnight");
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? t("am") : t("pm")}`;
}

/** "2026-09-30T08:00" (Bahrain) → "tomorrow at 8:00 am". */
function when(local: string | null | undefined, t: TFunction): string | null {
  if (!local) return null;
  const [date, time = "00:00"] = local.split("T");
  const at = clock(time, t);
  if (date === bahrainToday()) return t("today at {time}", { time: at });
  if (date === bahrainToday(1)) return t("tomorrow at {time}", { time: at });
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return t("{day} at {time}", { day: weekdayName(day), time: at });
}

function isValidUrl(url: string): boolean {
  if (!url) return true;
  if (url.startsWith("/")) return true;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** Loads one settings row into a draft, with dirty tracking and save. */
function useSettingDraft<T extends object>(key: string, fallback: T) {
  const loaded = useAsync(() => getSetting<T>(key, fallback), [key]);
  const [draft, setDraft] = useState<T | null>(null);
  useEffect(() => {
    if (loaded.data) setDraft(loaded.data);
  }, [loaded.data]);
  const dirty = !!draft && !!loaded.data && JSON.stringify(draft) !== JSON.stringify(loaded.data);
  useUnsavedGuard(dirty);
  const save = async (value: T): Promise<Result<true>> => {
    const r = await saveSetting(key, value, true);
    if (r.ok) {
      loaded.setData(() => value);
      setDraft(value);
    }
    return r;
  };
  return { loaded, draft, setDraft, dirty, save, discard: () => setDraft(loaded.data ?? null) };
}

/* ── Section ─────────────────────────────────────────────────────────────── */

export function ShopSettingsSection() {
  const t = useT();
  const { rest, navigate } = useAdmin();
  const tab = (["hours", "website", "contact", "maintenance"].includes(rest[0] ?? "") ? rest[0] : "ordering") as Tab;
  const status = useAsync(() => rpc<Status>("ordering_status"), []);
  useInterval(status.reload, 60_000);

  return (
    <>
      <PageHeader
        overline={t("08 — How the shop runs")}
        title={t("Shop settings.")}
        subtitle={t("Opening hours, pausing orders, and what the website shows. Changes reach the website within a minute or two.")}
      />
      <div className="adm-stack" style={{ gap: 16 }}>
        <StatusCard status={status.data} error={status.error} onChanged={status.reload} />
        <Tabs
          label={t("Shop settings sections")}
          value={tab}
          onChange={(v) => navigate("settings", v === "ordering" ? null : v)}
          tabs={[
            { value: "ordering", label: t("Online orders") },
            { value: "hours", label: t("Opening hours") },
            { value: "website", label: t("Announcements") },
            { value: "contact", label: t("Contact details") },
            { value: "maintenance", label: t("Back-soon page") },
          ]}
        />
        {tab === "ordering" && <OrderingPanel onSaved={status.reload} />}
        {tab === "hours" && <HoursPanel onSaved={status.reload} />}
        {tab === "website" && <WebsitePanel />}
        {tab === "contact" && <ContactPanel />}
        {tab === "maintenance" && <MaintenancePanel onSaved={status.reload} />}
      </div>
    </>
  );
}

/* ── Right now ───────────────────────────────────────────────────────────── */

function StatusCard({ status, error, onChanged }: { status: Status | null; error: string | null; onChanged: () => void }) {
  const t = useT();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const setPaused = async (paused: boolean) => {
    setBusy(true);
    const current = await getSetting<Ordering>("ordering", ORDERING);
    if (!current.ok) {
      setBusy(false);
      return toast.error(current.error);
    }
    const r = await saveSetting("ordering", { ...current.value, paused }, true);
    setBusy(false);
    if (!r.ok) return toast.error(r.error);
    onChanged();
    toast.ok(paused ? t("Online orders paused") : t("Online orders are back on"), () => {
      void saveSetting("ordering", { ...current.value, paused: !paused }, true).then(onChanged);
    });
  };

  if (error) return <LoadError message={error} onRetry={onChanged} />;
  if (!status) return <Loading />;

  const reason =
    status.reason === "paused" ? t("You paused online orders.")
    : status.reason === "maintenance" ? t("The website is showing the back-soon page.")
    : status.reason === "closure" ? t("Today is marked as closed.")
    : status.reason === "hours" ? t("Outside opening hours.")
    : null;
  const next = when(status.next_open, t);
  const closes = when(status.closes_at, t);

  return (
    <div className={`adm-shop-status ${status.open ? "is-open" : "is-closed"}`} role="status">
      <div className="adm-shop-status-text">
        <Badge tone={status.open ? "ok" : "warn"} dot>{status.open ? t("Open") : t("Closed")}</Badge>
        <strong>{status.open ? t("The website is taking orders right now.") : t("The website is not taking orders right now.")}</strong>
        <span>
          {status.open
            ? closes ? t("Until {when}.", { when: closes }) : t("Orders are open around the clock.")
            : [reason, next ? t("Opens again {when}.", { when: next }) : null].filter(Boolean).join(" ")}
        </span>
      </div>
      {status.reason !== "maintenance" && (
        status.reason === "paused" ? (
          <Button variant="primary" size="lg" icon={<Play size={18} />} loading={busy} onClick={() => setPaused(false)}>{t("Resume orders")}</Button>
        ) : (
          <Button size="lg" icon={<Pause size={18} />} loading={busy} onClick={() => setPaused(true)}>{t("Pause orders")}</Button>
        )
      )}
    </div>
  );
}

/* ── Online orders ───────────────────────────────────────────────────────── */

function OrderingPanel({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const s = useSettingDraft<Ordering>("ordering", ORDERING);
  const [saving, setSaving] = useState(false);

  if (s.loaded.loading && !s.loaded.data) return <Loading />;
  if (s.loaded.error) return <LoadError message={s.loaded.error} onRetry={s.loaded.reload} />;
  const d = s.draft;
  if (!d) return null;
  const set = (patch: Partial<Ordering>) => s.setDraft({ ...d, ...patch });

  const save = async () => {
    setSaving(true);
    /* The pause is the one field the status card also writes; keep whatever
       is saved now rather than what this form loaded. */
    const fresh = await getSetting<Ordering>("ordering", ORDERING);
    const r = await s.save({
      ...d,
      paused: fresh.ok ? fresh.value.paused : d.paused,
      min_order: Math.max(0, Math.round((d.min_order || 0) * 1000) / 1000),
      max_items: Math.min(20, Math.max(1, Math.round(d.max_items || 20))),
    });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Saved"));
    onSaved();
  };

  return (
    <div className="adm-stack" style={{ gap: 16, maxWidth: 760 }}>
      <Card title={t("When the website takes orders")}>
        <div className="adm-stack">
          <Toggle
            label={t("Only during opening hours")}
            description={d.only_during_hours ? t("Outside your hours, the cart says when you open next.") : t("Off: people can order any time, even when you're closed.")}
            checked={d.only_during_hours}
            onChange={(v) => set({ only_during_hours: v })}
          />
          <BilingualField
            label={t("Message while orders are paused")}
            en={d.pause_message}
            ar={d.pause_message_ar}
            onEn={(v) => set({ pause_message: v })}
            onAr={(v) => set({ pause_message_ar: v })}
            maxLength={200}
            hint={t("Shown in the cart. Leave blank for: “Online orders are paused for now. Please come by the café.”")}
          />
        </div>
      </Card>
      <Card title={t("Order limits")}>
        <div className="adm-form-grid">
          <MoneyField
            label={t("Minimum order")}
            value={d.min_order}
            onChange={(v) => set({ min_order: v ?? 0 })}
            min={0}
            hint={t("0 means no minimum.")}
          />
          <NumberField
            label={t("Most items in one order")}
            value={d.max_items}
            onChange={(v) => set({ max_items: v ?? 20 })}
            min={1}
            max={20}
            hint={t("Between 1 and 20. Bigger orders can message you.")}
          />
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={saving} onSave={save} onDiscard={s.discard} />
    </div>
  );
}

/* ── Opening hours ───────────────────────────────────────────────────────── */

function HoursPanel({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const s = useSettingDraft<Hours>("hours", HOURS);
  const [saving, setSaving] = useState(false);

  if (s.loaded.loading && !s.loaded.data) return <Loading />;
  if (s.loaded.error) return <LoadError message={s.loaded.error} onRetry={s.loaded.reload} />;
  const d = s.draft;
  if (!d) return null;

  const dayOf = (n: number): Day => d.week.find((w) => w.day === n) ?? { day: n, open: "07:00", close: "22:00", closed: true };
  const setDay = (n: number, patch: Partial<Day>) => {
    const week = WEEK_ORDER.map((i) => (i === n ? { ...dayOf(i), ...patch } : dayOf(i))).sort((a, b) => a.day - b.day);
    s.setDraft({ ...d, week });
  };
  const copyFirst = () => {
    const first = dayOf(WEEK_ORDER[0]!);
    s.setDraft({ ...d, week: d.week.map((w) => ({ ...w, open: first.open, close: first.close, closed: first.closed })) });
  };
  const setClosure = (i: number, patch: Partial<Closure>) =>
    s.setDraft({ ...d, closures: d.closures.map((c, j) => (j === i ? { ...c, ...patch } : c)) });

  const today = bahrainToday();
  const closureErrors = d.closures.map((c) =>
    !c.from ? t("Pick a date") : c.to && c.to < c.from ? t("The last day is before the first") : undefined,
  );

  const save = async () => {
    if (closureErrors.some(Boolean)) return toast.error(t("Check the days off first."));
    setSaving(true);
    const closures = d.closures
      .map((c) => ({ from: c.from, to: c.to && c.to !== c.from ? c.to : "", label: c.label.trim() }))
      .sort((a, b) => a.from.localeCompare(b.from));
    const r = await s.save({ ...d, closures });
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Opening hours saved"));
    onSaved();
  };

  return (
    <div className="adm-stack" style={{ gap: 16, maxWidth: 760 }}>
      <Card
        title={t("Every week")}
        subtitle={t("A closing time of 12:00 am means midnight. A closing time earlier than the opening time runs past midnight.")}
        actions={<Button size="sm" onClick={copyFirst}>{t("Use {day}'s hours every day", { day: weekdayName(WEEK_ORDER[0]!) })}</Button>}
      >
        <div className="adm-hours">
          {WEEK_ORDER.map((n) => {
            const day = dayOf(n);
            return (
              <div key={n} className="adm-hours-row">
                <span className="adm-hours-day">{weekdayName(n)}</span>
                <Toggle label={day.closed ? t("Closed") : t("Open")} checked={!day.closed} onChange={(v) => setDay(n, { closed: !v })} />
                {!day.closed && (
                  <span className="adm-hours-times">
                    <label>
                      <span className="sr-only">{t("{day} opens", { day: weekdayName(n) })}</span>
                      <input type="time" className="adm-input" value={day.open} onChange={(e) => setDay(n, { open: e.target.value || "00:00" })} />
                    </label>
                    <span aria-hidden="true">–</span>
                    <label>
                      <span className="sr-only">{t("{day} closes", { day: weekdayName(n) })}</span>
                      <input type="time" className="adm-input" value={day.close} onChange={(e) => setDay(n, { close: e.target.value || "00:00" })} />
                    </label>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <Card
        title={t("Days off")}
        subtitle={t("Holidays and other days the café is closed. Online orders stop on these days when “Only during opening hours” is on.")}
        actions={<Button size="sm" icon={<Plus size={16} />} onClick={() => s.setDraft({ ...d, closures: [...d.closures, { from: today, to: "", label: "" }] })}>{t("Add days off")}</Button>}
      >
        {d.closures.length === 0 ? (
          <p className="adm-muted adm-small" style={{ display: "flex", gap: 8, alignItems: "center" }}><CalendarX size={16} aria-hidden="true" />{t("No days off planned.")}</p>
        ) : (
          <div className="adm-stack" style={{ gap: 12 }}>
            {d.closures.map((c, i) => {
              const past = (c.to || c.from) < today && !!c.from;
              return (
                <div key={i} className="adm-closure">
                  <TextField label={t("First day")} type="date" value={c.from} onChange={(v) => setClosure(i, { from: v })} error={closureErrors[i]} />
                  <TextField label={t("Last day")} optional type="date" value={c.to} min={c.from || undefined} onChange={(v) => setClosure(i, { to: v })} hint={t("Leave blank for one day")} />
                  <TextField label={t("Reason")} optional value={c.label} onChange={(v) => setClosure(i, { label: v })} maxLength={60} placeholder={t("e.g. Eid")} hint={past ? t("Already passed") : undefined} />
                  <IconButton label={t("Remove")} onClick={() => s.setDraft({ ...d, closures: d.closures.filter((_, j) => j !== i) })}><Trash2 size={16} /></IconButton>
                </div>
              );
            })}
          </div>
        )}
      </Card>
      <SaveBar dirty={s.dirty} saving={saving} onSave={save} onDiscard={s.discard} />
    </div>
  );
}

/* ── Announcement bar + popup ────────────────────────────────────────────── */

function Schedule({ starts, ends, onStarts, onEnds }: { starts: string | null; ends: string | null; onStarts: (v: string | null) => void; onEnds: (v: string | null) => void }) {
  const t = useT();
  return (
    <div className="adm-form-grid">
      <TextField label={t("Show from")} optional type="datetime-local" value={toLocalInput(starts)} onChange={(v) => onStarts(fromLocalInput(v))} hint={t("Blank: straight away")} />
      <TextField label={t("Hide after")} optional type="datetime-local" value={toLocalInput(ends)} onChange={(v) => onEnds(fromLocalInput(v))} hint={t("Blank: until you turn it off")} />
    </div>
  );
}

function scheduleNote(item: { enabled: boolean; starts_at: string | null; ends_at: string | null }, t: TFunction): { tone: "ok" | "warn" | "neutral"; text: string } {
  if (!item.enabled) return { tone: "neutral", text: t("Off") };
  const now = Date.now();
  if (item.ends_at && Date.parse(item.ends_at) <= now) return { tone: "warn", text: t("Ended") };
  if (item.starts_at && Date.parse(item.starts_at) > now) return { tone: "warn", text: t("Scheduled") };
  return { tone: "ok", text: t("Showing now") };
}

function WebsitePanel() {
  const t = useT();
  const toast = useToast();
  const bar = useSettingDraft<Announcement>("announcement", ANNOUNCEMENT);
  const pop = useSettingDraft<Popup>("popup", POPUP);
  const [saving, setSaving] = useState(false);

  if ((bar.loaded.loading && !bar.loaded.data) || (pop.loaded.loading && !pop.loaded.data)) return <Loading />;
  if (bar.loaded.error) return <LoadError message={bar.loaded.error} onRetry={bar.loaded.reload} />;
  if (pop.loaded.error) return <LoadError message={pop.loaded.error} onRetry={pop.loaded.reload} />;
  const a = bar.draft;
  const p = pop.draft;
  if (!a || !p) return null;
  const setA = (patch: Partial<Announcement>) => bar.setDraft({ ...a, ...patch });
  const setP = (patch: Partial<Popup>) => pop.setDraft({ ...p, ...patch });

  const errors = {
    barText: a.enabled && !a.text.trim() ? t("Write the announcement, or turn it off") : undefined,
    barLink: isValidUrl(a.link_url.trim()) ? undefined : t("Use a full link starting with https://, or a page like /menu"),
    popTitle: p.enabled && !p.title.trim() ? t("Give the popup a title, or turn it off") : undefined,
    popLink: isValidUrl(p.link_url.trim()) ? undefined : t("Use a full link starting with https://, or a page like /menu"),
  };

  const save = async () => {
    if (Object.values(errors).some(Boolean)) return toast.error(t("Check the highlighted fields."));
    setSaving(true);
    let ok = true;
    if (bar.dirty) {
      const r = await bar.save({ ...a, text: a.text.trim(), link_url: a.link_url.trim() });
      if (!r.ok) {
        ok = false;
        toast.error(r.error);
      }
    }
    if (pop.dirty && ok) {
      /* A new version shows the popup again to people who closed the old one. */
      const old = pop.loaded.data;
      const changed = !old || old.title !== p.title || old.body !== p.body || old.image !== p.image || old.link_url !== p.link_url || (!old.enabled && p.enabled);
      const r = await pop.save({ ...p, title: p.title.trim(), link_url: p.link_url.trim(), version: changed ? (old?.version ?? 0) + 1 : p.version });
      if (!r.ok) {
        ok = false;
        toast.error(r.error);
      }
    }
    setSaving(false);
    if (ok) toast.ok(t("Saved. The website updates within a minute or two."));
  };

  const barState = scheduleNote(a, t);
  const popState = scheduleNote(p, t);

  return (
    <div className="adm-stack" style={{ gap: 16, maxWidth: 760 }}>
      <Card
        title={t("Announcement bar")}
        subtitle={t("A line across the top of every page. Good for opening times on a holiday, a new drink, or an event.")}
        actions={<Badge tone={barState.tone} dot>{barState.text}</Badge>}
      >
        <div className="adm-stack">
          <Toggle label={t("Show the announcement bar")} checked={a.enabled} onChange={(v) => setA({ enabled: v })} />
          <BilingualField label={t("Announcement")} required en={a.text} ar={a.text_ar} onEn={(v) => setA({ text: v })} onAr={(v) => setA({ text_ar: v })} maxLength={160} error={errors.barText} />
          <div className="adm-form-grid">
            <TextField label={t("Link")} optional value={a.link_url} onChange={(v) => setA({ link_url: v })} dir="ltr" placeholder="/menu" error={errors.barLink} />
          </div>
          {a.link_url.trim() && (
            <BilingualField label={t("Link text")} en={a.link_label} ar={a.link_label_ar} onEn={(v) => setA({ link_label: v })} onAr={(v) => setA({ link_label_ar: v })} maxLength={40} hint={t("Blank: “Find out more”")} />
          )}
          <Schedule starts={a.starts_at} ends={a.ends_at} onStarts={(v) => setA({ starts_at: v })} onEnds={(v) => setA({ ends_at: v })} />
          {a.text.trim() && (
            <div>
              <p className="adm-label" style={{ marginBottom: 6 }}>{t("Preview")}</p>
              <div className="adm-announce-preview" dir="ltr">
                <span>{a.text}</span>
                {a.link_url.trim() && <u>{a.link_label || "Find out more"}</u>}
              </div>
            </div>
          )}
        </div>
      </Card>
      <Card
        title={t("Popup")}
        subtitle={t("A box that opens once for each visitor. After you change it, everyone sees it once more.")}
        actions={<Badge tone={popState.tone} dot>{popState.text}</Badge>}
      >
        <div className="adm-stack">
          <Toggle label={t("Show the popup")} checked={p.enabled} onChange={(v) => setP({ enabled: v })} />
          <BilingualField label={t("Title")} required en={p.title} ar={p.title_ar} onEn={(v) => setP({ title: v })} onAr={(v) => setP({ title_ar: v })} maxLength={80} error={errors.popTitle} />
          <BilingualField label={t("Text")} multiline rows={3} en={p.body} ar={p.body_ar} onEn={(v) => setP({ body: v })} onAr={(v) => setP({ body_ar: v })} maxLength={400} />
          <ImagePicker label={t("Photo")} value={p.image || null} onChange={(url) => setP({ image: url ?? "" })} folder="popup" hint={t("Optional. Shown above the title.")} />
          <div className="adm-form-grid">
            <TextField label={t("Button link")} optional value={p.link_url} onChange={(v) => setP({ link_url: v })} dir="ltr" placeholder="/menu" error={errors.popLink} />
          </div>
          {p.link_url.trim() && (
            <BilingualField label={t("Button text")} en={p.link_label} ar={p.link_label_ar} onEn={(v) => setP({ link_label: v })} onAr={(v) => setP({ link_label_ar: v })} maxLength={40} hint={t("Blank: “Find out more”")} />
          )}
          <Schedule starts={p.starts_at} ends={p.ends_at} onStarts={(v) => setP({ starts_at: v })} onEnds={(v) => setP({ ends_at: v })} />
        </div>
      </Card>
      <SaveBar dirty={bar.dirty || pop.dirty} saving={saving} onSave={save} onDiscard={() => { bar.discard(); pop.discard(); }} />
    </div>
  );
}

/* ── Back-soon page ──────────────────────────────────────────────────────── */

function MaintenancePanel({ onSaved }: { onSaved: () => void }) {
  const t = useT();
  const toast = useToast();
  const confirm = useConfirm();
  const s = useSettingDraft<Maintenance>("maintenance", MAINTENANCE);
  const [saving, setSaving] = useState(false);

  if (s.loaded.loading && !s.loaded.data) return <Loading />;
  if (s.loaded.error) return <LoadError message={s.loaded.error} onRetry={s.loaded.reload} />;
  const d = s.draft;
  if (!d) return null;
  const wasOn = !!s.loaded.data?.enabled;

  const save = async () => {
    if (d.enabled && !wasOn) {
      const ok = await confirm({
        title: t("Hide the website?"),
        body: t("Every page will show the back-soon message and nobody can order online until you turn it off. This dashboard keeps working."),
        confirmLabel: t("Hide the website"),
        danger: true,
      });
      if (!ok) return;
    }
    setSaving(true);
    const r = await s.save(d);
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(d.enabled ? t("The website now shows the back-soon page") : t("Saved"));
    onSaved();
  };

  return (
    <div className="adm-stack" style={{ gap: 16, maxWidth: 760 }}>
      {wasOn && <Notice tone="warn" title={t("The website is hidden")}>{t("Visitors see the back-soon page. Turn it off and save to bring the website back.")}</Notice>}
      <Card title={t("Back-soon page")} subtitle={t("For when the website needs to be hidden for a while — a big menu change, or a problem. The café's own address and Instagram stay on the page.")}>
        <div className="adm-stack">
          <Toggle label={t("Hide the website and show the back-soon page")} checked={d.enabled} onChange={(v) => s.setDraft({ ...d, enabled: v })} />
          <BilingualField
            label={t("Message")}
            en={d.message}
            ar={d.message_ar}
            onEn={(v) => s.setDraft({ ...d, message: v })}
            onAr={(v) => s.setDraft({ ...d, message_ar: v })}
            maxLength={160}
            hint={t("Blank: “We're making a few changes. Back very soon.”")}
          />
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={saving} onSave={save} onDiscard={s.discard} />
    </div>
  );
}

/* ── Contact details ─────────────────────────────────────────────────────── */

function ContactPanel() {
  const t = useT();
  const toast = useToast();
  const s = useSettingDraft<Contact>("contact", CONTACT);
  const [saving, setSaving] = useState(false);

  if (s.loaded.loading && !s.loaded.data) return <Loading />;
  if (s.loaded.error) return <LoadError message={s.loaded.error} onRetry={s.loaded.reload} />;
  const d = s.draft;
  if (!d) return null;
  const set = (patch: Partial<Contact>) => s.setDraft({ ...d, ...patch });

  const linkError = (url: string) => (url.trim() && !/^https:\/\//i.test(url.trim()) ? t("Use a full link starting with https://") : undefined);
  const errors = { instagram: linkError(d.instagram), maps: linkError(d.maps_url) };

  const save = async () => {
    if (errors.instagram || errors.maps) return toast.error(t("Check the highlighted fields."));
    setSaving(true);
    const clean = Object.fromEntries(Object.entries(d).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v])) as Contact;
    const r = await s.save(clean);
    setSaving(false);
    if (!r.ok) return toast.error(r.error);
    toast.ok(t("Saved. The website updates within a minute or two."));
  };

  return (
    <div className="adm-stack" style={{ gap: 16, maxWidth: 760 }}>
      <Card title={t("Links on the website")} subtitle={t("The Instagram button in the footer, and “Find us” on the home and Friday Espresso pages.")}>
        <div className="adm-stack">
          <TextField label={t("Instagram")} value={d.instagram} onChange={(v) => set({ instagram: v })} dir="ltr" placeholder="https://www.instagram.com/mantelbh/" error={errors.instagram} hint={t("Paste the profile link without anything after a “?”.")} />
          <TextField label={t("Google Maps")} value={d.maps_url} onChange={(v) => set({ maps_url: v })} dir="ltr" placeholder="https://share.google/…" error={errors.maps} hint={t("In Google Maps, open the café, tap Share and copy the link.")} />
        </div>
      </Card>
      <Card title={t("How to reach the café")}>
        <div className="adm-stack">
          <div className="adm-form-grid">
            <TextField label={t("Email")} value={d.email} onChange={(v) => set({ email: v })} dir="ltr" type="email" />
            <TextField label={t("Phone")} optional value={d.phone} onChange={(v) => set({ phone: v })} dir="ltr" placeholder="+973" />
            <TextField label={t("WhatsApp")} optional value={d.whatsapp} onChange={(v) => set({ whatsapp: v })} dir="ltr" placeholder="+973" />
          </div>
          <BilingualField label={t("Address")} en={d.address} ar={d.address_ar} onEn={(v) => set({ address: v })} onAr={(v) => set({ address_ar: v })} maxLength={200} />
        </div>
      </Card>
      <SaveBar dirty={s.dirty} saving={saving} onSave={save} onDiscard={s.discard} />
    </div>
  );
}
