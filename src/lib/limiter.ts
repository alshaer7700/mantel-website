/*
 * A sliding-window limiter on the write actions, in the browser.
 *
 * READ THIS BEFORE RELYING ON IT: this is not a security control, and it is
 * not the thing that stops abuse. It lives in localStorage, so clearing site
 * data resets it and a script that never loads the page never meets it at all.
 * The limits that actually hold are in the database — supabase/009 for orders,
 * 019 for contact messages, 023 for the newsletter — where they are enforced
 * per IP and per email by a SECURITY DEFINER function the browser cannot talk
 * its way around.
 *
 * What this buys, which the database limits do not:
 *
 *   A stuck customer stops generating load. A jammed submit button, a
 *   double-tap on a slow connection, a page left retrying — each of those is a
 *   round trip to Supabase that ends in a rejection. Catching it here means
 *   the request is never made.
 *
 *   The failure reads as a sentence instead of an error. Hitting the server
 *   limit returns PT429 and a Postgres message; hitting this one returns the
 *   same `rate-limited` AppError shape with copy written for a customer, and
 *   the UI it flows into is already built to display exactly that.
 *
 * EVERY RULE HERE IS LOOSER THAN ITS SERVER COUNTERPART, and that is the
 * design, not an oversight. The server counts orders that LANDED (3 per email,
 * 6 per device per 10 minutes); this counts ATTEMPTS, including the ones that
 * failed validation and never created anything. A tighter client rule would
 * make this the effective limit and lock out a customer the database would
 * have happily served — a real person retrying a typo'd email is the exact
 * case that breaks. So these sit outside the server's envelope: they catch
 * runaway behaviour and nothing else.
 */

export type LimitRule = {
  /** Attempts permitted inside the window. */
  limit: number;
  windowMs: number;
};

export type LimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterMs: number };

const TEN_MINUTES = 10 * 60 * 1000;

/**
 * One entry per anon-callable write RPC.
 *
 * The server's own numbers, for comparison when tuning these — all per
 * 10 minutes, all counting successes:
 *
 *   order       3 per email, 6 per device, 60 site-wide   (supabase/009)
 *   contact     3 per email, 6 per device                 (supabase/019)
 *   newsletter  4 per device                              (supabase/023)
 */
export const LIMITS = {
  order: { limit: 10, windowMs: TEN_MINUTES },
  contact: { limit: 10, windowMs: TEN_MINUTES },
  newsletter: { limit: 6, windowMs: TEN_MINUTES },
} as const satisfies Record<string, LimitRule>;

export type LimitedAction = keyof typeof LIMITS;

/*
 * localStorage rather than sessionStorage, deliberately: a reload must not
 * reset the counter, or "reload and try again" becomes the bypass and the
 * limiter stops doing the one job it has.
 *
 * This stores timestamps only — no email, no name, no order contents. That
 * keeps it off the privacy retention backlog and out of the site's "we set no
 * cookies" position, which is about tracking, not about a list of integers
 * describing this browser's own recent clicks.
 */
const STORAGE_PREFIX = "mantel-limit:";

/** Never keep more than a window's worth of timestamps for one action. */
const MAX_STAMPS = 64;

function readStamps(action: string): number[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + action);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((n): n is number => typeof n === "number" && Number.isFinite(n));
  } catch {
    /* Storage blocked or corrupt. An unusable limiter must allow the action,
       never block it — the server limit is still there behind this. */
    return [];
  }
}

function writeStamps(action: string, stamps: readonly number[]): void {
  try {
    window.localStorage.setItem(
      STORAGE_PREFIX + action,
      JSON.stringify(stamps.slice(-MAX_STAMPS)),
    );
  } catch {
    /* Quota or private mode. Same reasoning as above: degrade to permissive. */
  }
}

/**
 * Record an attempt at `action` and say whether it may proceed.
 *
 * Check and record are one call on purpose: a separate `check()` and
 * `record()` can be checked and then not recorded — by an early return, a
 * thrown error, a branch added later — and a limiter that forgets to count is
 * indistinguishable from no limiter at all.
 *
 * Call it AFTER local validation and immediately before the request. What it
 * is rationing is round trips, and a submission that fails validation never
 * makes one; charging a slot for a mistyped email would spend the customer's
 * budget on the attempts that cost the backend nothing.
 */
export function takeSlot(action: LimitedAction): LimitDecision {
  const rule = LIMITS[action];
  const now = Date.now();
  const cutoff = now - rule.windowMs;

  /*
   * A timestamp in the future is discarded along with the expired ones. It can
   * only come from a clock that has since moved backwards, and keeping it
   * would hold a slot until real time caught up — potentially hours.
   */
  const recent = readStamps(action).filter((at) => at > cutoff && at <= now);

  if (recent.length >= rule.limit) {
    const oldest = Math.min(...recent);
    /* When the oldest attempt leaves the window, a slot frees up. */
    const retryAfterMs = Math.max(0, oldest + rule.windowMs - now);
    writeStamps(action, recent);
    return { allowed: false, retryAfterMs };
  }

  writeStamps(action, [...recent, now]);
  return { allowed: true };
}

/**
 * The sentence shown when a slot is refused.
 *
 * Rounded up to whole minutes and never below one: "try again in 0 minutes" is
 * worse than no number, and a precise countdown invites a customer to sit and
 * watch it.
 */
export function retryMessage(retryAfterMs: number): string {
  const minutes = Math.max(1, Math.ceil(retryAfterMs / 60_000));
  return minutes === 1
    ? "That was a lot of tries at once — please wait a minute and try again."
    : `That was a lot of tries at once — please wait about ${minutes} minutes and try again.`;
}
