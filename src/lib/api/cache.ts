/*
 * A read-through cache for the catalog queries, in front of Supabase.
 *
 * The menu and the object shelf are fetched on mount, unconditionally, by the
 * one effect in App.tsx. That is two round trips to Supabase on every single
 * page load — and because the app re-mounts on a reload, reloading five times
 * was ten queries for data that had not changed in weeks. With a room full of
 * customers doing the same thing, that is the load the project pool actually
 * sees.
 *
 * Three layers, in the order they are consulted:
 *
 *   memory          survives client-side navigation; dies with the document
 *   in-flight map   two callers asking at once share ONE request
 *   sessionStorage  survives a reload; dies when the tab closes
 *
 * The in-flight layer is not an optimisation — it is the one that fixes
 * double-mounting. React 18 StrictMode mounts effects twice in development,
 * and App.tsx's effect fires both fetches each time; without dedupe that is
 * four requests to render one page.
 *
 * WHAT THIS IS NOT: a rate limit. It reduces how often the app *asks*, which
 * is why it belongs in a change about load, but a caller that clears storage
 * gets a fresh request every time. The limits that cannot be sidestepped are
 * the ones in the database (supabase/005, 009, 015, 023). Nothing here is a
 * security control.
 */

/**
 * Five minutes.
 *
 * The staleness this can produce is bounded and cheap: a price edited in the
 * staff dashboard shows the old number for up to five minutes. It cannot
 * produce a WRONG CHARGE — place_order re-reads name and price from the
 * sellables view and computes the subtotal server-side (see
 * src/lib/api/orders.ts), so the browser's copy is display only. An item
 * marked unavailable inside the window is caught the same way: the order is
 * rejected with 'unknown, unavailable, or invalid-quantity items', which
 * errors.ts already turns into "Something in your bag just sold out."
 *
 * Raise this and the stale window grows; lower it and reloads start hitting
 * the network again. Five minutes is well under the interval at which this
 * café's catalog actually changes.
 */
export const CATALOG_TTL_MS = 5 * 60 * 1000;

/*
 * Bumping this invalidates every stored entry at once.
 *
 * Required because the cached value is a row shape, and a migration that adds
 * or renames a column changes that shape. Without a version in the key, a
 * returning visitor would rehydrate yesterday's shape into today's code —
 * which fails as a missing field at render time, far from the cause. Bump it
 * in the same commit that changes what the catalog selects.
 */
const CACHE_VERSION = "v1";

type Entry = { at: number; value: unknown };

const memory = new Map<string, Entry>();
const inFlight = new Map<string, Promise<unknown>>();

function storageKey(key: string): string {
  return `mantel-cache:${CACHE_VERSION}:${key}`;
}

function isFresh(entry: Entry, ttlMs: number): boolean {
  const age = Date.now() - entry.at;
  /*
   * A negative age means the clock moved backwards between the write and the
   * read (a manual change, or an NTP correction). Treating that as fresh would
   * pin the entry until the clock caught up, so it counts as stale.
   */
  return age >= 0 && age < ttlMs;
}

/*
 * Every sessionStorage access is wrapped. It throws rather than returning null
 * in Safari's private mode and wherever site data is blocked, and an
 * unavailable cache must degrade to "fetch it again", never to a broken page.
 */
function readStored(key: string, ttlMs: number): Entry | null {
  try {
    const raw = window.sessionStorage.getItem(storageKey(key));
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" || parsed === null ||
      typeof (parsed as Entry).at !== "number"
    ) {
      return null;
    }

    const entry = parsed as Entry;
    return isFresh(entry, ttlMs) ? entry : null;
  } catch {
    return null;
  }
}

function writeStored(key: string, entry: Entry): void {
  try {
    window.sessionStorage.setItem(storageKey(key), JSON.stringify(entry));
  } catch {
    /* Quota exceeded, or storage blocked. The memory layer still works. */
  }
}

/**
 * Serve `key` from cache when a fresh entry exists, otherwise run `load` —
 * once, however many callers ask at the same moment.
 *
 * `cacheable` decides what is worth keeping. It exists because the catalog
 * loaders resolve rather than reject on failure: fetchMenu returns
 * `{ ok: false, error }` for a dead socket, and storing that would serve the
 * error page from cache for the next five minutes. Only successes are kept,
 * so a failed load is retried on the next call.
 */
export async function readThrough<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
  cacheable: (value: T) => boolean,
): Promise<T> {
  const live = memory.get(key);
  if (live && isFresh(live, ttlMs)) return live.value as T;

  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;

  const stored = readStored(key, ttlMs);
  if (stored) {
    memory.set(key, stored);
    return stored.value as T;
  }

  const request = load()
    .then((value) => {
      if (cacheable(value)) {
        const entry: Entry = { at: Date.now(), value };
        memory.set(key, entry);
        writeStored(key, entry);
      }
      return value;
    })
    .finally(() => {
      /*
       * Cleared whether the load succeeded or threw. Leaving a rejected
       * promise in the map would hand the same rejection to every future
       * caller, turning one dropped request into a permanently broken page.
       */
      inFlight.delete(key);
    });

  inFlight.set(key, request);
  return request;
}

/**
 * Drop every cached catalog entry.
 *
 * For the staff dashboard: after editing the menu, an operator reloading the
 * public site should see their own change rather than wait out the TTL.
 */
export function clearCatalogCache(): void {
  memory.clear();
  try {
    for (let i = window.sessionStorage.length - 1; i >= 0; i -= 1) {
      const key = window.sessionStorage.key(i);
      if (key?.startsWith("mantel-cache:")) window.sessionStorage.removeItem(key);
    }
  } catch {
    /* Storage unavailable; the memory layer is cleared either way. */
  }
}
