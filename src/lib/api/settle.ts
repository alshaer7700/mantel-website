import type { QueryError } from "@/lib/api/errors";

/*
 * Guarantees that a Supabase call resolves, and resolves within a bounded
 * time, rather than trusting the client to do either.
 *
 * Two failures this exists for, both observed rather than imagined:
 *
 * 1. A NEVER-SETTLING PROMISE. With the network cut, the objects query neither
 *    resolved nor rejected — no result, no unhandled rejection, nothing. The
 *    page sat on "Loading…" indefinitely, because a loading flag is only ever
 *    cleared by a promise that finishes. An indefinite spinner is the worst of
 *    the failure modes: the visitor cannot tell it from a slow connection, so
 *    they wait instead of retrying.
 *
 * 2. A THROWN FETCH. supabase-js usually converts a transport failure into
 *    { data: null, error }, but when it throws instead, the error escapes the
 *    destructuring entirely and never reaches toAppError. That is why
 *    errors.ts has a "network" kind that nothing could previously produce.
 *
 * Both now land on the same shape every caller already handles.
 */

/** Long enough for a slow mobile connection, short enough to not read as broken. */
const TIMEOUT_MS = 12_000;

type Settled<T> = { data: T | null; error: QueryError | null };

/*
 * The argument is a thenable, not a Promise: a PostgrestFilterBuilder only
 * starts work when awaited, and typing it as PromiseLike keeps that laziness
 * while still accepting a real Promise from .rpc().
 */
export async function settle<T>(query: PromiseLike<Settled<T>>): Promise<Settled<T>> {
  try {
    return await Promise.race([query, timeout<T>()]);
  } catch (cause) {
    /*
     * An empty code is exactly what toAppError reads as "network", so the
     * classification stays in one place rather than being duplicated here.
     */
    return {
      data: null,
      error: { code: "", message: cause instanceof Error ? cause.message : "Request failed" },
    };
  }
}

function timeout<T>(): Promise<Settled<T>> {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error("Request timed out")), TIMEOUT_MS),
  );
}
