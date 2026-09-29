import { supabase } from "@/lib/supabaseClient";
import { settle } from "@/lib/api/settle";
import { readThrough } from "@/lib/api/cache";

/*
 * What the staff set in the dashboard's Shop settings, read through
 * public_site() (supabase/028, extended in 035). Only settings marked public
 * come back.
 *
 * Nothing here is a control. place_order enforces the pause, the opening
 * hours, the minimum order and the item limit on its own (035); this read is
 * so the customer sees why before they try, not after.
 *
 * A failed read resolves to null and the site behaves as it did before these
 * settings existed: open, no banner, no popup.
 */

export type OrderingStatus = {
  open: boolean;
  reason?: "maintenance" | "paused" | "closure" | "hours" | null;
  message?: string;
  /** Bahrain local time, "YYYY-MM-DDTHH:MM". */
  next_open?: string | null;
  closes_at?: string | null;
  min_order: number;
  max_items: number;
};

export type Announcement = {
  enabled: boolean;
  text: string;
  link_url: string;
  link_label: string;
  starts_at: string | null;
  ends_at: string | null;
};

export type Popup = {
  enabled: boolean;
  version: number;
  title: string;
  body: string;
  image: string;
  link_url: string;
  link_label: string;
  starts_at: string | null;
  ends_at: string | null;
};

export type WeekHours = { day: number; open: string; close: string; closed: boolean };

export type SiteInfo = {
  status: OrderingStatus;
  /** Published Website pages, keyed "page.home" etc.; see src/lib/content/pages.ts. */
  content: Record<string, unknown>;
  hours: { week: WeekHours[] } | null;
  announcement: Announcement | null;
  popup: Popup | null;
  maintenance: { enabled: boolean; message: string } | null;
};

/** One minute: long enough to spare reloads, short enough that a pause shows quickly. */
const SITE_TTL_MS = 60 * 1000;

export function fetchSite(): Promise<SiteInfo | null> {
  return readThrough("site", SITE_TTL_MS, loadSite, (value) => value !== null);
}

type Raw = { settings?: Record<string, unknown>; content?: Record<string, unknown>; status?: OrderingStatus };

async function loadSite(): Promise<SiteInfo | null> {
  const { data, error } = await settle(supabase.rpc("public_site"));
  if (error || !data || typeof data !== "object") return null;
  const raw = data as unknown as Raw;
  const s = raw.settings ?? {};
  return {
    status: raw.status ?? { open: true, min_order: 0, max_items: 20 },
    content: raw.content ?? {},
    hours: (s.hours as SiteInfo["hours"] | undefined) ?? null,
    announcement: (s.announcement as Announcement | undefined) ?? null,
    popup: (s.popup as Popup | undefined) ?? null,
    maintenance: (s.maintenance as SiteInfo["maintenance"] | undefined) ?? null,
  };
}

/** Inside the optional start/end window (ISO strings), or no window at all. */
export function isLive(item: { enabled: boolean; starts_at: string | null; ends_at: string | null } | null, now = Date.now()): boolean {
  if (!item?.enabled) return false;
  if (item.starts_at && Date.parse(item.starts_at) > now) return false;
  if (item.ends_at && Date.parse(item.ends_at) <= now) return false;
  return true;
}

/** "today at 7:00 am", "tomorrow at 8:00 am", "on Friday at 8:00 am". */
export function describeOpening(nextOpen: string | null | undefined): string | null {
  if (!nextOpen) return null;
  const [date, time] = nextOpen.split("T");
  if (!date || !time) return null;
  const [h = 0, m = 0] = time.split(":").map(Number);
  const clock = `${((h + 11) % 12) + 1}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain" }).format(new Date());
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Bahrain" }).format(new Date(Date.now() + 86_400_000));
  if (date === today) return `today at ${clock}`;
  if (date === tomorrow) return `tomorrow at ${clock}`;
  const day = new Intl.DateTimeFormat("en-GB", { weekday: "long", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
  return `on ${day} at ${clock}`;
}

/*
 * Opening hours as the About page lists them: days with the same hours are
 * grouped ("Sunday – Thursday  7am – 10pm"), Saturday first as in Bahrain.
 */
const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEK_ORDER = [6, 0, 1, 2, 3, 4, 5];

function shortClock(time: string): string {
  const [h = 0, m = 0] = time.split(":").map(Number);
  if (h === 0 && m === 0) return "12am";
  const hour = ((h + 11) % 12) + 1;
  return `${hour}${m ? `:${String(m).padStart(2, "0")}` : ""}${h < 12 ? "am" : "pm"}`;
}

export function hoursRows(week: WeekHours[] | undefined): { days: string; hours: string }[] {
  if (!week?.length) return [];
  const byDay = new Map(week.map((d) => [d.day, d]));
  const rows: { from: number; to: number; hours: string }[] = [];
  for (const n of WEEK_ORDER) {
    const d = byDay.get(n);
    const hours = !d || d.closed ? "Closed" : `${shortClock(d.open)} – ${shortClock(d.close)}`;
    const last = rows[rows.length - 1];
    if (last && last.hours === hours) last.to = n;
    else rows.push({ from: n, to: n, hours });
  }
  return rows.map((r) => ({
    days: r.from === r.to ? DAY_NAMES[r.from]! : `${DAY_NAMES[r.from]} – ${DAY_NAMES[r.to]}`,
    hours: r.hours,
  }));
}
