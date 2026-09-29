import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/lib/api/staffClient";
import { settle } from "@/lib/api/settle";
import type { QueryError } from "@/lib/api/errors";
import { translate, currentLang } from "@/admin/i18n";

/*
 * The dashboard reaches tables the public site never touches (settings,
 * content, audit log …). Those are not all in the generated Database type, so
 * the dashboard talks through an untyped view of the same client and declares
 * its own row shapes next to each screen. Row-level security in Postgres is
 * the guarantee either way; the types here are for the editor, not security.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const db = supabase as unknown as SupabaseClient<any, "public", any>;

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

/** A message a manager can act on, never a Postgres code. */
export function friendlyError(error: QueryError | null | undefined): string {
  const t = (s: string) => translate(currentLang(), s);
  if (!error) return t("Something went wrong. Please try again.");
  const code = error.code ?? "";
  const message = error.message ?? "";
  if (!code) return t("Couldn't reach the server. Check the internet connection and try again.");
  if (code === "42501" || /permission denied|row-level security/i.test(message)) {
    return t("You don't have permission to do this. Ask an admin to give your role access.");
  }
  if (code === "23505") return t("That name or code is already used. Choose a different one.");
  if (code === "23514") {
    if (/available_has_price/.test(message)) return t("An item needs a price above zero before it can be shown on the website.");
    return t("One of the values isn't allowed. Check the numbers and try again.");
  }
  if (code === "23503") return t("This is still linked to something else, so it can't be removed. Try archiving it instead.");
  if (code === "22P02" || code === "22023") return message ? t(message) : t("One of the values isn't valid.");
  if (code === "PGRST116") return t("That record no longer exists. Refresh the page.");
  // Our own RPCs raise sentences written for staff with the default code.
  if (code === "P0001" && message) return t(message);
  return t("Something went wrong. Please try again.");
}

export async function rpc<T>(name: string, args?: Record<string, unknown>): Promise<Result<T>> {
  const { data, error } = await settle<T>(db.rpc(name, args ?? {}) as unknown as PromiseLike<{ data: T | null; error: QueryError | null }>);
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, value: data as T };
}

export async function run<T>(query: PromiseLike<{ data: T | null; error: QueryError | null }>): Promise<Result<T>> {
  const { data, error } = await settle<T>(query);
  if (error) return { ok: false, error: friendlyError(error) };
  return { ok: true, value: data as T };
}

export async function getSetting<T>(key: string, fallback: T): Promise<Result<T>> {
  const result = await run<{ value: T }[]>(db.from("site_settings").select("value").eq("key", key).limit(1));
  if (!result.ok) return result;
  const row = result.value?.[0];
  return { ok: true, value: row ? ({ ...fallback, ...(row.value as object) } as T) : fallback };
}

export async function saveSetting<T>(key: string, value: T, isPublic?: boolean): Promise<Result<true>> {
  const { data: session } = await supabase.auth.getSession();
  const row: Record<string, unknown> = {
    key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: session.session?.user.id ?? null,
  };
  if (typeof isPublic === "boolean") row.is_public = isPublic;
  const result = await run(db.from("site_settings").upsert(row, { onConflict: "key" }));
  if (!result.ok) return result;
  return { ok: true, value: true };
}

/** Tells a counter tablet's PIN session to the database on every request. */
export function setCounterToken(token: string | null) {
  const rest = (supabase as unknown as { rest: { headers: Headers | Record<string, string> } }).rest;
  const headers = rest.headers;
  if (headers instanceof Headers) {
    if (token) headers.set("x-mantel-counter", token);
    else headers.delete("x-mantel-counter");
  } else if (token) {
    headers["x-mantel-counter"] = token;
  } else {
    delete headers["x-mantel-counter"];
  }
}
