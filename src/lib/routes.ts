import type { Page } from "@/app/types";

/*
 * The single source of truth for page ↔ URL. `page` used to be pure component
 * state, so the address bar never moved: nothing was linkable, Back left the
 * site, and a direct hit on /menu was a 404 because the server had no rule for
 * it. Every navigation now goes through here, and the host configs
 * (netlify.toml, vercel.json) rewrite unknown paths to index.html so a refresh
 * on a deep link still boots the app.
 */
export const ROUTES: Record<Page, string> = {
  home: "/",
  menu: "/menu",
  story: "/story",
  contact: "/contact",
  faq: "/faq",
  privacy: "/privacy",
  terms: "/terms",
  refund: "/refund",
};

export function pathFor(page: Page): string {
  return ROUTES[page];
}

const BY_PATH = new Map<string, Page>(
  (Object.entries(ROUTES) as [Page, string][]).map(([page, path]) => [path, page]),
);

/**
 * Resolve a pathname to a page. Trailing slashes and case are normalised so
 * /Menu/ and /menu land on the same place. Anything unrecognised falls back to
 * home — the caller replaces the URL to match, so the address bar never claims
 * to be somewhere the app isn't.
 */
export function pageFor(pathname: string): Page {
  const normalised = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return BY_PATH.get(normalised) ?? "home";
}

/** True when the pathname maps to a real route, so callers know to correct it. */
export function isKnownPath(pathname: string): boolean {
  const normalised = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  return BY_PATH.has(normalised);
}
