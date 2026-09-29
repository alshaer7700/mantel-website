import { currentLang, translate } from "@/admin/i18n";

const TZ = "Asia/Bahrain";

function locale() {
  return currentLang() === "ar" ? "ar-BH-u-nu-latn" : "en-GB";
}

export function money(value: number | string | null | undefined): string {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return `BD ${(Number.isFinite(n) ? n : 0).toFixed(3)}`;
}

export function num(value: number | null | undefined): string {
  return new Intl.NumberFormat(locale()).format(value ?? 0);
}

export function dateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(), {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

export function dateOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(), { timeZone: TZ, day: "numeric", month: "short", year: "numeric" }).format(d);
}

export function timeOnly(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat(locale(), { timeZone: TZ, hour: "numeric", minute: "2-digit" }).format(d);
}

export function ago(iso: string | null | undefined): string {
  if (!iso) return "—";
  const t = (s: string, v?: Record<string, number>) => translate(currentLang(), s, v);
  const diff = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(diff)) return "—";
  const min = Math.round(diff / 60000);
  if (min < 1) return t("just now");
  if (min < 60) return t("{n} min ago", { n: min });
  const hours = Math.round(min / 60);
  if (hours < 24) return t("{n} h ago", { n: hours });
  const days = Math.round(hours / 24);
  if (days < 30) return t("{n} days ago", { n: days });
  return dateOnly(iso);
}

export function minutesSince(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
}

/** The reference the customer reads back at the counter; mirrors src/lib/api/orders.ts. */
export function orderRef(id: string): string {
  return `MTL-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Today's date in Bahrain as YYYY-MM-DD. */
export function bahrainToday(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts;
}

export const WEEKDAYS_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function weekdayName(day: number): string {
  return translate(currentLang(), WEEKDAYS_EN[day] ?? "");
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
}

/** Download text as a file, in the browser. */
export function downloadFile(filename: string, content: string, type = "text/csv;charset=utf-8") {
  const blob = new Blob([type.startsWith("text/csv") ? "﻿" + content : content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function toCsv(rows: Record<string, unknown>[], columns?: { key: string; label: string }[]): string {
  const cols = columns ?? Object.keys(rows[0] ?? {}).map((key) => ({ key, label: key }));
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const s = typeof value === "object" ? JSON.stringify(value) : String(value);
    return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.map((c) => escape(c.label)).join(","), ...rows.map((r) => cols.map((c) => escape(r[c.key])).join(","))].join("\r\n");
}
